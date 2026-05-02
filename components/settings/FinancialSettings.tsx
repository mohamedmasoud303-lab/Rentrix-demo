import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import Card from '../ui/Card';
import { BadgeDollarSign, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FinancialSettings: React.FC = () => {
    const { db, updateSettings, updateGovernance } = useApp();
    const settings = db.settings;
    const governance = db.governance;
    const [taxRate, setTaxRate] = useState(settings?.taxRate || 0);
    const [currency, setCurrency] = useState(settings?.currency || 'OMR');
    const [lockDate, setLockDate] = useState(governance?.financialLockDate || '');

    useEffect(() => {
        if(governance) setLockDate(governance.financialLockDate);
    }, [governance]);

    const handleSave = () => {
        updateSettings({ taxRate, currency: currency as any });
        toast.success("تم حفظ السياسات المالية");
    };
    
    const handleLock = () => {
        if (!lockDate) {
            toast.error("يرجى تحديد تاريخ القفل.");
            return;
        }
        if (window.confirm(`هل أنت متأكد من قفل جميع الحركات المالية حتى تاريخ ${lockDate}؟ لا يمكن التراجع عن هذا الإجراء بسهولة.`)) {
            updateGovernance({ financialLockDate: lockDate });
            toast.success("تم تحديث تاريخ قفل الفترة المالية بنجاح.");
        }
    };

    return (
        <Card className="max-w-3xl border-border/50 p-6">
            <div className="space-y-10">
                <div>
                    <h2 className="text-xl font-black flex items-center gap-2 mb-6">
                        <BadgeDollarSign className="text-primary"/> السياسات المالية
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold block mb-1 text-heading">نسبة ضريبة القيمة المضافة (%)</label>
                            <input 
                                type="number" 
                                value={taxRate} 
                                onChange={e => setTaxRate(Number(e.target.value))} 
                                className="input-field" 
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold block mb-1 text-heading">العملة الأساسية للنظام</label>
                            <select 
                                value={currency} 
                                onChange={e => setCurrency(e.target.value as "OMR" | "SAR" | "EGP")} 
                                className="input-field"
                            >
                                <option value="OMR">ريال عماني (OMR)</option>
                                <option value="SAR">ريال سعودي (SAR)</option>
                                <option value="EGP">جنيه مصري (EGP)</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleSave} className="btn bg-primary text-primary-foreground hover:bg-primary/90 w-fit mt-6">حفظ الإعدادات</button>
                </div>

                 <div className="p-6 border-2 border-dashed border-danger/30 rounded-2xl bg-danger/5">
                    <h2 className="text-lg font-black flex items-center gap-2 mb-2 text-danger">
                        <Lock size={20}/> قفل الفترة المحاسبية
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        حدد تاريخاً لإقفال الفترة. لن يتمكن أي مستخدم من إضافة أو تعديل أي حركة مالية (سندات، مصروفات، فواتير) قبل أو في هذا التاريخ.
                    </p>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-grow w-full">
                            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-heading">إقفال جميع الحركات حتى تاريخ:</label>
                            <input 
                                type="date" 
                                value={lockDate} 
                                onChange={e => setLockDate(e.target.value)} 
                                className="input-field" 
                            />
                        </div>
                        <button onClick={handleLock} className="btn bg-danger text-danger-foreground hover:bg-danger/90 w-full sm:w-auto">تأكيد القفل</button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default FinancialSettings;
