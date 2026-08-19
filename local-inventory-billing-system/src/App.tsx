import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from './store/StoreContext';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import BillsHistory from './pages/BillsHistory';
import Claims from './pages/Claims';
import Backup from './pages/Backup';
import Settings from './pages/Settings';

type TabKey = 'dashboard' | 'billing' | 'inventory' | 'bills' | 'customers' | 'claims' | 'backup' | 'settings';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'billing', label: 'New Bill', icon: '🧾' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'bills', label: 'Sales History', icon: '📒' },
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'claims', label: 'Return/Exchange', icon: '🔄' },
  { key: 'backup', label: 'Backup', icon: '💾' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function AppShell() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (tab) {
      case 'dashboard':
        return <Dashboard onNavigate={(k: string) => setTab(k as TabKey)} />;
      case 'billing':
        return <Billing />;
      case 'inventory':
        return <Inventory />;
      case 'bills':
        return <BillsHistory />;
      case 'customers':
        return <Customers />;
      case 'claims':
        return <Claims />;
      case 'backup':
        return <Backup />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar - desktop / tablet landscape */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl text-white shadow">
            🛋️
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-800">Furniture Shop</p>
            <p className="text-xs text-slate-400">Stock & Billing Manager</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                tab === t.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-400">
          All data saved on this device
        </div>
      </aside>

      {/* Mobile/tablet top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              🛋️
            </div>
            <p className="font-bold text-slate-800">Furniture Shop</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            ☰ Menu
          </button>
        </header>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 max-w-[85%] bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-slate-800">Menu</p>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"
                >
                  ✕
                </button>
              </div>
              <nav className="space-y-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTab(t.key);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                      tab === t.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">{renderPage()}</main>

        {/* Bottom tab bar for tablets in portrait / touch use */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-slate-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex min-w-[80px] flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-semibold ${
                tab === t.key ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Toaster position="top-center" toastOptions={{ style: { fontWeight: 600 } }} />
      <AppShell />
    </StoreProvider>
  );
}
