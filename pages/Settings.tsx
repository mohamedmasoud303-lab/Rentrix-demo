
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Users as UsersIcon, Database 
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';

// Import sub-components
import BackupManager from './Backup';
import CompanySettings from '../components/settings/CompanySettings';
import FinancialSettings from '../components/settings/FinancialSettings';
import UsersSettings from '../components/settings/UsersSettings';

const Settings: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'general';
    
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const handleTabChange = (id: string) => {
        setActiveTab(id);
        navigate(`/system?tab=${id}`, { replace: true });
    };
    
    return (
        <div className="space-y-6">
            <PageHeader 
                title="إعدادات النظام" 
                description="إدارة المستخدمين، السياسات المالية، وأدوات صيانة النظام." 
            />
            
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="w-full lg:w-64 space-y-1">
                    <TabButton 
                        id="general" 
                        label="الإعدادات العامة" 
                        icon={<SettingsIcon size={18} />} 
                        active={activeTab === 'general'} 
                        onClick={handleTabChange} 
                    />
                    <TabButton 
                        id="users" 
                        label="المستخدمون والصلاحيات" 
                        icon={<UsersIcon size={18} />} 
                        active={activeTab === 'users'} 
                        onClick={handleTabChange} 
                    />
                    <div className="h-px bg-border my-4 mx-2"></div>
                    <TabButton 
                        id="backup" 
                        label="النسخ الاحتياطي" 
                        icon={<Database size={18} />} 
                        active={activeTab === 'backup'} 
                        onClick={handleTabChange} 
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <CompanySettings />
                            <FinancialSettings />
                        </div>
                    )}
                    {activeTab === 'users' && <UsersSettings />}
                    {activeTab === 'backup' && <BackupManager />}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ id: string; label: string; icon: React.ReactNode; active: boolean; onClick: (id: string) => void }> = ({ id, label, icon, active, onClick }) => (
    <button 
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
            active 
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default Settings;
