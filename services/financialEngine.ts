
import { 
  OwnerBalance, AccountBalance, 
  ContractBalance, JournalEntry, Property 
} from '../types';
import { dbEngine } from './db';
import Dexie, { Transaction } from 'dexie';
import { getLocalISODate } from '../utils/helpers';

const STATIC_ID = 1;
const r3 = (x: number): number => +x.toFixed(3);

/**
 * تسجيل قيد محاسبي مزدوج في دفتر اليومية
 */
export const postJournalEntry = async (
    tx: Transaction,
    { dr, cr, amount, ref, entityType, entityId, date }: { dr: string, cr: string, amount: number, ref: string, entityType?: 'CONTRACT' | 'TENANT', entityId?: string, date?: string }
): Promise<JournalEntry[]> => {
    const serialsTable = tx.table('serials');
    const currentSerials = await serialsTable.get(STATIC_ID);
    if (!currentSerials) throw new Error("Serials missing");
    
    const entryNo = String(currentSerials.journalEntry + 1);
    await serialsTable.update(STATIC_ID, { 'journalEntry': Number(entryNo) });

    const now = date || getLocalISODate();
    const ts = Date.now();

    const debit: JournalEntry = { id: crypto.randomUUID(), no: entryNo, date: now, accountId: dr, amount, type: 'DEBIT', sourceId: ref, createdAt: ts, entityType, entityId };
    const credit: JournalEntry = { id: crypto.randomUUID(), no: entryNo, date: now, accountId: cr, amount, type: 'CREDIT', sourceId: ref, createdAt: ts, entityType, entityId };
    
    await tx.table('journalEntries').bulkAdd([debit, credit]);
    return [debit, credit];
};

let isRebuilding = false;

/**
 * محرك الـ ERP اللحظي: إعادة بناء كشوف الأرصدة من واقع القيود
 */
export async function rebuildSnapshotsFromJournal(): Promise<void> {
    if (isRebuilding) {
        console.warn("Financial rebuild already in progress. Skipping concurrent run.");
        return;
    }
    isRebuilding = true;

    try {
        const [entries, settings, owners, properties, units, contracts, receipts, expenses, settlements] = await Promise.all([
            dbEngine.journalEntries.toArray(),
            dbEngine.settings.get(1),
            dbEngine.owners.toArray(),
            dbEngine.properties.toArray(),
            dbEngine.units.toArray(),
            dbEngine.contracts.toArray(),
            dbEngine.receipts.toArray(),
            dbEngine.expenses.toArray(),
            dbEngine.ownerSettlements.toArray()
        ]);

        if (!settings) throw new Error("Settings not found");

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        // 1. بناء خرائط الارتباط (Mapping)
        const sourceToOwner = new Map<string, string>();
        const unitToProp = new Map<string, Property | undefined>(units.map(u => [u.id, properties.find(p => p.id === u.propertyId)]));
        const contractToOwner = new Map<string, string | undefined>(contracts.map(c => [c.id, unitToProp.get(c.unitId)?.ownerId]));

        receipts.forEach(r => { const oid = contractToOwner.get(r.contractId); if(oid) sourceToOwner.set(r.id, oid as string); });
        expenses.forEach(e => { if(e.contractId) { const oid = contractToOwner.get(e.contractId); if(oid) sourceToOwner.set(e.id, oid as string); } });
        settlements.forEach(s => sourceToOwner.set(s.id, s.ownerId));

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        await (dbEngine as Dexie).transaction('rw', [
            dbEngine.ownerBalances, dbEngine.accountBalances, 
            dbEngine.kpiSnapshots, dbEngine.contractBalances, dbEngine.tenantBalances
        ], async (tx) => {
            const accMap = new Map<string, number>();
            const conMap = new Map<string, number>();
            const ownerMap = new Map<string, OwnerBalance>();

            owners.forEach(o => ownerMap.set(o.id, { ownerId: o.id, collections: 0, expenses: 0, settlements: 0, officeShare: 0, net: 0 }));

            const mappings = settings.accountMappings;

            entries.forEach(je => {
                // الحسابات العامة
                const curAcc = accMap.get(je.accountId) || 0;
                accMap.set(je.accountId, r3(curAcc + (je.type === 'DEBIT' ? je.amount : -je.amount)));

                // ذمم المستأجرين
                if (je.accountId === mappings.accountsReceivable && je.entityType === 'CONTRACT' && je.entityId) {
                    const curCon = conMap.get(je.entityId) || 0;
                    conMap.set(je.entityId, r3(curCon + (je.type === 'DEBIT' ? je.amount : -je.amount)));
                }

                // أرصدة الملاك والمكتب
                const ownerId = sourceToOwner.get(je.sourceId);
                if (ownerId && ownerMap.has(ownerId)) {
                    const b = ownerMap.get(ownerId)!;
                    if (je.accountId === mappings.ownersPayable) {
                        const amt = je.type === 'CREDIT' ? je.amount : -je.amount;
                        b.net = r3(b.net + amt);
                        
                        const isReceipt = receipts.some(r => r.id === je.sourceId);
                        const isExpense = expenses.some(e => e.id === je.sourceId);
                        const isSettlement = settlements.some(s => s.id === je.sourceId);

                        if (isReceipt) b.collections = r3(b.collections + (je.type === 'CREDIT' ? je.amount : 0));
                        else if (isExpense) b.expenses = r3(b.expenses + (je.type === 'DEBIT' ? je.amount : 0));
                        else if (isSettlement) b.settlements = r3(b.settlements + (je.type === 'DEBIT' ? je.amount : 0));
                    } else if (je.accountId === mappings.revenue.OFFICE_COMMISSION) {
                        // العمولات تزيد حصة المكتب
                        b.officeShare = r3(b.officeShare + je.amount);
                    }
                }
            });

            // تحديث نهائي
            await tx.table('accountBalances').clear();
            await tx.table('accountBalances').bulkPut(Array.from(accMap.entries()).map(([accountId, balance]) => ({ accountId, balance })));

            await tx.table('contractBalances').clear();
            await tx.table('contractBalances').bulkPut(Array.from(conMap.entries()).map(([contractId, balance]) => {
                const c = contracts.find(cx => cx.id === contractId);
                return { contractId, tenantId: c?.tenantId || '', unitId: c?.unitId || '', balance, depositBalance: 0, lastUpdatedAt: Date.now() };
            }));

            await tx.table('ownerBalances').clear();
            await tx.table('ownerBalances').bulkPut(Array.from(ownerMap.values()));

            await tx.table('kpiSnapshots').put({ 
                id: 'main', 
                totalOwnerNetBalance: r3(Array.from(ownerMap.values()).reduce((s, b) => s + b.net, 0)), 
                totalContractARBalance: r3(Array.from(conMap.values()).reduce((s, v) => s + v, 0)), 
                totalTenantARBalance: 0 
            });
        });

        // Save last rebuild time for diagnostics
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastFinancialRebuild', Date.now().toString());
        }
    } finally {
        isRebuilding = false;
    }
}
