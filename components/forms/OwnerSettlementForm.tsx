import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { OwnerSettlement } from '../../types';
import Modal from '../ui/Modal';

interface OwnerSettlementFormProps {
    isOpen: boolean;
    onClose: () => void;
    settlement: OwnerSettlement | null;
}

const OwnerSettlementForm: React.FC<OwnerSettlementFormProps> = ({ isOpen, onClose, settlement }) => {
    const { db, dataService } = useApp();
    const [ownerId, setOwnerId] = useState(db.owners[0]?.id || '');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (settlement) {
            setOwnerId(settlement.ownerId);
            setAmount(settlement.amount);
            setDate(settlement.date);
            setNotes(settlement.notes || '');
        }
    }, [settlement]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ownerId, amount, date, method: 'BANK' as const, ref: '', notes, status: 'POSTED' as const };
        if (settlement) {
            dataService.update('ownerSettlements', settlement.id, data);
        } else {
            dataService.add('ownerSettlements', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "تعديل تسوية المالك" : "تحويل رصيد للمالك"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-bold block mb-1">المالك</label>
                    <select 
                        value={ownerId} 
                        onChange={e => setOwnerId(e.target.value)} 
                        required
                        className="input-field"
                    >
                        {db.owners.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">تاريخ التحويل</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        required 
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">المبلغ المحول</label>
                    <input 
                        type="number" 
                        value={amount || ''} 
                        onChange={e => setAmount(Number(e.target.value))} 
                        required 
                        placeholder="المبلغ المودع في حساب المالك" 
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">البيان / ملاحظات</label>
                    <input 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="مثال: تحويل صافي إيرادات شهر مايو" 
                        className="input-field"
                    />
                </div>
                <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90 w-full mt-4">حفظ وإثبات التحويل</button>
            </form>
        </Modal>
    );
};

export default OwnerSettlementForm;
