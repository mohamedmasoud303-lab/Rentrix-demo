
import Dexie, { Transaction } from 'dexie';
import { toast } from 'react-hot-toast';
import { dbEngine } from './db';
import { Database, JournalEntry, Receipt, Invoice, User, Settings, Commission } from '../types';
import { dataService } from './dataService';
import { postJournalEntry, rebuildSnapshotsFromJournal } from './financialEngine';
import { formatCurrency, getLocalISODate, getLocalISOMonth } from '../utils/helpers';

const STATIC_ID = 1;

/**
 * إنشاء قيد عكسي لأي حركة مالية ملغاة
 */
const createReversingJE = async (tx: Transaction, sourceId: string) => {
    const entries: JournalEntry[] = await tx.table('journalEntries').where('sourceId').equals(sourceId).toArray();
    if (entries.length === 0) return;
    
    const governance = await tx.table('governance').get(STATIC_ID);
    const lockDate = governance?.financialLockDate ? new Date(governance.financialLockDate) : null;
    const today = new Date();

    if (lockDate && today <= lockDate) {
        throw new Error(`لا يمكن الإلغاء لأن الفترة المالية الحالية مقفلة.`);
    }

    const reversalDate = getLocalISODate(today);

    const groups = entries.reduce((acc, entry) => {
        if (!acc[entry.no]) acc[entry.no] = [];
        acc[entry.no].push(entry);
        return acc;
    }, {} as Record<string, JournalEntry[]>);

    for (const entryNo in groups) {
        const group = groups[entryNo];
        const debit = group.find(e => e.type === 'DEBIT');
        const credit = group.find(e => e.type === 'CREDIT');
        
        if (debit && credit) {
            await postJournalEntry(tx, { 
                dr: credit.accountId, 
                cr: debit.accountId, 
                amount: debit.amount, 
                ref: `${sourceId}-VOID`,
                date: reversalDate
            });
        }
    }
};

const voidReceipt = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
            const receipt = await tx.table('receipts').get(id);
            if (!receipt || receipt.status === 'VOID') return;
            
            // Idempotency: check if already voided in audit log or status
            if (receipt.status === 'VOID') return;

            await createReversingJE(tx, id);

            await tx.table('receipts').update(id, { status: 'VOID', voidedAt: Date.now() });
            await dataService.audit(user, 'VOID', 'receipts', id, `إلغاء سند القبض رقم ${receipt.no}`);
            
            const allocations = await tx.table('receiptAllocations').where({ receiptId: id }).toArray();
            if (allocations.length > 0) {
                const invoicesToUpdate = await tx.table('invoices').bulkGet(allocations.map(a => a.invoiceId));
                for (const invoice of invoicesToUpdate) {
                    if (!invoice) continue;
                    const allocation = allocations.find(a => a.invoiceId === invoice.id); if (!allocation) continue;
                    invoice.paidAmount = Math.max(0, invoice.paidAmount - allocation.amount);
                    invoice.status = invoice.paidAmount <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
                }
                await tx.table('invoices').bulkPut(invoicesToUpdate.filter(Boolean) as Invoice[]);
                await tx.table('receiptAllocations').where({ receiptId: id }).delete();
            }
        });
        toast.success('تم إلغاء السند وتحديث القيود المحاسبية.');
        await rebuildSnapshotsFromJournal();
    } catch (e: any) {
        toast.error(e.message || "فشل إلغاء السند.");
        console.error(e);
    }
};

const voidExpense = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.expenses, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
            await createReversingJE(tx, id);
            await tx.table('expenses').update(id, { status: 'VOID', voidedAt: Date.now() });
            await dataService.audit(user, 'VOID', 'expenses', id);
        });
        toast.success('تم إلغاء المصروف.');
        await rebuildSnapshotsFromJournal();
    } catch (e: any) { toast.error(e.message || "فشل الإلغاء."); }
};

