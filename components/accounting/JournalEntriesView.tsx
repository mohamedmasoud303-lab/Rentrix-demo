import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Account } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { PlusCircle } from 'lucide-react';
import ManualJournalVoucherForm from '../forms/ManualJournalVoucherForm';

const JournalEntriesView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const journalEntries = useMemo(() => [...(db.journalEntries || [])].sort((a, b) => b.createdAt - a.createdAt), [db.journalEntries]);
    const accounts = db.accounts || [];
    const accountsMap = useMemo(() => new Map<string, Account>((accounts || []).map(a => [a.id, a])), [accounts]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">دفتر اليومية العام</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"><PlusCircle size={16} /> إضافة قيد يدوي</button>
            </div>
            <div className="overflow-x-auto">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>رقم القيد</th>
                            <th>الحساب</th>
                            <th>مدين (Dr)</th>
                            <th>دائن (Cr)</th>
                            <th>المصدر / المرجع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(journalEntries || []).map(je => (
                            <tr key={je.id}>
                                <td data-label="التاريخ">{formatDate(je.date)}</td>
                                <td data-label="رقم القيد" className="font-mono font-bold text-heading">{je.no}</td>
                                <td data-label="الحساب">{accountsMap.get(je.accountId)?.name || 'حساب غير معروف'}</td>
                                <td data-label="مدين" className="font-mono text-success">{je.type === 'DEBIT' ? formatCurrency(je.amount) : '—'}</td>
                                <td data-label="دائن" className="font-mono text-danger">{je.type === 'CREDIT' ? formatCurrency(je.amount) : '—'}</td>
                                <td data-label="المصدر" className="text-xs font-mono text-muted-foreground truncate max-w-[150px]" title={je.sourceId}>{je.sourceId}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ManualJournalVoucherForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={financeService.addManualJournalVoucher} />}
        </div>
    );
};

export default JournalEntriesView;
