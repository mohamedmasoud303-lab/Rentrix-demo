
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { User, Settings, Database, PermissionAction, ContractBalance, OwnerBalance, AccountBalance, TenantBalance, Governance } from '../types';
import { toast } from 'react-hot-toast';
import { sanitizePhoneNumber } from '../utils/helpers';
import { useAppStore, dbService } from '../hooks/useAppStore';
import { dbEngine } from '../services/db';
import { financeService as actualFinanceService } from '../services/financeService';
import { dataService as actualDataService } from '../services/dataService';
import { rebuildSnapshotsFromJournal } from '../services/financialEngine';

import { backupService } from '../services/backupService';

// Define a default empty database structure
const emptyDb: Database = {
  settings: {} as Settings,
  auth: { users: [] },
  owners: [], properties: [], units: [], tenants: [], contracts: [],
  invoices: [], receipts: [], receiptAllocations: [], expenses: [],
  maintenanceRecords: [], depositTxs: [], auditLog: [], governance: {} as any,
  ownerSettlements: [], serials: {} as any, snapshots: [], accounts: [], journalEntries: [],
  autoBackups: [], ownerBalances: [], accountBalances: [], kpiSnapshots: [],
  contractBalances: [], tenantBalances: [], notificationTemplates: [],
  outgoingNotifications: [], appNotifications: [], leads: [], lands: [],
  commissions: [], missions: [], budgets: [], attachments: [],
};

interface AppContextType {
  db: Database;
  currentUser: User | null;
  isReady: boolean;
  isReadOnly: boolean;
  refreshData: () => Promise<void>;
  
  // Memoized Balance Maps
  contractBalances: Record<string, ContractBalance>;
  ownerBalances: Record<string, OwnerBalance>;
  accountBalances: Record<string, AccountBalance>;
  tenantBalances: Record<string, TenantBalance>;

  auth: {
    login: (u: string, p: string) => Promise<any>;
    logout: () => void;
    addUser: (user: any, pass: string) => Promise<any>;
    updateUser: (id: string, updates: any) => Promise<any>;
    changePassword: (id: string, newPass: string) => Promise<any>;
    forcePasswordReset: (id: string) => Promise<any>;
  };
  dataService: {
    add: (table: keyof Database, data: any) => Promise<any>;
    update: (table: keyof Database, id: string, data: any) => Promise<void>;
    remove: (table: keyof Database, id: string) => Promise<void>;
  };
  financeService: {
    createContract: (contractData: any) => Promise<any>;
    payInstallment: (invoiceId: string, paymentDate: string, receiptNo?: string, amount?: number) => Promise<any>;
    addReceiptWithAllocations: (receipt: any, allocations: any) => Promise<any>;
    voidReceipt: (id: string) => Promise<void>;
    voidExpense: (id: string) => Promise<void>;
    voidInvoice: (id: string) => Promise<void>;
    generateMonthlyInvoices: () => Promise<number>;
    addManualJournalVoucher: (data: any) => Promise<void>;
    payoutCommission: (id: string) => Promise<void>;
    voidDepositTx: (id: string) => Promise<void>;
    voidOwnerSettlement: (id: string) => Promise<void>;
  },
  canAccess: (action: PermissionAction) => boolean;
  rebuildFinancials: () => Promise<void>;
  createBackup: () => Promise<string>;
  createSnapshot: (note: string) => Promise<void>;
  restoreBackup: (json: string) => Promise<void>;
  wipeData: () => Promise<void>;

  // Helper Functions
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  updateGovernance: (updates: Partial<Governance>) => Promise<void>;
  generateOwnerPortalLink: (ownerId: string) => Promise<string>;
  generateNotifications: () => Promise<number>;
  sendWhatsApp: (phone: string, message: string) => void;

