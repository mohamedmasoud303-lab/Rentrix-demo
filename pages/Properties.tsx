
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Property, Unit, Owner } from '../types';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { PlusCircle, ArrowLeft, Lock, Building, Home } from 'lucide-react';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { formatCurrency } from '../utils/helpers';
import StatusPill from '../components/ui/StatusPill';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import TableControls from '../components/shared/TableControls';
import PropertyForm from '../components/forms/PropertyForm';
import UnitForm from '../components/forms/UnitForm';

const PropertiesPage: React.FC = () => {
    const [selectedProp, setSelectedProp] = useState<Property | null>(null);

    return (
        <div className="space-y-6">
            {selectedProp ? (
                <PropertyDetailView property={selectedProp} onBack={() => setSelectedProp(null)} />
            ) : (
                <PropertyListView onSelectProperty={setSelectedProp} />
            )}
        </div>
    );
};

// --- View for listing all properties ---
const PropertyListView: React.FC<{ onSelectProperty: (p: Property) => void }> = ({ onSelectProperty }) => {
    const { db, canAccess, dataService } = useApp();
    const [isPropModalOpen, setIsPropModalOpen] = useState(false);
    const [editingProp, setEditingProp] = useState<Property | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { properties, units, contracts } = db;

    const propertiesWithStats = useMemo(() => {
        if (!properties || !units || !contracts) return [];
        const rentedUnitIds = new Set(contracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId));
        return properties.map(p => {
            const propUnits = units.filter(u => u.propertyId === p.id);
            const occupiedCount = propUnits.filter(u => rentedUnitIds.has(u.id)).length;
            return { ...p, unitCount: propUnits.length, occupiedCount };
        }).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a,b) => a.name.localeCompare(b.name));
    }, [properties, units, contracts, searchTerm]);
    
    const handleOpenModal = (p: Property | null) => {
        setEditingProp(p);
        setIsPropModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader title="المحفظة العقارية" description="إدارة العقارات والوحدات التابعة لها، تتبع الإشغال والإيرادات." />
            
            <div className="mb-6">
                <TableControls
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onAdd={canAccess('MANAGE_PROPERTIES') ? () => handleOpenModal(null) : undefined}
                    addLabel="عقار جديد"
                    onPrint={() => window.print()}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {propertiesWithStats.map(p => (
                    <Card key={p.id} className="flex flex-col p-6 hover:shadow-lg transition-all duration-300 border-border/50 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Building size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-heading group-hover:text-primary transition-colors">{p.name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                        <Home size={14} /> {p.location}
                                    </p>
                                </div>
                            </div>
                            {canAccess('MANAGE_PROPERTIES') && (
                                <ActionsMenu items={[ EditAction(() => handleOpenModal(p)), DeleteAction(() => dataService.remove('properties', p.id)) ]} />
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                            <div className="p-4 bg-muted/30 rounded-xl flex flex-col items-center justify-center border border-border/50">
                                <span className="text-xs font-semibold text-muted-foreground mb-1">إجمالي الوحدات</span>
                                <span className="text-2xl font-black text-heading">{p.unitCount}</span>
                            </div>
                            <div className="p-4 bg-success/10 rounded-xl flex flex-col items-center justify-center border border-success/20">
                                <span className="text-xs font-semibold text-success mb-1">الوحدات المؤجرة</span>
                                <span className="text-2xl font-black text-success">{p.occupiedCount}</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => onSelectProperty(p)} 
                            className="w-full btn bg-secondary text-secondary-foreground hover:bg-secondary/90 flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                        >
                             إدارة الوحدات والبيانات
                        </button>
                    </Card>
                ))}
                {propertiesWithStats.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-muted/30 rounded-2xl border border-dashed border-border">
                        <Building size={48} className="text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-bold text-heading mb-2">لا توجد عقارات مضافة</h3>
                        <p className="text-sm text-muted-foreground max-w-md">لم يتم إضافة أي عقار بعد، قم بإضافة عقارك الأول لتبدأ في إدارة وحداتك.</p>
                    </div>
                )}
            </div>
            {isPropModalOpen && <PropertyForm isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} property={editingProp} />}
        </div>
    );
};

// --- View for a single property's details and units ---
const PropertyDetailView: React.FC<{ property: Property, onBack: () => void }> = ({ property, onBack }) => {
    const { dataService, canAccess, db } = useApp();
    const navigate = useNavigate();
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const units = useMemo(() => db.units.filter(u => u.propertyId === property.id && u.name.toLowerCase().includes(searchTerm.toLowerCase())), [db.units, property.id, searchTerm]);
    const activeContracts = useMemo(() => db.contracts.filter(c => c.status === 'ACTIVE'), [db.contracts]);

    const handleOpenUnitModal = (unit: Unit | null = null) => {
        setEditingUnit(unit);
        setIsUnitModalOpen(true);
    };

    const getUnitStatus = (unitId: string): { status: Unit['status'], tenantName?: string } => {
        const contract = activeContracts.find(c => c.unitId === unitId);
        if (contract) {
            const tenant = db.tenants.find(t => t.id === contract.tenantId);
            return { status: 'OCCUPIED', tenantName: tenant?.name };
        }
        return { status: 'AVAILABLE' };
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-heading">
                    <ArrowLeft size={20} />
                </button>
                <PageHeader title={property.name} description={property.location} className="mb-0" />
            </div>
            
            <Card className="p-6">
                <div className="mb-6">
                    <TableControls
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onAdd={canAccess('MANAGE_PROPERTIES') ? () => handleOpenUnitModal() : undefined}
                        addLabel="إضافة وحدة جديدة"
                        onPrint={() => window.print()}
                    />
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-start">الوحدة</th>
                                <th className="px-4 py-3 text-start">النوع</th>
                                <th className="px-4 py-3 text-start">القيمة الإيجارية</th>
                                <th className="px-4 py-3 text-start">الحالة</th>
                                <th className="px-4 py-3 text-start">المستأجر الحالي</th>
                                <th className="px-4 py-3 text-end">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {units.map(unit => {
                                const { status, tenantName } = getUnitStatus(unit.id);
                                return (
                                <tr key={unit.id} className="hover:bg-muted/10 transition-colors group">
                                    <td className="px-4 py-3 font-bold text-heading flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                                            <Home size={16} />
                                        </div>
                                        {unit.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{unit.type}</td>
                                    <td className="px-4 py-3 font-mono">{formatCurrency(unit.rentDefault)}</td>
                                    <td className="px-4 py-3">
                                        <StatusPill status={status}>{status === 'OCCUPIED' ? 'مؤجرة' : 'شاغرة'}</StatusPill>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{tenantName || <span className="text-muted-foreground/50">—</span>}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {status === 'AVAILABLE' && canAccess('MANAGE_CONTRACTS') && (
                                                <button onClick={() => navigate(`/contracts?action=add&unitId=${unit.id}`)} className="btn btn-sm btn-primary py-1 px-3 text-xs">تأجير</button>
                                            )}
                                            {canAccess('MANAGE_PROPERTIES') && (
                                                <ActionsMenu items={[ EditAction(() => handleOpenUnitModal(unit)), DeleteAction(() => dataService.remove('units', unit.id)) ]} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        لا توجد وحدات مطابقة للبحث أو مضافة لهذا العقار.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
        </div>
    );
};


export default PropertiesPage;
