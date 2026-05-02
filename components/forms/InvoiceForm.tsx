import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Invoice } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

const InvoiceForm: React.FC<{ isOpen: boolean, onClose: () => void, invoice: Invoice | null }> = ({ isOpen, onClose, invoice }) => {
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amount, setAmount] = useState(0);
    const [type, setType] = useState<Invoice['type']>('UTILITY');
    const [notes, setNotes] = useState('');

    const isReadOnly = !!(invoice && (invoice.type === 'RENT' || invoice.type === 'LATE_FEE'));

    const unitsWithProperties = useMemo(() => {
        return db.units.map(u => {
            const property = db.properties.find(p => p.id === u.propertyId);
            return { ...u, propertyName: property?.name || '' };
        }).sort((a,b) => a.propertyName.localeCompare(b.propertyName) || a.name.localeCompare(b.name));
    }, [db.units, db.properties]);
    
    const activeContractForUnit = useMemo(() => {
        if (!unitId) return null;
        return db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE');
    }, [unitId, db.contracts]);

    useEffect(() => {
        if (isOpen) {
            if (invoice) {
                const contract = db.contracts.find(c => c.id === invoice.contractId);
                setUnitId(contract?.unitId || '');
                setDueDate(invoice.dueDate);
                setAmount(invoice.amount);
                setType(invoice.type);
                setNotes(invoice.notes);
            } else {
                setUnitId(unitsWithProperties[0]?.id || '');
                setDueDate(new Date().toISOString().slice(0, 10));
                setAmount(0);
                setType('UTILITY');
                setNotes('');
            }
        }
    }, [isOpen, invoice, unitsWithProperties, db.contracts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!unitId || amount <= 0) {
            toast.error("يرجى تحديد الوحدة وإدخال مبلغ صحيح.");
            return;
        }
        if (!activeContractForUnit) {
            toast.error("لا يمكن إنشاء فاتورة لوحدة شاغرة. لإضافة تكاليف على المالك، يرجى إنشاء 'مصروف' من قسم المالية.");
            return;
        }
        
        const data = {
            contractId: activeContractForUnit.id,
            dueDate,
            amount,
            paidAmount: invoice ? invoice.paidAmount : 0,
            status: invoice ? invoice.status : 'UNPAID',
            type,
            notes,
        };

        if (invoice) {
            dataService.update('invoices', invoice.id, data);
        } else {
            dataService.add('invoices', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "عرض تفاصيل الفاتورة" : (invoice ? "تعديل فاتورة" : "إضافة فاتورة يدوية")}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {invoice && !isReadOnly && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لتعديل تاريخ استحقاق هذه الفاتورة، قم بتغيير حقل التاريخ واحفظ التغييرات.</p>}
                <div>
                    <label className="block text-sm font-medium mb-1">الوحدة</label>
                    <select value={unitId} onChange={e => setUnitId(e.target.value)} required disabled={isReadOnly}>
                        <option value="">-- اختر الوحدة --</option>
                        {unitsWithProperties.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.propertyName} - {u.name}
                            </option>
                        ))}
                    </select>
                     {unitId && !activeContractForUnit && !isReadOnly && (
                        <p className="text-xs text-red-500 mt-1">هذه الوحدة شاغرة. لا يمكن إنشاء فاتورة. لإضافة تكلفة على المالك، أنشئ مصروفاً.</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الفاتورة</label>
                        <select value={type} onChange={e => setType(e.target.value as Invoice['type'])} disabled={isReadOnly}>
                            <option value="UTILITY">خدمات</option>
                            <option value="MAINTENANCE">صيانة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المبلغ</label>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required disabled={isReadOnly} />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required disabled={isReadOnly} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات (مثال: فاتورة كهرباء شهر يونيو)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} required disabled={isReadOnly} />
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                        <button type="submit" className="btn btn-primary" disabled={!activeContractForUnit}>حفظ</button>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default InvoiceForm;
