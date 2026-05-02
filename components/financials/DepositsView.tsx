import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import TableControls from '../shared/TableControls';
import StatusPill from '../ui/StatusPill';
import ActionsMenu, { VoidAction } from '../shared/ActionsMenu';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DepositTxForm from '../forms/DepositTxForm';

const DepositsView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredDeposits = useMemo(() => {
        return db.depositTxs.filter(tx => {
            const contract = db.contracts.find(c => c.id === tx.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            const matchesSearch = tenant?.name.includes(searchTerm) || tx.note?.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [db.depositTxs, db.contracts, db.tenants, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">إدارة مبالغ التأمين</h2>
            </div>
            
            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => setIsModalOpen(true)}
                addLabel="حركة وديعة جديدة"
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
                            <th>التاريخ</th>
                            <th>المستأجر</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDeposits.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'إيداع جديد', 'DEPOSIT_DEDUCT': 'خصم للإصلاح', 'DEPOSIT_RETURN': 'إرجاع مستحقات'};
                            return (
                                <tr key={tx.id} className={`group ${tx.status === 'VOID' ? 'opacity-50 line-through' : ''}`}>
                                    <td data-label="التاريخ">{formatDate(tx.date)}</td>
                                    <td data-label="المستأجر">{tenant?.name || '—'}</td>
                                    <td data-label="النوع" className="font-bold">{typeMap[tx.type]}</td>
                                    <td data-label="المبلغ" className="font-mono font-bold">{formatCurrency(tx.amount, db.settings.currency)}</td>
                                    <td data-label="الحالة"><StatusPill status={tx.status}>{tx.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td data-label="إجراءات" className="action-cell">
                                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        {tx.status !== 'VOID' && <ActionsMenu items={[VoidAction(() => financeService.voidDepositTx(tx.id))]}/>}
                                      </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredDeposits.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد حركات مطابقة للبحث.</div>}
            </div>
            {isModalOpen && <DepositTxForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default DepositsView;
