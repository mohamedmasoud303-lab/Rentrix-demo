
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import ReceiptsView from '../components/financials/ReceiptsView';
import ExpensesView from '../components/financials/ExpensesView';
import DepositsView from '../components/financials/DepositsView';
import OwnerSettlementsView from '../components/financials/OwnerSettlementsView';

const Financials: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'receipts' | 'expenses' | 'deposits' | 'settlements'>('receipts');
    
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader title="الخزينة والمالية" description="إدارة السندات، المصروفات، والتحويلات المالية للملاك والمستأجرين." />
            <Card className="border-border/50">
                <Tabs 
                    tabs={[
                        { id: 'receipts', label: 'سندات القبض' },
                        { id: 'expenses', label: 'المصروفات' },
                        { id: 'deposits', label: 'الودائع والتأمين' },
                        { id: 'settlements', label: 'تسويات الملاك' }
                    ]}
                    activeTab={activeTab}
                    onTabClick={(id) => setActiveTab(id as any)}
                />
                <div className="pt-6 animate-in slide-in-from-left-2 duration-300">
                    {activeTab === 'receipts' && <ReceiptsView />}
                    {activeTab === 'expenses' && <ExpensesView />}
                    {activeTab === 'deposits' && <DepositsView />}
                    {activeTab === 'settlements' && <OwnerSettlementsView />}
                </div>
            </Card>
        </div>
    );
};

export default Financials;
