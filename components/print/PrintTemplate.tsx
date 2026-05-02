import React from 'react';
import { cn } from '../../utils/helpers';
import { useApp } from '../../contexts/AppContext';

interface PrintTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({
  title,
  subtitle,
  children,
  footer,
  className
}) => {
  const { db } = useApp();
  const settings = db.settings;

  return (
    <div className={cn("print-template bg-white text-black p-8 mx-auto", className)}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
        <div className="flex flex-col items-start">
          <h1 className="text-3xl font-black mb-2">{settings?.company?.name || 'اسم الشركة'}</h1>
          <p className="text-sm text-gray-600">{settings?.company?.address || 'العنوان'}</p>
          <p className="text-sm text-gray-600">{settings?.company?.phone || 'رقم الهاتف'}</p>
        </div>
        <div className="text-left">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          <p className="text-xs text-gray-400 mt-2">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        {footer || (
          <div className="flex justify-between items-end text-xs text-gray-500">
            <div>
              <p>تم استخراج هذا المستند من نظام إدارة العقارات</p>
              <p className="mt-1">توقيع المسؤول: ____________________</p>
            </div>
            <div className="text-left">
              <p>صفحة 1 من 1</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintTemplate;
