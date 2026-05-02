import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { PlusCircle, BookOpen, Layers } from 'lucide-react';
import ActionsMenu, { EditAction, DeleteAction } from '../shared/ActionsMenu';
import AccountForm from '../forms/AccountForm';

const ChartOfAccountsView: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const accounts = useMemo(() => [...(db.accounts || [])].sort((a, b) => a.no.localeCompare(b.no)), [db.accounts]);
    const accountBalances = db.accountBalances || [];

    const balancesMap = useMemo(() => new Map<string, number>((accountBalances || []).map(ab => [ab.accountId, ab.balance])), [accountBalances]);

    const handleOpenModal = (account: Account | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const groupedAccounts = useMemo(() => {
        if (!accounts) return {} as Record<Account['type'], Account[]>;
        const result: Record<Account['type'], Account[]> = { ASSET: [], LIABILITY: [], EQUITY: [], REVENUE: [], EXPENSE: [] };
        accounts.forEach(account => {
            if (!result[account.type]) result[account.type] = [];
            result[account.type].push(account);
        });
        return result;
    }, [accounts]);

    const accountTypes: { key: Account['type'], name: string, color: string }[] = [
        { key: 'ASSET', name: 'الأصول (الموجودات)', color: 'text-primary' },
        { key: 'LIABILITY', name: 'الالتزامات (الخصوم)', color: 'text-danger' },
        { key: 'EQUITY', name: 'حقوق الملكية', color: 'text-indigo-600' },
        { key: 'REVENUE', name: 'الإيرادات', color: 'text-success' },
        { key: 'EXPENSE', name: 'المصروفات', color: 'text-orange-600' }
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">دليل الحسابات الموحد</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center gap-2"><PlusCircle size={16} /> إضافة حساب</button>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
                {accountTypes.map(type => groupedAccounts[type.key] && groupedAccounts[type.key].length > 0 && (
                    <div key={type.key} className="space-y-4">
                        <div className="flex items-center gap-2 border-b-2 border-current pb-2 transition-colors">
                            <Layers size={18} className={type.color} />
                            <h3 className={`font-black text-lg ${type.color}`}>{type.name}</h3>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="responsive-table">
                                <thead>
                                    <tr className="bg-background">
                                        <th>كود الحساب</th>
                                        <th>اسم الحساب</th>
                                        <th className="text-left">الرصيد الحالي</th>
                                        <th className="w-16">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedAccounts[type.key].map(account => {
                                        const balance = balancesMap.get(account.id) || 0;
                                        return (
                                        <tr key={account.id} className={`${account.isParent ? 'bg-neutral/20 font-bold' : ''}`}>
                                            <td data-label="الكود" className="font-mono">{account.no}</td>
                                            <td data-label="الاسم" style={{ paddingRight: account.parentId ? '2.5rem' : '1rem' }}>
                                                <div className="flex items-center gap-2">
                                                    {account.isParent ? <BookOpen size={14} className="text-muted-foreground" /> : <span className="w-1.5 h-1.5 rounded-full bg-border"></span>}
                                                    {account.name}
                                                </div>
                                            </td>
                                            <td data-label="الرصيد" className={`font-mono text-left ${balance < 0 ? 'text-danger' : (balance > 0 ? 'text-success' : 'text-muted-foreground')}`}>
                                                {formatCurrency(balance)}
                                            </td>
                                            <td data-label="إجراءات" className="action-cell">
                                                 <ActionsMenu items={[ EditAction(() => handleOpenModal(account)), DeleteAction(() => dataService.remove('accounts', account.id)) ]} />
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && <AccountForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAccount(null); }} account={editingAccount} />}
        </div>
    );
};

export default ChartOfAccountsView;
