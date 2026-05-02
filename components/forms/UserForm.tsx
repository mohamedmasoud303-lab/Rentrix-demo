import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { User, UserRole } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, user }) => {
    const { auth } = useApp();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('USER');

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setRole(user.role);
            setPassword('');
        } else {
            setUsername('');
            setPassword('');
            setRole('USER');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (user) {
                await auth.updateUser(user.id, { username, role });
                toast.success("تم تحديث المستخدم بنجاح");
            } else {
                await auth.addUser({ username, role, mustChange: true }, password);
                toast.success("تم إضافة المستخدم بنجاح");
            }
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء حفظ المستخدم");
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium block mb-1">اسم المستخدم</label>
                    <input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        required 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                {!user && (
                    <div>
                        <label className="text-sm font-medium block mb-1">كلمة المرور المؤقتة</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                )}
                <div>
                    <label className="text-sm font-medium block mb-1">الرتبة / الصلاحيات</label>
                    <select 
                        value={role} 
                        onChange={e => setRole(e.target.value as UserRole)} 
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="USER">موظف عادي</option>
                        <option value="MANAGER">مشرف عمليات</option>
                        <option value="ADMIN">مدير نظام كامل</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ البيانات</button>
                </div>
            </form>
        </Modal>
    );
};

export default UserForm;
