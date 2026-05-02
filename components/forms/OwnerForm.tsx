
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Owner } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

const OwnerForm: React.FC<{ isOpen: boolean, onClose: () => void, owner: Owner | null }> = ({ isOpen, onClose, owner }) => {
    const { dataService } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [managementContractDate, setManagementContractDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [commissionType, setCommissionType] = useState<Owner['commissionType']>('RATE');
    const [commissionValue, setCommissionValue] = useState(0);

    useEffect(() => {
        if (owner) {
            setName(owner.name);
            setPhone(owner.phone);
            setAddress(owner.address || '');
            setManagementContractDate(owner.managementContractDate || '');
            setBankName(owner.bankName || '');
            setBankAccountNumber(owner.bankAccountNumber || '');
            setNotes(owner.notes);
            setCommissionType(owner.commissionType);
            setCommissionValue(owner.commissionValue);
        } else {
            setName('');
            setPhone('');
            setAddress('');
            setManagementContractDate('');
            setBankName('');
            setBankAccountNumber('');
            setNotes('');
            setCommissionType('RATE');
            setCommissionValue(0);
        }
    }, [owner, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { toast.error("اسم المالك مطلوب"); return; }
        if (commissionValue < 0) {
            toast.error("قيمة العمولة لا يمكن أن تكون سالبة.");
            return;
        }

        const data = { name, phone, address, managementContractDate, bankName, bankAccountNumber, notes, commissionType, commissionValue };
        if (owner) {
            dataService.update('owners', owner.id, data);
        } else {
            dataService.add('owners', data as any);
        }
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={owner ? 'تعديل مالك' : 'إضافة مالك'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات الأساسية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="text-xs font-bold block mb-1">الاسم</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">الهاتف</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-xs font-bold block mb-1">العنوان</label>
                            <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                    </div>

                    {/* Contract Info */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">معلومات التعاقد والعمولة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="text-xs font-bold block mb-1">تاريخ التعاقد</label>
                                <input type="date" value={managementContractDate} onChange={e => setManagementContractDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">نوع عمولة المكتب</label>
                                <select value={commissionType} onChange={e => setCommissionType(e.target.value as Owner['commissionType'])}>
                                   <option value="RATE">نسبة مئوية (%)</option>
                                   <option value="FIXED_MONTHLY">مبلغ شهري ثابت</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">
                                    {commissionType === 'RATE' ? 'قيمة النسبة (%)' : 'المبلغ الشهري'}
                                </label>
                                <input type="number" value={commissionValue} onChange={e => setCommissionValue(Math.max(0, Number(e.target.value)))} required />
                            </div>
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات البنكية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="text-xs font-bold block mb-1">اسم البنك</label>
                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">رقم الحساب</label>
                                <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                         <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">ملاحظات</h3>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-4" rows={3}/>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default OwnerForm;