const voidInvoice = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.invoices, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
            const invoice = await tx.table('invoices').get(id);
            if (!invoice) return;
            if (invoice.paidAmount > 0) {
                throw new Error("لا يمكن إلغاء فاتورة مسددة جزئياً. قم بإلغاء السندات أولاً.");
            }
            await createReversingJE(tx, id);
            await tx.table('invoices').update(id, { status: 'VOID', voidedAt: Date.now() });
            await dataService.audit(user, 'VOID', 'invoices', id);
        });
        toast.success('تم إلغاء الفاتورة.');
        await rebuildSnapshotsFromJournal();
    } catch (e: any) { toast.error(e.message || "فشل إلغاء الفاتورة."); }
};

// ... other functions remain unchanged
const addReceiptWithAllocations = async (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'no' | 'status'>, allocations: { invoiceId: string, amount: number }[], user: User | null | undefined, settings: Settings): Promise<void> => {
    let newReceiptNo = '';
    await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.journalEntries, dbEngine.auditLog, dbEngine.serials], async (tx) => {
        const governance = await tx.table('governance').get(STATIC_ID);
        const lockDate = governance?.financialLockDate ? new Date(governance.financialLockDate) : null;
        const entryDate = new Date(receiptData.dateTime.slice(0,10));
        if (lockDate && entryDate <= lockDate) {
            throw new Error(`الفترة المالية مغلقة حتى تاريخ ${lockDate.toLocaleDateString()}.`);
        }
        
        await tx.table('serials').where('id').equals(STATIC_ID).modify((s: any) => { s.receipt++; newReceiptNo = String(s.receipt); });
        const newReceipt: Receipt = { ...receiptData, id: crypto.randomUUID(), createdAt: Date.now(), no: newReceiptNo, status: 'POSTED' as const };
        await tx.table('receipts').add(newReceipt);
        const newAllocations = allocations.map(a => ({ id: crypto.randomUUID(), receiptId: newReceipt.id, ...a, createdAt: Date.now() }));
        await tx.table('receiptAllocations').bulkAdd(newAllocations);
        const invoicesToUpdate = await tx.table('invoices').bulkGet(allocations.map(a => a.invoiceId));
        for (const invoice of invoicesToUpdate) {
            if (!invoice) continue;
            const allocation = allocations.find(a => a.invoiceId === invoice.id); if (!allocation) continue;
            invoice.paidAmount += allocation.amount;
            invoice.status = (invoice.paidAmount >= (invoice.amount + (invoice.taxAmount || 0)) - 0.001) ? 'PAID' : 'PARTIALLY_PAID';
        }
        await tx.table('invoices').bulkPut(invoicesToUpdate as Invoice[]);
        const mappings = settings.accountMappings;
        await postJournalEntry(tx, { dr: mappings.paymentMethods[newReceipt.channel], cr: mappings.accountsReceivable, amount: newReceipt.amount, ref: newReceipt.id, entityType: 'CONTRACT', entityId: newReceipt.contractId, date: newReceipt.dateTime });
        await dataService.audit(user, 'CREATE', 'receipts', newReceipt.id, `إصدار سند قبض رقم ${newReceiptNo}`);
    });
    toast.success('تم تسجيل السند بنجاح.');
    await rebuildSnapshotsFromJournal();
};

