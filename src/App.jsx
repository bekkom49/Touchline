import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Team from './components/Team';
import Schedule from './components/Schedule';

function AppContent() {
  const { activeTab } = useApp();

  return (
    <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950 shadow-2xl shadow-black/40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-600/8 to-transparent"
        aria-hidden
      />

      <Header />

      <main className="relative min-h-0 flex-1 overflow-hidden pb-[4.75rem]">
        <div key={activeTab} className="animate-tab-in h-full">
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto overscroll-contain">
              <Dashboard />
            </div>
          )}
          {activeTab === 'team' && <Team />}
          {activeTab === 'schedule' && (
            <div className="h-full overflow-y-auto overscroll-contain">
              <Schedule />
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
