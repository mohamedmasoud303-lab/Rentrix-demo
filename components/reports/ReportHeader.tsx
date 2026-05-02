import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { formatDateTime } from '../../utils/helpers';

interface ReportHeaderProps {
    title: string;
    subtitle?: string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, subtitle }) => {
    const { db } = useApp();
    return (
        <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-heading">{title}</h2>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="text-left">
                <h3 className="font-bold text-lg">{db.settings?.company.name}</h3>
                <p className="text-xs text-muted-foreground">{db.settings?.company.phone}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(new Date().toISOString())}</p>
            </div>
        </div>
    );
};

export default ReportHeader;
