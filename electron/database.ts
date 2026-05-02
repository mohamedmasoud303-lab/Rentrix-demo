
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const initializeDatabase = (userDataPath: string) => {
    const dbPath = path.join(userDataPath, 'rentrix.db');
    const db = new Database(dbPath);

    // Pragmas for performance and reliability
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    // 1. Schema Versioning
    db.exec(`
        CREATE TABLE IF NOT EXISTS _meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    let currentVersion = 0;
    const versionRow = db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get() as any;
    if (versionRow) {
        currentVersion = parseInt(versionRow.value, 10);
    } else {
        db.prepare("INSERT INTO _meta (key, value) VALUES ('schema_version', '0')").run();
    }

    // 2. Legacy Schema (JSON-based) - Keep for migration
    const legacySchema = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, salt TEXT NOT NULL,
            role TEXT NOT NULL, mustChange INTEGER NOT NULL, createdAt INTEGER NOT NULL, isDemo INTEGER
        );
        CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS governance (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS serials (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        
        CREATE TABLE IF NOT EXISTS owners (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS receiptAllocations (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS maintenanceRecords (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS depositTxs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS ownerSettlements (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS journalEntries (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS lands (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS auditLog (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS autoBackups (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS ownerBalances (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS accountBalances (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS contractBalances (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS tenantBalances (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS kpiSnapshots (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS notificationTemplates (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS outgoingNotifications (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS appNotifications (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    `;
    db.exec(legacySchema);

    // 3. Normalized Schema (v1)
    if (currentVersion < 1) {
        console.log("Migrating to schema v1 (Normalized Tables)...");
        
        // Backup instruction: Before running this in production, copy rentrix.db to rentrix_backup.db
        
        db.exec(`
            -- Normalized Tables
            CREATE TABLE IF NOT EXISTS norm_owners (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                nationalId TEXT,
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER
            );

            CREATE TABLE IF NOT EXISTS norm_properties (
                id TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT,
                address TEXT,
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER,
                FOREIGN KEY (ownerId) REFERENCES norm_owners(id)
            );

            CREATE TABLE IF NOT EXISTS norm_units (
                id TEXT PRIMARY KEY,
                propertyId TEXT NOT NULL,
                unitNumber TEXT NOT NULL,
                type TEXT,
                status TEXT DEFAULT 'Available',
                yearlyRent REAL DEFAULT 0,
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER,
                FOREIGN KEY (propertyId) REFERENCES norm_properties(id)
            );

            CREATE TABLE IF NOT EXISTS norm_tenants (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                idNo TEXT,
                status TEXT DEFAULT 'ACTIVE',
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER
            );

            CREATE TABLE IF NOT EXISTS norm_contracts (
                id TEXT PRIMARY KEY,
                tenantId TEXT NOT NULL,
                unitId TEXT NOT NULL,
                startDate TEXT NOT NULL,
                endDate TEXT NOT NULL,
                totalAmount REAL NOT NULL,
                paymentCycle TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER,
                FOREIGN KEY (tenantId) REFERENCES norm_tenants(id),
                FOREIGN KEY (unitId) REFERENCES norm_units(id)
            );

            CREATE TABLE IF NOT EXISTS norm_installments (
                id TEXT PRIMARY KEY,
                contractId TEXT NOT NULL,
                dueDate TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'Pending',
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER,
                FOREIGN KEY (contractId) REFERENCES norm_contracts(id)
            );

            CREATE TABLE IF NOT EXISTS norm_payments (
                id TEXT PRIMARY KEY,
                installmentId TEXT NOT NULL,
                amount REAL NOT NULL,
                paymentDate TEXT NOT NULL,
                receiptNo TEXT,
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                FOREIGN KEY (installmentId) REFERENCES norm_installments(id)
            );

            CREATE TABLE IF NOT EXISTS norm_maintenance (
                id TEXT PRIMARY KEY,
                unitId TEXT NOT NULL,
                description TEXT NOT NULL,
                cost REAL DEFAULT 0,
                status TEXT DEFAULT 'Pending',
                chargedTo TEXT DEFAULT 'OWNER',
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000),
                updatedAt INTEGER,
                FOREIGN KEY (unitId) REFERENCES norm_units(id)
            );

            CREATE TABLE IF NOT EXISTS norm_attachments (
                id TEXT PRIMARY KEY,
                entityType TEXT NOT NULL,
                entityId TEXT NOT NULL,
                filePath TEXT NOT NULL,
                mimeType TEXT,
                originalName TEXT,
                createdAt INTEGER DEFAULT (cast(strftime('%s','now') as int)*1000)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_norm_properties_owner ON norm_properties(ownerId);
            CREATE INDEX IF NOT EXISTS idx_norm_units_property ON norm_units(propertyId);
            CREATE INDEX IF NOT EXISTS idx_norm_contracts_tenant ON norm_contracts(tenantId);
            CREATE INDEX IF NOT EXISTS idx_norm_contracts_unit ON norm_contracts(unitId);
            CREATE INDEX IF NOT EXISTS idx_norm_installments_contract ON norm_installments(contractId);
            CREATE INDEX IF NOT EXISTS idx_norm_payments_installment ON norm_payments(installmentId);
            CREATE INDEX IF NOT EXISTS idx_norm_maintenance_unit ON norm_maintenance(unitId);
            CREATE INDEX IF NOT EXISTS idx_norm_attachments_entity ON norm_attachments(entityType, entityId);
        `);

        // Note: Actual data migration from JSON tables to norm_ tables would happen here.
        // For now, we keep the JSON tables active so we don't break the UI, 
        // and we will migrate the UI to use the normalized tables in subsequent phases.
        
        db.prepare("UPDATE _meta SET value = '1' WHERE key = 'schema_version'").run();
        currentVersion = 1;
        console.log("Schema v1 migration complete.");
    }

    // Integrity Check
    try {
        const integrity = db.pragma('integrity_check');
        if (integrity !== 'ok') {
            console.error('Database integrity check failed:', integrity);
        }
    } catch (e) {
        console.error('Failed to run integrity check:', e);
    }

    // Initial data seeding
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    if (userCount === 0) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.createHash('sha256').update('123' + salt).digest('hex');
        db.prepare('INSERT INTO users (id, username, hash, salt, role, mustChange, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), 'admin', hash, salt, 'ADMIN', 1, Date.now());
    }

    const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM settings').get() as any).count;
    if (settingsCount === 0) {
        const defaultSettings = {
            theme: 'light', currency: 'OMR', contractAlertDays: 30, taxRate: 0,
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
        };
        db.prepare('INSERT INTO settings (id, data) VALUES (?, ?)').run(1, JSON.stringify(defaultSettings));

        db.prepare('INSERT INTO governance (id, data) VALUES (?, ?)').run(1, JSON.stringify({ isLocked: false, financialLockDate: '2000-01-01' }));
        
        db.prepare('INSERT INTO serials (id, data) VALUES (?, ?)').run(1, JSON.stringify({
            receipt: 1000, expense: 1000, invoice: 1000, ownerSettlement: 1000, maintenance: 1000, journalEntry: 1000, lead: 1000, mission: 1000
        }));

        const defaultAccounts = [
            { id: '1101', no: '1101', name: 'الصندوق (نقدي)', type: 'ASSET', isParent: false, parentId: null },
            { id: '1102', no: '1102', name: 'البنك', type: 'ASSET', isParent: false, parentId: null },
            { id: '1201', no: '1201', name: 'ذمم المستأجرين', type: 'ASSET', isParent: false, parentId: null },
            { id: '2101', no: '2101', name: 'ذمم الملاك (دائنون)', type: 'LIABILITY', isParent: false, parentId: null },
            { id: '2141', no: '2141', name: 'تأمينات مستأجرين', type: 'LIABILITY', isParent: false, parentId: null },
            { id: '4101', no: '4101', name: 'إيرادات إيجارات', type: 'REVENUE', isParent: false, parentId: null },
            { id: '4102', no: '4102', name: 'عمولات إدارية', type: 'REVENUE', isParent: false, parentId: null },
            { id: '5101', no: '5101', name: 'مصاريف صيانة عمومية', type: 'EXPENSE', isParent: false, parentId: null }
        ];

        const insertAccount = db.prepare('INSERT INTO accounts (id, data) VALUES (?, ?)');
        db.transaction((accounts) => {
            for(const acc of accounts) insertAccount.run(acc.id, JSON.stringify(acc));
        })(defaultAccounts);
    }

    return db;
};