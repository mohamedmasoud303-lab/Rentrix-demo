
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
        <>
            <PageHeader title="قائمة العقارات" description="عرض وإدارة جميع العقارات والوحدات التابعة لها." />
            
            <div className="mb-6">
                <TableControls
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onAdd={canAccess('MANAGE_PROPERTIES') ? () => handleOpenModal(null) : undefined}
                    addLabel="إضافة عقار"
                    onPrint={() => window.print()}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {propertiesWithStats.map(p => (
                    <Card key={p.id} className="flex flex-col !p-0 overflow-hidden">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl text-heading">{p.name}</h3>
                                    <p className="text-sm text-muted-foreground">{p.location}</p>
                                </div>
                                {canAccess('MANAGE_PROPERTIES') && (
                                    <ActionsMenu items={[ EditAction(() => handleOpenModal(p)), DeleteAction(() => dataService.remove('properties', p.id)) ]} />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-background rounded-xl text-center">
                                    <p className="text-xs text-muted-foreground">الوحدات</p>
                                    <p className="text-lg font-bold">{p.unitCount}</p>
                                </div>
                                <div className="p-3 bg-success-foreground rounded-xl text-center">
                                    <p className="text-xs text-muted-foreground">مؤجرة</p>
                                    <p className="text-lg font-bold text-success">{p.occupiedCount}</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => onSelectProperty(p)} className="w-full mt-4 btn btn-secondary rounded-t-none">
                             إدارة الوحدات
                        </button>
                    </Card>
                ))}
            </div>
            {isPropModalOpen && <PropertyForm isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} property={editingProp} />}
        </>
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
        <>
            <PageHeader title={property.name} description={property.location}>
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="btn btn-secondary flex items-center gap-2"><ArrowLeft size={16}/> العودة للعقارات</button>
                </div>
            </PageHeader>
            <Card>
                <TableControls
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onAdd={canAccess('MANAGE_PROPERTIES') ? () => handleOpenUnitModal() : undefined}
                    addLabel="إضافة وحدة"
                    onPrint={() => window.print()}
                />
                <div className="overflow-x-auto mt-4">
                    <table className="w-full responsive-table">
                        <thead><tr><th>اسم الوحدة</th><th>النوع</th><th>الإيجار الافتراضي</th><th>الحالة</th><th>المستأجر الحالي</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {units.map(unit => {
                                const { status, tenantName } = getUnitStatus(unit.id);
                                return (
                                <tr key={unit.id} className="group">
                                    <td data-label="الوحدة" className="font-bold text-heading">{unit.name}</td>
                                    <td data-label="النوع">{unit.type}</td>
                                    <td data-label="الإيجار">{formatCurrency(unit.rentDefault)}</td>
                                    <td data-label="الحالة"><StatusPill status={status}>{status === 'OCCUPIED' ? 'مؤجرة' : 'شاغرة'}</StatusPill></td>
                                    <td data-label="المستأجر">{tenantName || '—'}</td>
                                    <td data-label="إجراءات" className="action-cell">
                                        <div className="flex items-center justify-end gap-2">
                                            {status === 'AVAILABLE' && canAccess('MANAGE_CONTRACTS') && (
                                                <button onClick={() => navigate(`/contracts?action=add&unitId=${unit.id}`)} className="btn btn-sm btn-primary">تأجير</button>
                                            )}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canAccess('MANAGE_PROPERTIES') && (
                                                <ActionsMenu items={[ EditAction(() => handleOpenUnitModal(unit)), DeleteAction(() => dataService.remove('units', unit.id)) ]} />
                                            )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
        </>
    );
};


export default PropertiesPage;
