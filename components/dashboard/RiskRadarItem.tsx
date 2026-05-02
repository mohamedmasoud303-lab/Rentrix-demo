import React from 'react';
import { cn } from '../../utils/helpers';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface RiskRadarItemProps {
  title: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  value: string | number;
  description?: string;
  className?: string;
  onClick?: () => void;
}

const RiskRadarItem: React.FC<RiskRadarItemProps> = ({
  title,
  riskLevel,
  value,
  description,
  className,
  onClick
}) => {
  const styles = {
    low: {
      bg: 'bg-success/5',
      border: 'border-success/20',
      icon: <ShieldCheck size={18} className="text-success" />,
      text: 'text-success',
      bar: 'bg-success'
    },
    medium: {
      bg: 'bg-warning/5',
      border: 'border-warning/20',
      icon: <AlertTriangle size={18} className="text-warning" />,
      text: 'text-warning',
      bar: 'bg-warning'
    },
    high: {
      bg: 'bg-orange-500/5',
      border: 'border-orange-500/20',
      icon: <AlertTriangle size={18} className="text-orange-500" />,
      text: 'text-orange-500',
      bar: 'bg-orange-500'
    },
    critical: {
      bg: 'bg-danger/5',
      border: 'border-danger/20',
      icon: <ShieldAlert size={18} className="text-danger" />,
      text: 'text-danger',
      bar: 'bg-danger'
    }
  };

  const style = styles[riskLevel];

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-sm",
        style.bg,
        style.border,
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        </div>
        <span className={cn("text-lg font-black", style.text)}>{value}</span>
      </div>
      
      {description && (
        <p className="text-[10px] text-muted-foreground mb-3">{description}</p>
      )}
      
      <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full", style.bar)} 
          style={{ width: riskLevel === 'low' ? '25%' : riskLevel === 'medium' ? '50%' : riskLevel === 'high' ? '75%' : '100%' }}
        />
      </div>
    </div>
  );
};

export default RiskRadarItem;
