import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getTenantStatement } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';
import { User, Calendar, Users } from 'lucide-react';
import ReportHeader from './ReportHeader';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';

const TenantStatementView: React.FC = () => {
    const { db } = useApp();
    const [tenantId, setTenantId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const reportData = useMemo(() => {
        if (!db || !tenantId) return null;
        return getTenantStatement(db, tenantId, startDate, endDate);
    }, [db, tenantId, startDate, endDate]);

    const handlePrint = () => window.print();

    return (
        <div className="p-8 space-y-6">
            <div className="no-print bg-neutral/5 p-6 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><User className="w-3 h-3"/> المستأجر</label>
                    <select value={tenantId} onChange={e => setTenantId(e.target.value)} className="input-field">
                        <option value="">اختر المستأجر...</option>
                        {db?.tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                        <ReportHeader title="كشف حساب مستأجر" subtitle={`للفترة من ${startDate} إلى ${endDate}`} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-danger/5 rounded-xl border border-danger/10">
                                <p className="text-[10px] text-muted-foreground mb-1">إجمالي الفواتير</p>
                                <p className="text-lg font-black font-mono text-danger">{formatCurrency(reportData.summary.totalInvoiced)}</p>
                            </div>
                            <div className="p-4 bg-success/5 rounded-xl border border-success/10">
                                <p className="text-[10px] text-muted-foreground mb-1">إجمالي المدفوعات</p>
                                <p className="text-lg font-black font-mono text-success">{formatCurrency(reportData.summary.totalPaid)}</p>
                            </div>
                            <div className="p-4 bg-heading/5 rounded-xl border border-heading/10">
                                <p className="text-[10px] text-muted-foreground mb-1">الرصيد المستحق حالياً</p>
                                <p className="text-lg font-black font-mono">{formatCurrency(reportData.summary.closingBalance)}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto bg-card rounded-xl border border-border">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-neutral/5 border-b-2 border-border">
                                        <th className="p-3 text-right">التاريخ</th>
                                        <th className="p-3 text-right">البيان</th>
                                        <th className="p-3 text-right">مدين (فاتورة)</th>
                                        <th className="p-3 text-right">دائن (سند)</th>
                                        <th className="p-3 text-right">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-neutral/5 font-bold italic">
                                        <td className="p-3">{startDate}</td>
                                        <td className="p-3" colSpan={3}>رصيد مرحل</td>
                                        <td className="p-3 font-mono">{formatCurrency(reportData.summary.openingBalance)}</td>
                                    </tr>
                                    {reportData.transactions.map((t, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-neutral/5">
                                            <td className="p-3">{t.date}</td>
                                            <td className="p-3">{t.description}</td>
                                            <td className="p-3 font-mono text-danger">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                            <td className="p-3 font-mono text-success">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                            <td className="p-3 font-mono font-bold">{formatCurrency(t.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <ExportButtons 
                                data={reportData.transactions} 
                                filename={`Tenant_Statement_${tenantId}`} 
                                onPrint={handlePrint} 
                            />
                        </div>
                    </div>

                    {/* Print View */}
                    <div className="hidden print:block">
                        <PrintTemplate title="كشف حساب مستأجر" subtitle={`للفترة من ${startDate} إلى ${endDate}`}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4 mb-6 text-sm border p-4 rounded-lg">
                                    <div>
                                        <p className="font-bold text-gray-500">المستأجر</p>
                                        <p className="font-bold">{db?.tenants.find(t => t.id === tenantId)?.name}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي الفواتير</p>
                                        <p className="font-mono text-danger">{formatCurrency(reportData.summary.totalInvoiced)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي المدفوعات</p>
                                        <p className="font-mono text-success">{formatCurrency(reportData.summary.totalPaid)}</p>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2">التاريخ</th>
                                            <th className="border p-2">البيان</th>
                                            <th className="border p-2">مدين</th>
                                            <th className="border p-2">دائن</th>
                                            <th className="border p-2">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="border p-2">{startDate}</td>
                                            <td className="border p-2" colSpan={3}>رصيد مرحل</td>
                                            <td className="border p-2 font-mono">{formatCurrency(reportData.summary.openingBalance)}</td>
                                        </tr>
                                        {reportData.transactions.map((t, i) => (
                                            <tr key={i}>
                                                <td className="border p-2">{t.date}</td>
                                                <td className="border p-2">{t.description}</td>
                                                <td className="border p-2 font-mono">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                                <td className="border p-2 font-mono">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                                <td className="border p-2 font-mono">{formatCurrency(t.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="flex justify-end mt-8">
                                    <div className="w-1/3 space-y-2 border p-4 rounded-lg bg-gray-50">
                                        <div className="flex justify-between text-lg font-black">
                                            <span>الرصيد المستحق:</span>
                                            <span className="font-mono">{formatCurrency(reportData.summary.closingBalance)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PrintTemplate>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <p>اختر المستأجر لعرض كشف الحساب.</p>
                </div>
            )}
        </div>
    );
};

export default TenantStatementView;
