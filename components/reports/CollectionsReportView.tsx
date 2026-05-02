import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getCollectionsReport } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import ReportHeader from './ReportHeader';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';

const CollectionsReportView: React.FC = () => {
    const { db } = useApp();
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const reportData = useMemo(() => {
        if (!db) return null;
        return getCollectionsReport(db, startDate, endDate);
    }, [db, startDate, endDate]);

    const handlePrint = () => window.print();

    return (
        <div className="p-8 space-y-6">
            <div className="no-print bg-neutral/5 p-6 rounded-xl border border-border grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> من تاريخ</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> إلى تاريخ</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
            </div>

            {reportData && (
                <>
                    {/* Screen View */}
                    <div className="no-print space-y-6">
                        <ReportHeader title="تقرير التحصيلات والديون" subtitle={`للفترة من ${startDate} إلى ${endDate}`} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-success/5 rounded-3xl border border-success/10 text-center flex flex-col items-center justify-center">
                                <TrendingUp className="w-12 h-12 text-success mb-4 opacity-50" />
                                <p className="text-sm text-muted-foreground mb-2">إجمالي المحصل في الفترة</p>
                                <p className="text-4xl font-black font-mono text-success">{formatCurrency(reportData.totalCollected)}</p>
                            </div>
                            <div className="p-8 bg-danger/5 rounded-3xl border border-danger/10 text-center flex flex-col items-center justify-center">
                                <AlertCircle className="w-12 h-12 text-danger mb-4 opacity-50" />
                                <p className="text-sm text-muted-foreground mb-2">إجمالي الديون المتأخرة (Overdue)</p>
                                <p className="text-4xl font-black font-mono text-danger">{formatCurrency(reportData.overdueTotal)}</p>
                                <p className="text-xs text-muted-foreground mt-2">عدد الفواتير المتأخرة: {reportData.overdueCount}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-black text-heading">التدفق النقدي اليومي</h3>
                            <div className="h-64 flex items-end gap-1 border-b border-l p-4 bg-card rounded-xl border-border">
                                {reportData.chartData.map((d, i) => {
                                    const max = Math.max(...reportData.chartData.map(x => x.value), 1);
                                    const height = (d.value / max) * 100;
                                    return (
                                        <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-colors relative group rounded-t-sm" style={{ height: `${height}%` }}>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-heading text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 mb-1">
                                                {d.name}: {formatCurrency(d.value)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <ExportButtons 
                                data={reportData.chartData} 
                                filename={`Collections_Report_${startDate}`} 
                                onPrint={handlePrint} 
                            />
                        </div>
                    </div>

                    {/* Print View */}
                    <div className="hidden print:block">
                        <PrintTemplate title="تقرير التحصيلات والديون" subtitle={`للفترة من ${startDate} إلى ${endDate}`}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm border p-4 rounded-lg bg-gray-50">
                                    <div className="text-center border-l border-gray-300">
                                        <p className="font-bold text-gray-500">إجمالي المحصل</p>
                                        <p className="text-2xl font-mono font-bold text-success">{formatCurrency(reportData.totalCollected)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-500">الديون المتأخرة</p>
                                        <p className="text-2xl font-mono font-bold text-danger">{formatCurrency(reportData.overdueTotal)}</p>
                                        <p className="text-xs text-gray-400 mt-1">({reportData.overdueCount} فاتورة)</p>
                                    </div>
                                </div>

                                <h3 className="font-bold border-b pb-2 mb-2">تفاصيل التحصيلات اليومية</h3>
                                <table className="w-full text-xs border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 w-1/2">التاريخ</th>
                                            <th className="border p-2 w-1/2">المبلغ المحصل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.chartData.length > 0 ? reportData.chartData.map((d, i) => (
                                            <tr key={i}>
                                                <td className="border p-2 text-center">{d.name}</td>
                                                <td className="border p-2 text-center font-mono">{formatCurrency(d.value)}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={2} className="border p-2 text-center">لا توجد تحصيلات في هذه الفترة</td></tr>
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

export default CollectionsReportView;
