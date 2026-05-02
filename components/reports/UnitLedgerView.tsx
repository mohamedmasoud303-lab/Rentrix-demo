import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getUnitLedger } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';
import { Building, Home, Calendar, FileText, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import ReportHeader from './ReportHeader';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';
import StatusPill from '../ui/StatusPill';

const UnitLedgerView: React.FC = () => {
    const { db } = useApp();
    const [propertyId, setPropertyId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const units = useMemo(() => {
        if (!db || !propertyId) return [];
        return db.units.filter(u => u.propertyId === propertyId);
    }, [db, propertyId]);

    const reportData = useMemo(() => {
        if (!db || !unitId) return null;
        return getUnitLedger(db, unitId, startDate, endDate);
    }, [db, unitId, startDate, endDate]);

    const handlePrint = () => window.print();

    return (
        <div className="p-8 space-y-6">
            <div className="no-print bg-neutral/5 p-6 rounded-xl border border-border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Building className="w-3 h-3"/> العقار</label>
                    <select value={propertyId} onChange={e => { setPropertyId(e.target.value); setUnitId(''); }} className="input-field">
                        <option value="">اختر العقار...</option>
                        {db?.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Home className="w-3 h-3"/> الوحدة</label>
                    <select value={unitId} onChange={e => setUnitId(e.target.value)} className="input-field" disabled={!propertyId}>
                        <option value="">اختر الوحدة...</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> من تاريخ</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> إلى تاريخ</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
                </div>
            </div>

            {reportData ? (
                <>
                    {/* Screen View */}
                    <div className="no-print space-y-6">
                        <ReportHeader title={`كشف حركة الوحدة: ${reportData.unit?.name}`} subtitle={`للفترة من ${startDate} إلى ${endDate}`} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center">
                                <TrendingUp className="w-8 h-8 text-primary mb-2" />
                                <p className="text-xs text-muted-foreground">إجمالي المفوتر</p>
                                <p className="text-2xl font-black font-mono">{formatCurrency(reportData.stats.totalBilled)}</p>
                            </div>
                            <div className="p-6 bg-success/5 rounded-2xl border border-success/10 flex flex-col items-center">
                                <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                                <p className="text-xs text-muted-foreground">إجمالي المحصل</p>
                                <p className="text-2xl font-black font-mono">{formatCurrency(reportData.stats.totalCollected)}</p>
                            </div>
                            <div className="p-6 bg-danger/5 rounded-2xl border border-danger/10 flex flex-col items-center">
                                <AlertCircle className="w-8 h-8 text-danger mb-2" />
                                <p className="text-xs text-muted-foreground">تكاليف الصيانة</p>
                                <p className="text-2xl font-black font-mono">{formatCurrency(reportData.stats.maintenanceCost)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4"/> سجل الإشغال (Contracts Timeline)</h3>
                            <div className="overflow-x-auto bg-card rounded-xl border border-border">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-neutral/5 border-b border-border">
                                            <th className="p-3 text-right">الفترة</th>
                                            <th className="p-3 text-right">المستأجر</th>
                                            <th className="p-3 text-right">الإيجار</th>
                                            <th className="p-3 text-right">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.timeline.map((t, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-neutral/5">
                                                <td className="p-3 font-mono">{t.period}</td>
                                                <td className="p-3 font-bold">{t.tenantName}</td>
                                                <td className="p-3 font-mono">{formatCurrency(t.rent)}</td>
                                                <td className="p-3"><StatusPill status={t.status}>{t.status}</StatusPill></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4"/> سجل الصيانة</h3>
                            <div className="overflow-x-auto bg-card rounded-xl border border-border">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-neutral/5 border-b border-border">
                                            <th className="p-3 text-right">التاريخ</th>
                                            <th className="p-3 text-right">الوصف</th>
                                            <th className="p-3 text-right">التكلفة</th>
                                            <th className="p-3 text-right">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.maintenance.length > 0 ? reportData.maintenance.map((m, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-neutral/5">
                                                <td className="p-3">{m.requestDate}</td>
                                                <td className="p-3">{m.description}</td>
                                                <td className="p-3 font-mono text-danger">{formatCurrency(m.cost)}</td>
                                                <td className="p-3">{m.status}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">لا توجد سجلات صيانة</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <ExportButtons 
                                data={reportData.timeline} 
                                filename={`Unit_Ledger_${unitId}`} 
                                onPrint={handlePrint} 
                            />
                        </div>
                    </div>

                    {/* Print View */}
                    <div className="hidden print:block">
                        <PrintTemplate title={`كشف حركة الوحدة: ${reportData.unit?.name}`} subtitle={`للفترة من ${startDate} إلى ${endDate}`}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm border p-4 rounded-lg">
                                    <div>
                                        <p className="font-bold text-gray-500">العقار</p>
                                        <p className="font-bold">{db?.properties.find(p => p.id === propertyId)?.name}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">الوحدة</p>
                                        <p className="font-bold">{reportData.unit?.name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6 text-sm border p-4 rounded-lg bg-gray-50">
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي المفوتر</p>
                                        <p className="font-mono text-primary">{formatCurrency(reportData.stats.totalBilled)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي المحصل</p>
                                        <p className="font-mono text-success">{formatCurrency(reportData.stats.totalCollected)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">تكاليف الصيانة</p>
                                        <p className="font-mono text-danger">{formatCurrency(reportData.stats.maintenanceCost)}</p>
                                    </div>
                                </div>

                                <h3 className="font-bold border-b pb-2 mb-2">سجل الإشغال</h3>
                                <table className="w-full text-xs border-collapse border border-gray-300 mb-8">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2">الفترة</th>
                                            <th className="border p-2">المستأجر</th>
                                            <th className="border p-2">الإيجار</th>
                                            <th className="border p-2">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.timeline.map((t, i) => (
                                            <tr key={i}>
                                                <td className="border p-2 font-mono">{t.period}</td>
                                                <td className="border p-2 font-bold">{t.tenantName}</td>
                                                <td className="border p-2 font-mono">{formatCurrency(t.rent)}</td>
                                                <td className="border p-2">{t.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <h3 className="font-bold border-b pb-2 mb-2">سجل الصيانة</h3>
                                <table className="w-full text-xs border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2">التاريخ</th>
                                            <th className="border p-2">الوصف</th>
                                            <th className="border p-2">التكلفة</th>
                                            <th className="border p-2">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.maintenance.length > 0 ? reportData.maintenance.map((m, i) => (
                                            <tr key={i}>
                                                <td className="border p-2">{m.requestDate}</td>
                                                <td className="border p-2">{m.description}</td>
                                                <td className="border p-2 font-mono">{formatCurrency(m.cost)}</td>
                                                <td className="border p-2">{m.status}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="border p-2 text-center">لا توجد سجلات</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </PrintTemplate>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Home className="w-12 h-12 mb-4 opacity-20" />
                    <p>اختر العقار والوحدة لعرض السجل.</p>
                </div>
            )}
        </div>
    );
};

export default UnitLedgerView;
