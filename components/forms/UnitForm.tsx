import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Unit } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface UnitFormProps {
    isOpen: boolean;
    onClose: () => void;
    unit: Unit | null;
    propertyId: string;
}

const UnitForm: React.FC<UnitFormProps> = ({ isOpen, onClose, unit, propertyId }) => {
    const { dataService } = useApp();
    const [data, setData] = useState<Partial<Unit>>({});

    useEffect(() => {
        if (unit) {
            setData(unit);
        } else {
            setData({ 
                name: '', 
                type: 'شقة', 
                rentDefault: 0, 
                propertyId, 
                status: 'AVAILABLE' 
            });
        }
    }, [unit, propertyId, isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name) {
            toast.error("اسم الوحدة مطلوب.");
            return;
        }
        
        if (unit) {
            dataService.update('units', unit.id, data);
            toast.success("تم تحديث الوحدة بنجاح");
        } else {
            dataService.add('units', data as any);
            toast.success("تم إضافة الوحدة بنجاح");
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={unit ? 'تعديل وحدة' : 'إضافة وحدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium block mb-1">اسم/رقم الوحدة</label>
                    <input 
                        name="name" 
                        value={data.name || ''} 
                        onChange={e => setData({...data, name: e.target.value})} 
                        placeholder="مثال: شقة 101" 
                        required
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">نوع الوحدة</label>
                    <input 
                        name="type" 
                        value={data.type || ''} 
                        onChange={e => setData({...data, type: e.target.value})} 
                        placeholder="مثال: شقة، محل، مكتب" 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">الإيجار الافتراضي</label>
                    <input 
                        name="rentDefault" 
                        type="number" 
                        value={data.rentDefault || ''} 
                        onChange={e => setData({...data, rentDefault: Number(e.target.value)})} 
                        placeholder="0.00" 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default UnitForm;
