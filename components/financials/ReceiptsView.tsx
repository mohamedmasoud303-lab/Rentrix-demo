import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Receipt } from '../../types';
import { useLocation, useNavigate } from 'react-router-dom';
import TableControls from '../shared/TableControls';
import StatusPill from '../ui/StatusPill';
import ActionsMenu, { EditAction, VoidAction, PrintAction } from '../shared/ActionsMenu';
import { MessageCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import ReceiptAllocationModal from '../forms/ReceiptAllocationModal';
import EditReceiptForm from '../forms/EditReceiptForm';
import PrintPreviewModal from '../shared/PrintPreviewModal';
import { ReceiptPrintable } from '../print/ReceiptPrintable';
import { exportReceiptToPdf } from '../../services/pdfService';
import { WhatsAppComposerModal } from '../shared/WhatsAppComposerModal';

const ReceiptsView: React.FC = () => {
    const { db, financeService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
    const [defaultContractId, setDefaultContractId] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'add') {
            const invoiceId = params.get('invoiceId');
            if (invoiceId) {
                const invoice = db.invoices.find(i => i.id === invoiceId);
                if (invoice) {
                    setDefaultContractId(invoice.contractId);
                }
            }
            setIsAddModalOpen(true);
            // Clean up URL
            navigate('/financials?tab=receipts', { replace: true });
        }
    }, [location, db.invoices, navigate]);

    const filteredReceipts = useMemo(() => {
        return db.receipts.filter(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            const matchesSearch = r.no.includes(searchTerm) || tenant?.name.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.receipts, db.contracts, db.tenants, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">سجلات القبض التحصيل</h2>
            </div>
            
            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => setIsAddModalOpen(true)}
                addLabel="إضافة سند قبض"
                onPrint={() => window.print()}
                filterOptions={[
                    { value: 'ALL', label: 'الكل' },
                    { value: 'POSTED', label: 'مرحّل' },
                    { value: 'VOID', label: 'ملغي' }
                ]}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />

            <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-4 py-3 text-start">رقم السند</th>
                            <th className="px-4 py-3 text-start">التاريخ</th>
                            <th className="px-4 py-3 text-start">المستأجر</th>
                            <th className="px-4 py-3 text-start">المبلغ</th>
                            <th className="px-4 py-3 text-start">الحالة</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredReceipts.map(r => {
                            const contract = db.contracts.find(c => c.id === r.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            return (
                                <tr key={r.id} className={`hover:bg-muted/10 transition-colors group ${r.status === 'VOID' ? 'opacity-50 bg-neutral/10' : ''}`}>
                                    <td className={`px-4 py-3 font-mono font-bold ${r.status === 'VOID' ? 'line-through text-muted-foreground' : 'text-heading'}`}>{r.no}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.dateTime)}</td>
                                    <td className="px-4 py-3 font-medium">{tenant?.name || '—'}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-success">{formatCurrency(r.amount, db.settings.currency)}</td>
                                    <td className="px-4 py-3"><StatusPill status={r.status}>{r.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-2">
                                        <ActionsMenu items={[
                                            EditAction(() => { setEditingReceipt(r); setIsEditModalOpen(true); }),
                                            PrintAction(() => setPrintingReceipt(r)),
                                            { label: 'إرسال واتساب', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } }) },
                                            VoidAction(() => financeService.voidReceipt(r.id))
                                        ]} />
                                      </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredReceipts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <h3 className="text-lg font-semibold text-heading mb-1">لا توجد سندات قبض</h3>
                                    <p className="text-muted-foreground text-sm">لم يتم العثور على أي سندات مطابقة لخيارات البحث أو الفلترة المحددة.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isAddModalOpen && <ReceiptAllocationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={(receipt) => setPrintingReceipt(receipt)} defaultContractId={defaultContractId} />}
            {isEditModalOpen && <EditReceiptForm isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingReceipt(null); }} receipt={editingReceipt} />}
            {printingReceipt && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="طباعة سند قبض" 
                    onExportPdf={() => {
                        if (!db || !printingReceipt) return;
                        const contract = db.contracts.find(c => c.id === printingReceipt.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportReceiptToPdf(printingReceipt, tenant, db.settings);
                    }}>
                    <ReceiptPrintable receipt={printingReceipt} />
                </PrintPreviewModal>
            )}
            {whatsAppContext && <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />}
        </div>
    );
};

export default ReceiptsView;
