
import Dexie, { Table } from 'dexie';
import { 
    User, Settings, Owner, Property, Unit, Tenant, Contract, Invoice, Receipt, 
    ReceiptAllocation, Expense, MaintenanceRecord, DepositTx,
    AuditLogEntry, Governance, OwnerSettlement, Serials, Snapshot, 
    Account, JournalEntry, Database,
    OwnerBalance, AccountBalance, KpiSnapshot, ContractBalance, TenantBalance, AutoBackup,
    NotificationTemplate, OutgoingNotification, AppNotification, Lead, Land, Commission, Mission, Budget,
    Attachment
} from '../types';

export type SettingsWithId = Settings & { id: number };
export type GovernanceWithId = Governance & { id: number };
export type SerialsWithId = Serials & { id: number };

async function sha256(msg: string): Promise<string> {
  const enc = new TextEncoder().encode(msg);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class RentrixDB extends Dexie {
    settings!: Table<SettingsWithId, number>;
    users!: Table<User, string>;
    owners!: Table<Owner, string>;
    properties!: Table<Property, string>;
    units!: Table<Unit, string>;
    tenants!: Table<Tenant, string>;
    contracts!: Table<Contract, string>;
    invoices!: Table<Invoice, string>;
    receipts!: Table<Receipt, string>;
    receiptAllocations!: Table<ReceiptAllocation, string>;
    expenses!: Table<Expense, string>;
    maintenanceRecords!: Table<MaintenanceRecord, string>;
    depositTxs!: Table<DepositTx, string>;
    auditLog!: Table<AuditLogEntry, string>;
    governance!: Table<GovernanceWithId, number>;
    ownerSettlements!: Table<OwnerSettlement, string>;
    serials!: Table<SerialsWithId, number>;
    snapshots!: Table<Snapshot, string>;
    accounts!: Table<Account, string>;
    journalEntries!: Table<JournalEntry, string>;
    autoBackups!: Table<AutoBackup, string>;
    ownerBalances!: Table<OwnerBalance, string>;
    accountBalances!: Table<AccountBalance, string>;
    kpiSnapshots!: Table<KpiSnapshot, string>;
    contractBalances!: Table<ContractBalance, string>;
    tenantBalances!: Table<TenantBalance, string>;
    notificationTemplates!: Table<NotificationTemplate, string>;
    outgoingNotifications!: Table<OutgoingNotification, string>;
    appNotifications!: Table<AppNotification, string>;
    leads!: Table<Lead, string>;
    lands!: Table<Land, string>;
    commissions!: Table<Commission, string>;
    missions!: Table<Mission, string>;
    budgets!: Table<Budget, string>;
    attachments!: Table<Attachment, string>;

    constructor() {
        super('Rentrix_ERP_V12_DB');
        // FIX: Cast this to any to resolve Property 'version' does not exist on type 'RentrixDB' error.
        (this as any).version(2).stores({
            settings: 'id',
            users: 'id, username, role',
            owners: 'id, name, phone',
            properties: 'id, ownerId, name',
            units: 'id, propertyId, name, type, status',
            tenants: 'id, name, phone, idNo',
            contracts: 'id, unitId, tenantId, status, end, [unitId+status]',
            invoices: 'id, contractId, status, dueDate, type, [contractId+status+dueDate]',
            receipts: 'id, no, contractId, dateTime, status, [contractId+dateTime]',
            receiptAllocations: 'id, receiptId, invoiceId, [receiptId+invoiceId]',
            expenses: 'id, no, contractId, dateTime, category, status',
            maintenanceRecords: 'id, no, unitId, status, requestDate',
            depositTxs: 'id, contractId',
            auditLog: 'id, ts, userId, action',
            governance: 'id',
            ownerSettlements: 'id, no, ownerId, date',
            serials: 'id',
            snapshots: 'id, ts',
            accounts: 'id, no, parentId, type',
            journalEntries: 'id, date, accountId, sourceId, [entityType+entityId], [accountId+date]',
            autoBackups: '&id',
            ownerBalances: '&ownerId',
            accountBalances: '&accountId',
            kpiSnapshots: '&id',
            contractBalances: '&contractId, tenantId, unitId',
            tenantBalances: '&tenantId',
            notificationTemplates: 'id',
            outgoingNotifications: 'id, status',
            appNotifications: 'id, isRead, role',
            leads: 'id, no, name, phone',
            lands: 'id, plotNo',
            commissions: 'id, staffId, status',
            missions: 'id, no, date',
            budgets: 'id, year',
            attachments: 'id, entityId, entityType',
        });
    }

    async initialize() {
        const settingsCount = await this.settings.count();
        if (settingsCount === 0) {
            await this.settings.add({
                id: 1, theme: 'light', currency: 'OMR', contractAlertDays: 30, taxRate: 0,
                company: { name: 'مشاريع جودة الإنطلاقة', address: 'سلطنة عمان', phone: '+968' },
                appearance: { primaryColor: '#2563eb' },
                maintenance: { defaultChargedTo: 'OWNER' },
                lateFee: { isEnabled: false, graceDays: 5, type: 'FIXED_AMOUNT', value: 0 },
                accountMappings: {
                    accountsReceivable: '1201', ownersPayable: '2101',
                    revenue: { RENT: '4101', OFFICE_COMMISSION: '4102' },
                    paymentMethods: { CASH: '1101', BANK: '1102', POS: '1103' },
                    expenseCategories: { default: '5101' }
                }
            });

            await this.governance.add({ id: 1, isLocked: false, financialLockDate: '2000-01-01' });

            await this.serials.add({
                id: 1, receipt: 1000, expense: 1000, invoice: 1000, 
                ownerSettlement: 1000, maintenance: 1000, journalEntry: 1000, 
                lead: 1000, mission: 1000
            });

            await this.accounts.bulkAdd([
                { id: '1101', no: '1101', name: 'الصندوق (نقدي)', type: 'ASSET', isParent: false, parentId: null },
                { id: '1102', no: '1102', name: 'البنك', type: 'ASSET', isParent: false, parentId: null },
                { id: '1201', no: '1201', name: 'ذمم المستأجرين', type: 'ASSET', isParent: false, parentId: null },
                { id: '2101', no: '2101', name: 'ذمم الملاك (دائنون)', type: 'LIABILITY', isParent: false, parentId: null },
                { id: '2141', no: '2141', name: 'تأمينات مستأجرين', type: 'LIABILITY', isParent: false, parentId: null },
                { id: '4101', no: '4101', name: 'إيرادات إيجارات', type: 'REVENUE', isParent: false, parentId: null },
                { id: '4102', no: '4102', name: 'عمولات إدارية', type: 'REVENUE', isParent: false, parentId: null },
                { id: '5101', no: '5101', name: 'مصاريف صيانة عمومية', type: 'EXPENSE', isParent: false, parentId: null }
            ]);
        }

        const usersCount = await this.users.count();
        if (usersCount === 0) {
            const salt = 'd5f1e8';
            const hash = await sha256('123' + salt);
            await this.users.add({
                id: crypto.randomUUID(),
                username: 'admin',
                role: 'ADMIN',
                salt,
                hash,
                mustChange: true,
                createdAt: Date.now()
            });
        }
    }

    async getAllData(): Promise<Database> {
        const data: Partial<Database> = {}; const STATIC_ID = 1;
        const tables = (this as any).tables;
        for (const table of tables) {
            if (['settings', 'governance', 'serials'].includes(table.name)) {
                const singleRec = await table.get(STATIC_ID);
                if (singleRec) { const { id, ...rest } = singleRec as any; (data as any)[table.name] = rest; }
            } else if (table.name === 'users') { data.auth = { users: await table.toArray() }; } 
            else { (data as any)[table.name] = await table.toArray(); }
        }
        return data as Database;
    }
}

export const dbEngine = new RentrixDB();
