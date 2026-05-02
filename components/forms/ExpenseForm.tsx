import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Expense } from '../../types';
import Modal from '../ui/Modal';

interface ExpenseFormProps {
    isOpen: boolean;
    onClose: () => void;
    expense: Expense | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, expense }) => {
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('صيانة');
    const [amount, setAmount] = useState(0);
    const [chargedTo, setChargedTo] = useState<Expense['chargedTo']>('OWNER');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [payee, setPayee] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (expense) {
            setContractId(expense.contractId);
            setCategory(expense.category);
            setAmount(expense.amount);
            setChargedTo(expense.chargedTo || 'OWNER');
            setDateTime(expense.dateTime.slice(0, 16));
            setPayee(expense.payee || '');
            setNotes(expense.notes || '');
        }
    }, [expense]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { contractId, dateTime, category, amount, status: 'POSTED' as const, chargedTo, ref: '', notes, payee };
        if (expense) {
            dataService.update('expenses', expense.id, data);
        } else {
            dataService.add('expenses', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">التصنيف</label>
                        <input 
                            value={category} 
                            onChange={e => setCategory(e.target.value)} 
                            required 
                            placeholder="مثال: صيانة، كهرباء، عمولة" 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">المبلغ</label>
                        <input 
                            type="number" 
                            value={amount || ''} 
                            onChange={e => setAmount(Number(e.target.value))} 
                            required 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">يخصم من</label>
                        <select 
                            value={chargedTo} 
                            onChange={e => setChargedTo(e.target.value as any)}
                            className="input-field"
                        >
                            <option value="OWNER">حساب المالك</option>
                            <option value="OFFICE">حساب المكتب</option>
                            <option value="TENANT">حساب المستأجر</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">العقد المرتبط (اختياري)</label>
                        <select 
                            value={contractId || ''} 
                            onChange={e => setContractId(e.target.value || null)}
                            className="input-field"
                        >
                            <option value="">-- مصروف مكتب عام --</option>
                            {db.contracts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {db.tenants.find(t => t.id === c.tenantId)?.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">تاريخ المصروف</label>
                        <input 
                            type="datetime-local" 
                            value={dateTime} 
                            onChange={e => setDateTime(e.target.value)} 
                            required 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">المستلم / الجهة</label>
                        <input 
                            value={payee} 
                            onChange={e => setPayee(e.target.value)} 
                            placeholder="اسم الفني أو الشركة" 
                            className="input-field"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">ملاحظات إضافية</label>
                    <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        rows={2} 
                        className="input-field"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ وتسجيل المصروف</button>
                </div>
            </form>
        </Modal>
    );
};

export default ExpenseForm;
