import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Receipt } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface ReceiptAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (receipt: Receipt) => void;
    defaultContractId?: string;
}

const ReceiptAllocationModal: React.FC<ReceiptAllocationModalProps> = ({ isOpen, onClose, onSuccess, defaultContractId }) => {
    const { db, financeService, refreshData } = useApp();
    const [contractId, setContractId] = useState(defaultContractId || '');
    const [receiptData, setReceiptData] = useState({
        dateTime: new Date().toISOString().slice(0, 16),
        channel: 'CASH' as Receipt['channel'],
        amount: 0,
        ref: '',
        notes: ''
    });
    const [allocations, setAllocations] = useState<Map<string, number>>(new Map());

    const unpaidInvoices = useMemo(() => {
        if (!contractId) return [];
        return db.invoices
            .filter(inv => inv.contractId === contractId && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [contractId, db.invoices]);

    useEffect(() => {
        if (contractId && receiptData.amount > 0) {
            let remainingAmount = receiptData.amount;
            const newAllocations = new Map<string, number>();
            for (const invoice of unpaidInvoices) {
                const balance = (invoice.amount + (invoice.taxAmount || 0)) - invoice.paidAmount;
                const allocationAmount = Math.min(remainingAmount, balance);
                if (allocationAmount > 0) {
                    newAllocations.set(invoice.id, allocationAmount);
                    remainingAmount -= allocationAmount;
                }
                if (remainingAmount <= 0) break;
            }
            setAllocations(newAllocations);
        } else {
            setAllocations(new Map());
        }
    }, [contractId, receiptData.amount, unpaidInvoices]);


    const totalAllocated = useMemo(() => Array.from(allocations.values()).reduce((sum: number, amount: number) => sum + amount, 0), [allocations]);
    const remainingToAllocate = receiptData.amount - totalAllocated;
    const isBalanced = Math.abs(remainingToAllocate) < 0.001;
    
    const handleAllocationChange = (invoiceId: string, value: string) => {
        const newAllocations = new Map(allocations);
        newAllocations.set(invoiceId, Number(value) || 0);
        setAllocations(newAllocations);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (receiptData.amount <= 0 || !isBalanced) {
            toast.error("يجب أن يساوي المبلغ المخصص إجمالي مبلغ السند.");
            return;
        }
        try {
            const finalAllocations = Array.from(allocations.entries()).filter(([, amount]) => amount > 0).map(([invoiceId, amount]) => ({ invoiceId, amount }));
            const result = await financeService.addReceiptWithAllocations({ contractId, ...receiptData }, finalAllocations);
            await refreshData();
            onClose();
            toast.success("تم إضافة السند بنجاح");
            if (onSuccess && result.receipt) {
                onSuccess(result.receipt);
            }
        } catch (error) {
            console.error("Failed to add receipt with allocations:", error);
            toast.error(error instanceof Error ? error.message : "فشل إضافة السند.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة سند قبض وتخصيص الدفعات">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border rounded-lg bg-background">
                    <div>
                        <label className="text-xs font-bold block mb-1">العقد</label>
                        <select 
                            value={contractId} 
                            onChange={e => setContractId(e.target.value)} 
                            required
                            className="input-field"
                        >
                            <option value="">-- اختر العقد --</option>
                            {db.contracts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {db.tenants.find(t => t.id === c.tenantId)?.name} - {db.units.find(u => u.id === c.unitId)?.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">المبلغ المستلم</label>
                        <input 
                            type="number" 
                            value={receiptData.amount || ''} 
                            onChange={e => setReceiptData({ ...receiptData, amount: Number(e.target.value) })} 
                            required 
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">الطريقة</label>
                        <select 
                            value={receiptData.channel} 
                            onChange={e => setReceiptData({ ...receiptData, channel: e.target.value as any })}
                            className="input-field"
                        >
                            <option value="CASH">نقدي</option>
                            <option value="BANK">تحويل</option>
                            <option value="POS">شبكة</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold block mb-1">ملاحظات</label>
                        <textarea 
                            value={receiptData.notes} 
                            onChange={e => setReceiptData({ ...receiptData, notes: e.target.value })} 
                            rows={1}
                            className="input-field"
                        />
                    </div>
                </div>

                {contractId && (
                    <div className="space-y-2">
                        <h3 className="font-bold text-heading border-b pb-2">تخصيص على الفواتير المستحقة</h3>
                        {unpaidInvoices.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto border border-border rounded-md">
                                {unpaidInvoices.map(inv => (
                                    <div key={inv.id} className="grid grid-cols-4 gap-4 items-center p-2 border-b last:border-b-0 hover:bg-background transition-colors">
                                        <div className="text-xs"><strong>#{inv.no}</strong><br/>{formatDate(inv.dueDate)}</div>
                                        <div className="text-xs text-red-500">مستحق: {formatCurrency((inv.amount + (inv.taxAmount || 0)) - inv.paidAmount)}</div>
                                        <div className="col-span-2">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={allocations.get(inv.id) || ''} 
                                                onChange={e => handleAllocationChange(inv.id, e.target.value)} 
                                                placeholder="المبلغ المخصص" 
                                                className="h-8 py-0 w-full border rounded-md px-2"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center text-sm text-muted-foreground p-4 bg-background rounded-md">لا توجد فواتير مستحقة لهذا العقد حالياً.</p>}
                        
                        <div className={`grid grid-cols-3 gap-2 text-xs font-bold p-3 rounded-md border ${isBalanced ? 'bg-success-foreground border-success/30 text-success' : 'bg-danger-foreground border-danger/30 text-danger'}`}>
                            <div>الإجمالي: {formatCurrency(receiptData.amount)}</div>
                            <div>المخصص: {formatCurrency(totalAllocated)}</div>
                            <div>المتبقي: {formatCurrency(remainingToAllocate)}</div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn bg-primary text-primary-foreground hover:bg-primary/90" disabled={!isBalanced || receiptData.amount <= 0}>حفظ السند</button>
                </div>
            </form>
        </Modal>
    );
};

export default ReceiptAllocationModal;
