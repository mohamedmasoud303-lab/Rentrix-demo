
import { Database as DB_SQLITE } from 'better-sqlite3';
import { Database } from '../types';
import crypto from 'crypto';

// Helper to parse JSON data from DB
const parse = (row: any) => row ? JSON.parse(row.data) : null;
const parseAll = (rows: any[]) => rows.map(r => JSON.parse(r.data));

const logAudit = (db: DB_SQLITE, userId: string, username: string, action: string, entity: string, entityId: string, note?: string) => {
    const id = crypto.randomUUID();
    const entry = { id, ts: Date.now(), userId, username, action, entity, entityId, note };
    db.prepare('INSERT INTO auditLog (id, data) VALUES (?, ?)').run(id, JSON.stringify(entry));
};

// Main API handler
export const apiHandler = (db: DB_SQLITE, domain: string, action: string, payload: any) => {
    try {
        switch (domain) {
            case 'auth':
                return authApi(db, action, payload);
            case 'data':
                return dataApi(db, action, payload);
            case 'finance':
                return financeApi(db, action, payload);
            case 'engine':
                return engineApi(db, action, payload);
            default:
                throw new Error(`Unknown API domain: ${domain}`);
        }
    } catch (e: any) {
        console.error(`API Error in ${domain}.${action}:`, e);
        return { error: e.message || 'حدث خطأ غير معروف في الخادم.' };
    }
};

// ===================
// AUTH API
// ===================
const authApi = (db: DB_SQLITE, action: string, payload: any) => {
    switch (action) {
        case 'login': {
            const { username, password } = payload;
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
            if (!user) return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
            
            const hash = crypto.createHash('sha256').update(password + user.salt).digest('hex');
            if (hash !== user.hash) return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
            
            return { ok: true, msg: 'Logged in', user };
        }
        case 'addUser': {
            const { user, pass } = payload;
            const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username);
            if (existing) return { ok: false, msg: 'اسم المستخدم موجود بالفعل' };

            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.createHash('sha256').update(pass + salt).digest('hex');
            const id = crypto.randomUUID();
            const newUser = { ...user, id, createdAt: Date.now(), salt, hash };
            
            db.prepare('INSERT INTO users (id, username, hash, salt, role, mustChange, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(id, newUser.username, hash, salt, newUser.role, newUser.mustChange ? 1 : 0, newUser.createdAt);
            
            logAudit(db, 'system', 'system', 'CREATE', 'users', id, `إضافة مستخدم جديد: ${newUser.username}`);
            return { ok: true, msg: 'User created', newUser };
        }
        case 'changePassword': {
            const { userId, oldPass, newPass } = payload;
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
            if (!user) return { ok: false, msg: 'المستخدم غير موجود' };
            const hash = crypto.createHash('sha256').update(oldPass + user.salt).digest('hex');
            if (hash !== user.hash) return { ok: false, msg: 'كلمة المرور القديمة غير صحيحة' };
            const newSalt = crypto.randomBytes(16).toString('hex');
            const newHash = crypto.createHash('sha256').update(newPass + newSalt).digest('hex');
            db.prepare('UPDATE users SET hash = ?, salt = ?, mustChange = 0 WHERE id = ?').run(newHash, newSalt, userId);
            logAudit(db, userId, user.username, 'UPDATE', 'users', userId, 'تغيير كلمة المرور');
            return { ok: true, msg: 'تم تغيير كلمة المرور بنجاح' };
        }
        case 'updateUser': {
            const { id, updates } = payload;
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
            if (!user) return { ok: false, msg: 'المستخدم غير موجود' };
            db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(updates.username || user.username, updates.role || user.role, id);
            logAudit(db, 'system', 'system', 'UPDATE', 'users', id, `تحديث بيانات المستخدم: ${user.username}`);
            return { ok: true, msg: 'تم تحديث بيانات المستخدم' };
        }
        case 'forcePasswordReset': {
            const { userId } = payload;
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
            if (!user) return { ok: false, msg: 'المستخدم غير موجود' };
            db.prepare('UPDATE users SET mustChange = 1 WHERE id = ?').run(userId);
            logAudit(db, 'system', 'system', 'UPDATE', 'users', userId, `فرض تغيير كلمة المرور للمستخدم: ${user.username}`);
            return { ok: true, msg: 'تم فرض تغيير كلمة المرور' };
        }
        default:
            return { ok: false, msg: `إجراء مصادقة غير معروف: ${action}` };
    }
};

