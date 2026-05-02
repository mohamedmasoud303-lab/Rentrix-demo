import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface ExecutiveKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
    label?: string;
  };
  description?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

const ExecutiveKpiCard: React.FC<ExecutiveKpiCardProps> = ({
  title,
  value,
  icon,
  trend,
  description,
  color = 'primary',
  className,
  onClick
}) => {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-foreground">{value}</h3>
        </div>
        <div className={cn("rounded-xl p-2.5", colorStyles[color])}>
          {icon}
        </div>
      </div>
      
      {(trend || description) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 font-bold rounded-full px-2 py-0.5",
              trend.isUp ? "text-success bg-success/10" : "text-danger bg-danger/10"
            )}>
              {trend.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{trend.value}</span>
            </div>
          )}
          {description && (
            <p className="text-muted-foreground font-medium truncate">{description}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutiveKpiCard;
