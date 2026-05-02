import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getMaintenanceReport } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';
import { Calendar, Building, Wrench } from 'lucide-react';
import ReportHeader from './ReportHeader';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';
import StatusPill from '../ui/StatusPill';

const MaintenanceReportView: React.FC = () => {
    const { db } = useApp();
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [propertyId, setPropertyId] = useState('');

    const reportData = useMemo(() => {
        if (!db) return null;
        return getMaintenanceReport(db, startDate, endDate, propertyId || undefined);
    }, [db, startDate, endDate, propertyId]);

    const handlePrint = () => window.print();

    return (
        <div className="p-8 space-y-6">
            <div className="no-print bg-neutral/5 p-6 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Building className="w-3 h-3"/> العقار</label>
                    <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="input-field">
                        <option value="">كل العقارات</option>
                        {db?.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

            {reportData && (
                <>
                    {/* Screen View */}
                    <div className="no-print space-y-6">
                        <ReportHeader title="تقرير تكاليف الصيانة" subtitle={`للفترة من ${startDate} إلى ${endDate}`} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted/30 rounded-xl border border-border text-center">
                                <p className="text-[10px] text-muted-foreground">إجمالي التكلفة</p>
                                <p className="text-xl font-black font-mono">{formatCurrency(reportData.totalCost)}</p>
                            </div>
                            <div className="p-4 bg-warning/5 rounded-xl border border-warning/10 text-center">
                                <p className="text-[10px] text-muted-foreground">تحت التنفيذ</p>
                                <p className="text-xl font-black text-warning">{reportData.byStatus.IN_PROGRESS + reportData.byStatus.NEW}</p>
                            </div>
                            <div className="p-4 bg-success/5 rounded-xl border border-success/10 text-center">
                                <p className="text-[10px] text-muted-foreground">مكتملة</p>
                                <p className="text-xl font-black text-success">{reportData.byStatus.COMPLETED}</p>
                            </div>
                            <div className="p-4 bg-heading/5 rounded-xl border border-heading/10 text-center">
                                <p className="text-[10px] text-muted-foreground">مغلقة</p>
                                <p className="text-xl font-black">{reportData.byStatus.CLOSED}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto bg-card rounded-xl border border-border">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-neutral/5 border-b border-border">
                                        <th className="p-3 text-right">التاريخ</th>
                                        <th className="p-3 text-right">الوحدة</th>
                                        <th className="p-3 text-right">الوصف</th>
                                        <th className="p-3 text-right">التكلفة</th>
                                        <th className="p-3 text-right">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.records.length > 0 ? reportData.records.map((r, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-neutral/5">
                                            <td className="p-3">{r.requestDate}</td>
                                            <td className="p-3 font-bold">{db?.units.find(u => u.id === r.unitId)?.name}</td>
                                            <td className="p-3">{r.description}</td>
                                            <td className="p-3 font-mono">{formatCurrency(r.cost)}</td>
                                            <td className="p-3"><StatusPill status={r.status}>{r.status}</StatusPill></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">لا توجد سجلات</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <ExportButtons 
                                data={reportData.records} 
                                filename={`Maintenance_Report_${startDate}`} 
                                onPrint={handlePrint} 
                            />
                        </div>
                    </div>

                    {/* Print View */}
                    <div className="hidden print:block">
                        <PrintTemplate title="تقرير تكاليف الصيانة" subtitle={`للفترة من ${startDate} إلى ${endDate}`}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-4 mb-6 text-sm border p-4 rounded-lg bg-gray-50">
                                    <div className="text-center">
                                        <p className="font-bold text-gray-500">إجمالي التكلفة</p>
                                        <p className="font-mono font-bold">{formatCurrency(reportData.totalCost)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-500">تحت التنفيذ</p>
                                        <p className="font-mono text-warning">{reportData.byStatus.IN_PROGRESS + reportData.byStatus.NEW}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-500">مكتملة</p>
                                        <p className="font-mono text-success">{reportData.byStatus.COMPLETED}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-500">مغلقة</p>
                                        <p className="font-mono">{reportData.byStatus.CLOSED}</p>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2">التاريخ</th>
                                            <th className="border p-2">الوحدة</th>
                                            <th className="border p-2">الوصف</th>
                                            <th className="border p-2">التكلفة</th>
                                            <th className="border p-2">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.records.length > 0 ? reportData.records.map((r, i) => (
                                            <tr key={i}>
                                                <td className="border p-2">{r.requestDate}</td>
                                                <td className="border p-2 font-bold">{db?.units.find(u => u.id === r.unitId)?.name}</td>
                                                <td className="border p-2">{r.description}</td>
                                                <td className="border p-2 font-mono">{formatCurrency(r.cost)}</td>
                                                <td className="border p-2">{r.status}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="border p-2 text-center">لا توجد سجلات</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </PrintTemplate>
                    </div>
                </>
            )}
        </div>
    );
};

export default MaintenanceReportView;
