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

            <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-4 py-3 text-start">التاريخ</th>
                            <th className="px-4 py-3 text-start">المستأجر</th>
                            <th className="px-4 py-3 text-start">النوع</th>
                            <th className="px-4 py-3 text-start">المبلغ</th>
                            <th className="px-4 py-3 text-start">الحالة</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredDeposits.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'إيداع جديد', 'DEPOSIT_DEDUCT': 'خصم للإصلاح', 'DEPOSIT_RETURN': 'إرجاع مستحقات'};
                            return (
                                <tr key={tx.id} className={`hover:bg-muted/10 transition-colors group ${tx.status === 'VOID' ? 'opacity-50 bg-neutral/10 line-through' : ''}`}>
                                    <td className="px-4 py-3 text-xs">{formatDate(tx.date)}</td>
                                    <td className="px-4 py-3 font-medium text-heading">{tenant?.name || '—'}</td>
                                    <td className="px-4 py-3 font-bold">{typeMap[tx.type]}</td>
                                    <td className="px-4 py-3 font-mono font-bold">{formatCurrency(tx.amount, db.settings.currency)}</td>
                                    <td className="px-4 py-3"><StatusPill status={tx.status}>{tx.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-end">
                                        {tx.status !== 'VOID' && <ActionsMenu items={[VoidAction(() => financeService.voidDepositTx(tx.id))]}/>}
                                      </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredDeposits.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <h3 className="text-lg font-semibold text-heading mb-1">لا توجد حركات وديعة</h3>
                                    <p className="text-muted-foreground text-sm">لم يتم العثور على أي حركات تأمين أو ودائع.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <DepositTxForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default DepositsView;
