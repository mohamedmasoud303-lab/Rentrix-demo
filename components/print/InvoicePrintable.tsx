
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Invoice } from '../../types';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PrintLayout } from './PrintLayout';

export const InvoicePrintable: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
    const { db } = useApp();
    const contract = db.contracts.find(c => c.id === invoice.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
    const total = invoice.amount + (invoice.taxAmount || 0);

    return (
        <PrintLayout title="فاتورة" subtitle={`رقم الفاتورة: ${invoice.no}`}>
            <div className="flex justify-between mb-8 text-sm">
                <div>
                    <p><strong>إلى السيد/ة:</strong> {tenant?.name || 'غير معروف'}</p>
                    <p><strong>العقد:</strong> {contract?.id.slice(0, 8)}...</p>
                </div>
                <div>
                    <p><strong>تاريخ الفاتورة:</strong> {formatDate(new Date(invoice.createdAt).toISOString())}</p>
                    <p><strong>تاريخ الاستحقاق:</strong> {formatDate(invoice.dueDate)}</p>
                </div>
            </div>
            <table className="w-full text-sm text-right border-collapse">
                <thead>
                    <tr className="bg-background">
                        <th className="p-2 border border-border">البيان</th>
                        <th className="p-2 border border-border">الكمية</th>
                        <th className="p-2 border border-border">السعر</th>
                        <th className="p-2 border border-border">الضريبة</th>
                        <th className="p-2 border border-border">المجموع</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b">
                        <td className="p-2 border border-border">{invoice.notes || `فاتورة ${invoice.type}`}</td>
                        <td className="p-2 border border-border">1</td>
                        <td className="p-2 border border-border">{formatCurrency(invoice.amount, db.settings.currency)}</td>
                        <td className="p-2 border border-border">{formatCurrency(invoice.taxAmount || 0, db.settings.currency)}</td>
                        <td className="p-2 border border-border">{formatCurrency(total, db.settings.currency)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={4} className="p-2 border border-border text-left font-bold">الإجمالي المستحق</td>
                        <td className="p-2 border border-border font-bold">{formatCurrency(total, db.settings.currency)}</td>
                    </tr>
                </tfoot>
            </table>
        </PrintLayout>
    );
};
