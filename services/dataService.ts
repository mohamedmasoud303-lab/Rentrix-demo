
import Dexie from 'dexie';
import { toast } from 'react-hot-toast';
import { dbEngine } from './db';
import { postJournalEntry, rebuildSnapshotsFromJournal } from './financialEngine';
import { Database, Serials, User, Receipt, Expense, OwnerSettlement, Settings, Invoice, Owner } from '../types';
import { getLocalISODate } from '../utils/helpers';

const STATIC_ID = 1;

const audit = async (user: User | null | undefined, action: string, entity: string, entityId: string, note: string = '') => {
    if (!user) return;
    await dbEngine.auditLog.add({ id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
};

const add = async <T extends keyof Database>(
    table: T,
    entry: Omit<any, 'id' | 'createdAt' | 'no'>,
    user: User | null | undefined,
    settings: Settings
): Promise<any | null> => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const finalEntry: { [key: string]: any } = { ...entry, id, createdAt: now };
    const tables = [dbEngine.governance, dbEngine.serials, (dbEngine as any)[table], dbEngine.journalEntries, dbEngine.auditLog, dbEngine.owners, dbEngine.contracts, dbEngine.units, dbEngine.properties];
    
    try {
        await (dbEngine as Dexie).transaction('rw', tables, async (tx) => {
            const governance = await tx.table('governance').get(STATIC_ID);
            const lockDate = governance?.financialLockDate ? new Date(governance.financialLockDate) : null;
            
            const entryDateStr = finalEntry.date || finalEntry.dateTime || finalEntry.dueDate || getLocalISODate();
            const entryDate = new Date(entryDateStr.slice(0,10));

            if (lockDate && entryDate <= lockDate) {
                if (['receipts', 'expenses', 'ownerSettlements', 'journalEntries', 'invoices', 'depositTxs'].includes(table as string)) {
                    throw new Error(`الفترة المالية مغلقة حتى تاريخ ${lockDate.toLocaleDateString()}. لا يمكن تسجيل حركات جديدة.`);
                }
            }

            const serialKeys: any = { receipts: 'receipt', expenses: 'expense', invoices: 'invoice', ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance', leads: 'lead', missions: 'mission' };
            const sKey = serialKeys[table];
            if (sKey) {
                const s = await tx.table('serials').get(STATIC_ID);
                if (s) { s[sKey]++; finalEntry.no = String(s[sKey]); await tx.table('serials').put(s); }
            }
            
            await tx.table(String(table)).add(finalEntry);
            await audit(user, 'CREATE', String(table), id);
            
            const m = settings.accountMappings;
            if (table === 'invoices') {
                const inv = finalEntry as Invoice;
                if (inv.status !== 'VOID') {
                    // القيد عند إصدار الفاتورة: من حـ/ ذمم المستأجرين إلى حـ/ ذمم الملاك
                    await postJournalEntry(tx, { 
                        dr: m.accountsReceivable, 
                        cr: m.ownersPayable, 
                        amount: inv.amount + (inv.taxAmount || 0), 
                        ref: inv.id, 
                        entityType: 'CONTRACT', 
                        entityId: inv.contractId, 
                        date: inv.dueDate 
                    });
                }
            } else if (table === 'receipts') {
                const r = finalEntry as Receipt;
                // القيد عند التحصيل: من حـ/ الصندوق أو البنك إلى حـ/ ذمم المستأجرين
                await postJournalEntry(tx, { 
                    dr: m.paymentMethods[r.channel], 
                    cr: m.accountsReceivable, 
                    amount: r.amount, 
                    ref: r.id, 
                    entityType: 'CONTRACT', 
                    entityId: r.contractId, 
                    date: r.dateTime 
                });

                const contract = await tx.table('contracts').get(r.contractId);
                if (contract) {
                    const unit = await tx.table('units').get(contract.unitId);
                    const property = unit ? await tx.table('properties').get(unit.propertyId) : null;
                    const owner = property ? await tx.table('owners').get(property.ownerId) as Owner : null;
                    
                    if (owner && owner.commissionValue > 0) {
                        let comm = 0;
                        if (owner.commissionType === 'RATE') comm = (r.amount * owner.commissionValue) / 100;
                        else comm = owner.commissionValue;

                        if (comm > 0) {
                            // قيد استقطاع عمولة المكتب: من حـ/ ذمم الملاك إلى حـ/ إيراد عمولات المكتب
                            await postJournalEntry(tx, { 
                                dr: m.ownersPayable, 
                                cr: m.revenue.OFFICE_COMMISSION, 
                                amount: comm, 
                                ref: r.id, 
                                date: r.dateTime 
                            });
                        }
                    }
                }
            } else if (table === 'expenses') {
                const e = finalEntry as Expense;
                const payAcc = m.paymentMethods.CASH;
                if (e.chargedTo === 'OWNER') {
                    await postJournalEntry(tx, { dr: m.ownersPayable, cr: payAcc, amount: e.amount, ref: e.id, date: e.dateTime });
                } else if (e.chargedTo === 'OFFICE') {
                    const expAcc = m.expenseCategories[e.category] || m.expenseCategories.default;
                    await postJournalEntry(tx, { dr: expAcc, cr: payAcc, amount: e.amount, ref: e.id, date: e.dateTime });
                }
            } else if (table === 'ownerSettlements') {
                const s = finalEntry as OwnerSettlement;
                const payAcc = m.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
                await postJournalEntry(tx, { dr: m.ownersPayable, cr: payAcc, amount: s.amount, ref: s.id, date: s.date });
            }
        });
        
        await rebuildSnapshotsFromJournal();
        return finalEntry;
    } catch (error) {
        console.error("ERP Transaction Error:", error);
        toast.error(error instanceof Error ? error.message : 'خطأ في المعالجة المالية.');
        return null;
    }
};

const update = async <T extends keyof Database>(table: T, id: string, updates: Partial<any>, user: User | null | undefined): Promise<void> => {
    try {
        await (dbEngine as any)[table].update(id, { ...updates, updatedAt: Date.now() });
        await audit(user, 'UPDATE', String(table), id);
        if (['receipts', 'expenses', 'ownerSettlements', 'invoices', 'contracts'].includes(table as string)) {
            await rebuildSnapshotsFromJournal();
        }
        toast.success('تم تحديث السجل.');
    } catch(error) { toast.error('فشل التحديث.'); }
};

const remove = async <T extends keyof Database>(table: T, id: string, user: User | null | undefined): Promise<void> => {
    if (window.confirm('لا يمكن التراجع عن عملية الحذف. هل أنت متأكد؟')) {
        try {
            await (dbEngine as any)[table].delete(id);
            await audit(user, 'DELETE', String(table), id);
            await rebuildSnapshotsFromJournal();
            toast.success('تم الحذف وتحديث الأرصدة.');
        } catch (error) { toast.error('حدث خطأ أثناء الحذف.'); }
    }
};

export const dataService = { add, update, remove, audit };
