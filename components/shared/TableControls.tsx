import React from 'react';
import { Search, Filter, Download, Printer, Plus, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface FilterOption {
    value: string;
    label: string;
}

interface TableControlsProps {
  searchTerm?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: (query: string) => void; // Legacy support
  onFilter?: () => void;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

const TableControls: React.FC<TableControlsProps> = ({
  searchTerm,
  onSearchChange,
  onSearch,
  onFilter,
  filterOptions,
  activeFilter,
  onFilterChange,
  onExport,
  onPrint,
  onRefresh,
  onAdd,
  addLabel = 'إضافة جديد',
  title,
  subtitle,
  className,
  children
}) => {
  return (
    <div className={cn("space-y-4 mb-6", className)}>
      {(title || subtitle) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="text-xl font-black tracking-tight">{title}</h2>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          {(onSearch || onSearchChange) && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                placeholder="بحث..." 
                value={searchTerm}
                className="w-full pl-4 pr-9 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                onChange={(e) => {
                    if (onSearchChange) onSearchChange(e.target.value);
                    if (onSearch) onSearch(e.target.value);
                }}
              />
            </div>
          )}
          
          {filterOptions && onFilterChange && (
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <select 
                    value={activeFilter} 
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="text-sm border-none bg-transparent focus:ring-0 font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                    {filterOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
          )}

          {onFilter && !filterOptions && (
            <button 
              onClick={onFilter}
              className="p-2 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="تصفية"
            >
              <Filter size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {children}
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="تحديث"
            >
              <RefreshCw size={18} />
            </button>
          )}
          
          {onPrint && (
            <button 
              onClick={onPrint}
              className="p-2 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="طباعة"
            >
              <Printer size={18} />
            </button>
          )}
          
          {onExport && (
            <button 
              onClick={onExport}
              className="p-2 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="تصدير"
            >
              <Download size={18} />
            </button>
          )}
          
          {onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold shadow-sm"
            >
              <Plus size={16} />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableControls;