export const financeService = {
    addReceiptWithAllocations,
    voidReceipt,
    voidExpense,
    voidInvoice,
    voidDepositTx: async (id: string, user: User | null | undefined) => {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.depositTxs, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
            await createReversingJE(tx, id);
            await tx.table('depositTxs').update(id, { status: 'VOID' });
        });
        toast.success("تم إلغاء حركة التأمين.");
        await rebuildSnapshotsFromJournal();
    },
    voidOwnerSettlement: async (id: string, user: User | null | undefined) => {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.ownerSettlements, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
            await createReversingJE(tx, id);
            await tx.table('ownerSettlements').update(id, { status: 'VOID' });
        });
        toast.success("تم إلغاء تسوية المالك.");
        await rebuildSnapshotsFromJournal();
    },
    generateMonthlyInvoices: async (user: User | null | undefined, settings: Settings): Promise<number> => {
        const today = new Date();
        const todayStr = getLocalISODate(today);
        const currentMonthYm = getLocalISOMonth(today);
        
        let count = 0;
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.contracts, dbEngine.invoices, dbEngine.auditLog, dbEngine.serials, dbEngine.journalEntries], async (tx) => {
            // 1. Generate missing invoices for active contracts (if any)
            const activeContracts = await tx.table('contracts').where('status').equals('ACTIVE').toArray();
            for (const c of activeContracts) {
                const dueDate = `${currentMonthYm}-${String(c.dueDay).padStart(2, '0')}`;
                const exists = await tx.table('invoices').where({ contractId: c.id, dueDate }).first();
                if (!exists) {
                    const tax = (c.rent * settings.taxRate) / 100;
                    await dataService.add('invoices', { contractId: c.id, dueDate, amount: c.rent, taxAmount: tax, paidAmount: 0, status: 'UNPAID', type: 'RENT', notes: `إيجار شهر ${today.getMonth() + 1}` }, user, settings);
                    count++;
                }
            }

            // 2. Update status to OVERDUE for unpaid invoices past due date
            const unpaid = await tx.table('invoices').where('status').anyOf(['UNPAID', 'PARTIALLY_PAID']).toArray();
            for (const inv of unpaid) {
                if (inv.dueDate < todayStr) {
                    await tx.table('invoices').update(inv.id, { status: 'OVERDUE' });
                    count++;
                }
            }
            
            await dataService.audit(user, 'SYSTEM', 'engine', 'all', 'توليد فواتير شهرية وتحديث المتأخرات');
        });
        
        return count;
    },
    generateNotifications: async (user: User | null | undefined, settings: Settings): Promise<number> => {
        const today = new Date();
        const alertThreshold = new Date();
        alertThreshold.setDate(today.getDate() + (settings.contractAlertDays || 30));
        
        let count = 0;
        
        // 1. تنبيهات العقود المنتهية أو التي قاربت على الانتهاء
        const contracts = await dbEngine.contracts.where('status').equals('ACTIVE').toArray();
        for (const c of contracts) {
            const endDate = new Date(c.end);
            if (endDate <= alertThreshold) {
                const tenant = await dbEngine.tenants.get(c.tenantId);
                const unit = await dbEngine.units.get(c.unitId);
                const exists = await dbEngine.outgoingNotifications.where({ 
                    recipientContact: tenant?.phone || '', 
                    type: 'CONTRACT_EXPIRY',
                    refId: c.id 
                }).first();
                
                if (!exists && tenant) {
                    const message = `عزيزي ${tenant.name}، نود تذكيركم بأن عقد إيجار الوحدة (${unit?.name}) سينتهي بتاريخ ${c.end}. يرجى التواصل معنا للتجديد.`;
                    await dataService.add('outgoingNotifications', {
                        recipientName: tenant.name,
                        recipientContact: tenant.phone,
                        message,
                        type: 'CONTRACT_EXPIRY',
                        status: 'PENDING',
                        refId: c.id
                    }, user, settings);
                    count++;
                }
            }
        }
        
        // 2. تنبيهات الفواتير المتأخرة
        const overdueInvoices = await dbEngine.invoices.where('status').equals('OVERDUE').toArray();
        for (const inv of overdueInvoices) {
            const contract = await dbEngine.contracts.get(inv.contractId);
            const tenant = contract ? await dbEngine.tenants.get(contract.tenantId) : null;
            const unit = contract ? await dbEngine.units.get(contract.unitId) : null;
            
            const exists = await dbEngine.outgoingNotifications.where({ 
                recipientContact: tenant?.phone || '', 
                type: 'INVOICE_OVERDUE',
                refId: inv.id 
            }).first();
            
            if (!exists && tenant) {
                const balance = inv.amount + (inv.taxAmount || 0) - inv.paidAmount;
                const message = `عزيزي ${tenant.name}، نود تذكيركم بوجود فاتورة مستحقة للوحدة (${unit?.name}) بمبلغ ${formatCurrency(balance)}، استحقت بتاريخ ${inv.dueDate}. يرجى السداد في أقرب وقت.`;
                await dataService.add('outgoingNotifications', {
                    recipientName: tenant.name,
                    recipientContact: tenant.phone,
                    message,
                    type: 'INVOICE_OVERDUE',
                    status: 'PENDING',
                    refId: inv.id
                }, user, settings);
                count++;
            }
        }
        
        return count;
    },
    createContract: async (contractData: any, user: User | null | undefined): Promise<any> => {
        let result;
        // Idempotency check: prevent duplicate contracts for same unit/tenant in same period
        const existing = await dbEngine.contracts
            .where({ unitId: contractData.unitId, tenantId: contractData.tenantId })
            .filter(c => c.start === contractData.start && c.status === 'ACTIVE')
            .first();
        if (existing) {
            toast.error("هذا العقد موجود بالفعل.");
            return existing;
        }

        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.contracts, dbEngine.units, dbEngine.invoices, dbEngine.auditLog, dbEngine.serials], async (tx) => {
            const { unitId, tenantId, start, end, rent: totalAmount, paymentCycle = 'Monthly' } = contractData;
            
            // 1) Check unit status
            const unit = await tx.table('units').get(unitId);
            if (!unit) throw new Error('الوحدة غير موجودة');
            if (unit.status !== 'AVAILABLE') throw new Error('الوحدة غير متاحة للتأجير');

            // 2) Insert contract
            const contractId = crypto.randomUUID();
            const contract = { ...contractData, id: contractId, status: 'ACTIVE', createdAt: Date.now() };
            await tx.table('contracts').add(contract);

            // 3) Update unit status -> "OCCUPIED"
            await tx.table('units').update(unitId, { status: 'OCCUPIED' });

            // 4) Auto-generate installments
            const startDate = new Date(start);
            const endDate = new Date(end);
            let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
            if (endDate.getDate() >= startDate.getDate()) months++;
            
            let count = 1;
            if (paymentCycle === 'Monthly') count = months;
            else if (paymentCycle === 'Quarterly') count = Math.ceil(months / 3);
            else if (paymentCycle === 'Annual') count = Math.ceil(months / 12);
            
            if (count <= 0) count = 1;

            const base = Math.floor((totalAmount / count) * 100) / 100;
            let sum = 0;
            
            for (let i = 0; i < count; i++) {
                let amount = base;
                if (i === count - 1) {
                    amount = Math.round((totalAmount - sum) * 100) / 100;
                }
                sum += amount;
                
                const dueDate = new Date(startDate);
                if (paymentCycle === 'Monthly') dueDate.setMonth(startDate.getMonth() + i);
                else if (paymentCycle === 'Quarterly') dueDate.setMonth(startDate.getMonth() + (i * 3));
                else if (paymentCycle === 'Annual') dueDate.setFullYear(startDate.getFullYear() + i);
                
                const invoiceId = crypto.randomUUID();
                let newInvoiceNo = '';
                await tx.table('serials').where('id').equals(STATIC_ID).modify((s: any) => { s.invoice++; newInvoiceNo = String(s.invoice); });

                const invoice = {
                    id: invoiceId,
                    contractId,
                    no: newInvoiceNo,
                    type: 'RENT',
                    amount,
                    paidAmount: 0,
                    dueDate: getLocalISODate(dueDate),
                    status: 'UNPAID',
                    notes: `دفعة إيجار رقم ${i + 1}`,
                    createdAt: Date.now()
                };
                await tx.table('invoices').add(invoice);
            }

            // 5) Write audit log
            await dataService.audit(user, 'CREATE', 'contracts', contractId, 'تم إنشاء عقد جديد');
            result = contract;
        });
        toast.success('تم إنشاء العقد وتوليد الفواتير بنجاح.');
        return result;
    },
    payInstallment: async (invoiceId: string, paymentDate: string, user: User | null | undefined, settings: Settings, receiptNo?: string, amount?: number): Promise<any> => {
        let resultReceipt;
        // Idempotency: check if invoice is already paid
        const invCheck = await dbEngine.invoices.get(invoiceId);
        if (invCheck?.status === 'PAID') {
            toast.error("هذه الفاتورة مدفوعة مسبقاً.");
            return null;
        }

        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.journalEntries, dbEngine.auditLog, dbEngine.serials], async (tx) => {
            const invoice = await tx.table('invoices').get(invoiceId);
            if (!invoice) throw new Error('الفاتورة غير موجودة');
            if (invoice.status === 'PAID') throw new Error('الفاتورة مدفوعة مسبقاً');
            
            // 1) Get Serial
            let newReceiptNo = receiptNo;
            if (!newReceiptNo) {
                await tx.table('serials').where('id').equals(STATIC_ID).modify((s: any) => { s.receipt++; newReceiptNo = String(s.receipt); });
            }

            // 2) Insert receipt
            const receiptId = crypto.randomUUID();
            const receipt: Receipt = {
                id: receiptId,
                no: newReceiptNo!,
                contractId: invoice.contractId,
                dateTime: paymentDate + 'T12:00:00',
                amount: amount || (invoice.amount + (invoice.taxAmount || 0) - invoice.paidAmount),
                channel: 'CASH',
                status: 'POSTED',
                createdAt: Date.now(),
                notes: `سداد فاتورة رقم ${invoice.no || ''}`,
                ref: ''
            };
            await tx.table('receipts').add(receipt);

            // 3) Create Allocation
            const allocId = crypto.randomUUID();
            await tx.table('receiptAllocations').add({
                id: allocId,
                receiptId,
                invoiceId,
                amount: receipt.amount,
                createdAt: Date.now()
            });

            // 4) Update Invoice
            invoice.paidAmount += receipt.amount;
            invoice.status = (invoice.paidAmount >= (invoice.amount + (invoice.taxAmount || 0)) - 0.001) ? 'PAID' : 'PARTIALLY_PAID';
            await tx.table('invoices').put(invoice);

            // 5) Journal Entry
            const mappings = settings.accountMappings;
            await postJournalEntry(tx, { 
                dr: mappings.paymentMethods[receipt.channel], 
                cr: mappings.accountsReceivable, 
                amount: receipt.amount, 
                ref: receipt.id, 
                entityType: 'CONTRACT', 
                entityId: receipt.contractId, 
                date: receipt.dateTime 
            });

            // 6) Audit
            await dataService.audit(user, 'CREATE', 'receipts', receiptId, `تحصيل فاتورة رقم ${invoice.no || ''}`);
            resultReceipt = receipt;
        });
        toast.success('تم تسجيل الدفعة بنجاح.');
        await rebuildSnapshotsFromJournal();
        return resultReceipt;
    },
    addManualJournalVoucher: async (data: any, user: User | null | undefined): Promise<void> => {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.governance, dbEngine.journalEntries, dbEngine.auditLog, dbEngine.serials], async (tx) => {
            const { dr, cr, amount, date, notes } = data;
            await postJournalEntry(tx, { dr, cr, amount, ref: 'MANUAL', date, entityType: undefined, entityId: undefined });
            await dataService.audit(user, 'CREATE', 'journalEntries', 'MANUAL', `قيد يدوي: ${notes}`);
        });
        toast.success('تم إضافة القيد المحاسبي بنجاح.');
        await rebuildSnapshotsFromJournal();
    },
    payoutCommission: async (id: string, user: User | null | undefined) => {
        await (dbEngine as Dexie).transaction('rw', [dbEngine.commissions, dbEngine.auditLog], async (tx) => {
            const comm = await tx.table('commissions').get(id);
            if (!comm) throw new Error('العمولة غير موجودة');
            if (comm.status === 'PAID') throw new Error('العمولة مدفوعة مسبقاً');
            
            await tx.table('commissions').update(id, { status: 'PAID', paidAt: Date.now() });
            await dataService.audit(user, 'UPDATE', 'commissions', id, 'صرف عمولة');
        });
        toast.success('تم صرف العمولة بنجاح.');
    }
};
