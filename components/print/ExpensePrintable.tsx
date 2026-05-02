
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Expense } from '../../types';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PrintLayout } from './PrintLayout';
import { tafneeta } from '../../utils/numberToArabic';

export const ExpensePrintable: React.FC<{ expense: Expense }> = ({ expense }) => {
    const { db } = useApp();
    const amountInWords = tafneeta(expense.amount);
    
    return (
        <PrintLayout title="سند صرف" subtitle={`رقم السند: ${expense.no}`}>
            <div className="text-base leading-loose space-y-6">
                 <p>التاريخ: <span className="font-mono">{formatDate(expense.dateTime)}</span></p>
                 <p>صرف إلى السيد/ة: <span className="font-bold border-b border-border px-4">{expense.payee || expense.ref || 'غير محدد'}</span></p>
                 <p>مبلغاً وقدره: <span className="font-bold bg-background p-2 rounded-md">{formatCurrency(expense.amount, db.settings.currency)}</span></p>
                 <p className="text-sm">({amountInWords})</p>
                 <p>وذلك عن: <span className="italic">{expense.category}: {expense.notes || expense.ref}</span></p>
            </div>
             <footer className="mt-24 flex justify-around text-center">
                <div><p className="font-bold">المحاسب</p><p className="mt-16">.........................</p></div>
                <div><p className="font-bold">المستلم</p><p className="mt-16">.........................</p></div>
            </footer>
        </PrintLayout>
    );
};