  // Desktop-only features
  googleUser: any | null;
  googleSignIn: () => void;
  googleSignOut: () => void;
  syncToGoogleDrive: () => Promise<void>;
  restoreFromGoogleDrive: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoading, setLoading, version } = useAppStore();
  const [db, setDb] = useState<Database>(emptyDb);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Helper to call the backend
  const apiCall = useCallback(async (domain: string, action: string, payload?: any) => {
    try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.invoke === 'function') {
            const result = await electronAPI.invoke('api', { domain, action, payload });
            if (result && result.error) {
                throw new Error(result.error);
            }
            return result;
        } else {
            // Fallback for web preview using actual services and dbEngine
            let result;
            if (domain === 'data') {
                if (action === 'getAll') return await dbEngine.getAllData();
                if (action === 'add') result = await actualDataService.add(payload.table, payload.data, currentUser, db.settings);
                if (action === 'update') result = await actualDataService.update(payload.table, payload.id, payload.data, currentUser);
                if (action === 'remove') result = await actualDataService.remove(payload.table, payload.id, currentUser);
                if (action === 'updateSettings') {
                    await dbEngine.settings.update(1, payload.settings);
                    result = { ok: true };
                }
                if (action === 'updateGovernance') {
                    await dbEngine.governance.update(1, payload.governance);
                    result = { ok: true };
                }
            }
            if (domain === 'auth') {
                if (action === 'login') {
                    const user = db.auth.users.find(u => u.username === payload.username);
                    if (user) return { ok: true, user };
                    return { ok: false, error: 'User not found' };
                }
                if (action === 'changePassword') {
                    const { userId, newPass } = payload;
                    const user = await dbEngine.users.get(userId);
                    if (!user) return { ok: false, error: 'User not found' };
                    
                    // Simple hash for web preview
                    const newHash = btoa(newPass + user.salt); 
                    await dbEngine.users.update(userId, { hash: newHash, mustChange: false });
                    return { ok: true };
                }
                if (action === 'addUser') {
                    const { user, pass } = payload;
                    const salt = Math.random().toString(36).substring(7);
                    const hash = btoa(pass + salt);
                    const newUser = { ...user, id: crypto.randomUUID(), salt, hash, createdAt: Date.now() };
                    await dbEngine.users.add(newUser);
                    return { ok: true, newUser };
                }
                if (action === 'updateUser') {
                    await dbEngine.users.update(payload.id, payload.updates);
                    return { ok: true };
                }
                if (action === 'forcePasswordReset') {
                    await dbEngine.users.update(payload.userId, { mustChange: true });
                    return { ok: true };
                }
            }
            if (domain === 'finance') {
                if (action === 'createContract') result = await actualFinanceService.createContract(payload.contractData, currentUser);
                if (action === 'payInstallment') result = await actualFinanceService.payInstallment(payload.invoiceId, payload.paymentDate, currentUser, db.settings, payload.receiptNo, payload.amount);
                if (action === 'generateMonthlyInvoices') result = await actualFinanceService.generateMonthlyInvoices(currentUser, db.settings);
                if (action === 'voidInvoice') result = await actualFinanceService.voidInvoice(payload.id, currentUser);
                if (action === 'voidReceipt') result = await actualFinanceService.voidReceipt(payload.id, currentUser);
                if (action === 'voidExpense') result = await actualFinanceService.voidExpense(payload.id, currentUser);
                if (action === 'voidDepositTx') result = await actualFinanceService.voidDepositTx(payload.id, currentUser);
                if (action === 'voidOwnerSettlement') result = await actualFinanceService.voidOwnerSettlement(payload.id, currentUser);
                if (action === 'addReceiptWithAllocations') result = await actualFinanceService.addReceiptWithAllocations(payload.receipt, payload.allocations, currentUser, db.settings);
                if (action === 'addManualJournalVoucher') result = await actualFinanceService.addManualJournalVoucher(payload, currentUser);
                if (action === 'payoutCommission') result = await actualFinanceService.payoutCommission(payload.id, currentUser);
            }
            if (domain === 'engine') {
                if (action === 'rebuildFinancials') result = await rebuildSnapshotsFromJournal();
                if (action === 'generateNotifications') result = await actualFinanceService.generateNotifications(currentUser, db.settings);
            }
            
            // Trigger refresh for mutations
            if (['add', 'update', 'remove', 'updateSettings', 'updateGovernance', 'createContract', 'payInstallment', 'generateMonthlyInvoices', 'voidInvoice', 'voidReceipt', 'voidExpense', 'voidDepositTx', 'voidOwnerSettlement', 'addReceiptWithAllocations', 'addManualJournalVoucher', 'payoutCommission', 'rebuildFinancials', 'generateNotifications'].includes(action)) {
                useAppStore.getState().refresh();
            }
            
            return result || { ok: true };
        }
    } catch (e: any) {
        console.error(`API call failed: ${domain}.${action}`, e);
        toast.error(e.message || 'An unexpected error occurred.');
        throw e;
    }
  }, [db, currentUser]);
  
  const refreshData = useCallback(async () => {
    try {
      await dbEngine.initialize();
      const allData = await dbEngine.getAllData();
      const currentUserId = sessionStorage.getItem('currentUserId');
      const user = allData.auth?.users?.find((u: User) => u.id === currentUserId) || allData.auth?.users?.[0] || null;
      
      setDb(allData);
      setCurrentUser(user);
      setIsReady(true);
    } catch(e) {
      console.error("Fatal: Could not load data from backend.", e);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, version]); // Re-fetch when version changes

  const contractBalances = useMemo(() => Object.fromEntries((db.contractBalances || []).map(b => [b.contractId, b])), [db.contractBalances]);
  const ownerBalances = useMemo(() => Object.fromEntries((db.ownerBalances || []).map(b => [b.ownerId, b])), [db.ownerBalances]);
  const accountBalances = useMemo(() => Object.fromEntries((db.accountBalances || []).map(b => [b.accountId, b])), [db.accountBalances]);
  const tenantBalances = useMemo(() => Object.fromEntries((db.tenantBalances || []).map(b => [b.tenantId, b])), [db.tenantBalances]);
  
  const isReadOnly = useMemo(() => {
    if (!currentUser || !db.governance) return true;
    if (currentUser.role === 'ADMIN') return false;
    return db.governance.isLocked;
  }, [currentUser, db.governance]);
  
  const canAccess = useCallback((action: PermissionAction): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'MANAGER') {
      const managerAllowed: PermissionAction[] = ['VIEW_DASHBOARD', 'MANAGE_PROPERTIES', 'MANAGE_CONTRACTS', 'MANAGE_FINANCIALS', 'VIEW_REPORTS'];
      return managerAllowed.includes(action);
    }
    const userAllowed: PermissionAction[] = ['VIEW_DASHBOARD', 'MANAGE_PROPERTIES', 'MANAGE_CONTRACTS'];
    return userAllowed.includes(action);
  }, [currentUser]);

  const updateSettings = async (updates: Partial<Settings>) => {
    const newSettings = { ...db.settings, ...updates };
    await apiCall('data', 'updateSettings', { settings: newSettings });
    await refreshData();
    toast.success("تم حفظ الإعدادات.");
  };

  const updateGovernance = async (updates: Partial<Governance>) => {
    const newGov = { ...db.governance, ...updates };
    await apiCall('data', 'updateGovernance', { governance: newGov });
    await refreshData();
  }

  const generateOwnerPortalLink = async (ownerId: string): Promise<string> => {
    const baseUrl = window.location.href.split('#')[0];
    const token = btoa(`${ownerId}:${Date.now()}`);
    const updatedOwner = await apiCall('data', 'update', { table: 'owners', id: ownerId, data: { portalToken: token }});
    await refreshData();
    return `${baseUrl}#/owner-view/${ownerId}?auth=${token}`;
  };

  const value: AppContextType = {
    db,
    currentUser,
    isReady,
    isReadOnly,
    refreshData,
    contractBalances, ownerBalances, accountBalances, tenantBalances,
    auth: {
      login: async (username, password) => {
        const result = await apiCall('auth', 'login', { username, password });
        if (result.ok) {
            sessionStorage.setItem('currentUserId', result.user.id);
            await refreshData();
        }
        return result;
      },
      logout: () => {
        sessionStorage.removeItem('currentUserId');
        setCurrentUser(null);
        window.location.hash = '/login';
      },
      addUser: async (user, pass) => {
        const result = await apiCall('auth', 'addUser', { user, pass });
        if (result.ok) await refreshData();
        return result;
      },
      updateUser: async (id, updates) => {
        const result = await apiCall('auth', 'updateUser', { id, updates });
        if (result.ok) await refreshData();
        return result;
      },
      changePassword: async (id, newPass) => {
        const result = await apiCall('auth', 'changePassword', { id: id, userId: id, newPass });
        if (result.ok) {
            await refreshData();
        }
        return result;
      },
      forcePasswordReset: async (id) => {
        const result = await apiCall('auth', 'forcePasswordReset', { id: id, userId: id });
        if (result.ok) await refreshData();
        return result;
      },
    },
    dataService: {
        add: (table, data) => apiCall('data', 'add', { table, data }),
        update: (table, id, data) => apiCall('data', 'update', { table, id, data }),
        remove: (table, id) => apiCall('data', 'remove', { table, id }),
    },
    financeService: {
        createContract: (contractData) => apiCall('finance', 'createContract', { contractData }),
        payInstallment: (invoiceId, paymentDate, receiptNo, amount) => apiCall('finance', 'payInstallment', { invoiceId, paymentDate, receiptNo, amount }),
        addReceiptWithAllocations: (receipt, allocations) => apiCall('finance', 'addReceiptWithAllocations', { receipt, allocations }),
        voidReceipt: (id) => apiCall('finance', 'voidReceipt', { id }),
        voidExpense: (id) => apiCall('finance', 'voidExpense', { id }),
        voidInvoice: (id) => apiCall('finance', 'voidInvoice', { id }),
        voidDepositTx: (id) => apiCall('finance', 'voidDepositTx', { id }),
        voidOwnerSettlement: (id) => apiCall('finance', 'voidOwnerSettlement', { id }),
        generateMonthlyInvoices: () => apiCall('finance', 'generateMonthlyInvoices'),
        addManualJournalVoucher: (data: any) => apiCall('finance', 'addManualJournalVoucher', data),
        payoutCommission: (id: string) => apiCall('finance', 'payoutCommission', { id }),
    },
    canAccess,
    rebuildFinancials: async () => {
        const tId = toast.loading("جاري تدقيق وإعادة بناء السجلات المالية...");
        try {
            await apiCall('engine', 'rebuildFinancials');
            await refreshData();
            toast.success("اكتملت عملية التدقيق المالي.", { id: tId });
        } catch (e) { toast.error("فشل التدقيق المالي.", { id: tId }); }
    },
    createBackup: async () => {
        return await backupService.createBackup();
    },
    createSnapshot: async (note: string) => {
        const tId = toast.loading("جاري إنشاء نقطة استعادة...");
        try {
            const backupJson = await backupService.createBackup();
            await dbEngine.snapshots.add({ id: crypto.randomUUID(), note, ts: Date.now(), data: JSON.parse(backupJson).data });
            await refreshData();
            toast.success("تم إنشاء نقطة استعادة بنجاح.", { id: tId });
        } catch (e) {
            toast.error("فشل إنشاء نقطة الاستعادة.", { id: tId });
        }
    },
    restoreBackup: async (json) => {
        const tId = toast.loading("جاري التحقق واستعادة البيانات...");
        try {
            const result = await backupService.restoreBackup(json, currentUser);
            if (result.success) {
                toast.success("تمت استعادة البيانات بنجاح. سيتم تحديث الصفحة.", { id: tId });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error("فشل استعادة البيانات. راجع سجل التشخيص.", { id: tId });
            }
        } catch (e: any) {
            toast.error(e.message || "فشل الاستعادة.", { id: tId });
        }
    },
    wipeData: async () => {
        await apiCall('data', 'wipeData');
        toast.success("تم مسح جميع البيانات. سيتم إعادة تشغيل التطبيق.");
        setTimeout(() => window.location.reload(), 1500);
    },
    updateSettings,
    updateGovernance,
    generateOwnerPortalLink,
    generateNotifications: () => apiCall('engine', 'generateNotifications'),
    sendWhatsApp: (phone, message) => {
        const cleanPhone = sanitizePhoneNumber(phone);
        if (!cleanPhone) { toast.error("رقم الهاتف غير صحيح"); return; }
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    },
    // Desktop-only features
    googleUser: null,
    googleSignIn: () => toast.error('هذه الميزة غير متوفرة في نسخة سطح المكتب'),
    googleSignOut: () => {},
    syncToGoogleDrive: async () => { toast.error('هذه الميزة غير متوفرة في نسخة سطح المكتب'); },
    restoreFromGoogleDrive: async () => { toast.error('هذه الميزة غير متوفرة في نسخة سطح المكتب'); }
  };

  if (!isReady) {
      return (
          <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-bold animate-pulse">جاري تحضير المحرك المالي لـ Rentrix...</p>
          </div>
      );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
