
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Contract } from '../../types';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PrintLayout } from './PrintLayout';

export const ContractPrintable: React.FC<{ contract: Contract }> = ({ contract }) => {
    const { db } = useApp();
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    const owner = property ? db.owners.find(o => o.id === property.ownerId) : null;
    
    return (
        <PrintLayout title="عقد إيجار" subtitle={`رقم العقد المرجعي: ${contract.id.slice(0, 8)}`}>
            <div className="text-sm leading-relaxed space-y-4">
                <p>إنه في يوم {formatDate(new Date(contract.createdAt).toISOString())} تم الاتفاق بين كل من:</p>
                <p><strong>الطرف الأول (المؤجر):</strong> {owner?.name || db.settings.company.name}</p>
                <p><strong>الطرف الثاني (المستأجر):</strong> {tenant?.name}</p>
                <p>واتفق الطرفان على أن يستأجر الطرف الثاني من الطرف الأول ما هو {unit?.type} رقم ({unit?.name}) في العقار ({property?.name}) الكائن في {property?.location}.</p>
                <p>ويسري عقد الايجار لمدة سنة ميلادية تبدأ من تاريخ {formatDate(contract.start)} إلى تاريخ {formatDate(contract.end)}.</p>
                <p>مقابل إيجار شهري قدره (<strong>{formatCurrency(contract.rent, db.settings.currency)}</strong>)، يُدفع مقدماً كل شهر.</p>
                <p>كما قام الطرف الثاني بدفع مبلغ وقدره (<strong>{formatCurrency(contract.deposit, db.settings.currency)}</strong>) كتأمين لا يرد إلا عند نهاية العقد.</p>
            </div>
            <footer className="mt-24 flex justify-around text-center">
                <div><p className="font-bold">توقيع الطرف الأول (المؤجر)</p><p className="mt-16">.........................</p></div>
                <div><p className="font-bold">توقيع الطرف الثاني (المستأجر)</p><p className="mt-16">.........................</p></div>
            </footer>
        </PrintLayout>
    );
};
