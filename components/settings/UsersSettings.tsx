import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { User, UserRole } from '../../types';
import Card from '../ui/Card';
import ActionsMenu, { EditAction } from '../shared/ActionsMenu';
import { ShieldCheck, UserPlus, KeyRound } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import UserForm from '../forms/UserForm';

const UsersSettings: React.FC = () => {
    const { db, auth } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const getRoleLabel = (role: UserRole) => {
        const map = { ADMIN: 'مدير نظام', MANAGER: 'مشرف عمليات', USER: 'موظف إدخال' };
        return map[role] || role;
    };

    if (!db) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-border/50 p-6">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <ShieldCheck className="text-primary"/> 
                        إدارة المستخدمين
                    </h2>
                    <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="btn bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                        <UserPlus size={18} /> 
                        إضافة مستخدم
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {db.auth.users.map(u => (
                        <div key={u.id} className="bg-muted/30 border border-border p-5 rounded-2xl relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className={`absolute top-0 right-0 w-1.5 h-full ${u.role === 'ADMIN' ? 'bg-danger' : u.role === 'MANAGER' ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xl">
                                        {u.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-foreground">{u.username}</h4>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{getRoleLabel(u.role)}</p>
                                    </div>
                                </div>
                                 <ActionsMenu items={[
                                    EditAction(() => { setEditingUser(u); setIsModalOpen(true); }),
                                    { label: 'إعادة تعيين المرور', icon: <KeyRound size={16} />, onClick: () => auth.forcePasswordReset(u.id) }
                                ]} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-4 border-t border-border/50">
                                <span>أنشئ في: {formatDate(new Date(u.createdAt).toISOString())}</span>
                                {u.mustChange && <span className="text-danger font-bold bg-danger/10 px-2 py-0.5 rounded-full">يتطلب تغيير كلمة السر</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            {isModalOpen && <UserForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} />}
        </div>
    );
};

export default UsersSettings;
