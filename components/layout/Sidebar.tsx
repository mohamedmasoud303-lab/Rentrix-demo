
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { 
  LayoutDashboard, Building, Users, FileText, 
  Receipt, Wrench, Calculator, PieChart, MessageSquare, 
  Map as MapIcon, ClipboardList, Banknote, UserCog, 
  ChevronDown, ChevronLeft, BarChart3
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface NavLinkItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  permission?: string;
}

interface NavGroup {
  title: string;
  links: NavLinkItem[];
  isCollapsible?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { db, canAccess, currentUser } = useApp();
  const { pathname } = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'المالية والمحاسبة': true,
    'النمو والتواصل': true,
    'التقارير والنظام': true
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups: NavGroup[] = [
    {
      title: 'الرئيسية',
      links: [
        { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
      ]
    },
    {
      title: 'الإدارة التشغيلية',
      links: [
        { path: '/properties', label: 'العقارات', icon: Building },
        { path: '/people', label: 'الملاك والمستأجرين', icon: Users },
        { path: '/contracts', label: 'العقود', icon: FileText },
        { path: '/maintenance', label: 'الصيانة', icon: Wrench },
      ]
    },
    {
      title: 'المالية',
      isCollapsible: true,
      links: [
        { path: '/invoices', label: 'الفواتير', icon: Receipt },
        { path: '/financials', label: 'سندات وودائع', icon: Calculator, permission: 'MANAGE_FINANCIALS' },
      ]
    },
    {
      title: 'التقارير والنظام',
      isCollapsible: true,
      links: [
        { path: '/reports', label: 'مركز التقارير', icon: BarChart3, permission: 'VIEW_REPORTS' },
        { path: '/system', label: 'إعدادات النظام', icon: UserCog, adminOnly: true },
      ]
    }
  ];

  return (
    <aside
      className={`fixed lg:static inset-y-0 right-0 z-50 flex w-72 flex-col bg-card border-l border-border transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center gap-4 p-6 border-b border-border">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">R</div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Rentrix ERP</h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Real Estate Management</p>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 py-6">
        <nav className="space-y-6">
          {navGroups.map(group => {
            const visibleLinks = group.links.filter(link => {
                if (link.adminOnly) return currentUser?.role === 'ADMIN';
                if (link.permission) return canAccess(link.permission as any);
                return true;
            });

            if (visibleLinks.length === 0) return null;

            const isExpanded = !group.isCollapsible || expandedGroups[group.title];

            return (
              <div key={group.title} className="space-y-1">
                <button 
                  onClick={() => group.isCollapsible && toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-primary transition-colors ${group.isCollapsible ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span>{group.title}</span>
                  {group.isCollapsible && (
                    isExpanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />
                  )}
                </button>
                
                {isExpanded && (
                  <ul className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {visibleLinks.map(link => (
                      <li key={link.path}>
                        <NavLink
                          to={link.path}
                          onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                          className={({ isActive }) => `
                              flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-sm transition-all
                              ${isActive 
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }
                          `}
                        >
                          <link.icon size={18} strokeWidth={pathname === link.path ? 2.5 : 2} />
                          <span>{link.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-border">
          <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                        {currentUser?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                        <p className="font-bold text-xs text-foreground truncate leading-none mb-1">{currentUser?.username}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{currentUser?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
                    </div>
                </div>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;
