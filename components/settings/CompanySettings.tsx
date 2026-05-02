import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import Card from '../ui/Card';
import { Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CompanySettings: React.FC = () => {
    const { db, updateSettings } = useApp();
    const settings = db.settings;
    const [data, setData] = useState<any>(settings?.company || {});

    const handleSave = () => {
        updateSettings({ company: data });
        toast.success("تم حفظ معلومات المؤسسة بنجاح");
    };

    return (
        <Card className="max-w-3xl">
            <h2 className="text-xl font-black flex items-center gap-2 mb-6">
                <Building2 className="text-primary"/> معلومات المؤسسة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">اسم المؤسسة (يظهر في التقارير)</label>
                    <input 
                        value={data.name || ''} 
                        onChange={e => setData({...data, name: e.target.value})} 
                        className="w-full p-2 border rounded-md" 
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">العنوان</label>
                    <input 
                        value={data.address || ''} 
                        onChange={e => setData({...data, address: e.target.value})} 
                        className="w-full p-2 border rounded-md" 
                    />
                </div>
                <div>
                    <label className="text-sm font-medium block mb-1">رقم الهاتف</label>
                    <input 
                        value={data.phone || ''} 
                        onChange={e => setData({...data, phone: e.target.value})} 
                        className="w-full p-2 border rounded-md" 
                    />
                </div>
            </div>
            <button onClick={handleSave} className="btn btn-primary w-fit mt-6">حفظ التغييرات</button>
        </Card>
    );
};

export default CompanySettings;
