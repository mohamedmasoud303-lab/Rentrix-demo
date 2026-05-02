import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { MaintenanceRecord } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface MaintenanceFormProps {
    isOpen: boolean;
    onClose: () => void;
    record: MaintenanceRecord | null;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ isOpen, onClose, record }) => {
    const { db, dataService } = useApp();
    const [data, setData] = useState<Partial<MaintenanceRecord>>({});

    useEffect(() => {
        if (!db.settings) return;
        if (record) {
            setData(record);
        } else {
            setData({
                unitId: db.units[0]?.id || '',
                requestDate: new Date().toISOString().slice(0, 10),
                description: '',
                status: 'NEW',
                cost: 0,
                chargedTo: db.settings.maintenance.defaultChargedTo
            });
        }
    }, [record, isOpen, db.settings, db.units]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({
            ...prev,
            [name]: ['cost'].includes(name) ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db.settings || !data.unitId || !data.description) {
            toast.error("الوحدة والوصف مطلوبان.");
            return;
        }

        try {
            if (record) {
                if ((record.expenseId || record.invoiceId) && (record.status !== data.status || record.cost !== data.cost || record.chargedTo !== data.chargedTo)) {
                    toast.error("لا يمكن تعديل البيانات المالية لطلب مرتبط بحركة مالية. قم بإلغاء المصروف/الفاتورة أولاً.");
                    return;
                }
                
                const isNewlyCompleted = ['COMPLETED', 'CLOSED'].includes(data.status!) && !['COMPLETED', 'CLOSED'].includes(record.status) && (data.cost || 0) > 0;
                let updates: any = { ...data };

                if (isNewlyCompleted) {
                    const activeContract = db.contracts.find(c => c.unitId === data.unitId && c.status === 'ACTIVE');
                    
                    if (data.chargedTo === 'TENANT') {
                        if (!activeContract) {
                            toast.error("لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط.");
                            return;
                        }
                        const newInvoice = await dataService.add('invoices', {
                            contractId: activeContract.id,
                            dueDate: new Date().toISOString().slice(0, 10),
                            amount: data.cost!,
                            paidAmount: 0,
                            status: 'UNPAID',
                            type: 'MAINTENANCE',
                            notes: `فاتورة صيانة: ${data.description}`.slice(0, 100)
                        });
                        if (newInvoice) {
                            updates.invoiceId = newInvoice.id;
                            updates.completedAt = Date.now();
                        }
                    } else { // OWNER or OFFICE
                        const newExpense = await dataService.add('expenses', {
                            contractId: activeContract?.id || null,
                            dateTime: new Date().toISOString(),
                            category: 'صيانة',
                            amount: data.cost!,
                            ref: `صيانة للوحدة ${db.units.find(u => u.id === data.unitId)?.name}`,
                            notes: data.description || '',
                            chargedTo: data.chargedTo,
                            status: 'POSTED'
                        });
                        if (newExpense) {
                            updates.expenseId = newExpense.id;
                            updates.completedAt = Date.now();
                        }
                    }
                }
                await dataService.update('maintenanceRecords', record.id, updates);
                toast.success("تم تحديث طلب الصيانة بنجاح");
            } else {
                await dataService.add('maintenanceRecords', data as any);
                toast.success("تم إضافة طلب الصيانة بنجاح");
            }
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "فشل حفظ طلب الصيانة.");
        }
    };
    
    if (!db.settings) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? "تعديل طلب صيانة" : "إضافة طلب صيانة"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الوحدة</label>
                        <select 
                            name="unitId" 
                            value={data.unitId} 
                            onChange={handleChange} 
                            required
                            className="w-full p-2 border rounded-md"
                        >
                            {db.units.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({db.properties.find(p => p.id === u.propertyId)?.name})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">تاريخ الطلب</label>
                        <input 
                            name="requestDate" 
                            type="date" 
                            value={data.requestDate} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-sm font-medium">الوصف</label>
                    <textarea 
                        name="description" 
                        value={data.description} 
                        onChange={handleChange} 
                        required 
                        rows={3} 
                        placeholder="وصف المشكلة أو الطلب" 
                        className="w-full p-2 border rounded-md"
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الحالة</label>
                        <select 
                            name="status" 
                            value={data.status} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="NEW">جديد</option>
                            <option value="IN_PROGRESS">قيد التنفيذ</option>
                            <option value="COMPLETED">مكتمل</option>
                            <option value="CLOSED">مغلق</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">التكلفة</label>
                        <input 
                            name="cost" 
                            type="number" 
                            value={data.cost || ''} 
                            onChange={handleChange} 
                            placeholder="0.00"
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">يتحملها</label>
                        <select 
                            name="chargedTo" 
                            value={data.chargedTo} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="OWNER">المالك</option>
                            <option value="OFFICE">المكتب</option>
                            <option value="TENANT">المستأجر</option>
                        </select>
                    </div>
                 </div>

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default MaintenanceForm;
