
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
            <header className="text-center mb-8 pb-4 border-b border-border/50 animate-in slide-in-from-top-4 duration-500">
                {settings.company?.logoDataUrl && <img src={settings.company.logoDataUrl} alt="Company Logo" className="h-16 mx-auto mb-4" />}
                <h1 className="text-3xl font-black text-heading">بوابة تقارير المالك</h1>
                <p className="text-lg text-muted-foreground mt-1">{owner.name}</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 animate-in fade-in duration-700">
                <div className="p-6 bg-card rounded-2xl shadow-sm border border-border/50 border-t-4 border-t-primary">
                    <p className="text-sm font-bold text-muted-foreground">إجمالي التحصيلات</p>
                    <p className="text-2xl font-black text-primary mt-2">{formatCurrency(ownerStats.collections, settings.currency)}</p>
                </div>
                <div className="p-6 bg-card rounded-2xl shadow-sm border border-border/50 border-t-4 border-t-danger">
                    <p className="text-sm font-bold text-muted-foreground">إجمالي المصاريف والعمولة</p>
                    <p className="text-2xl font-black text-danger mt-2">{formatCurrency(ownerStats.expenses + ownerStats.officeShare, settings.currency)}</p>
                </div>
                <div className="p-6 bg-card rounded-2xl shadow-sm border border-border/50 border-t-4 border-t-success">
                    <p className="text-sm font-bold text-muted-foreground">صافي المستحق لك</p>
                    <p className="text-2xl font-black text-success mt-2">{formatCurrency(ownerStats.net, settings.currency)}</p>
                </div>
            </div>
            
            <div className="mt-10 animate-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-xl font-black mb-6 text-heading">الوحدات التابعة للمالك وحالتها</h2>
                <div className="space-y-6">
                    {propertiesWithUnits.map(prop => (
                        <Card key={prop.id} className="border-border/50 p-6">
                            <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-heading">
                                <Building size={20} className="text-primary" />
                                {prop.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prop.units.map(unit => (
                                    <div key={unit.id} className={`p-5 rounded-xl border ${unit.isRented ? 'border-success/30 bg-success/5' : 'border-info/30 bg-info/5'}`}>
                                        <div className="flex items-center gap-2 font-bold text-heading">
                                            <Home size={16} className={unit.isRented ? 'text-success' : 'text-info'} />
                                            {unit.name}
                                        </div>
                                        {unit.isRented ? (
                                            <div className="mt-3 text-xs space-y-2 pl-6">
                                                <p className="flex items-center gap-2 text-muted-foreground"><User size={14} /> {unit.tenantName}</p>
                                                <p className="text-muted-foreground font-medium">ينتهي في: <span className="font-bold">{formatDate(unit.contractEnd)}</span></p>
                                            </div>
                                        ) : (
                                            <p className="text-xs mt-3 pl-6 font-bold text-info">شاغرة</p>
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
