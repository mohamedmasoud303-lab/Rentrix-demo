import React from 'react';

interface SummaryStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'success' | 'warning' | 'danger' | 'info';
}

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({ label, value, icon, color = 'info' }) => {
  const colorClasses = {
    success: 'bg-success-foreground text-success',
    warning: 'bg-warning-foreground text-warning',
    danger: 'bg-danger-foreground text-danger',
    info: 'bg-primary-light text-primary',
  };

  return (
    <div className="p-5 bg-card rounded-lg border border-border shadow-brand">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="text-3xl font-black text-heading">{value}</p>
        </div>
        <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default SummaryStatCard;