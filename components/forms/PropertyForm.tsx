import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Property } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface PropertyFormProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property | null;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ isOpen, onClose, property }) => {
    const { db, dataService } = useApp();
    const [data, setData] = useState<Partial<Property>>({});

    useEffect(() => {
        if (property) {
            setData(property);
        } else {
            setData({ 
                name: '', 
                location: '', 
                ownerId: db.owners[0]?.id || '' 
            });
        }
    }, [property, isOpen, db.owners]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name || !data.ownerId) {
            toast.error("الاسم والمالك حقول مطلوبة.");
            return;
        }
        
        if (property) {
            dataService.update('properties', property.id, data);
            toast.success("تم تحديث العقار بنجاح");
        } else {
            dataService.add('properties', data as any);
            toast.success("تم إضافة العقار بنجاح");
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={property ? 'تعديل عقار' : 'إضافة عقار'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium block mb-1">اسم العقار</label>
                    <input 
                        name="name" 
                        value={data.name || ''} 
                        onChange={e => setData({...data, name: e.target.value})} 
                        placeholder="اسم العقار" 
                        required
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">الموقع</label>
                    <input 
                        name="location" 
                        value={data.location || ''} 
                        onChange={e => setData({...data, location: e.target.value})} 
                        placeholder="الموقع" 
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">المالك</label>
                    <select 
                        name="ownerId" 
                        value={data.ownerId || ''} 
                        onChange={e => setData({...data, ownerId: e.target.value})} 
                        required
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="">-- اختر المالك --</option>
                        {db.owners.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default PropertyForm;
