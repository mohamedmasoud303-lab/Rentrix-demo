import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Mission } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface MissionFormProps {
    isOpen: boolean;
    onClose: () => void;
    mission: Mission | null;
}

const MissionForm: React.FC<MissionFormProps> = ({ isOpen, onClose, mission }) => {
    const { db, dataService } = useApp();
    const [data, setData] = useState<Partial<Mission>>({});
    
    const { leads, owners } = db;

    useEffect(() => {
        if (mission) {
            setData(mission);
        } else {
            setData({ 
                title: '', 
                date: new Date().toISOString().slice(0, 10), 
                time: '10:00', 
                status: 'PLANNED', 
                leadId: null, 
                ownerId: null, 
                resultSummary: '' 
            });
        }
    }, [mission, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ 
            ...prev, 
            [name]: value === 'null' ? null : value 
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.title) {
            toast.error("العنوان مطلوب.");
            return;
        }
        
        if (mission) {
            dataService.update('missions', mission.id, data);
            toast.success("تم تحديث المهمة بنجاح");
        } else {
            dataService.add('missions', data as any);
            toast.success("تم إضافة المهمة بنجاح");
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mission ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-bold block mb-1 text-heading">عنوان المهمة</label>
                    <input 
                        name="title" 
                        value={data.title || ''} 
                        onChange={handleChange} 
                        placeholder="مثال: زيارة صيانة، معاينة وحدة" 
                        required 
                        className="input-field"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold block mb-1 text-heading">التاريخ</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={data.date || ''} 
                            onChange={handleChange} 
                            required 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold block mb-1 text-heading">الوقت</label>
                        <input 
                            type="time" 
                            name="time" 
                            value={data.time || ''} 
                            onChange={handleChange} 
                            required 
                            className="input-field"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold block mb-1 text-heading">ربط بعميل محتمل</label>
                        <select 
                            name="leadId" 
                            value={data.leadId || 'null'} 
                            onChange={handleChange}
                            className="input-field"
                        >
                            <option value="null">-- لا يوجد --</option>
                            {leads?.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold block mb-1 text-heading">ربط بمالك</label>
                        <select 
                            name="ownerId" 
                            value={data.ownerId || 'null'} 
                            onChange={handleChange}
                            className="input-field"
                        >
                            <option value="null">-- لا يوجد --</option>
                            {owners?.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1 text-heading">الحالة</label>
                    <select 
                        name="status" 
                        value={data.status} 
                        onChange={handleChange}
                        className="input-field"
                    >
                        <option value="PLANNED">مخطط لها</option>
                        <option value="COMPLETED">مكتملة</option>
                        <option value="CANCELLED">ملغاة</option>
                    </select>
                </div>
                {(data.status === 'COMPLETED') && (
                    <div>
                        <label className="text-sm font-bold block mb-1 text-heading">ملخص النتائج</label>
                        <textarea 
                            name="resultSummary" 
                            value={data.resultSummary || ''} 
                            onChange={handleChange} 
                            rows={2} 
                            placeholder="ماذا حدث خلال المهمة؟" 
                            className="input-field"
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ المهمة</button>
                </div>
            </form>
        </Modal>
    );
};

export default MissionForm;
