
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
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard label="إجمالي المتأخرات" value={formatCurrency(summaryData.overdueAmount)} icon={<AlertTriangle size={24}/>} color="danger"/>
                <SummaryStatCard label="عدد الفواتير المتأخرة" value={summaryData.overdueCount} icon={<Hash size={24}/>} color="danger"/>
                <SummaryStatCard label="مستحق (غير متأخر)" value={formatCurrency(summaryData.unpaidAmount)} icon={<DollarSign size={24}/>} color="warning"/>
                <SummaryStatCard label="متوسط أيام التأخير" value={summaryData.avgOverdueDays.toFixed(0)} icon={<Clock size={24}/>} color="warning"/>
            </div>
            
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold">الفواتير والمطالبات المالية</h2>
                <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary flex items-center gap-2">
                    {isMonthlyLoading && <RefreshCw size={16} className="animate-spin" />} {isMonthlyLoading ? 'جاري...' : 'إصدار الفواتير الآلي'}
                </button>
            </div>

            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => { setEditingInvoice(null); setIsModalOpen(true); }}
                addLabel="إضافة فاتورة"
                onPrint={() => window.print()}
                filterOptions={filters}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
            />

            <div className="overflow-x-auto mt-4">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>#</th><th>المستأجر / الوحدة</th><th>النوع</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th className="text-left">إجراء سريع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoicesWithDetails.map(inv => {
                            const balance = inv.amount + (inv.taxAmount || 0) - inv.paidAmount;
                            return (
                            <tr key={inv.id} className={`group ${inv.status === 'PAID' ? 'opacity-60' : ''} ${inv.status === 'OVERDUE' ? 'bg-danger-foreground' : ''}`}>
                                <td className="font-mono text-xs">{inv.no}</td>
                                <td><div className="font-bold">{inv.tenant?.name}</div><div className="text-[10px] text-muted-foreground">{inv.unit?.name}</div></td>
                                <td className="text-xs">{inv.type}</td>
                                <td className="text-xs">{formatDate(inv.dueDate)}</td>
                                <td><div className="font-mono font-bold">{formatCurrency(inv.amount + (inv.taxAmount || 0))}</div>{balance > 0 && <div className="text-[9px] text-danger">متبقي: {formatCurrency(balance)}</div>}</td>
                                <td><StatusPill status={inv.status}>{getInvoiceStatusLabel(inv.status)}</StatusPill></td>
                                <td className="text-left">
                                    <div className="flex items-center justify-end gap-2">
                                        {inv.status !== 'PAID' && (
                                            <button 
                                                onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${inv.id}`)}
                                                className="btn btn-sm btn-success flex items-center gap-1 text-[10px]"
                                            >
                                                <DollarSign size={12}/> تحصيل
                                            </button>
                                        )}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ActionsMenu items={[
                                                EditAction(() => {setEditingInvoice(inv); setIsModalOpen(true);}),
                                                PrintAction(() => setPrintingInvoice(inv)),
                                                VoidAction(() => financeService.voidInvoice(inv.id)),
                                            ]} />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                    {invoicesWithDetails.length === 0 && (<div className="text-center py-16"><ReceiptText size={52} className="mx-auto text-muted" /><h3 className="mt-4 text-xl font-semibold text-heading">لا توجد فواتير</h3></div>)}
            </div>
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
