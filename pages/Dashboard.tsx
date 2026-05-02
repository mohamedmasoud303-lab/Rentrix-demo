
import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, toArabicDigits, formatDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, FileText, Receipt, Wrench, 
  AlertCircle, TrendingUp, RefreshCw, 
  Plus, Calendar, Clock,
  LayoutDashboard, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import ExecutiveKpiCard from '../components/ui/ExecutiveKpiCard';
import RiskRadarItem from '../components/dashboard/RiskRadarItem';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

import QuickActionBtn from '../components/dashboard/QuickActionBtn';

const Dashboard: React.FC = () => {
    const { db, currentUser, rebuildFinancials } = useApp();
    const navigate = useNavigate();
    
    const stats = useMemo(() => {
        if (!db.settings) return null;
        const { units, contracts, contractBalances, receipts, expenses: dbExpenses, maintenanceRecords, tenants } = db;
        
        // Basic counts
        const totalUnits = units.length;
        const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
        const vacantUnits = totalUnits - activeContracts.length;
        
        // Financials
        const totalArrears = contractBalances.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
        
        // Monthly collection (current month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        const monthlyCollection = receipts
            .filter(r => r.status === 'POSTED' && r.createdAt >= firstDayOfMonth)
            .reduce((s, r) => s + r.amount, 0);
            
        // Maintenance costs (current month)
        const monthlyMaintenance = maintenanceRecords
            .filter(m => m.status === 'COMPLETED' && m.completedAt && m.completedAt >= firstDayOfMonth)
            .reduce((s, m) => s + (m.cost || 0), 0);

        // Helper to get names
        const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'غير معروف';
        const getUnitNumber = (unitId: string) => units.find(u => u.id === unitId)?.name || 'غير معروف';

        // Alerts
        const upcomingExpirations = contracts
            .filter(c => {
                if (c.status !== 'ACTIVE') return false;
                const endTime = new Date(c.end).getTime();
                const thirtyDaysFromNow = now.getTime() + (30 * 24 * 60 * 60 * 1000);
                return endTime <= thirtyDaysFromNow && endTime >= now.getTime();
            })
            .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime())
            .slice(0, 5)
            .map(c => ({
                ...c,
                tenantName: getTenantName(c.tenantId),
                unitNumber: getUnitNumber(c.unitId)
            }));

        const overduePayments = contractBalances
            .filter(b => b.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5)
            .map(b => ({
                ...b,
                tenantName: getTenantName(b.tenantId),
                unitNumber: getUnitNumber(b.unitId)
            }));

        // Chart Data: Cashflow (last 6 months)
        const cashflowData = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const monthStart = d.getTime();
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();
            const monthName = d.toLocaleString('ar-EG', { month: 'short' });
            
            const income = receipts
                .filter(r => r.status === 'POSTED' && r.createdAt >= monthStart && r.createdAt <= monthEnd)
                .reduce((s, r) => s + r.amount, 0);
                
            const exp = dbExpenses
                .filter(e => e.status === 'POSTED' && new Date(e.dateTime).getTime() >= monthStart && new Date(e.dateTime).getTime() <= monthEnd)
                .reduce((s, e) => s + e.amount, 0);
                
            return { name: monthName, دخل: income, خرج: exp };
        });

        // Chart Data: Unit Status
        const unitStatusData = [
            { name: 'مؤجر', value: activeContracts.length, color: 'var(--primary)' },
            { name: 'شاغر', value: vacantUnits, color: 'var(--muted-foreground)' },
        ];

        return { 
            totalUnits, vacantUnits, totalArrears, monthlyCollection, monthlyMaintenance,
            upcomingExpirations, overduePayments, cashflowData, unitStatusData,
            activeCount: activeContracts.length,
        };
    }, [db]);

    if (!stats) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4 animate-pulse">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <RefreshCw className="animate-spin text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-bold">جاري تحميل لوحة التحكم...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader 
                title={`مرحباً، ${currentUser?.username}`} 
                description="إليك نظرة عامة على أداء محفظتك العقارية اليوم."
            >
                <div className="flex items-center gap-2">
                    <button 
                        onClick={rebuildFinancials} 
                        className="btn btn-ghost flex items-center gap-2 text-xs"
                        title="إعادة بناء السجلات المالية من دفتر اليومية"
                    >
                        <RefreshCw size={14} /> تحديث البيانات
                    </button>
                    <button 
                        onClick={() => navigate('/contracts/new')}
                        className="btn bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-xs"
                    >
                        <Plus size={14} /> عقد جديد
                    </button>
                </div>
            </PageHeader>

            {/* Executive KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ExecutiveKpiCard 
                    title="إجمالي التحصيلات" 
                    value={formatCurrency(stats.monthlyCollection)} 
                    icon={<TrendingUp size={24}/>} 
                    color="success"
                    trend={{ value: '8%', isUp: true }}
                    description="مقارنة بالشهر السابق"
                />
                <ExecutiveKpiCard 
                    title="الوحدات الشاغرة" 
                    value={toArabicDigits(stats.vacantUnits)} 
                    icon={<Users size={24}/>} 
                    color="warning"
                    trend={{ value: '2', isUp: false }}
                    description="وحدات متاحة للتأجير"
                />
                <ExecutiveKpiCard 
                    title="المتأخرات المالية" 
                    value={formatCurrency(stats.totalArrears)} 
                    icon={<AlertCircle size={24}/>} 
                    color="danger"
                    description="إجمالي الديون المستحقة"
                />
                <ExecutiveKpiCard 
                    title="طلبات الصيانة" 
                    value={formatCurrency(stats.monthlyMaintenance)} 
                    icon={<Wrench size={24}/>} 
                    color="info"
                    description="تكاليف الشهر الحالي"
                />
            </div>

            {/* Secondary KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard 
                    title="إجمالي الوحدات" 
                    value={toArabicDigits(stats.totalUnits)} 
                    icon={<Building2 size={18}/>} 
                    color="blue" 
                />
                <KpiCard 
                    title="مستحق اليوم" 
                    value={formatCurrency(0)} 
                    icon={<Calendar size={18}/>} 
                    color="blue" 
                />
                <KpiCard 
                    title="عقود نشطة" 
                    value={toArabicDigits(stats.activeCount)} 
                    icon={<FileText size={18}/>} 
                    color="green" 
                />
                 <KpiCard 
                    title="نسبة الإشغال" 
                    value={`%${toArabicDigits(Math.round((stats.activeCount / stats.totalUnits) * 100) || 0)}`} 
                    icon={<PieChartIcon size={18}/>} 
                    color="yellow" 
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 border-border/50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black flex items-center gap-2">
                                <BarChart3 size={18} className="text-primary" />
                                التدفق النقدي (آخر 6 أشهر)
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span>المقبوضات</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                                    <span>المصروفات</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.cashflowData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        tickFormatter={(value) => toArabicDigits(value)}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--card)', 
                                            borderColor: 'var(--border)',
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Bar dataKey="دخل" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar dataKey="خرج" fill="var(--muted-foreground)" opacity={0.2} radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 border-border/50">
                            <h3 className="font-black flex items-center gap-2 mb-6">
                                <PieChartIcon size={18} className="text-primary" />
                                حالة الوحدات
                            </h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.unitStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.unitStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <div className="space-y-4">
                             <RiskRadarItem 
                                title="مخاطر التحصيل" 
                                riskLevel={stats.totalArrears > 10000 ? 'high' : stats.totalArrears > 0 ? 'medium' : 'low'} 
                                value={formatCurrency(stats.totalArrears)}
                                description="بناءً على المتأخرات الحالية"
                             />
                             <RiskRadarItem 
                                title="مخاطر الشواغر" 
                                riskLevel={stats.vacantUnits > 5 ? 'high' : stats.vacantUnits > 2 ? 'medium' : 'low'} 
                                value={`${toArabicDigits(stats.vacantUnits)} وحدات`}
                                description="وحدات غير مؤجرة لفترة طويلة"
                             />
                        </div>
                    </div>
                </div>

                {/* Sidebar Alerts Area */}
                <div className="space-y-6">
                    <Card className="p-0 overflow-hidden border-danger/20">
                        <div className="p-4 bg-danger/5 border-b border-danger/10 flex items-center justify-between">
                            <h3 className="font-black text-xs text-danger uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} />
                                تنبيهات التحصيل
                            </h3>
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                                {toArabicDigits(stats.overduePayments.length)}
                            </span>
                        </div>
                        <div className="divide-y divide-border">
                            {stats.overduePayments.map((p, i) => (
                                <div key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/invoices')}>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm truncate max-w-[120px]">{p.tenantName}</p>
                                        <span className="text-xs font-black text-danger">{formatCurrency(p.balance)}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">وحدة: {p.unitNumber}</p>
                                </div>
                            ))}
                            {stats.overduePayments.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-xs">لا توجد متأخرات حالياً</div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-0 overflow-hidden border-orange/20">
                        <div className="p-4 bg-orange/5 border-b border-orange/10 flex items-center justify-between">
                            <h3 className="font-black text-xs text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} />
                                عقود تنتهي قريباً
                            </h3>
                        </div>
                        <div className="divide-y divide-border">
                            {stats.upcomingExpirations.map((c, i) => (
                                <div key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm truncate max-w-[120px]">{c.tenantName}</p>
                                        <span className="text-[10px] font-bold bg-orange/10 text-orange-600 px-2 py-0.5 rounded-full">
                                            {formatDate(c.end)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">وحدة: {c.unitNumber}</p>
                                </div>
                            ))}
                            {stats.upcomingExpirations.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-xs">لا توجد عقود تنتهي قريباً</div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 border-border/50">
                        <h3 className="font-black flex items-center gap-2 mb-6">
                            <LayoutDashboard size={18} className="text-primary" />
                            إجراءات سريعة
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <QuickActionBtn 
                                icon={<FileText size={18} />} 
                                label="إضافة عقد" 
                                onClick={() => navigate('/contracts/new')} 
                            />
                            <QuickActionBtn 
                                icon={<Receipt size={18} />} 
                                label="سند قبض" 
                                onClick={() => navigate('/financials')} 
                            />
                            <QuickActionBtn 
                                icon={<Wrench size={18} />} 
                                label="طلب صيانة" 
                                onClick={() => navigate('/maintenance')} 
                            />
                            <QuickActionBtn 
                                icon={<BarChart3 size={18} />} 
                                label="التقارير" 
                                onClick={() => navigate('/reports')} 
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
