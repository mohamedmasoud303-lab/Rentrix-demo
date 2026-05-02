
import React from 'react';
import { useApp } from '../../contexts/AppContext';

interface PrintLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ title, subtitle, children }) => {
    const { db } = useApp();
    const { settings } = db;
    const { company } = settings;

    return (
        <div className="print-area font-['Cairo'] bg-white text-black p-8" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                <div className="flex flex-col items-start">
                    <h1 className="text-3xl font-black mb-2">{company.name || 'اسم الشركة'}</h1>
                    <p className="text-sm text-gray-600">{company.address || 'العنوان'}</p>
                    <p className="text-sm text-gray-600">{company.phone || 'رقم الهاتف'}</p>
                </div>
                <div className="text-left">
                    {company.logoDataUrl && <img src={company.logoDataUrl} alt="logo" className="h-16 mb-2 object-contain ml-auto" />}
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    <p className="text-xs text-gray-400 mt-2">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
            </div>

            <main className="min-h-[500px]">
                {children}
            </main>

            <footer className="mt-12 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-end text-xs text-gray-500">
                    <div>
                        <p>تم استخراج هذا المستند من نظام إدارة العقارات</p>
                        <p className="mt-1">توقيع المسؤول: ____________________</p>
                    </div>
                    <div className="text-left">
                        <p>صفحة 1 من 1</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
