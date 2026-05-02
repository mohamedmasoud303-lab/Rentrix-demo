
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import { 
    TrendingUp, Wallet, Users, FileBarChart, 
    History, Building2
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import ReportCard from '../components/reports/ReportCard';
import OwnerStatementView from '../components/reports/OwnerStatementView';
import TenantStatementView from '../components/reports/TenantStatementView';
import UnitLedgerView from '../components/reports/UnitLedgerView';
import CollectionsReportView from '../components/reports/CollectionsReportView';
import MaintenanceReportView from '../components/reports/MaintenanceReportView';
import AgingReportView from '../components/reports/AgingReportView';

type ReportTab = 'owner' | 'tenant' | 'aging' | 'unit_ledger' | 'collections' | 'maintenance';

const Reports: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { db } = useApp();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [activeTab, setActiveTab] = useState<ReportTab | null>(queryParams.get('tab') as ReportTab | null);

    if (!db) return null;

    const handleTabChange = (tab: ReportTab | null) => {
        setActiveTab(tab);
        if (tab) navigate(`/reports?tab=${tab}`);
        else navigate('/reports');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {!activeTab ? (
                <>
                    <PageHeader title="مركز التقارير" description="تقارير تحليلية شاملة للتدقيق والرقابة المالية." />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard title="كشف حساب مالك" subtitle="تفصيلي لحصص الملاك وصافي مستحقاتهم." icon={<Wallet />} onClick={() => handleTabChange('owner')} />
                        <ReportCard title="كشف حساب مستأجر" subtitle="تحليل مديونية المستأجر والتحصيلات." icon={<Users />} onClick={() => handleTabChange('tenant')} />
                        <ReportCard title="كشف حركة وحدة" subtitle="سجل تاريخي للإشغال والتحصيلات والمصاريف." icon={<Building2 />} onClick={() => handleTabChange('unit_ledger')} />
                        <ReportCard title="تقرير التحصيلات" subtitle="تحليل التدفقات النقدية والديون المتأخرة." icon={<TrendingUp />} onClick={() => handleTabChange('collections')} />
                        <ReportCard title="تقرير الصيانة" subtitle="تحليل تكاليف الصيانة حسب العقار والوحدة." icon={<FileBarChart />} onClick={() => handleTabChange('maintenance')} />
                        <ReportCard title="أعمار الذمم (Aging)" subtitle="تحليل ديون المستأجرين حسب مدة التأخير." icon={<History />} onClick={() => handleTabChange('aging')} />
                    </div>
                </>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <button onClick={() => handleTabChange(null)} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                        العودة لمركز التقارير
                    </button>
                    <Card className="min-h-[600px] border-border/50">
                        {activeTab === 'owner' && <OwnerStatementView />}
                        {activeTab === 'tenant' && <TenantStatementView />}
                        {activeTab === 'unit_ledger' && <UnitLedgerView />}
                        {activeTab === 'collections' && <CollectionsReportView />}
                        {activeTab === 'maintenance' && <MaintenanceReportView />}
                        {activeTab === 'aging' && <AgingReportView />}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Reports;
