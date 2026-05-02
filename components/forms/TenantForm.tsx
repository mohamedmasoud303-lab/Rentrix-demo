
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Tenant } from '../../types';
import Modal from '../ui/Modal';
import AttachmentsManager from '../shared/AttachmentsManager';
import { toast } from 'react-hot-toast';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { analyzeText } from '../../services/geminiService';

const TenantForm: React.FC<{ isOpen: boolean, onClose: () => void, tenant: Tenant | null }> = ({ isOpen, onClose, tenant }) => {
    const { dataService } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idNo, setIdNo] = useState('');
    const [status, setStatus] = useState<Tenant['status']>('ACTIVE');
    const [notes, setNotes] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (tenant) {
            setName(tenant.name);
            setPhone(tenant.phone);
            setIdNo(tenant.idNo);
            setStatus(tenant.status);
            setNotes(tenant.notes);
        } else {
            setName('');
            setPhone('');
            setIdNo('');
            setStatus('ACTIVE');
            setNotes('');
        }
    }, [tenant, isOpen]);

    const handleAnalyzeNotes = async (task: 'summarize' | 'improve') => {
        if (!notes) {
            toast.error("لا توجد ملاحظات لتحليلها.");
            return;
        }
        setIsAnalyzing(true);
        const toastId = toast.loading("...جاري التحليل بالذكاء الاصطناعي");
        try {
            const result = await analyzeText(notes, task);
            setNotes(result);
            toast.success("تم التحليل بنجاح", { id: toastId });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { toast.error("اسم المستأجر مطلوب"); return; }

        const data = { name, phone, idNo, status, notes };
        if (tenant) {
            dataService.update('tenants', tenant.id, data);
        } else {
            dataService.add('tenants', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tenant ? 'تعديل مستأجر' : 'إضافة مستأجر'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الهاتف</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم الهوية</label>
                            <input type="text" value={idNo} onChange={e => setIdNo(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Tenant['status'])}>
                                <option value="ACTIVE">نشط</option>
                                <option value="INACTIVE">غير نشط</option>
                                <option value="BLACKLIST">قائمة سوداء</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <div className="relative">
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="pl-12"/>
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <button type="button" onClick={() => handleAnalyzeNotes('summarize')} disabled={isAnalyzing} title="تلخيص بالذكاء الاصطناعي" className="p-1 rounded-md text-muted-foreground hover:bg-background hover:text-primary disabled:opacity-50">
                                    <Sparkles size={16} />
                                </button>
                                <button type="button" onClick={() => handleAnalyzeNotes('improve')} disabled={isAnalyzing} title="تحسين النص بالذكاء الاصطناعي" className="p-1 rounded-md text-muted-foreground hover:bg-background hover:text-primary disabled:opacity-50">
                                    <BrainCircuit size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {tenant && <AttachmentsManager entityType="TENANT" entityId={tenant.id} />}

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default TenantForm;
