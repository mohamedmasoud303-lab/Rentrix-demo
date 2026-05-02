
import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import OwnerView from './pages/OwnerView';
import { Toaster } from 'react-hot-toast';
import PageLoader from './components/ui/PageLoader';
import { hexToHsl } from './utils/helpers';

// Static imports for stability
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import People from './pages/People';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Financials from './pages/Financials';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const App: React.FC = () => {
  const { db, currentUser, isReady, createBackup } = useApp();
  const settings = db.settings;

  useEffect(() => {
    if (settings) {
        document.title = settings.company?.name || 'Rentrix';
        if (settings.appearance?.primaryColor) {
            document.documentElement.style.setProperty('--primary', hexToHsl(settings.appearance.primaryColor));
        }
    }
  }, [settings]);

  // Listen for Electron backup trigger
  useEffect(() => {
    if ((window as any).electronAPI?.onBackupTriggered) {
        (window as any).electronAPI.onBackupTriggered(async (data: any) => {
            const backupJson = await createBackup();
            const date = new Date().toISOString().split('T')[0];
            const fileName = `rentrix_backup_${date}${data?.isAuto ? '_auto' : ''}.json`;
            
            if (data?.isAuto) {
                console.log('Auto-backup triggered');
            } else {
                await (window as any).electronAPI.saveBackup(fileName, backupJson);
            }
        });
    }
  }, [createBackup]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl + P: Print
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            window.print();
        }
        // Ctrl + F: Focus Search (if exists)
        if (e.ctrlKey && e.key === 'f') {
            const searchInput = document.querySelector('input[placeholder*="بحث"]') as HTMLInputElement;
            if (searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isReady) {
    return <PageLoader />;
  }

  return (
    <>
      <Toaster position="bottom-center" toastOptions={{
        className: 'font-bold',
        style: {
          background: 'hsl(var(--heading))',
          color: 'hsl(var(--card))',
        },
      }}/>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/owner-view/:ownerId" element={<OwnerView />} />

          {!currentUser ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : currentUser.mustChange ? (
            <Route path="*" element={<ChangePassword />} />
          ) : (
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/people" element={<People />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/financials" element={<Financials />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/reports" element={<Reports />} />
              
              {/* Merged System Routes */}
              <Route path="/system" element={<Settings />} />
              <Route path="/backup" element={<Navigate to="/system?tab=backup" replace />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