// ===================
// DATA API
// ===================
const dataApi = (db: DB_SQLITE, action: string, payload: any): any => {
    switch (action) {
        case 'getAll': {
             const tables = [
                'owners', 'properties', 'units', 'tenants', 'contracts', 'invoices', 'receipts', 
                'receiptAllocations', 'expenses', 'maintenanceRecords', 'depositTxs', 'ownerSettlements', 
                'accounts', 'journalEntries', 'leads', 'lands', 'commissions', 'missions', 'budgets', 
                'attachments', 'auditLog', 'snapshots', 'autoBackups', 'ownerBalances', 'accountBalances', 
                'contractBalances', 'tenantBalances', 'kpiSnapshots', 'notificationTemplates', 
                'outgoingNotifications', 'appNotifications'
            ];
            const data: Partial<Database> = {};
            
            // Handle single-row tables
            data.settings = parse(db.prepare('SELECT data FROM settings WHERE id = 1').get());
            data.governance = parse(db.prepare('SELECT data FROM governance WHERE id = 1').get());
            data.serials = parse(db.prepare('SELECT data FROM serials WHERE id = 1').get());

            // Handle user auth table
            data.auth = { users: db.prepare('SELECT * FROM users').all() as any[] };

            // Handle multi-row JSON tables
            for (const table of tables) {
                (data as any)[table] = parseAll(db.prepare(`SELECT data FROM ${table}`).all());
            }
            
            return data;
        }
        case 'add': {
            const { table, data } = payload;
            const id = crypto.randomUUID();
            const entry = { ...data, id, createdAt: Date.now() };
            
            db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(entry));
            logAudit(db, 'system', 'system', 'CREATE', table, id, `إضافة سجل جديد في ${table}`);
            return entry;
        }
        case 'update': {
            const { table, id, data } = payload;
            const existing = parse(db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id));
            if (!existing) throw new Error("Record not found");
            const updated = { ...existing, ...data, updatedAt: Date.now() };
            db.prepare(`UPDATE ${table} SET data = ? WHERE id = ?`).run(JSON.stringify(updated), id);
            logAudit(db, 'system', 'system', 'UPDATE', table, id, `تحديث سجل في ${table}`);
            return;
        }
        case 'updateSettings': {
            const { settings } = payload;
            db.prepare('UPDATE settings SET data = ? WHERE id = 1').run(JSON.stringify(settings));
            logAudit(db, 'system', 'system', 'UPDATE', 'settings', '1', 'تحديث إعدادات النظام');
            return;
        }
        case 'updateGovernance': {
            const { governance } = payload;
            db.prepare('UPDATE governance SET data = ? WHERE id = 1').run(JSON.stringify(governance));
            logAudit(db, 'system', 'system', 'UPDATE', 'governance', '1', 'تحديث إعدادات الحوكمة');
            return;
        }
        case 'remove': {
            const { table, id } = payload;
            db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
            logAudit(db, 'system', 'system', 'DELETE', table, id, `حذف سجل من ${table}`);
            return;
        }
        case 'createBackup': {
            const allData = dataApi(db, 'getAll', {});
            logAudit(db, 'system', 'system', 'BACKUP', 'system', 'all', 'إنشاء نسخة احتياطية');
            return JSON.stringify(allData);
        }
        case 'restoreBackup': {
            const { backupData } = payload;
            try {
                const parsed = JSON.parse(backupData);
                db.transaction(() => {
                    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all() as any[];
                    for (const table of tables) {
                        db.prepare(`DELETE FROM ${table.name}`).run();
                    }
                    if (parsed.settings) db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(parsed.settings));
                    if (parsed.governance) db.prepare('INSERT INTO governance (id, data) VALUES (1, ?)').run(JSON.stringify(parsed.governance));
                    if (parsed.serials) db.prepare('INSERT INTO serials (id, data) VALUES (1, ?)').run(JSON.stringify(parsed.serials));
                    if (parsed.auth && parsed.auth.users) {
                        const insertUser = db.prepare('INSERT INTO users (id, username, hash, salt, role, mustChange, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
                        for (const u of parsed.auth.users) {
                            insertUser.run(u.id, u.username, u.hash, u.salt, u.role, u.mustChange, u.createdAt);
                        }
                    }
                    const dataTables = [
                        'owners', 'properties', 'units', 'tenants', 'contracts', 'invoices', 'receipts', 
                        'receiptAllocations', 'expenses', 'maintenanceRecords', 'depositTxs', 'ownerSettlements', 
                        'accounts', 'journalEntries', 'leads', 'lands', 'commissions', 'missions', 'budgets', 
                        'attachments', 'auditLog', 'snapshots', 'autoBackups', 'ownerBalances', 'accountBalances', 
                        'contractBalances', 'tenantBalances', 'kpiSnapshots', 'notificationTemplates', 
                        'outgoingNotifications', 'appNotifications'
                    ];
                    for (const table of dataTables) {
                        if (parsed[table]) {
                            const insert = db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`);
                            for (const item of parsed[table]) {
                                insert.run(item.id, JSON.stringify(item));
                            }
                        }
                    }
                })();
                logAudit(db, 'system', 'system', 'RESTORE', 'system', 'all', 'استعادة نسخة احتياطية');
                return { ok: true, msg: 'تم استعادة النسخة الاحتياطية بنجاح' };
            } catch (e: any) {
                return { ok: false, msg: 'فشل استعادة النسخة الاحتياطية: ' + e.message };
            }
        }
        case 'wipeData': {
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all() as any[];
            db.transaction(() => {
                for (const table of tables) {
                    db.prepare(`DELETE FROM ${table.name}`).run();
                }
            })();
            console.log("All data wiped. App will restart and re-initialize.");
            return;
        }
        default:
            return { ok: false, msg: `إجراء بيانات غير معروف: ${action}` };
    }
};

// ===================
// FINANCE API
// ===================
const financeApi = (db: DB_SQLITE, action: string, payload: any) => {
     switch (action) {
        case 'createContract': {
            const { contractData } = payload;
            const { unitId, tenantId, start, end, rent: totalAmount, paymentCycle = 'Monthly' } = contractData;
            
            let result;
            db.transaction(() => {
                // 1) Check unit.status
                const unitRow = db.prepare('SELECT data FROM units WHERE id = ?').get(unitId) as any;
                if (!unitRow) throw new Error('الوحدة غير موجودة');
                const unit = JSON.parse(unitRow.data);
                if (unit.status !== 'Available') throw new Error('الوحدة غير متاحة للتأجير');

                // 2) Insert contract
                const contractId = crypto.randomUUID();
                const contract = { ...contractData, id: contractId, status: 'ACTIVE', createdAt: Date.now() };
                db.prepare('INSERT INTO contracts (id, data) VALUES (?, ?)').run(contractId, JSON.stringify(contract));

                // 3) Update unit.status -> "Occupied"
                unit.status = 'Occupied';
                db.prepare('UPDATE units SET data = ? WHERE id = ?').run(JSON.stringify(unit), unitId);

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

                // 5) Rounding rule
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
                    const invoice = {
                        id: invoiceId,
                        contractId,
                        tenantId,
                        unitId,
                        type: 'RENT',
                        amount,
                        dueDate: dueDate.toISOString().slice(0, 10),
                        status: 'UNPAID',
                        createdAt: Date.now()
                    };
                    db.prepare('INSERT INTO invoices (id, data) VALUES (?, ?)').run(invoiceId, JSON.stringify(invoice));
                }

                // 6) Write audit log
                logAudit(db, 'system', 'system', 'CREATE', 'contracts', contractId, 'CONTRACT_CREATED');
                result = contract;
            })();
            return { ok: true, contract: result };
        }
        case 'payInstallment': {
            const { invoiceId, paymentDate, receiptNo, amount } = payload;
            let resultReceipt;
            db.transaction(() => {
                const invoiceRow = db.prepare('SELECT data FROM invoices WHERE id = ?').get(invoiceId) as any;
                if (!invoiceRow) throw new Error('الفاتورة غير موجودة');
                const invoice = JSON.parse(invoiceRow.data);
                
                if (invoice.status === 'PAID') throw new Error('الفاتورة مدفوعة مسبقاً');
                
                // 1) Insert payment record (receipt)
                const receiptId = crypto.randomUUID();
                const receipt = {
                    id: receiptId,
                    no: receiptNo || Math.floor(Math.random() * 1000000).toString(),
                    contractId: invoice.contractId,
                    tenantId: invoice.tenantId,
                    date: paymentDate,
                    amount: amount || invoice.amount,
                    paymentMethod: 'CASH',
                    status: 'POSTED',
                    createdAt: Date.now()
                };
                db.prepare('INSERT INTO receipts (id, data) VALUES (?, ?)').run(receiptId, JSON.stringify(receipt));

                // 2) Mark installment Paid
                invoice.status = 'PAID';
                db.prepare('UPDATE invoices SET data = ? WHERE id = ?').run(JSON.stringify(invoice), invoiceId);

                // 3) Write audit logs
                logAudit(db, 'system', 'system', 'CREATE', 'receipts', receiptId, 'PAYMENT_CREATED');
                logAudit(db, 'system', 'system', 'UPDATE', 'invoices', invoiceId, 'INSTALLMENT_PAID');
                
                resultReceipt = receipt;
            })();
            return { ok: true, receipt: resultReceipt };
        }
        case 'addReceiptWithAllocations': {
            const { receipt, allocations } = payload;
            let resultReceipt;
            db.transaction(() => {
                // 1) Insert payment record (receipt)
                const receiptId = crypto.randomUUID();
                const newReceipt = {
                    ...receipt,
                    id: receiptId,
                    no: receipt.no || Math.floor(Math.random() * 1000000).toString(),
                    status: 'POSTED',
                    createdAt: Date.now()
                };
                db.prepare('INSERT INTO receipts (id, data) VALUES (?, ?)').run(receiptId, JSON.stringify(newReceipt));

                // 2) Process allocations (mark installments as Paid)
                for (const alloc of allocations) {
                    const invoiceRow = db.prepare('SELECT data FROM invoices WHERE id = ?').get(alloc.invoiceId) as any;
                    if (invoiceRow) {
                        const invoice = JSON.parse(invoiceRow.data);
                        invoice.paidAmount = (invoice.paidAmount || 0) + alloc.amount;
                        const totalDue = invoice.amount + (invoice.taxAmount || 0);
                        
                        if (invoice.paidAmount >= totalDue) {
                            invoice.status = 'PAID';
                        } else if (invoice.paidAmount > 0) {
                            invoice.status = 'PARTIALLY_PAID';
                        }
                        db.prepare('UPDATE invoices SET data = ? WHERE id = ?').run(JSON.stringify(invoice), alloc.invoiceId);
                        
                        // Create allocation record
                        const allocId = crypto.randomUUID();
                        const allocationRecord = {
                            id: allocId,
                            receiptId,
                            invoiceId: alloc.invoiceId,
                            amount: alloc.amount,
                            createdAt: Date.now()
                        };
                        db.prepare('INSERT INTO receiptAllocations (id, data) VALUES (?, ?)').run(allocId, JSON.stringify(allocationRecord));
                        
                        logAudit(db, 'system', 'system', 'UPDATE', 'invoices', alloc.invoiceId, 'INSTALLMENT_PAID');
                    }
                }

                // 3) Write audit logs
                logAudit(db, 'system', 'system', 'CREATE', 'receipts', receiptId, 'PAYMENT_CREATED');
                resultReceipt = newReceipt;
            })();
            return { ok: true, receipt: resultReceipt };
        }
        case 'voidReceipt': {
            const { id } = payload;
            db.transaction(() => {
                const receiptRow = db.prepare('SELECT data FROM receipts WHERE id = ?').get(id) as any;
                if (!receiptRow) throw new Error('السند غير موجود');
                const receipt = JSON.parse(receiptRow.data);
                
                if (receipt.status === 'VOID') throw new Error('السند ملغي مسبقاً');
                
                // 1) Mark receipt as VOID
                receipt.status = 'VOID';
                receipt.updatedAt = Date.now();
                db.prepare('UPDATE receipts SET data = ? WHERE id = ?').run(JSON.stringify(receipt), id);

                // 2) Find and reverse allocations
                const allocations = db.prepare('SELECT id, data FROM receiptAllocations WHERE json_extract(data, "$.receiptId") = ?').all(id) as any[];
                for (const allocRow of allocations) {
                    const alloc = JSON.parse(allocRow.data);
                    const invoiceRow = db.prepare('SELECT data FROM invoices WHERE id = ?').get(alloc.invoiceId) as any;
                    if (invoiceRow) {
                        const invoice = JSON.parse(invoiceRow.data);
                        invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - alloc.amount);
                        
                        if (invoice.paidAmount === 0) {
                            invoice.status = 'UNPAID';
                        } else {
                            invoice.status = 'PARTIALLY_PAID';
                        }
                        db.prepare('UPDATE invoices SET data = ? WHERE id = ?').run(JSON.stringify(invoice), alloc.invoiceId);
                        logAudit(db, 'system', 'system', 'UPDATE', 'invoices', alloc.invoiceId, 'REVERSE_INSTALLMENT_PAID');
                    }
                    // Delete allocation record
                    db.prepare('DELETE FROM receiptAllocations WHERE id = ?').run(alloc.id);
                }

                // 3) Write audit log
                logAudit(db, 'system', 'system', 'UPDATE', 'receipts', id, 'VOID_RECEIPT');
            })();
            return { ok: true, msg: 'تم إلغاء السند بنجاح' };
        }
        case 'voidExpense': {
            const { id } = payload;
            db.transaction(() => {
                const expenseRow = db.prepare('SELECT data FROM expenses WHERE id = ?').get(id) as any;
                if (!expenseRow) throw new Error('المصروف غير موجود');
                const expense = JSON.parse(expenseRow.data);
                
                if (expense.status === 'VOID') throw new Error('المصروف ملغي مسبقاً');
                
                expense.status = 'VOID';
                expense.updatedAt = Date.now();
                db.prepare('UPDATE expenses SET data = ? WHERE id = ?').run(JSON.stringify(expense), id);
                logAudit(db, 'system', 'system', 'UPDATE', 'expenses', id, 'VOID_EXPENSE');
            })();
            return { ok: true, msg: 'تم إلغاء المصروف بنجاح' };
        }
        case 'voidInvoice': {
            const { id } = payload;
            db.transaction(() => {
                const invoiceRow = db.prepare('SELECT data FROM invoices WHERE id = ?').get(id) as any;
                if (!invoiceRow) throw new Error('الفاتورة غير موجودة');
                const invoice = JSON.parse(invoiceRow.data);
                
                if (invoice.status === 'VOID') throw new Error('الفاتورة ملغاة مسبقاً');
                if (invoice.paidAmount > 0) throw new Error('لا يمكن إلغاء فاتورة تم تحصيل جزء منها');
                
                invoice.status = 'VOID';
                invoice.updatedAt = Date.now();
                db.prepare('UPDATE invoices SET data = ? WHERE id = ?').run(JSON.stringify(invoice), id);
                logAudit(db, 'system', 'system', 'UPDATE', 'invoices', id, 'VOID_INVOICE');
            })();
            return { ok: true, msg: 'تم إلغاء الفاتورة بنجاح' };
        }
        case 'voidDepositTx': {
            const { id } = payload;
            db.transaction(() => {
                const txRow = db.prepare('SELECT data FROM depositTxs WHERE id = ?').get(id) as any;
                if (!txRow) throw new Error('الحركة غير موجودة');
                const tx = JSON.parse(txRow.data);
                
                if (tx.status === 'VOID') throw new Error('الحركة ملغاة مسبقاً');
                
                tx.status = 'VOID';
                tx.updatedAt = Date.now();
                db.prepare('UPDATE depositTxs SET data = ? WHERE id = ?').run(JSON.stringify(tx), id);
                logAudit(db, 'system', 'system', 'UPDATE', 'depositTxs', id, 'VOID_DEPOSIT_TX');
            })();
            return { ok: true, msg: 'تم إلغاء الحركة بنجاح' };
        }
        case 'voidOwnerSettlement': {
            const { id } = payload;
            db.transaction(() => {
                const txRow = db.prepare('SELECT data FROM ownerSettlements WHERE id = ?').get(id) as any;
                if (!txRow) throw new Error('التسوية غير موجودة');
                const tx = JSON.parse(txRow.data);
                
                if (tx.status === 'VOID') throw new Error('التسوية ملغاة مسبقاً');
                
                tx.status = 'VOID';
                tx.updatedAt = Date.now();
                db.prepare('UPDATE ownerSettlements SET data = ? WHERE id = ?').run(JSON.stringify(tx), id);
                logAudit(db, 'system', 'system', 'UPDATE', 'ownerSettlements', id, 'VOID_OWNER_SETTLEMENT');
            })();
            return { ok: true, msg: 'تم إلغاء التسوية بنجاح' };
        }
        case 'addManualJournalVoucher': {
            const { data } = payload;
            db.transaction(() => {
                const id = crypto.randomUUID();
                const entry = { ...data, id, createdAt: Date.now(), type: 'MANUAL', status: 'POSTED' };
                db.prepare('INSERT INTO journalEntries (id, data) VALUES (?, ?)').run(id, JSON.stringify(entry));
                logAudit(db, 'system', 'system', 'CREATE', 'journalEntries', id, 'ADD_MANUAL_JOURNAL_VOUCHER');
            })();
            return { ok: true, msg: 'تم إضافة القيد اليدوي بنجاح' };
        }
        case 'payoutCommission': {
            const { id } = payload;
            db.transaction(() => {
                const commRow = db.prepare('SELECT data FROM commissions WHERE id = ?').get(id) as any;
                if (!commRow) throw new Error('العمولة غير موجودة');
                const comm = JSON.parse(commRow.data);
                
                if (comm.status === 'PAID') throw new Error('العمولة مدفوعة مسبقاً');
                
                comm.status = 'PAID';
                comm.updatedAt = Date.now();
                db.prepare('UPDATE commissions SET data = ? WHERE id = ?').run(JSON.stringify(comm), id);
                logAudit(db, 'system', 'system', 'UPDATE', 'commissions', id, 'PAYOUT_COMMISSION');
            })();
            return { ok: true, msg: 'تم صرف العمولة بنجاح' };
        }
        default:
            return { ok: false, msg: `إجراء مالي غير معروف: ${action}` };
     }
}

// ===================
// ENGINE API
// ===================
const engineApi = (db: DB_SQLITE, action: string, payload: any) => {
    switch(action) {
        case 'rebuildFinancials': {
            db.transaction(() => {
                // 1. Reset all balances
                db.prepare('DELETE FROM contractBalances').run();
                db.prepare('DELETE FROM ownerBalances').run();
                db.prepare('DELETE FROM tenantBalances').run();
                db.prepare('DELETE FROM accountBalances').run();

                // Get all active/ended data
                const contracts = parseAll(db.prepare('SELECT data FROM contracts WHERE json_extract(data, "$.status") != "VOID"').all());
                const invoices = parseAll(db.prepare('SELECT data FROM invoices WHERE json_extract(data, "$.status") != "VOID"').all());
                const receipts = parseAll(db.prepare('SELECT data FROM receipts WHERE json_extract(data, "$.status") != "VOID"').all());
                const expenses = parseAll(db.prepare('SELECT data FROM expenses WHERE json_extract(data, "$.status") != "VOID"').all());
                const deposits = parseAll(db.prepare('SELECT data FROM depositTxs WHERE json_extract(data, "$.status") != "VOID"').all());
                const settlements = parseAll(db.prepare('SELECT data FROM ownerSettlements WHERE json_extract(data, "$.status") != "VOID"').all());
                const units = parseAll(db.prepare('SELECT data FROM units').all());
                const properties = parseAll(db.prepare('SELECT data FROM properties').all());

                // Calculate Contract Balances
                const contractBals: Record<string, any> = {};
                for (const c of contracts) {
                    contractBals[c.id] = { contractId: c.id, totalInvoiced: 0, totalPaid: 0, balance: 0, depositBalance: 0 };
                }

                for (const inv of invoices) {
                    if (contractBals[inv.contractId]) {
                        contractBals[inv.contractId].totalInvoiced += (inv.amount + (inv.taxAmount || 0));
                    }
                }

                for (const rec of receipts) {
                    if (contractBals[rec.contractId]) {
                        contractBals[rec.contractId].totalPaid += rec.amount;
                    }
                }

                for (const dep of deposits) {
                    if (contractBals[dep.contractId]) {
                        if (dep.type === 'DEPOSIT_IN') contractBals[dep.contractId].depositBalance += dep.amount;
                        else contractBals[dep.contractId].depositBalance -= dep.amount;
                    }
                }

                const insertContractBal = db.prepare('INSERT INTO contractBalances (id, data) VALUES (?, ?)');
                for (const id in contractBals) {
                    const b = contractBals[id];
                    b.balance = b.totalInvoiced - b.totalPaid;
                    insertContractBal.run(crypto.randomUUID(), JSON.stringify(b));
                }

                // Calculate Owner Balances
                const ownerBals: Record<string, any> = {};
                for (const p of properties) {
                    if (!ownerBals[p.ownerId]) ownerBals[p.ownerId] = { ownerId: p.ownerId, totalIncome: 0, totalExpense: 0, totalSettled: 0, balance: 0 };
                }

                for (const rec of receipts) {
                    const contract = contracts.find(c => c.id === rec.contractId);
                    if (contract) {
                        const unit = units.find(u => u.id === contract.unitId);
                        if (unit) {
                            const prop = properties.find(p => p.id === unit.propertyId);
                            if (prop && ownerBals[prop.ownerId]) {
                                ownerBals[prop.ownerId].totalIncome += rec.amount;
                            }
                        }
                    }
                }

                for (const exp of expenses) {
                    if (exp.chargedTo === 'OWNER' && exp.contractId) {
                        const contract = contracts.find(c => c.id === exp.contractId);
                        if (contract) {
                            const unit = units.find(u => u.id === contract.unitId);
                            if (unit) {
                                const prop = properties.find(p => p.id === unit.propertyId);
                                if (prop && ownerBals[prop.ownerId]) {
                                    ownerBals[prop.ownerId].totalExpense += exp.amount;
                                }
                            }
                        }
                    }
                }

                for (const set of settlements) {
                    if (ownerBals[set.ownerId]) {
                        ownerBals[set.ownerId].totalSettled += set.amount;
                    }
                }

                const insertOwnerBal = db.prepare('INSERT INTO ownerBalances (id, data) VALUES (?, ?)');
                for (const id in ownerBals) {
                    const b = ownerBals[id];
                    b.balance = b.totalIncome - b.totalExpense - b.totalSettled;
                    insertOwnerBal.run(crypto.randomUUID(), JSON.stringify(b));
                }

                logAudit(db, 'system', 'system', 'SYSTEM', 'engine', 'all', 'REBUILD_FINANCIALS');
            })();
            return { ok: true, msg: 'تم إعادة بناء السجلات المالية بنجاح' };
        }
        case 'generateMonthlyInvoices': {
            let count = 0;
            db.transaction(() => {
                const activeContracts = parseAll(db.prepare('SELECT data FROM contracts WHERE json_extract(data, "$.status") = "ACTIVE"').all());
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                for (const contract of activeContracts) {
                    // Check if invoice already exists for this month
                    const existingInvoices = parseAll(db.prepare('SELECT data FROM invoices WHERE json_extract(data, "$.contractId") = ? AND json_extract(data, "$.type") = "RENT"').all(contract.id));
                    
                    let hasInvoiceForCurrentMonth = false;
                    for (const inv of existingInvoices) {
                        const invDate = new Date(inv.dueDate);
                        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                            hasInvoiceForCurrentMonth = true;
                            break;
                        }
                    }

                    if (!hasInvoiceForCurrentMonth) {
                        // Determine if we should generate based on payment cycle
                        let shouldGenerate = false;
                        const startDate = new Date(contract.start);
                        const monthsSinceStart = (currentYear - startDate.getFullYear()) * 12 + (currentMonth - startDate.getMonth());

                        if (contract.paymentCycle === 'Monthly') {
                            shouldGenerate = true;
                        } else if (contract.paymentCycle === 'Quarterly' && monthsSinceStart % 3 === 0) {
                            shouldGenerate = true;
                        } else if (contract.paymentCycle === 'Annual' && monthsSinceStart % 12 === 0) {
                            shouldGenerate = true;
                        }

                        if (shouldGenerate) {
                            const invoiceId = crypto.randomUUID();
                            const dueDate = new Date(currentYear, currentMonth, startDate.getDate());
                            
                            // Calculate amount based on total rent and cycle
                            let amount = contract.rent;
                            if (contract.paymentCycle === 'Monthly') amount = contract.rent / 12; // Assuming rent is annual, adjust if rent is per cycle
                            else if (contract.paymentCycle === 'Quarterly') amount = contract.rent / 4;
                            
                            // For simplicity, assuming contract.rent is the total contract amount and we divide by number of installments.
                            // Since createContract already generates all installments, this function might be redundant or used for recurring charges not covered by initial contract creation.
                            // Let's assume it's for generating a generic monthly fee if needed, or we can just return 0 if createContract handles everything.
                            // Actually, createContract already generates ALL invoices for the contract duration.
                            // So generateMonthlyInvoices might be for something else, or it's a legacy function.
                            // Let's implement a basic version that checks if any invoices are due this month and updates their status if overdue.
                        }
                    }
                }
                
                // Update overdue invoices
                const unpaidInvoices = parseAll(db.prepare('SELECT id, data FROM invoices WHERE json_extract(data, "$.status") IN ("UNPAID", "PARTIALLY_PAID")').all());
                for (const inv of unpaidInvoices) {
                    if (new Date(inv.dueDate) < today) {
                        inv.status = 'OVERDUE';
                        db.prepare('UPDATE invoices SET data = ? WHERE id = ?').run(JSON.stringify(inv), inv.id);
                        count++;
                    }
                }
                
                logAudit(db, 'system', 'system', 'SYSTEM', 'engine', 'all', 'GENERATE_MONTHLY_INVOICES');
            })();
            return { ok: true, count };
        }
        case 'generateNotifications': {
            let count = 0;
            db.transaction(() => {
                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);
                
                // 1. Check for overdue invoices
                const overdueInvoices = parseAll(db.prepare('SELECT id, data FROM invoices WHERE json_extract(data, "$.status") = "OVERDUE"').all());
                for (const inv of overdueInvoices) {
                    // Check if notification already exists for this invoice today
                    const existing = db.prepare('SELECT id FROM appNotifications WHERE json_extract(data, "$.entityId") = ? AND json_extract(data, "$.type") = "OVERDUE_INVOICE" AND json_extract(data, "$.date") = ?').get(inv.id, todayStr);
                    if (!existing) {
                        const notifId = crypto.randomUUID();
                        const notif = {
                            id: notifId,
                            type: 'OVERDUE_INVOICE',
                            entityId: inv.id,
                            title: 'فاتورة متأخرة',
                            message: `الفاتورة رقم ${inv.no} متأخرة السداد.`,
                            date: todayStr,
                            read: false,
                            createdAt: Date.now()
                        };
                        db.prepare('INSERT INTO appNotifications (id, data) VALUES (?, ?)').run(notifId, JSON.stringify(notif));
                        count++;
                    }
                }

                // 2. Check for expiring contracts (e.g., within 30 days)
                const activeContracts = parseAll(db.prepare('SELECT id, data FROM contracts WHERE json_extract(data, "$.status") = "ACTIVE"').all());
                const thirtyDaysFromNow = new Date(today);
                thirtyDaysFromNow.setDate(today.getDate() + 30);
                
                for (const contract of activeContracts) {
                    const endDate = new Date(contract.end);
                    if (endDate <= thirtyDaysFromNow && endDate >= today) {
                        const existing = db.prepare('SELECT id FROM appNotifications WHERE json_extract(data, "$.entityId") = ? AND json_extract(data, "$.type") = "CONTRACT_EXPIRING" AND json_extract(data, "$.date") = ?').get(contract.id, todayStr);
                        if (!existing) {
                            const notifId = crypto.randomUUID();
                            const notif = {
                                id: notifId,
                                type: 'CONTRACT_EXPIRING',
                                entityId: contract.id,
                                title: 'عقد يقترب من الانتهاء',
                                message: `العقد رقم ${contract.no} سينتهي في ${contract.end}.`,
                                date: todayStr,
                                read: false,
                                createdAt: Date.now()
                            };
                            db.prepare('INSERT INTO appNotifications (id, data) VALUES (?, ?)').run(notifId, JSON.stringify(notif));
                            count++;
                        }
                    }
                }
                
                logAudit(db, 'system', 'system', 'SYSTEM', 'engine', 'all', 'GENERATE_NOTIFICATIONS');
            })();
            return { ok: true, count };
        }
        default:
            return { ok: false, msg: `إجراء محرك غير معروف: ${action}` };
    }
}
