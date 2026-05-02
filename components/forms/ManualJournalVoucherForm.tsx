import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/helpers';

interface ManualJournalVoucherFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const ManualJournalVoucherForm: React.FC<ManualJournalVoucherFormProps> = ({ isOpen, onClose, onSubmit }) => {
    const { db } = useApp();
    const accounts = db.accounts || [];
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<{ accountId: string; debit: number; credit: number }[]>([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]);

    const handleLineChange = (index: number, field: string, value: any) => {
        const newLines = [...lines]; (newLines[index] as any)[field] = value; setLines(newLines);
    };
    const addLine = () => setLines([...lines, { accountId: '', debit: 0, credit: 0 }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));
    const totals = useMemo(() => lines.reduce((acc, l) => ({ debit: acc.debit + (Number(l.debit) || 0), credit: acc.credit + (Number(l.credit) || 0) }), { debit: 0, credit: 0 }), [lines]);
    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.001 && totals.debit > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) { toast.error("القيد غير متوازن."); return; }
        await onSubmit({ date, notes, lines: lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0)) });
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إنشاء قيد يومية يدوي">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">تاريخ القيد</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-field" />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">البيان العام</label>
                        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="وصف العملية المحاسبية" required className="input-field" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-bold border-b pb-2">تفاصيل القيد (مدين ودائن)</h3>
                    {lines.map((line, index) => (
                        <div key={index} className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                            <select className="flex-1 min-w-[200px] p-2 border rounded-md" value={line.accountId} onChange={e => handleLineChange(index, 'accountId', e.target.value)} required>
                                <option value="">-- اختر الحساب --</option>
                                {accounts.filter(a => !a.isParent).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.no})</option>)}
                            </select>
                            <input className="w-24 md:w-32 p-2 border rounded-md" type="number" placeholder="مدين" value={line.debit || ''} onChange={e => handleLineChange(index, 'debit', parseFloat(e.target.value))} />
                            <input className="w-24 md:w-32 p-2 border rounded-md" type="number" placeholder="دائن" value={line.credit || ''} onChange={e => handleLineChange(index, 'credit', parseFloat(e.target.value))} />
                            <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 2} className="p-2 text-danger hover:bg-danger-foreground rounded-md disabled:opacity-30">×</button>
                        </div>
                    ))}
                    <button type="button" onClick={addLine} className="text-xs font-bold text-primary hover:underline">+ إضافة طرف آخر للقيد</button>
                </div>
                <div className={`flex justify-between p-3 rounded-lg font-black text-sm ${isBalanced ? 'bg-success-foreground text-success' : 'bg-danger-foreground text-danger'}`}>
                    <div>إجمالي المدين: {formatCurrency(totals.debit)}</div>
                    <div>إجمالي الدائن: {formatCurrency(totals.credit)}</div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90" disabled={!isBalanced}>حفظ وترحيل القيد</button>
                </div>
            </form>
        </Modal>
    );
};

export default ManualJournalVoucherForm;
