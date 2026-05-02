
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Receipt } from '../../types';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PrintLayout } from './PrintLayout';
import { tafneeta } from '../../utils/numberToArabic';

export const ReceiptPrintable: React.FC<{ receipt: Receipt }> = ({ receipt }) => {
    const { db } = useApp();
    const contract = db.contracts.find(c => c.id === receipt.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
    const amountInWords = tafneeta(receipt.amount);

    return (
        <PrintLayout title="سند قبض" subtitle={`رقم السند: ${receipt.no}`}>
            <div className="text-base leading-loose space-y-6">
                 <p>التاريخ: <span className="font-mono">{formatDate(receipt.dateTime)}</span></p>
                 <p>استلمنا من السيد/ة: <span className="font-bold border-b border-border px-4">{tenant?.name || 'غير محدد'}</span></p>
                 <p>مبلغاً وقدره: <span className="font-bold bg-background p-2 rounded-md">{formatCurrency(receipt.amount, db.settings.currency)}</span></p>
                 <p className="text-sm">({amountInWords})</p>
                 <p>وذلك عن: <span className="italic">{receipt.notes || 'دفعة إيجار'}</span></p>
            </div>
             <footer className="mt-24 flex justify-around text-center">
                <div><p className="font-bold">المستلم</p><p className="mt-16">.........................</p></div>
                <div><p className="font-bold">الختم</p></div>
            </footer>
        </PrintLayout>
    );
};
