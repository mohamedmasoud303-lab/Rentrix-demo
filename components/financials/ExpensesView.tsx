import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Expense } from '../../types';
import TableControls from '../shared/TableControls';
import StatusPill from '../ui/StatusPill';
import ActionsMenu, { EditAction, VoidAction, PrintAction } from '../shared/ActionsMenu';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import ExpenseForm from '../forms/ExpenseForm';
import PrintPreviewModal from '../shared/PrintPreviewModal';
import { ExpensePrintable } from '../print/ExpensePrintable';
import { exportExpenseToPdf } from '../../services/pdfService';

const ExpensesView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [printingExpense, setPrintingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredExpenses = useMemo(() => {
        return db.expenses.filter(e => {
            const matchesSearch = e.no.includes(searchTerm) || e.category.includes(searchTerm) || e.notes.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.expenses, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">سجلات المصروفات</h2>
            </div>
            
            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => setIsModalOpen(true)}
                addLabel="إضافة مصروف"
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
                            <th>التصنيف</th>
                            <th>المبلغ</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className={`group ${e.status === 'VOID' ? 'opacity-50 line-through' : ''}`}>
                                <td data-label="رقم السند" className="font-mono font-bold text-heading">{e.no}</td>
                                <td data-label="التاريخ">{formatDateTime(e.dateTime)}</td>
                                <td data-label="التصنيف">{e.category}</td>
                                <td data-label="المبلغ" className="font-bold text-danger">{formatCurrency(e.amount, db.settings.currency)}</td>
                                <td data-label="الحالة"><StatusPill status={e.status}>{e.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                <td data-label="إجراءات" className="action-cell">
                                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ActionsMenu items={[
                                        EditAction(() => { setEditingExpense(e); setIsModalOpen(true); }),
                                        PrintAction(() => setPrintingExpense(e)),
                                        VoidAction(() => financeService.voidExpense(e.id))
                                    ]} />
                                  </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredExpenses.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد مصروفات مطابقة للبحث.</div>}
            </div>
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            
            {printingExpense && (
                <PrintPreviewModal 
                    isOpen={!!printingExpense} 
                    onClose={() => setPrintingExpense(null)} 
                    title="طباعة سند صرف" 
                    onExportPdf={() => {
                        if (!db || !printingExpense) return;
                        exportExpenseToPdf(printingExpense, db.settings);
                    }}
                >
                    <ExpensePrintable expense={printingExpense} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default ExpensesView;
