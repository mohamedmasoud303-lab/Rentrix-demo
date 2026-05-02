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

            <div className="overflow-x-auto mt-4">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>رقم السند</th>
                            <th>التاريخ</th>
                            <th>المستأجر</th>
                            <th>المبلغ</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReceipts.map(r => {
                            const contract = db.contracts.find(c => c.id === r.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            return (
                                <tr key={r.id} className={`group ${r.status === 'VOID' ? 'opacity-50 line-through bg-neutral/30' : ''}`}>
                                    <td data-label="رقم السند" className="font-mono font-bold text-heading">{r.no}</td>
                                    <td data-label="التاريخ">{formatDateTime(r.dateTime)}</td>
                                    <td data-label="المستأجر">{tenant?.name || '—'}</td>
                                    <td data-label="المبلغ" className="font-bold text-success">{formatCurrency(r.amount, db.settings.currency)}</td>
                                    <td data-label="الحالة"><StatusPill status={r.status}>{r.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td data-label="إجراءات" className="action-cell">
                                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </tbody>
                </table>
                {filteredReceipts.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد سندات مطابقة للبحث.</div>}
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
