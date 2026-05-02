
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Contract } from '../types';
import Card from '../components/ui/Card';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, toArabicDigits, formatDate } from '../utils/helpers';
import { FileText, PlusCircle, AlertTriangle, Clock, DollarSign, Repeat } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { exportContractToPdf } from '../services/pdfService';
import { toast } from 'react-hot-toast';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import { ContractPrintable } from '../components/print/ContractPrintable';
import PageHeader from '../components/ui/PageHeader';
import TableControls from '../components/shared/TableControls';
import ContractForm from '../components/forms/ContractForm';

const Contracts: React.FC = () => {
    const { db, dataService, contractBalances } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [printingContract, setPrintingContract] = useState<Contract | null>(null);
    const [defaultUnitId, setDefaultUnitId] = useState<string | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const contractsData = useMemo(() => {
        if (!db.settings) return { contracts: [], stats: { active: 0, totalRent: 0, expiring: 0, overdueBalance: 0 }};

        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + db.settings.contractAlertDays);

        const contracts = db.contracts.map(c => {
            const balance = contractBalances[c.id]?.balance || 0;
            const isExpiring = c.status === 'ACTIVE' && new Date(c.end) <= alertDate && new Date(c.end) >= new Date();
            let risk: 'high' | 'medium' | 'low' = 'low';
            if (balance > 0) risk = 'high';
            else if (isExpiring) risk = 'medium';

            return { ...c, balance, isExpiring, risk };
        }).filter(c => {
            const unit = db.units.find(u => u.id === c.unitId);
            const tenant = db.tenants.find(t => t.id === c.tenantId);
            const matchesSearch = (unit?.name.includes(searchTerm) || tenant?.name.includes(searchTerm));
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => {
            if (a.risk === 'high' && b.risk !== 'high') return -1;
            if (b.risk === 'high' && a.risk !== 'high') return 1;
            if (a.risk === 'medium' && b.risk === 'low') return -1;
            if (b.risk === 'medium' && a.risk === 'low') return 1;
            return new Date(a.end).getTime() - new Date(b.end).getTime();
        });

        const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
        const stats = {
            active: activeContracts.length,
            totalRent: activeContracts.reduce((sum, c) => sum + c.rent, 0),
            expiring: activeContracts.filter(c => c.isExpiring).length,
            overdueBalance: activeContracts.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0)
        };

        return { contracts, stats };
    }, [db, contractBalances, searchTerm, statusFilter]);


    const handleOpenModal = (contract: Contract | null = null, unitIdForNew?: string) => {
        setEditingContract(contract);
        setDefaultUnitId(unitIdForNew);
        setIsModalOpen(true);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'add' && params.get('unitId')) {
            handleOpenModal(null, params.get('unitId')!);
            navigate('/contracts', { replace: true });
        } else if (params.get('contractId')) {
            const contractToEdit = db.contracts.find(c => c.id === params.get('contractId'));
            if (contractToEdit) handleOpenModal(contractToEdit);
            navigate('/contracts', { replace: true });
        }
    }, [location, db.contracts, navigate]);

    const handleCloseModal = () => setIsModalOpen(false);
    const handleDelete = (id: string) => {
        if (db.receipts.some(r => r.contractId === id) || db.expenses.some(e => e.contractId === id)) {
            toast.error("لا يمكن حذف العقد لوجود حركات مالية مرتبطة به.");
            return;
        }
        dataService.remove('contracts', id);
    };
    const handlePrint = (id: string) => setPrintingContract(db.contracts.find(c => c.id === id) || null);
    
    const { contracts, stats } = contractsData;

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة العقود" description="عرض وتعديل جميع عقود الإيجار في النظام." />
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard label="العقود النشطة" value={stats.active} icon={<FileText size={24}/>} color="info"/>
                <SummaryStatCard label="إجمالي الإيجارات الشهرية" value={formatCurrency(stats.totalRent)} icon={<DollarSign size={24}/>} color="success"/>
                <SummaryStatCard label="عقود تنتهي قريباً" value={stats.expiring} icon={<Clock size={24}/>} color={stats.expiring > 0 ? 'warning' : 'success'}/>
                <SummaryStatCard label="إجمالي المتأخرات" value={formatCurrency(stats.overdueBalance)} icon={<AlertTriangle size={24}/>} color={stats.overdueBalance > 0 ? 'danger' : 'success'}/>
            </div>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">قائمة العقود (مرتبة حسب الأولوية)</h2>
                </div>
                
                <TableControls
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onAdd={() => handleOpenModal()}
                    addLabel="إضافة عقد"
                    onPrint={() => window.print()}
                    filterOptions={[
                        { value: 'ALL', label: 'الكل' },
                        { value: 'ACTIVE', label: 'نشط' },
                        { value: 'ENDED', label: 'منتهي' },
                        { value: 'SUSPENDED', label: 'معلق' }
                    ]}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
                
                <div className="overflow-x-auto mt-4">
                    <table className="w-full responsive-table">
                        <thead>
                            <tr>
                                <th>الوحدة / المستأجر</th>
                                <th>الإيجار</th>
                                <th>الفترة</th>
                                <th>الرصيد المستحق</th>
                                <th>الحالة</th>
                                <th className="text-left">الإجراء السريع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map(c => {
                                const unit = db.units.find(u => u.id === c.unitId);
                                const tenant = db.tenants.find(t => t.id === c.tenantId);
                                return (
                                    <tr key={c.id} className={`group ${c.risk === 'high' ? 'bg-danger-foreground' : c.risk === 'medium' ? 'bg-warning-foreground' : ''}`}>
                                        <td data-label="الوحدة/المستأجر" className="font-medium text-heading whitespace-nowrap">
                                            <div>{unit?.name}</div>
                                            <div className="text-xs text-muted-foreground">{tenant?.name}</div>
                                        </td>
                                        <td data-label="الإيجار">{formatCurrency(c.rent, db.settings.currency)}</td>
                                        <td data-label="الفترة" className="text-muted-foreground text-sm">{toArabicDigits(c.start)} ← {toArabicDigits(c.end)}</td>
                                        <td data-label="الرصيد" className={`font-bold ${c.balance > 0 ? 'text-danger' : 'text-foreground'}`}>{formatCurrency(c.balance, db.settings.currency)}</td>
                                        <td data-label="الحالة"><StatusPill status={c.status}>{c.status === 'ACTIVE' ? 'نشط' : (c.status === 'ENDED' ? 'منتهي' : 'معلق')}</StatusPill></td>
                                        <td data-label="إجراء سريع" className="action-cell">
                                            <div className="flex items-center justify-end gap-2">
                                                {c.balance > 0 && <button onClick={() => navigate('/financials')} className="btn btn-danger btn-sm flex items-center gap-1"><DollarSign size={14}/> تحصيل</button>}
                                                {c.isExpiring && <button className="btn btn-warning btn-sm flex items-center gap-1"><Repeat size={14}/> تجديد</button>}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionsMenu items={[ EditAction(() => handleOpenModal(c)), PrintAction(() => handlePrint(c.id)), DeleteAction(() => handleDelete(c.id)),]} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {contracts.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد عقود مطابقة للبحث.</div>}
                </div>
            </Card>
            <ContractForm isOpen={isModalOpen} onClose={handleCloseModal} contract={editingContract} defaultUnitId={defaultUnitId} />
            {printingContract && ( 
                <PrintPreviewModal 
                    isOpen={!!printingContract} 
                    onClose={() => setPrintingContract(null)} 
                    title={`معاينة طباعة العقد`}
                    onExportPdf={() => {
                        if (!db.settings || !printingContract) return;
                        const tenant = db.tenants.find(t => t.id === printingContract.tenantId);
                        const unit = db.units.find(u => u.id === printingContract.unitId);
                        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : undefined;
                        const owner = property ? db.owners.find(o => o.id === property.ownerId) : undefined;
                        exportContractToPdf(printingContract, tenant, unit, property, owner, db.settings);
                    }}
                >
                    <ContractPrintable contract={printingContract} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default Contracts;
