import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User as UserIcon, Settings, Key, Bell } from 'lucide-react';
import Notifications from './Notifications';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, auth } = useApp();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex w-full bg-card border-b border-border h-[var(--topbar-height)] shadow-sm">
      <div className="relative flex flex-grow items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(true);
            }}
            className="z-50 block rounded-md border border-border bg-card p-2 hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Brand for mobile */}
        <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-lg">R</div>
            <span className="font-black text-lg">Rentrix</span>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-2 sm:gap-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              title={theme === 'dark' ? 'الوضع المضيء' : 'الوضع المظلم'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <Notifications />

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-black leading-none mb-1">{currentUser?.username}</p>
                  <p className="text-[10px] text-muted-foreground uppercase leading-none">{currentUser?.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <UserIcon size={16} />
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-border mb-2">
                    <p className="text-sm font-black">{currentUser?.username}</p>
                    <p className="text-xs text-muted-foreground">
                        {currentUser?.role === 'ADMIN' ? 'مدير النظام' : currentUser?.role === 'MANAGER' ? 'مشرف عمليات' : 'موظف'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => { setUserMenuOpen(false); navigate('/system'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-right"
                  >
                    <Settings size={16} className="text-muted-foreground" />
                    <span>إعدادات الحساب</span>
                  </button>
                  
                  <button 
                    onClick={() => { setUserMenuOpen(false); navigate('/change-password'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-right"
                  >
                    <Key size={16} className="text-muted-foreground" />
                    <span>تغيير كلمة المرور</span>
                  </button>

                  <div className="h-px bg-border my-2"></div>

                  <button 
                    onClick={() => { setUserMenuOpen(false); auth.logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-danger/10 text-danger transition-colors text-right"
                  >
                    <LogOut size={16} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;