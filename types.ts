
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  username: string;
  hash: string;
  salt: string;
  role: UserRole;
  mustChange: boolean;
  createdAt: number;
  isDemo?: boolean;
}

export type PermissionAction = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_PROPERTIES'
  | 'MANAGE_CONTRACTS'
  | 'MANAGE_FINANCIALS'
  | 'DELETE_RECORDS'
  | 'VIEW_REPORTS'
  | 'SYSTEM_SETTINGS'
  | 'USER_MANAGEMENT';

// --- Core Data Entities ---

export interface Owner {
  id: string;
  name: string;
  phone: string;
  address?: string;
  managementContractDate?: string;
  bankName?: string;
  bankAccountNumber?: string;
  notes: string;
  commissionType: 'RATE' | 'FIXED_MONTHLY';
  commissionValue: number;
  portalToken?: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  location: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  type: string;
  rentDefault: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  idNo: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLIST';
  notes: string;
}

export interface Contract {
  id: string;
  unitId: string;
  tenantId: string;
  rent: number;
  dueDay: number;
  start: string;
  end: string;
  deposit: number;
  status: 'ACTIVE' | 'ENDED' | 'SUSPENDED';
  paymentCycle?: 'Monthly' | 'Quarterly' | 'Annual';
  createdAt: number;
}

export interface Invoice {
  id: string;
  contractId: string;
  no: string;
  dueDate: string;
  amount: number;
  taxAmount?: number;
  paidAmount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOID';
  type: 'RENT' | 'MAINTENANCE' | 'UTILITY' | 'LATE_FEE';
  notes: string;
  createdAt: number;
  relatedInvoiceId?: string;
}

export interface Receipt {
  id: string;
  no: string;
  contractId: string;
  dateTime: string;
  amount: number;
  channel: 'CASH' | 'BANK' | 'POS';
  ref: string;
  notes: string;
  status: 'POSTED' | 'VOID';
  createdAt: number;
  voidedAt?: number;
}

export interface ReceiptAllocation {
  id: string;
  receiptId: string;
  invoiceId: string;
  amount: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  no: string;
  contractId: string | null;
  dateTime: string;
  category: string;
  amount: number;
  status: 'POSTED' | 'VOID';
  chargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
  ref: string;
  notes: string;
  payee?: string;
}

export interface MaintenanceRecord {
  id: string;
  no: string;
  unitId: string;
  requestDate: string;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  cost: number;
  chargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
  expenseId?: string;
  invoiceId?: string;
  completedAt?: number;
}

export interface DepositTx {
  id: string;
  contractId: string;
  type: 'DEPOSIT_IN' | 'DEPOSIT_RETURN' | 'DEPOSIT_DEDUCT';
  amount: number;
  date: string;
  status: 'POSTED' | 'VOID';
  note: string;
  createdAt: number;
}

export interface OwnerSettlement {
  id: string;
  no: string;
  ownerId: string;
  amount: number;
  date: string;
  method: 'CASH' | 'BANK';
  ref: string;
  notes: string;
  status: 'POSTED' | 'VOID';
  createdAt: number;
}

export interface Account {
  id: string;
  no: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  isParent: boolean;
  parentId: string | null;
}

export interface JournalEntry {
  id: string;
  no: string;
  date: string;
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  sourceId: string;
  createdAt: number;
  entityType?: 'CONTRACT' | 'TENANT';
  entityId?: string;
}

// --- Aging Analytics Types ---
export interface AgedDebt {
  tenantName: string;
  totalDue: number;
  current: number; // < 30 days
  thirtyPlus: number; // 30-60 days
  sixtyPlus: number; // 60-90 days
  ninetyPlus: number; // > 90 days
}

// --- Support Tables ---

export interface Serials {
  id: number;
  receipt: number;
  expense: number;
  invoice: number;
  ownerSettlement: number;
  maintenance: number;
  journalEntry: number;
  lead: number;
  mission: number;
}

export interface Snapshot {
  id: string;
  ts: number;
  note: string;
  data: any;
}

export interface AuditLogEntry {
  id: string;
  ts: number;
  userId: string;
  username: string;
  action: string;
  entity: string;
  entityId: string;
  note: string;
}

export interface Governance {
  id: number;
  isLocked: boolean;
  financialLockDate: string;
}

// --- Analytics & Aggregates ---

export interface OwnerBalance {
  ownerId: string;
  collections: number;
  expenses: number;
  settlements: number;
  officeShare: number;
  net: number;
}

export interface AccountBalance {
  accountId: string;
  balance: number;
}

export interface ContractBalance {
  contractId: string;
  tenantId: string;
  unitId: string;
  balance: number;
  depositBalance: number;
  lastUpdatedAt: number;
}

