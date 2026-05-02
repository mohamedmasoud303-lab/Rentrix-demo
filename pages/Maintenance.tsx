
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { MaintenanceRecord, Expense, Invoice } from '../types';
import Card from '../components/ui/Card';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDate } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import { Wrench, PlusCircle, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { MaintenancePrintable } from '../components/print/MaintenancePrintable';
import { exportMaintenanceRecordToPdf } from '../services/pdfService';
import TableControls from '../components/shared/TableControls';
import MaintenanceForm from '../components/forms/MaintenanceForm';

const Maintenance: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const handleOpenModal = (record: MaintenanceRecord | null = null) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRecord(null);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (!db) return;
        const record = db.maintenanceRecords.find(r => r.id === id);
        if (record?.expenseId || record?.invoiceId) {
            toast.error("لا يمكن حذف طلب الصيانة هذا لأنه مرتبط بحركة مالية.");
            return;
        }
        dataService.remove('maintenanceRecords', id);
    };

    const summaryData = useMemo(() => {
        if (!db) return { open: 0, aged: 0, unbilledCost: 0, newToday: 0 };
        const openTickets = db.maintenanceRecords.filter(r => r.status !== 'CLOSED');
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return {
            open: openTickets.length,
            aged: openTickets.filter(r => new Date(r.requestDate) < sevenDaysAgo).length,
            unbilledCost: db.maintenanceRecords
                .filter(r => (r.status === 'COMPLETED') && !r.expenseId && !r.invoiceId)
                .reduce((sum, r) => sum + r.cost, 0),
            newToday: db.maintenanceRecords.filter(r => r.requestDate === today).length,
        }
    }, [db]);

    const recordsWithDetails = useMemo(() => {
        if (!db) return [];
        const statusPriority: { [key in MaintenanceRecord['status']]: number } = { 'NEW': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'CLOSED': 4 };
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        return db.maintenanceRecords.filter(rec => {
            const unit = db.units.find(u => u.id === rec.unitId);
            const matchesSearch = rec.no.includes(searchTerm) || rec.description.includes(searchTerm) || unit?.name.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).map(rec => ({
            ...rec,
            isAging: rec.status === 'NEW' && new Date(rec.requestDate) < threeDaysAgo
        })).sort((a,b) => statusPriority[a.status] - statusPriority[b.status] || new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime());
    }, [db, searchTerm, statusFilter]);
    
    const getStatusLabel = (status: MaintenanceRecord['status']) => {
        const map: { [key in MaintenanceRecord['status']]: string } = { 'NEW': 'جديد', 'IN_PROGRESS': 'قيد التنفيذ', 'COMPLETED': 'مكتمل', 'CLOSED': 'مغلق' };
        return map[status] || status;
    }
    
    if (!db.settings) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard label="طلبات مفتوحة" value={summaryData.open} icon={<Wrench size={24}/>} color={summaryData.open > 0 ? 'warning' : 'success'}/>
                <SummaryStatCard label="طلبات متأخرة (> 7 أيام)" value={summaryData.aged} icon={<AlertTriangle size={24}/>} color={summaryData.aged > 0 ? 'danger' : 'success'}/>
                <SummaryStatCard label="طلبات جديدة اليوم" value={summaryData.newToday} icon={<Clock size={24}/>} color="info"/>
                <SummaryStatCard label="تكاليف غير مفوترة" value={formatCurrency(summaryData.unbilledCost)} icon={<DollarSign size={24}/>} color={summaryData.unbilledCost > 0 ? 'warning' : 'success'}/>
            </div>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">طلبات الصيانة (مرتبة حسب الأولوية)</h2>
                </div>
                
                <TableControls
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onAdd={() => handleOpenModal()}
                    addLabel="إضافة طلب صيانة"
                    onPrint={() => window.print()}
                    filterOptions={[
                        { value: 'ALL', label: 'الكل' },
                        { value: 'NEW', label: 'جديد' },
                        { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
                        { value: 'COMPLETED', label: 'مكتمل' },
                        { value: 'CLOSED', label: 'مغلق' }
                    ]}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
                
                <div className="overflow-x-auto mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>الوحدة</th><th>تاريخ الطلب</th><th>التكلفة</th>
                                <th>الحالة</th><th className="text-left">الإجراء السريع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recordsWithDetails.map(rec => {
                                const unit = db.units.find(u => u.id === rec.unitId);
                                const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                                return (
                                    <tr key={rec.id} className={`group cursor-pointer ${rec.isAging ? 'bg-warning-foreground' : ''}`} onClick={() => handleOpenModal(rec)}>
                                        <td className="font-mono">{rec.no}</td>
                                        <td className="font-medium text-heading"><div>{unit?.name}</div><div className="text-xs text-muted-foreground">{property?.name}</div></td>
                                        <td>{formatDate(rec.requestDate)}</td>
                                        <td>{formatCurrency(rec.cost)}</td>
                                        <td><StatusPill status={rec.status}>{getStatusLabel(rec.status)}</StatusPill></td>
                                        <td className="text-left w-64">
                                            <div className="flex items-center justify-end gap-2">
                                                {rec.status === 'NEW' && <button onClick={(e) => { e.stopPropagation(); dataService.update('maintenanceRecords', rec.id, { status: 'IN_PROGRESS' }); }} className="btn btn-sm btn-secondary">بدء العمل</button>}
                                                {rec.status === 'COMPLETED' && rec.cost > 0 && !rec.expenseId && !rec.invoiceId && <button onClick={(e) => { e.stopPropagation(); handleOpenModal(rec); }} className="btn btn-sm btn-primary">إنشاء مصروف/فاتورة</button>}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                    <ActionsMenu items={[ EditAction(() => handleOpenModal(rec)), PrintAction(() => setPrintingRecord(rec)), DeleteAction(() => handleDelete(rec.id))]} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {recordsWithDetails.length === 0 && (<div className="text-center py-16"><Wrench size={52} className="mx-auto text-muted" /><h3 className="mt-4 text-xl font-semibold text-heading">لا توجد طلبات صيانة مطابقة</h3></div>)}
                </div>
            </Card>
            <MaintenanceForm isOpen={isModalOpen} onClose={handleCloseModal} record={editingRecord} />
            {printingRecord && (
                <PrintPreviewModal
                    isOpen={!!printingRecord}
                    onClose={() => setPrintingRecord(null)}
                    title={`طباعة طلب صيانة #${printingRecord.no}`}
                    onExportPdf={() => {
                        if (!db.settings || !printingRecord) return;
                        const unit = db.units.find(u => u.id === printingRecord.unitId);
                        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : undefined;
                        exportMaintenanceRecordToPdf(printingRecord, unit, property, db.settings);
                    }}
                >
                    <MaintenancePrintable record={printingRecord} />
                </PrintPreviewModal>
            )}
        </div>
    );
};


export default Maintenance;
