
import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import Card from '../components/ui/Card';
import { Building, Home, User } from 'lucide-react';
import { Contract, Tenant, Unit } from '../types';

const OwnerView: React.FC = () => {
    const { ownerId } = useParams<{ ownerId: string }>();
    const [searchParams] = useSearchParams();
    const authToken = searchParams.get('auth');
    const { db, ownerBalances } = useApp();
    const { settings, owners, properties, units, contracts, tenants } = db;
    
    const owner = useMemo(() => owners.find(o => o.id === ownerId), [owners, ownerId]);

    const propertiesWithUnits = useMemo(() => {
        if (!properties || !units || !contracts || !tenants) return [];
        
        const contractsMap = new Map<string, Contract>(contracts.filter(c => c.status === 'ACTIVE').map(c => [c.unitId, c]));
        const tenantsMap = new Map<string, Tenant>(tenants.map(t => [t.id, t]));

        return properties.filter(p => p.ownerId === ownerId).map(prop => {
            const unitsForProp = units.filter(u => u.propertyId === prop.id).map(unit => {
                const contract = contractsMap.get(unit.id);
                if (contract) {
                    const tenant = tenantsMap.get(contract.tenantId);
                    return {
                        ...unit,
                        isRented: true as const,
                        tenantName: tenant?.name || 'غير معروف',
                        contractEnd: contract.end,
                    };
                }
                return {
                    ...unit,
                    isRented: false as const,
                };
            });
            return {
                ...prop,
                units: unitsForProp,
            };
        });
    }, [ownerId, properties, units, contracts, tenants]);


    // --- Authentication and Validation ---
    let isValid = false;
    if (authToken && ownerId) {
        try {
            const decodedToken = atob(authToken);
            const [tokenOwnerId, timestampStr] = decodedToken.split(':');
            const timestamp = parseInt(timestampStr, 10);
            
            // Link is valid for 24 hours (24 * 60 * 60 * 1000 milliseconds)
            const isExpired = (Date.now() - timestamp) > 86400000;

            if (tokenOwnerId === ownerId && !isExpired) {
                isValid = true;
            }
        } catch (e) {
            console.error("Invalid auth token", e);
            isValid = false;
        }
    }
    
    const ownerStats = ownerId ? ownerBalances[ownerId] : null;

    if (!isValid || !owner || !ownerStats || !settings) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                 <Card className="w-full max-w-2xl text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ في الوصول</h1>
                    <p className="text-text">الرابط الذي تحاول الوصول إليه غير صالح أو منتهي الصلاحية.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-background min-h-screen" dir="rtl">
            <header className="text-center mb-8 pb-4 border-b-2 border-border">
                {settings.company?.logoDataUrl && <img src={settings.company.logoDataUrl} alt="Company Logo" className="h-16 mx-auto mb-4" />}
                <h1 className="text-3xl font-bold text-text">بوابة تقارير المالك</h1>
                <p className="text-lg text-text-muted">{owner.name}</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-blue-500">
                    <p className="text-sm text-text-muted">إجمالي التحصيلات</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{formatCurrency(ownerStats.collections, settings.currency)}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-red-500">
                    <p className="text-sm text-text-muted">إجمالي المصاريف والعمولة</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">{formatCurrency(ownerStats.expenses + ownerStats.officeShare, settings.currency)}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-green-500">
                    <p className="text-sm text-text-muted">صافي المستحق لك</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{formatCurrency(ownerStats.net, settings.currency)}</p>
                </div>
            </div>
            
            <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">الوحدات التابعة للمالك وحالتها</h2>
                <div className="space-y-6">
                    {propertiesWithUnits.map(prop => (
                        <Card key={prop.id}>
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-border pb-2">
                                <Building size={20} />
                                {prop.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prop.units.map(unit => (
                                    <div key={unit.id} className={`p-4 rounded-lg border-l-4 ${unit.isRented ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'}`}>
                                        <div className="flex items-center gap-2 font-bold">
                                            <Home size={16} />
                                            {unit.name}
                                        </div>
                                        {unit.isRented ? (
                                            <div className="mt-2 text-xs space-y-1 pl-6">
                                                <p className="flex items-center gap-2"><User size={14} /> {unit.tenantName}</p>
                                                <p>ينتهي في: {formatDate(unit.contractEnd)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs mt-2 pl-6">شاغرة</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OwnerView;