export interface TenantBalance {
  tenantId: string;
  balance: number;
  lastUpdatedAt: number;
}

export interface KpiSnapshot {
  id: string;
  totalOwnerNetBalance: number;
  totalContractARBalance: number;
  totalTenantARBalance: number;
}

// --- Settings ---

export interface Settings {
  id: number;
  theme: 'light' | 'dark';
  currency: 'OMR' | 'SAR' | 'EGP';
  contractAlertDays: number;
  taxRate: number;
  company: {
    name: string;
    address: string;
    phone: string;
    logoDataUrl?: string;
  };
  appearance: {
    primaryColor: string;
  };
  maintenance: {
    defaultChargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
  };
  lateFee: {
    isEnabled: boolean;
    graceDays: number;
    type: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_RENT';
    value: number;
  };
  accountMappings: {
    accountsReceivable: string;
    ownersPayable: string;
    revenue: {
      RENT: string;
      OFFICE_COMMISSION: string;
      OTHER_INCOME?: string;
    };
    paymentMethods: {
      CASH: string;
      BANK: string;
      POS: string;
    };
    expenseCategories: {
      [key: string]: string;
      default: string;
    };
  };
  googleClientId?: string;
}

// --- Other modules ---

export interface NotificationTemplate {
  id: string;
  title: string;
  template: string;
  isEnabled: boolean;
}

export interface OutgoingNotification {
  id: string;
  recipientName: string;
  recipientContact: string;
  message: string;
  status: 'PENDING' | 'SENT';
  createdAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  role: UserRole;
  isRead: boolean;
  createdAt: number;
}

export interface Lead {
  id: string;
  no: string;
  name: string;
  phone: string;
  email?: string;
  desiredUnitType?: string;
  minBudget?: number;
  maxBudget?: number;
  status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'NOT_INTERESTED' | 'CLOSED';
  notes: string;
  createdAt: number;
}

export interface Land {
  id: string;
  plotNo: string;
  name: string;
  location: string;
  area: number;
  category: string;
  ownerPrice: number;
  commission: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  notes: string;
  createdAt: number;
}

export interface Commission {
  id: string;
  staffId: string;
  type: 'RENT' | 'SALE' | 'MANAGEMENT';
  dealValue: number;
  percentage: number;
  amount: number;
  status: 'UNPAID' | 'PAID';
  expenseId?: string;
  paidAt?: number;
  createdAt: number;
}

export interface Mission {
  id: string;
  no: string;
  title: string;
  date: string;
  time: string;
  leadId: string | null;
  ownerId: string | null;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  resultSummary: string;
  createdAt: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  monthlyAmounts: number[];
}

export interface Budget {
  id: string;
  year: number;
  items: BudgetItem[];
}

export interface AutoBackup {
  id: string;
  lastSuccess?: number;
  frequency: 'DAILY' | 'WEEKLY';
}

export interface Attachment {
  id: string;
  entityId: string;
  entityType: 'CONTRACT' | 'TENANT' | 'RECEIPT' | 'LAND' | 'LEAD';
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  createdAt: number;
}

export interface AuditIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  entityType?: keyof Database;
  entityId?: string;
  entityIdentifier?: string;
  resolutionPath?: string;
}

export interface Database {
  auth: { users: User[] };
  settings: Settings;
  owners: Owner[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  contracts: Contract[];
  invoices: Invoice[];
  receipts: Receipt[];
  receiptAllocations: ReceiptAllocation[];
  expenses: Expense[];
  maintenanceRecords: MaintenanceRecord[];
  depositTxs: DepositTx[];
  auditLog: AuditLogEntry[];
  governance: Governance;
  ownerSettlements: OwnerSettlement[];
  serials: Serials;
  snapshots: Snapshot[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  autoBackups: AutoBackup[];
  ownerBalances: OwnerBalance[];
  accountBalances: AccountBalance[];
  kpiSnapshots: KpiSnapshot[];
  contractBalances: ContractBalance[];
  tenantBalances: TenantBalance[];
  notificationTemplates: NotificationTemplate[];
  outgoingNotifications: OutgoingNotification[];
  appNotifications: AppNotification[];
  leads: Lead[];
  lands: Land[];
  commissions: Commission[];
  missions: Mission[];
  budgets: Budget[];
  attachments: Attachment[];
}

export interface DerivedData {
  ownerBalances: Record<string, OwnerBalance>;
  contractBalances: Record<string, ContractBalance>;
  tenantBalances: Record<string, TenantBalance>;
  accountBalances: Record<string, AccountBalance>;
  totalOwnerNetBalance: number;
  totalContractARBalance: number;
  totalTenantARBalance: number;
}
