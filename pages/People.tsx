
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

            <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-4 py-3 text-start">الاسم</th>
                            <th className="px-4 py-3 text-start">الهاتف</th>
                            <th className="px-4 py-3 text-start">رقم الهوية</th>
                            <th className="px-4 py-3 text-start">الحالة</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredTenants.map(t => (
                            <tr key={t.id} className="hover:bg-muted/10 transition-colors group">
                                <td className="px-4 py-3 font-bold text-heading flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                                        <Users size={16} />
                                    </div>
                                    {t.name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{t.phone}</td>
                                <td className="px-4 py-3 font-mono">{t.idNo}</td>
                                <td className="px-4 py-3">
                                    <StatusPill status={t.status}>
                                        {t.status === 'ACTIVE' ? 'نشط' : (t.status === 'BLACKLIST' ? 'قائمة سوداء' : 'غير نشط')}
                                    </StatusPill>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenWhatsAppModal(t)} className="w-8 h-8 rounded shrink-0 bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 transition-colors">
                                            <MessageCircle size={16} />
                                        </button>
                                        <ActionsMenu items={[
                                            EditAction(() => handleOpenModal(t)),
                                            DeleteAction(() => handleDelete(t.id)),
                                        ]} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTenants.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <Users size={32} className="text-muted-foreground/50 mb-2" />
                                        <p>لا يوجد مستأجرون مطابقون للبحث.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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

            <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-4 py-3 text-start">الاسم</th>
                            <th className="px-4 py-3 text-start">الهاتف</th>
                            <th className="px-4 py-3 text-start">عدد العقارات</th>
                            <th className="px-4 py-3 text-end">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredOwners.map(owner => (
                            <tr key={owner.id} className="hover:bg-muted/10 transition-colors group">
                                <td className="px-4 py-3 font-bold text-heading flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => handleOpenModal(owner)}>
                                    <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                                        <Users size={16} />
                                    </div>
                                    {owner.name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{owner.phone}</td>
                                <td className="px-4 py-3">
                                    <div className="inline-flex items-center justify-center px-2 py-1 rounded bg-muted/50 text-xs font-bold">
                                        {properties.filter(p => p.ownerId === owner.id).length} عقارات
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end items-center gap-2">
                                        <button 
                                            onClick={async () => {
                                                const link = await generateOwnerPortalLink(owner.id);
                                                navigator.clipboard.writeText(link);
                                                toast.success("تم نسخ رابط المالك!");
                                            }}
                                            className="btn btn-sm bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 text-[10px]"
                                            title="نسخ الرابط المخصص للمالك لمتابعة محفظته"
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
                        {filteredOwners.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <Users size={32} className="text-muted-foreground/50 mb-2" />
                                        <p>لا يوجد ملاك مطابقون للبحث.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <OwnerForm isOpen={isModalOpen} onClose={handleCloseModals} owner={editingOwner} />
        </div>
    );
};

export default People;
