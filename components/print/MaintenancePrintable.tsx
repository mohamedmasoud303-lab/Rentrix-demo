import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PrintLayout } from './PrintLayout';

export const MaintenancePrintable: React.FC<{ record: MaintenanceRecord }> = ({ record }) => {
    const { db } = useApp();
    const unit = db.units.find(u => u.id === record.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    
    const getStatusLabel = (status: MaintenanceRecord['status']) => {
        const map: { [key in MaintenanceRecord['status']]: string } = { 'NEW': 'جديد', 'IN_PROGRESS': 'قيد التنفيذ', 'COMPLETED': 'مكتمل', 'CLOSED': 'مغلق' };
        return map[status] || status;
    }

    return (
        <PrintLayout title="طلب صيانة" subtitle={`رقم الطلب: ${record.no}`}>
            <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 p-4 border border-border rounded-md">
                    <p><strong>تاريخ الطلب:</strong> {formatDate(record.requestDate)}</p>
                    <p><strong>الحالة:</strong> {getStatusLabel(record.status)}</p>
                    <p><strong>العقار:</strong> {property?.name}</p>
                    <p><strong>الوحدة:</strong> {unit?.name}</p>
                    <p><strong>التكلفة:</strong> {formatCurrency(record.cost, db.settings.currency)}</p>
                    <p><strong>تحمل على:</strong> {record.chargedTo}</p>
                </div>
                <div>
                    <h3 className="font-bold">وصف الطلب:</h3>
                    <p className="p-3 bg-background rounded-md border border-border mt-1 min-h-[100px]">{record.description}</p>
                </div>
            </div>
        </PrintLayout>
    );
};
