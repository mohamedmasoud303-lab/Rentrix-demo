import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { OwnerSettlement } from '../../types';
import TableControls from '../shared/TableControls';
import StatusPill from '../ui/StatusPill';
import ActionsMenu, { EditAction, VoidAction } from '../shared/ActionsMenu';
import { formatCurrency, formatDate } from '../../utils/helpers';
import OwnerSettlementForm from '../forms/OwnerSettlementForm';

const OwnerSettlementsView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSettlement, setEditingSettlement] = useState<OwnerSettlement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filtered = useMemo(() => db.ownerSettlements.filter(s => {
        const owner = db.owners.find(o => o.id === s.ownerId);
        const matchesSearch = s.no.includes(searchTerm) || owner?.name.includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [db.ownerSettlements, db.owners, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">تسويات وتحويلات الملاك</h2>
            </div>
            
            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => setIsModalOpen(true)}
                addLabel="إضافة تحويل للمالك"
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
                            <th className="px-4 py-3 text-start">الرقم</th>
                            <th className="px-4 py-3 text-start">التاريخ</th>
                            <th className="px-4 py-3 text-start">المالك</th>
                            <th className="px-4 py-3 text-start">المبلغ المحول</th>
                            <th className="px-4 py-3 text-start">الحالة</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filtered.map(s => {
                            const owner = db.owners.find(o => o.id === s.ownerId);
                            return (
                                <tr key={s.id} className={`hover:bg-muted/10 transition-colors group ${s.status === 'VOID' ? 'opacity-50 bg-neutral/10' : ''}`}>
                                    <td className={`px-4 py-3 font-mono font-bold ${s.status === 'VOID' ? 'line-through text-muted-foreground' : 'text-heading'}`}>{s.no}</td>
                                    <td className="px-4 py-3 text-xs">{formatDate(s.date)}</td>
                                    <td className="px-4 py-3 font-medium text-heading">{owner?.name || '—'}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(s.amount, db.settings.currency)}</td>
                                    <td className="px-4 py-3"><StatusPill status={s.status}>{s.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-end">
                                        <ActionsMenu items={[ EditAction(() => { setEditingSettlement(s); setIsModalOpen(true); }), VoidAction(() => financeService.voidOwnerSettlement(s.id)) ]} />
                                      </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <h3 className="text-lg font-semibold text-heading mb-1">لا توجد تسويات مالية</h3>
                                    <p className="text-muted-foreground text-sm">لم يتم العثور على أي تحويلات للملاك.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

export default OwnerSettlementsView;
