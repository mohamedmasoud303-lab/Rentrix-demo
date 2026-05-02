
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'green' | 'red' | 'blue' | 'yellow';
  onClick?: () => void;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'blue', onClick, className = '' }) => {
  const colorMap = {
    green: 'text-success bg-success/10 border-success/20',
    red: 'text-danger bg-danger/10 border-danger/20',
    blue: 'text-primary bg-primary/10 border-primary/20',
    yellow: 'text-warning bg-warning/10 border-warning/20',
  };

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm transition-all ${onClick ? 'cursor-pointer active:scale-95 hover:border-primary/40' : ''} ${className}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <span className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">{title}</span>
           {icon && <div className={`p-2 rounded-xl ${colorMap[color]}`}>{icon}</div>}
        </div>
        <div className="flex items-baseline gap-1 truncate">
            <span className="text-xl sm:text-2xl font-black text-heading leading-none" dir="ltr">{value}</span>
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
