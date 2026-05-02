import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getOwnerStatement } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';
import { User, Calendar, Percent } from 'lucide-react';
import ExportButtons from './ExportButtons';
import PrintTemplate from '../print/PrintTemplate';

const OwnerStatementView: React.FC = () => {
    const { db } = useApp();
    const [ownerId, setOwnerId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [includeVoided, setIncludeVoided] = useState(false);
    const [commissionRate, setCommissionRate] = useState(2.5);
    const [showCommission, setShowCommission] = useState(true);

    const reportData = useMemo(() => {
        if (!db || !ownerId) return null;
        return getOwnerStatement(db, ownerId, startDate, endDate, undefined, undefined, includeVoided);
    }, [db, ownerId, startDate, endDate, includeVoided]);

    const handlePrint = () => window.print();

    const commissionAmount = useMemo(() => {
        if (!reportData || !showCommission) return 0;
        return (reportData.summary.totalCollected * commissionRate) / 100;
    }, [reportData, showCommission, commissionRate]);

    const netBalance = useMemo(() => {
        if (!reportData) return 0;
        return reportData.summary.closingBalance - commissionAmount;
    }, [reportData, commissionAmount]);

    return (
        <div className="p-8 space-y-6">
            <div className="no-print bg-neutral/5 p-6 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><User className="w-3 h-3"/> المالك</label>
                    <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full p-2 border rounded-md">
                        <option value="">اختر المالك...</option>
                        {db?.owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> من تاريخ</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Calendar className="w-3 h-3"/> إلى تاريخ</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-2"><Percent className="w-3 h-3"/> نسبة العمولة</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={commissionRate} 
                            onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} 
                            className="w-full p-2 border rounded-md" 
                            disabled={!showCommission}
                        />
                        <input 
                            type="checkbox" 
                            checked={showCommission} 
                            onChange={e => setShowCommission(e.target.checked)} 
                            className="w-5 h-5"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input type="checkbox" checked={includeVoided} onChange={e => setIncludeVoided(e.target.checked)} />
                        إظهار الملغاة
                    </label>
                </div>
            </div>

            {reportData ? (
                <>
                    {/* Screen View */}
                    <div className="no-print space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-[10px] text-muted-foreground mb-1">الرصيد الافتتاحي</p>
                                <p className="text-lg font-black font-mono">{formatCurrency(reportData.summary.openingBalance)}</p>
                            </div>
                            <div className="p-4 bg-success/5 rounded-xl border border-success/10">
                                <p className="text-[10px] text-muted-foreground mb-1">إجمالي التحصيلات</p>
                                <p className="text-lg font-black font-mono text-success">{formatCurrency(reportData.summary.totalCollected)}</p>
                            </div>
                            <div className="p-4 bg-danger/5 rounded-xl border border-danger/10">
                                <p className="text-[10px] text-muted-foreground mb-1">إجمالي المصاريف</p>
                                <p className="text-lg font-black font-mono text-danger">{formatCurrency(reportData.summary.totalExpenses)}</p>
                            </div>
                            <div className="p-4 bg-heading/5 rounded-xl border border-heading/10">
                                <p className="text-[10px] text-muted-foreground mb-1">صافي المستحق للمالك</p>
                                <p className="text-lg font-black font-mono">{formatCurrency(netBalance)}</p>
                                {showCommission && <p className="text-[10px] text-muted-foreground mt-1">بعد خصم عمولة {formatCurrency(commissionAmount)}</p>}
                            </div>
                        </div>

                        <div className="overflow-x-auto bg-card rounded-xl border border-border">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-neutral/5 border-b border-border">
                                        <th className="p-3 text-right">التاريخ</th>
                                        <th className="p-3 text-right">البيان</th>
                                        <th className="p-3 text-right">المرجع</th>
                                        <th className="p-3 text-right">مدين (عليه)</th>
                                        <th className="p-3 text-right">دائن (له)</th>
                                        <th className="p-3 text-right">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-neutral/5 font-bold italic">
                                        <td className="p-3">{startDate}</td>
                                        <td className="p-3" colSpan={4}>رصيد مرحل من فترة سابقة</td>
                                        <td className="p-3 font-mono">{formatCurrency(reportData.summary.openingBalance)}</td>
                                    </tr>
                                    {reportData.transactions.map((t, i) => (
                                        <tr key={i} className={`border-b border-border/50 hover:bg-neutral/5 ${t.status === 'VOID' ? 'opacity-50 line-through' : ''}`}>
                                            <td className="p-3">{t.date}</td>
                                            <td className="p-3">{t.description}</td>
                                            <td className="p-3 text-xs text-muted-foreground">{t.ref}</td>
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
                                filename={`Owner_Statement_${ownerId}_${startDate}`} 
                                onPrint={handlePrint} 
                            />
                        </div>
                    </div>

                    {/* Print View (Hidden on Screen) */}
                    <div className="hidden print:block">
                        <PrintTemplate title="كشف حساب مالك" subtitle={`للفترة من ${startDate} إلى ${endDate}`}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-4 mb-6 text-sm border p-4 rounded-lg">
                                    <div>
                                        <p className="font-bold text-gray-500">المالك</p>
                                        <p className="font-bold">{db?.owners.find(o => o.id === ownerId)?.name}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">الرصيد الافتتاحي</p>
                                        <p className="font-mono">{formatCurrency(reportData.summary.openingBalance)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي التحصيلات</p>
                                        <p className="font-mono text-success">{formatCurrency(reportData.summary.totalCollected)}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-500">إجمالي المصاريف</p>
                                        <p className="font-mono text-danger">{formatCurrency(reportData.summary.totalExpenses)}</p>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2">التاريخ</th>
                                            <th className="border p-2">البيان</th>
                                            <th className="border p-2">المرجع</th>
                                            <th className="border p-2">مدين</th>
                                            <th className="border p-2">دائن</th>
                                            <th className="border p-2">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="border p-2">{startDate}</td>
                                            <td className="border p-2" colSpan={4}>رصيد مرحل</td>
                                            <td className="border p-2 font-mono">{formatCurrency(reportData.summary.openingBalance)}</td>
                                        </tr>
                                        {reportData.transactions.map((t, i) => (
                                            <tr key={i} className={t.status === 'VOID' ? 'line-through text-gray-400' : ''}>
                                                <td className="border p-2">{t.date}</td>
                                                <td className="border p-2">{t.description}</td>
                                                <td className="border p-2">{t.ref}</td>
                                                <td className="border p-2 font-mono">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                                <td className="border p-2 font-mono">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                                <td className="border p-2 font-mono">{formatCurrency(t.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="flex justify-end mt-8">
                                    <div className="w-1/3 space-y-2 border p-4 rounded-lg bg-gray-50">
                                        <div className="flex justify-between text-sm">
                                            <span>الرصيد قبل العمولة:</span>
                                            <span className="font-mono font-bold">{formatCurrency(reportData.summary.closingBalance)}</span>
                                        </div>
                                        {showCommission && (
                                            <div className="flex justify-between text-sm text-red-600">
                                                <span>عمولة الإدارة ({commissionRate}%):</span>
                                                <span className="font-mono">({formatCurrency(commissionAmount)})</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-black border-t pt-2 mt-2">
                                            <span>صافي المستحق للمالك:</span>
                                            <span className="font-mono">{formatCurrency(netBalance)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PrintTemplate>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 mb-4 opacity-20 bg-current rounded-full"></div>
                    <p>يرجى اختيار المالك وتحديد الفترة الزمنية لعرض التقرير.</p>
                </div>
            )}
        </div>
    );
};

export default OwnerStatementView;
