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

            <div className="overflow-x-auto mt-4">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>المالك</th>
                            <th>المبلغ المحول</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => {
                            const owner = db.owners.find(o => o.id === s.ownerId);
                            return (
                                <tr key={s.id} className={`group ${s.status === 'VOID' ? 'opacity-50 line-through' : ''}`}>
                                    <td data-label="رقم التسوية" className="font-mono font-bold text-heading">{s.no}</td>
                                    <td data-label="التاريخ">{formatDate(s.date)}</td>
                                    <td data-label="المالك">{owner?.name || '—'}</td>
                                    <td data-label="المبلغ" className="font-bold text-primary">{formatCurrency(s.amount, db.settings.currency)}</td>
                                    <td data-label="الحالة"><StatusPill status={s.status}>{s.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td data-label="إجراءات" className="action-cell">
                                        <ActionsMenu items={[ EditAction(() => { setEditingSettlement(s); setIsModalOpen(true); }), VoidAction(() => financeService.voidOwnerSettlement(s.id)) ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد تسويات مطابقة للبحث.</div>}
            </div>
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

export default OwnerSettlementsView;
