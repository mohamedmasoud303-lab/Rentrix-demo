import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { calculateAgingReport } from '../../services/accountingService';
import { formatCurrency } from '../../utils/helpers';
import { AlertCircle } from 'lucide-react';
import ReportHeader from './ReportHeader';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';

const AgingReportView: React.FC = () => {
    const { db } = useApp();
    const data = useMemo(() => db ? calculateAgingReport(db) : [], [db]);

    const handlePrint = () => window.print();

    return (
        <div className="p-8 space-y-6">
            {/* Screen View */}
            <div className="no-print space-y-8">
                <ReportHeader title="تحليل أعمار الديون (Accounts Receivable Aging)" subtitle={`كما في ${new Date().toISOString().slice(0, 10)}`} />
                
                <div className="overflow-x-auto bg-card rounded-xl border border-border">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-neutral/5 border-b border-border">
                            <tr>
                                <th className="p-4 text-right">المستأجر</th>
                                <th className="p-4 text-right">الإجمالي المستحق</th>
                                <th className="p-4 text-right">حالي (أقل من شهر)</th>
                                <th className="p-4 text-right text-warning">30-60 يوم</th>
                                <th className="p-4 text-right text-orange-500">60-90 يوم</th>
                                <th className="p-4 text-right text-danger">أكثر من 90 يوم</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-border/50 hover:bg-neutral/5">
                                    <td className="p-4 font-bold">{row.tenantName}</td>
                                    <td className="p-4 font-mono font-black">{formatCurrency(row.totalDue)}</td>
                                    <td className="p-4 text-muted-foreground font-mono">{formatCurrency(row.current)}</td>
                                    <td className="p-4 text-warning font-semibold font-mono">{formatCurrency(row.thirtyPlus)}</td>
                                    <td className="p-4 text-orange-500 font-semibold font-mono">{formatCurrency(row.sixtyPlus)}</td>
                                    <td className="p-4 text-danger font-black bg-danger/5 font-mono">{formatCurrency(row.ninetyPlus)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data.length === 0 && <p className="text-center py-20 text-muted-foreground">لا توجد ديون مستحقة حالياً. عمل ممتاز!</p>}

                <div className="flex justify-end">
                    <ExportButtons 
                        data={data} 
                        filename={`Aging_Report_${new Date().toISOString().slice(0, 10)}`} 
                        onPrint={handlePrint} 
                    />
                </div>
            </div>

            {/* Print View */}
            <div className="hidden print:block">
                <PrintTemplate title="تحليل أعمار الديون" subtitle={`كما في ${new Date().toISOString().slice(0, 10)}`}>
                    <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2">المستأجر</th>
                                <th className="border p-2">الإجمالي</th>
                                <th className="border p-2">حالي</th>
                                <th className="border p-2">30-60 يوم</th>
                                <th className="border p-2">60-90 يوم</th>
                                <th className="border p-2">90+ يوم</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i}>
                                    <td className="border p-2 font-bold">{row.tenantName}</td>
                                    <td className="border p-2 font-mono font-bold">{formatCurrency(row.totalDue)}</td>
                                    <td className="border p-2 font-mono">{formatCurrency(row.current)}</td>
                                    <td className="border p-2 font-mono">{formatCurrency(row.thirtyPlus)}</td>
                                    <td className="border p-2 font-mono">{formatCurrency(row.sixtyPlus)}</td>
                                    <td className="border p-2 font-mono font-bold">{formatCurrency(row.ninetyPlus)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </PrintTemplate>
            </div>
        </div>
    );
};

export default AgingReportView;
