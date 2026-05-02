
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
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader title="طلبات الصيانة" description="إدارة طلبات الصيانة ومتابعة حالتها وتكاليفها." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryStatCard label="طلبات مفتوحة" value={summaryData.open} icon={<Wrench size={24}/>} color={summaryData.open > 0 ? 'warning' : 'success'}/>
                <SummaryStatCard label="طلبات متأخرة (> 7 أيام)" value={summaryData.aged} icon={<AlertTriangle size={24}/>} color={summaryData.aged > 0 ? 'danger' : 'success'}/>
                <SummaryStatCard label="طلبات جديدة اليوم" value={summaryData.newToday} icon={<Clock size={24}/>} color="info"/>
                <SummaryStatCard label="تكاليف غير مفوترة" value={formatCurrency(summaryData.unbilledCost)} icon={<DollarSign size={24}/>} color={summaryData.unbilledCost > 0 ? 'warning' : 'success'}/>
            </div>
            <Card className="p-6 border-border/50">
                <div className="mb-6">
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
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-start">رقم الطلب</th>
                                <th className="px-4 py-3 text-start">الوحدة / العقار</th>
                                <th className="px-4 py-3 text-start">تاريخ الطلب</th>
                                <th className="px-4 py-3 text-start">التكلفة</th>
                                <th className="px-4 py-3 text-start">الحالة</th>
                                <th className="px-4 py-3 text-end">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {recordsWithDetails.map(rec => {
                                const unit = db.units.find(u => u.id === rec.unitId);
                                const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                                return (
                                    <tr key={rec.id} className={`hover:bg-muted/10 transition-colors group cursor-pointer ${rec.isAging ? 'bg-warning/5 border-l-2 border-l-warning' : ''}`} onClick={() => handleOpenModal(rec)}>
                                        <td className="px-4 py-3 font-mono font-bold text-xs">{rec.no}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-heading">{unit?.name || 'غير محدد'}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{property?.name || 'عقار غير معروف'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs">{formatDate(rec.requestDate)}</td>
                                        <td className="px-4 py-3 font-mono font-medium">{formatCurrency(rec.cost)}</td>
                                        <td className="px-4 py-3"><StatusPill status={rec.status}>{getStatusLabel(rec.status)}</StatusPill></td>
                                        <td className="px-4 py-3 text-end">
                                            <div className="flex items-center justify-end gap-2">
                                                {rec.status === 'NEW' && <button onClick={(e) => { e.stopPropagation(); dataService.update('maintenanceRecords', rec.id, { status: 'IN_PROGRESS' }); }} className="btn btn-sm btn-secondary text-[10px] px-2 py-1">بدء العمل</button>}
                                                {rec.status === 'COMPLETED' && rec.cost > 0 && !rec.expenseId && !rec.invoiceId && <button onClick={(e) => { e.stopPropagation(); handleOpenModal(rec); }} className="btn btn-sm bg-primary/10 text-primary hover:bg-primary/20 text-[10px] px-2 py-1">إنشاء مصروف/فاتورة</button>}
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ActionsMenu items={[ EditAction(() => handleOpenModal(rec)), PrintAction(() => setPrintingRecord(rec)), DeleteAction(() => handleDelete(rec.id))]} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {recordsWithDetails.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Wrench size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                                        <h3 className="text-lg font-semibold text-heading mb-1">لا توجد طلبات صيانة</h3>
                                        <p className="text-muted-foreground text-sm">لم يتم العثور على طلبات صيانة مطابقة.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
