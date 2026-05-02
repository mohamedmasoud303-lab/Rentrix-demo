
import { dbEngine } from './db';
import { User } from '../types';
import { toast } from 'react-hot-toast';

async function sha256(msg: string): Promise<string> {
  const enc = new TextEncoder().encode(msg);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randSalt(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  login: async (username: string, password: string): Promise<{ok: boolean, msg: string, user?: User}> => {
    const user = await dbEngine.users.where('username').equals(username).first();
    if (!user || await sha256(password + user.salt) !== user.hash) {
      return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }
    sessionStorage.setItem('currentUserId', user.id);
    return { ok: true, msg: 'Logged in', user };
  },

  logout: () => {
    sessionStorage.removeItem('currentUserId');
    window.location.reload(); // Reload to clear all app state
  },
  
  getCurrentUserId: (): string | null => {
    return sessionStorage.getItem('currentUserId');
  },

  changePassword: async (userId: string, newPass: string): Promise<{ ok: boolean }> => {
    const salt = randSalt();
    const hash = await sha256(newPass + salt);
    await dbEngine.users.update(userId, { hash, salt, mustChange: false });
    return { ok: true };
  },

  addUser: async (user: Omit<User, 'id' | 'createdAt' | 'salt' | 'hash'>, pass: string): Promise<{ ok: boolean; msg: string; newUser?: User; }> => {
    const existing = await dbEngine.users.where('username').equals(user.username).first();
    if (existing) {
      return { ok: false, msg: 'اسم المستخدم موجود بالفعل' };
    }
    const salt = randSalt();
    const hash = await sha256(pass + salt);
    const id = crypto.randomUUID();
    const newUser: User = { ...user, id, createdAt: Date.now(), salt, hash };
    await dbEngine.users.add(newUser);
    return { ok: true, msg: 'User created', newUser };
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
    await dbEngine.users.update(id, updates);
  },

  forcePasswordReset: async (userId: string): Promise<{ ok: boolean }> => {
    if (window.confirm('هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟')) {
      await dbEngine.users.update(userId, { mustChange: true });
      toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
      return { ok: true };
    }
    return { ok: false };
  },
};
