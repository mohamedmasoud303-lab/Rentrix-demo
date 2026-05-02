import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { DepositTx } from '../../types';
import Modal from '../ui/Modal';

interface DepositTxFormProps {
    isOpen: boolean;
    onClose: () => void;
}

const DepositTxForm: React.FC<DepositTxFormProps> = ({ isOpen, onClose }) => {
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState(db.contracts[0]?.id || '');
    const [type, setType] = useState<DepositTx['type']>('DEPOSIT_IN');
    const [amount, setAmount] = useState(0);
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dataService.add('depositTxs', { 
            contractId, 
            type, 
            amount, 
            date: new Date().toISOString().slice(0, 10), 
            note, 
            status: 'POSTED' 
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="حركة مبلغ تأمين (وديعة)">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-bold block mb-1">العقد / المستأجر</label>
                    <select 
                        value={contractId} 
                        onChange={e => setContractId(e.target.value)} 
                        required
                        className="w-full p-2 border rounded-md"
                    >
                        {db.contracts.map(c => (
                            <option key={c.id} value={c.id}>
                                {db.tenants.find(t => t.id === c.tenantId)?.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">نوع الحركة</label>
                    <select 
                        value={type} 
                        onChange={e => setType(e.target.value as any)}
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="DEPOSIT_IN">إيداع مبلغ تأمين جديد</option>
                        <option value="DEPOSIT_RETURN">إرجاع التأمين للمستأجر</option>
                        <option value="DEPOSIT_DEDUCT">خصم من التأمين للصيانة</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">المبلغ</label>
                    <input 
                        type="number" 
                        value={amount || ''} 
                        onChange={e => setAmount(Number(e.target.value))} 
                        required 
                        placeholder="0.000" 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">السبب / ملاحظات</label>
                    <input 
                        value={note} 
                        onChange={e => setNote(e.target.value)} 
                        placeholder="مثال: تأمين عقد جديد، خصم تلفيات صبغ" 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-4">تأكيد الحركة المالية</button>
            </form>
        </Modal>
    );
};

export default DepositTxForm;
