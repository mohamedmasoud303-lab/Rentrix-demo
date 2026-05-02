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

            <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-4 py-3 text-start">رقم السند</th>
                            <th className="px-4 py-3 text-start">التاريخ</th>
                            <th className="px-4 py-3 text-start">التصنيف</th>
                            <th className="px-4 py-3 text-start">المبلغ</th>
                            <th className="px-4 py-3 text-start">الحالة</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className={`hover:bg-muted/10 transition-colors group ${e.status === 'VOID' ? 'opacity-50 bg-neutral/10' : ''}`}>
                                <td className={`px-4 py-3 font-mono font-bold ${e.status === 'VOID' ? 'line-through text-muted-foreground' : 'text-heading'}`}>{e.no}</td>
                                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(e.dateTime)}</td>
                                <td className="px-4 py-3 font-medium">{e.category}</td>
                                <td className="px-4 py-3 font-mono font-bold text-danger">{formatCurrency(e.amount, db.settings.currency)}</td>
                                <td className="px-4 py-3"><StatusPill status={e.status}>{e.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <ActionsMenu items={[
                                        EditAction(() => { setEditingExpense(e); setIsModalOpen(true); }),
                                        PrintAction(() => setPrintingExpense(e)),
                                        VoidAction(() => financeService.voidExpense(e.id))
                                    ]} />
                                  </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <h3 className="text-lg font-semibold text-heading mb-1">لا توجد مصروفات</h3>
                                    <p className="text-muted-foreground text-sm">لم يتم العثور على أي مصروفات مطابقة لخيارات البحث أو الفلترة المحددة.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
