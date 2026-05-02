import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Receipt } from '../../types';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../utils/helpers';

interface EditReceiptFormProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: Receipt | null;
}

const EditReceiptForm: React.FC<EditReceiptFormProps> = ({ isOpen, onClose, receipt }) => {
    const { db, dataService } = useApp();
    const [dateTime, setDateTime] = useState('');
    const [ref, setRef] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if (receipt) {
            setDateTime(receipt.dateTime.slice(0, 16));
            setRef(receipt.ref);
            setNotes(receipt.notes);
        }
    }, [receipt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!receipt) return;
        dataService.update('receipts', receipt.id, { dateTime, ref, notes });
        onClose();
    };

    if (!receipt) return null;
    const contract = db.contracts.find(c => c.id === receipt.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تعديل سند قبض #${receipt.no}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-background rounded-md border border-border">
                    <p className="text-sm"><strong>المستأجر:</strong> {tenant?.name}</p>
                    <p className="text-sm"><strong>المبلغ:</strong> {formatCurrency(receipt.amount, db.settings.currency)}</p>
                </div>
                <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لا يمكن تعديل المبلغ أو العقد لضمان سلامة القيود المحاسبية.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">التاريخ والوقت</label>
                        <input 
                            type="datetime-local" 
                            value={dateTime} 
                            onChange={e => setDateTime(e.target.value)} 
                            required 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">مرجع / رقم الحوالة</label>
                        <input 
                            value={ref} 
                            onChange={e => setRef(e.target.value)} 
                            className="input-field"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">ملاحظات</label>
                    <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        rows={2} 
                        className="input-field"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ التعديلات</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditReceiptForm;
