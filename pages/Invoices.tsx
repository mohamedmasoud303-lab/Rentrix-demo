
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ReceiptText, RefreshCw, AlertTriangle, DollarSign, Clock, Hash } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction, VoidAction, PrintAction } from '../components/shared/ActionsMenu';
import InvoiceForm from '../components/forms/InvoiceForm';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { InvoicePrintable } from '../components/print/InvoicePrintable';
import { exportInvoiceToPdf } from '../services/pdfService';
import TableControls from '../components/shared/TableControls';

const Invoices: React.FC = () => {
    const { db, financeService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filters = [ { value: 'all', label: 'الكل' }, { value: 'unpaid', label: 'غير مدفوعة' }, { value: 'overdue', label: 'متأخرة' }, { value: 'paid', label: 'مدفوعة' }];
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const filterParam = new URLSearchParams(location.search).get('filter') || 'all';
        if (filters.some(f => f.value === filterParam)) setActiveFilter(filterParam);
    }, [location.search]);

    const handleFilterChange = (filterKey: string) => {
        setActiveFilter(filterKey);
        navigate(`/invoices?filter=${filterKey}`);
    };

    const handleGenerateInvoices = async () => {
        setIsMonthlyLoading(true);
        try {
            const count = await financeService.generateMonthlyInvoices();
            toast.success(`تم إصدار ${count} فاتورة جديدة بنجاح.`);
        } catch (error) { toast.error(`فشل إصدار الفواتير: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally { setIsMonthlyLoading(false); }
    };
    
    const getInvoiceStatusLabel = (status: Invoice['status']) => {
        const map: { [key in Invoice['status']]: string } = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'PARTIALLY_PAID': 'مدفوعة جزئياً', 'OVERDUE': 'متأخرة', 'VOID': 'ملغاة' };
        return map[status] || status;
    };

    const summaryData = useMemo(() => {
        const unpaid = db.invoices.filter(i => i.status !== 'PAID' && i.status !== 'VOID');
        const overdue = unpaid.filter(i => new Date(i.dueDate) < new Date() && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status));
        
        const overdueAmount = overdue.reduce((sum, i) => sum + (i.amount + (i.taxAmount||0) - i.paidAmount), 0);
        const unpaidAmount = unpaid.reduce((sum, i) => sum + (i.amount + (i.taxAmount||0) - i.paidAmount), 0) - overdueAmount;
        const totalOverdueDays = overdue.reduce((sum, i) => sum + (new Date().getTime() - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24), 0);

        return {
            overdueAmount,
            overdueCount: overdue.length,
            unpaidAmount,
            avgOverdueDays: overdue.length > 0 ? totalOverdueDays / overdue.length : 0,
        };
    }, [db.invoices]);

    const invoicesWithDetails = useMemo(() => {
        let filteredInvoices = db.invoices.filter(inv => inv.status !== 'VOID');
        
        // Search Filter
        if (searchTerm) {
            filteredInvoices = filteredInvoices.filter(inv => 
                inv.no.includes(searchTerm) || 
                db.tenants.find(t => t.id === db.contracts.find(c => c.id === inv.contractId)?.tenantId)?.name.includes(searchTerm)
            );
        }

        // Status Filter
        if (activeFilter !== 'all') {
            filteredInvoices = filteredInvoices.filter(inv => {
                if (activeFilter === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status);
                if (activeFilter === 'overdue') return inv.status === 'OVERDUE';
                if (activeFilter === 'paid') return inv.status === 'PAID';
                return true;
            });
        }
        return filteredInvoices
            .map(inv => ({ ...inv, tenant: db.tenants.find(t => t.id === db.contracts.find(c => c.id === inv.contractId)?.tenantId), unit: db.units.find(u => u.id === db.contracts.find(c=>c.id === inv.contractId)?.unitId)}))
            .sort((a, b) => {
                if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
                if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
                return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            });
    }, [db, activeFilter, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <PageHeader title="المطالبات المالية" description="متابعة وإصدار الفواتير، وتحصيل المستحقات وإدارة المتأخرات." className="mb-0" />
                <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm">
                    {isMonthlyLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {isMonthlyLoading ? 'جاري الإصدار...' : 'إصدار الفواتير الآلي'}
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryStatCard label="إجمالي المتأخرات" value={formatCurrency(summaryData.overdueAmount)} icon={<AlertTriangle size={24}/>} color="danger"/>
                <SummaryStatCard label="عدد الفواتير المتأخرة" value={summaryData.overdueCount} icon={<Hash size={24}/>} color="danger"/>
                <SummaryStatCard label="مستحق (غير متأخر)" value={formatCurrency(summaryData.unpaidAmount)} icon={<DollarSign size={24}/>} color="warning"/>
                <SummaryStatCard label="متوسط أيام التأخير" value={summaryData.avgOverdueDays.toFixed(0)} icon={<Clock size={24}/>} color="warning"/>
            </div>
            
            <Card className="p-6 border-border/50">
                <div className="mb-6">
                    <TableControls
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onAdd={() => { setEditingInvoice(null); setIsModalOpen(true); }}
                        addLabel="إضافة فاتورة يدوية"
                        onPrint={() => window.print()}
                        filterOptions={filters}
                        activeFilter={activeFilter}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-start">رقم الفاتورة</th>
                                <th className="px-4 py-3 text-start">المستأجر / الوحدة</th>
                                <th className="px-4 py-3 text-start">النوع</th>
                                <th className="px-4 py-3 text-start">تاريخ الاستحقاق</th>
                                <th className="px-4 py-3 text-start">المبلغ</th>
                                <th className="px-4 py-3 text-start">الحالة</th>
                                <th className="px-4 py-3 text-end">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {invoicesWithDetails.map(inv => {
                                const balance = inv.amount + (inv.taxAmount || 0) - inv.paidAmount;
                                return (
                                <tr key={inv.id} className={`hover:bg-muted/10 transition-colors group ${inv.status === 'PAID' ? 'opacity-60' : ''} ${inv.status === 'OVERDUE' ? 'bg-danger/5 border-l-2 border-l-danger' : ''}`}>
                                    <td className="px-4 py-3 font-mono text-xs font-bold">{inv.no}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-heading">{inv.tenant?.name || 'غير معروف'}</div>
                                        <div className="text-[10px] text-muted-foreground">{inv.unit?.name || 'غير محدد'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs">{inv.type}</td>
                                    <td className="px-4 py-3 text-xs">{formatDate(inv.dueDate)}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-mono font-bold text-heading">{formatCurrency(inv.amount + (inv.taxAmount || 0))}</div>
                                        {balance > 0 && <div className="text-[10px] text-danger font-mono font-medium mt-0.5">متبقي: {formatCurrency(balance)}</div>}
                                    </td>
                                    <td className="px-4 py-3"><StatusPill status={inv.status}>{getInvoiceStatusLabel(inv.status)}</StatusPill></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${inv.id}`)}
                                                    className="btn btn-sm bg-success/10 text-success hover:bg-success/20 flex items-center gap-1 text-[10px] px-2 py-1"
                                                >
                                                    <DollarSign size={12}/> تحصيل
                                                </button>
                                            )}
                                            <ActionsMenu items={[
                                                EditAction(() => {setEditingInvoice(inv); setIsModalOpen(true);}),
                                                PrintAction(() => setPrintingInvoice(inv)),
                                                VoidAction(() => financeService.voidInvoice(inv.id)),
                                            ]} />
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {invoicesWithDetails.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <ReceiptText size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                                        <h3 className="text-lg font-semibold text-heading mb-1">لا توجد فواتير</h3>
                                        <p className="text-muted-foreground text-sm">لم يتم العثور على أي فواتير مطابقة لخيارات البحث أو الفلترة المحددة.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <InvoiceForm isOpen={isModalOpen} onClose={() => {setEditingInvoice(null); setIsModalOpen(false);}} invoice={editingInvoice} />
            
            {printingInvoice && (
                <PrintPreviewModal
                    isOpen={!!printingInvoice}
                    onClose={() => setPrintingInvoice(null)}
                    title={`طباعة فاتورة #${printingInvoice.no}`}
                    onExportPdf={() => {
                        if (!db || !printingInvoice) return;
                        const contract = db.contracts.find(c => c.id === printingInvoice.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportInvoiceToPdf(printingInvoice, tenant, contract, db.settings);
                    }}
                >
                    <InvoicePrintable invoice={printingInvoice} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default Invoices;
