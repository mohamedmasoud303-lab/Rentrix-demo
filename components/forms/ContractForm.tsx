import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Contract } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';
import AttachmentsManager from '../shared/AttachmentsManager';

interface ContractFormProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    defaultUnitId?: string;
}

const ContractForm: React.FC<ContractFormProps> = ({ isOpen, onClose, contract, defaultUnitId }) => {
    const { db, dataService, financeService, refreshData } = useApp();
    const [data, setData] = useState<Partial<Omit<Contract, 'id' | 'createdAt'>>>({});

    const availableUnits = useMemo(() => {
        return db.units.filter(u => !db.contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE' && c.id !== contract?.id));
    }, [db.units, db.contracts, contract]);

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        if (contract) {
            setData(contract);
        } else {
            const startDate = new Date(today);
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            
            // Find first available unit if defaultUnitId is not provided or not available
            const initialUnitId = defaultUnitId || availableUnits[0]?.id || '';
            
            setData({
                unitId: initialUnitId,
                tenantId: db.tenants[0]?.id || '',
                rent: 0,
                dueDay: 1,
                start: today,
                end: endDate.toISOString().slice(0, 10),
                deposit: 0,
                status: 'ACTIVE',
                paymentCycle: 'Monthly'
            });
        }
    }, [contract, isOpen, db.tenants, availableUnits, defaultUnitId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({
            ...prev,
            [name]: ['rent', 'dueDay', 'deposit'].includes(name) ? Number(value) : value
        }));
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setData(prev => ({ ...prev, start: newStart }));
        try {
            const startDate = new Date(newStart);
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            setData(prev => ({ ...prev, end: endDate.toISOString().slice(0, 10) }));
        } catch (error) {
            console.error("Invalid date", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.unitId || !data.tenantId || !data.start || !data.end) {
            toast.error("يرجى ملء جميع الحقول المطلوبة.");
            return;
        }

        try {
            if (contract) {
                await dataService.update('contracts', contract.id, data);
                toast.success("تم تحديث العقد بنجاح");
            } else {
                await financeService.createContract(data as Omit<Contract, 'id' | 'createdAt'>);
                toast.success("تم إنشاء العقد بنجاح");
            }
            await refreshData();
            onClose();
        } catch (e: any) {
            toast.error(e.message || "حدث خطأ أثناء حفظ العقد");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل عقد' : 'إضافة عقد'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-md font-semibold border-b border-border pb-2">تفاصيل العقد</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">الوحدة</label>
                            <select 
                                name="unitId" 
                                value={data.unitId} 
                                onChange={handleChange} 
                                required
                                className="input-field"
                            >
                                <option value="">اختر الوحدة...</option>
                                {contract && !availableUnits.some(u => u.id === contract.unitId) && (
                                    <option value={contract.unitId}>
                                        {db.units.find(u => u.id === contract.unitId)?.name} (الحالية)
                                    </option>
                                )}
                                {availableUnits.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({db.properties.find(p => p.id === u.propertyId)?.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">المستأجر</label>
                            <select 
                                name="tenantId" 
                                value={data.tenantId} 
                                onChange={handleChange} 
                                required
                                className="input-field"
                            >
                                <option value="">اختر المستأجر...</option>
                                {db.tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">قيمة الإيجار</label>
                            <input 
                                name="rent" 
                                type="number" 
                                value={data.rent} 
                                onChange={handleChange} 
                                placeholder="0.00" 
                                required 
                                className="input-field"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">دورة الدفع</label>
                            <select 
                                name="paymentCycle" 
                                value={data.paymentCycle || 'Monthly'} 
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="Monthly">شهري</option>
                                <option value="Quarterly">ربع سنوي</option>
                                <option value="Annual">سنوي</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">يوم الاستحقاق (1-28)</label>
                            <input 
                                name="dueDay" 
                                type="number" 
                                min="1" 
                                max="28" 
                                value={data.dueDay} 
                                onChange={handleChange} 
                                required 
                                className="input-field"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">تاريخ البدء</label>
                            <input 
                                name="start" 
                                type="date" 
                                value={data.start} 
                                onChange={handleStartDateChange} 
                                required 
                                className="input-field"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">تاريخ الانتهاء</label>
                            <input 
                                name="end" 
                                type="date" 
                                value={data.end} 
                                onChange={handleChange} 
                                required 
                                className="input-field"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">الوديعة (التأمين)</label>
                            <input 
                                name="deposit" 
                                type="number" 
                                value={data.deposit} 
                                onChange={handleChange} 
                                placeholder="0.00" 
                                className="input-field"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">الحالة</label>
                            <select 
                                name="status" 
                                value={data.status} 
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="ACTIVE">نشط</option>
                                <option value="ENDED">منتهي</option>
                                <option value="SUSPENDED">معلق</option>
                            </select>
                        </div>
                    </div>
                </div>

                {contract && (
                    <div className="pt-4 border-t border-border">
                        <AttachmentsManager entityType="CONTRACT" entityId={contract.id} />
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default ContractForm;
