
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Lead } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

const LeadForm: React.FC<{ isOpen: boolean, onClose: () => void, lead: Lead | null }> = ({ isOpen, onClose, lead }) => {
// FIX: `settings` is not a direct property of AppContext, it's inside `db`.
    const { dataService, db } = useApp();
    const { settings } = db;
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [desiredUnitType, setDesiredUnitType] = useState('');
    const [minBudget, setMinBudget] = useState<number | undefined>();
    const [maxBudget, setMaxBudget] = useState<number | undefined>();
    const [status, setStatus] = useState<Lead['status']>('NEW');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (lead) {
                setName(lead.name);
                setPhone(lead.phone);
                setEmail(lead.email || '');
                setDesiredUnitType(lead.desiredUnitType || '');
                setMinBudget(lead.minBudget);
                setMaxBudget(lead.maxBudget);
                setStatus(lead.status);
                setNotes(lead.notes);
            } else {
                setName('');
                setPhone('');
                setEmail('');
                setDesiredUnitType('');
                setMinBudget(undefined);
                setMaxBudget(undefined);
                setStatus('NEW');
                setNotes('');
            }
        }
    }, [lead, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) {
            toast.error("الاسم والهاتف مطلوبان.");
            return;
        }

        const data = { name, phone, email, desiredUnitType, minBudget, maxBudget, status, notes };
        if (lead) {
            dataService.update('leads', lead.id, data);
        } else {
            dataService.add('leads', data as any);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'تعديل عميل محتمل' : 'إضافة عميل محتمل'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الاسم</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الهاتف</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الوحدة المطلوبة</label>
                        <input type="text" value={desiredUnitType} onChange={e => setDesiredUnitType(e.target.value)} placeholder="مثال: شقة غرفتين"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">أقل ميزانية ({settings.currency})</label>
                        <input type="number" value={minBudget || ''} onChange={e => setMinBudget(Number(e.target.value) || undefined)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">أعلى ميزانية ({settings.currency})</label>
                        <input type="number" value={maxBudget || ''} onChange={e => setMaxBudget(Number(e.target.value) || undefined)} />
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium mb-1">الحالة</label>
                     <select value={status} onChange={e => setStatus(e.target.value as Lead['status'])}>
                        <option value="NEW">جديد</option>
                        <option value="CONTACTED">تم التواصل</option>
                        <option value="INTERESTED">مهتم</option>
                        <option value="NOT_INTERESTED">غير مهتم</option>
                        <option value="CLOSED">مغلق</option>
                     </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
                 <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default LeadForm;
