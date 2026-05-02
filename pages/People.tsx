
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Owner, Tenant } from '../types';
import Card from '../components/ui/Card';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { MessageCircle, Users, BookOpen, Link as LinkIcon, PlusCircle } from 'lucide-react';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import TenantForm from '../components/forms/TenantForm';
import OwnerForm from '../components/forms/OwnerForm';
import StatusPill from '../components/ui/StatusPill';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import TableControls from '../components/shared/TableControls';

const People: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tenants' | 'owners'>('tenants');
    
    return (
        <div className="space-y-6">
            <PageHeader title="إدارة الأشخاص" description="إدارة بيانات الملاك والمستأجرين والتواصل معهم."/>
            <Card>
                <Tabs 
                    tabs={[{id: 'tenants', label: 'المستأجرون'}, {id: 'owners', label: 'الملاك'}]}
                    activeTab={activeTab}
                    onTabClick={(id) => setActiveTab(id as any)}
                />
                <div className="pt-6">
                    {activeTab === 'tenants' && <TenantsView />}
                    {activeTab === 'owners' && <OwnersView />}
                </div>
            </Card>
        </div>
    );
};

// Tenants Component
const TenantsView: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const { tenants, contracts } = db;

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = t.name.includes(searchTerm) || t.phone.includes(searchTerm) || t.idNo.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tenants, searchTerm, statusFilter]);

    const handleOpenModal = (tenant: Tenant | null = null) => {
        setEditingTenant(tenant);
        setIsModalOpen(true);
    };

    const handleOpenWhatsAppModal = (person: Tenant) => {
        if (!person.phone) {
            toast.error('لا يوجد رقم هاتف لهذا الشخص.');
            return;
        }
        setWhatsAppContext({
            recipient: { name: person.name, phone: person.phone },
            type: 'tenant',
            data: { tenant: person }
        });
    };

    const handleCloseModals = () => {
        setIsModalOpen(false);
        setWhatsAppContext(null);
    };

    const handleDelete = (id: string) => {
        if (contracts.some(c => c.tenantId === id)) {
            toast.error("لا يمكن حذف المستأجر لأنه مرتبط بعقود. يرجى حذف العقود أولاً.");
            return;
        }
        dataService.remove('tenants', id);
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة المستأجرين</h2>
            </div>

            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => handleOpenModal()}
                addLabel="إضافة مستأجر"
                onPrint={() => window.print()}
                filterOptions={[
                    { value: 'ALL', label: 'الكل' },
                    { value: 'ACTIVE', label: 'نشط' },
                    { value: 'INACTIVE', label: 'غير نشط' },
                    { value: 'BLACKLIST', label: 'قائمة سوداء' }
                ]}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />

            <div className="overflow-x-auto mt-4">
                <table className="w-full responsive-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>رقم الهوية</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTenants.map(t => (
                            <tr key={t.id} className="group">
                                <td data-label="الاسم" className="font-medium text-heading">{t.name}</td>
                                <td data-label="الهاتف">{t.phone}</td>
                                <td data-label="رقم الهوية">{t.idNo}</td>
                                <td data-label="الحالة">
                                    <StatusPill status={t.status}>
                                        {t.status === 'ACTIVE' ? 'نشط' : (t.status === 'BLACKLIST' ? 'قائمة سوداء' : 'غير نشط')}
                                    </StatusPill>
                                </td>
                                <td data-label="إجراءات" className="action-cell">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ActionsMenu items={[
                                        EditAction(() => handleOpenModal(t)),
                                        { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => handleOpenWhatsAppModal(t) },
                                        DeleteAction(() => handleDelete(t.id)),
                                    ]} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTenants.length === 0 && <div className="text-center py-12 text-muted-foreground">لا يوجد مستأجرون مطابقون للبحث.</div>}
            </div>

            <TenantForm isOpen={isModalOpen} onClose={handleCloseModals} tenant={editingTenant} />
            <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />
        </div>
    );
};

// Owners Component
const OwnersView: React.FC = () => {
    const { db, dataService, generateOwnerPortalLink } = useApp();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { owners, properties } = db;

    const filteredOwners = useMemo(() => {
        return owners.filter(o => o.name.includes(searchTerm) || o.phone.includes(searchTerm));
    }, [owners, searchTerm]);

    const handleOpenModal = (owner: Owner | null = null) => {
        setEditingOwner(owner);
        setIsModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsModalOpen(false);
    };
    
    const handleDelete = (id: string) => {
        if (properties.some(p => p.ownerId === id)) {
            toast.error("لا يمكن حذف المالك لأنه يمتلك عقارات مسجلة. يرجى تغيير ملكية العقارات أولاً.");
            return;
        }
        dataService.remove('owners', id);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة الملاك</h2>
            </div>

            <TableControls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => handleOpenModal()}
                addLabel="إضافة مالك"
                onPrint={() => window.print()}
            />

            <div className="overflow-x-auto mt-4">
                <table className="w-full responsive-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>عدد العقارات</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOwners.map(owner => (
                            <tr key={owner.id} className="group">
                                <td data-label="الاسم" className="font-medium text-heading cursor-pointer" onClick={() => handleOpenModal(owner)}>{owner.name}</td>
                                <td data-label="الهاتف">{owner.phone}</td>
                                <td data-label="عدد العقارات">{properties.filter(p => p.ownerId === owner.id).length}</td>
                                <td data-label="إجراءات" className="action-cell">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity items-center gap-2">
                                        <button 
                                            onClick={async () => {
                                                const link = await generateOwnerPortalLink(owner.id);
                                                navigator.clipboard.writeText(link);
                                                toast.success("تم نسخ رابط المالك!");
                                            }}
                                            className="btn btn-sm btn-secondary flex items-center gap-1 text-[10px]"
                                        >
                                            <LinkIcon size={12} /> رابط المالك
                                        </button>
                                        <ActionsMenu items={[
                                            EditAction(() => handleOpenModal(owner)),
                                            { label: 'كشف حساب', icon: <BookOpen size={16} />, onClick: () => navigate(`/reports?tab=owner&ownerId=${owner.id}`) },
                                            DeleteAction(() => handleDelete(owner.id))
                                        ]} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredOwners.length === 0 && <div className="text-center py-12 text-muted-foreground">لا يوجد ملاك مطابقون للبحث.</div>}
            </div>
            <OwnerForm isOpen={isModalOpen} onClose={handleCloseModals} owner={editingOwner} />
        </div>
    );
};

export default People;
