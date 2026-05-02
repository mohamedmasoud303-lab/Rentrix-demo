
import { create } from 'zustand';
import { dbEngine } from '../services/db';

export const dbService = {
  getAll: async (table: string) => {
    if (table === 'auth') {
        const users = await dbEngine.users.toArray();
        return { users };
    }
    if (['settings', 'governance', 'serials'].includes(table)) {
        const res = await (dbEngine as any)[table].get(1);
        if (res) {
            const { id, ...rest } = res;
            return rest;
        }
        return {};
    }
    return await (dbEngine as any)[table].toArray();
  },
  
  insert: async (table: string, data: any) => {
    const newRecord = { 
      ...data, 
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || Date.now() 
    };
    await (dbEngine as any)[table].add(newRecord);
    return newRecord;
  },
  
  update: async (table: string, id: string, data: any) => {
    await (dbEngine as any)[table].update(id, { ...data, updatedAt: Date.now() });
    return await (dbEngine as any)[table].get(id);
  },
  
  delete: async (table: string, id: string) => {
    await (dbEngine as any)[table].delete(id);
  }
};

// --- Zustand Store ---
interface AppState {
  currentPage: string;
  isLoading: boolean;
  version: number; // Incremented on every mutation to trigger re-fetches
  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  refresh: () => void;
  
  // CRUD Actions
  getAll: (table: string) => Promise<any[]>;
  insert: (table: string, data: any) => Promise<any>;
  update: (table: string, id: string, data: any) => Promise<any>;
  delete: (table: string, id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  isLoading: false,
  version: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
  setLoading: (loading) => set({ isLoading: loading }),
  refresh: () => set((state) => ({ version: state.version + 1 })),
  
  getAll: async (table) => await dbService.getAll(table),
  insert: async (table, data) => {
    const res = await dbService.insert(table, data);
    set((state) => ({ version: state.version + 1 }));
    return res;
  },
  update: async (table, id, data) => {
    const res = await dbService.update(table, id, data);
    set((state) => ({ version: state.version + 1 }));
    return res;
  },
  delete: async (table, id) => {
    await dbService.delete(table, id);
    set((state) => ({ version: state.version + 1 }));
  },
}));
