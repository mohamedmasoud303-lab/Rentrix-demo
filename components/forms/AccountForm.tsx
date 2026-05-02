import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Account } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface AccountFormProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account | null;
}

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, account }) => {
    const { db, dataService } = useApp();
    const allAccounts = db.accounts || [];
    const [data, setData] = useState<Partial<Account>>({});

    useEffect(() => {
        if (account) setData(account);
        else setData({ no: '', name: '', type: 'ASSET', isParent: false, parentId: null });
    }, [account]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // @ts-ignore
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (value === 'null' ? null : value);
        setData(prev => ({...prev, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!data.name || !data.no) { toast.error("رقم الحساب واسمه حقول مطلوبة."); return; }
        if (account) dataService.update('accounts', account.id, data); else dataService.add('accounts', data as any);
        onClose();
    };
    
    const parentAccounts = useMemo(() => (allAccounts || []).filter(a => a.isParent), [allAccounts]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">رقم الحساب (كود)</label>
                        <input name="no" value={data.no || ''} onChange={handleChange} placeholder="مثال: 1101" required className="input-field"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">اسم الحساب</label>
                        <input name="name" value={data.name || ''} onChange={handleChange} placeholder="مثال: البنك الوطني" required className="input-field"/>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">نوع الحساب</label>
                        <select name="type" value={data.type} onChange={handleChange} className="input-field">
                            <option value="ASSET">أصول</option>
                            <option value="LIABILITY">التزامات</option>
                            <option value="EQUITY">حقوق ملكية</option>
                            <option value="REVENUE">إيرادات</option>
                            <option value="EXPENSE">مصروفات</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">الحساب الرئيسي (الأب)</label>
                        <select name="parentId" value={data.parentId || 'null'} onChange={handleChange} className="input-field">
                            <option value="null">-- حساب رئيسي (مستوى 1) --</option>
                            {parentAccounts?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.no})</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-neutral/20 rounded-lg">
                    <input type="checkbox" name="isParent" checked={data.isParent || false} onChange={handleChange} id="is-parent-checkbox" className="w-5 h-5 accent-primary" />
                    <label htmlFor="is-parent-checkbox" className="text-sm font-bold text-heading">هذا حساب أب (يحتوي على حسابات فرعية)</label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ الحساب</button>
                </div>
            </form>
        </Modal>
    );
};

export default AccountForm;
