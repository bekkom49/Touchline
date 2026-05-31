import { useApp } from '../context/AppContext';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-900/40 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all duration-300 ease-out active:scale-95 ${
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform duration-300 ease-out ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
                  isActive ? 'text-emerald-300' : ''
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`mt-0.5 h-0.5 rounded-full bg-emerald-500 transition-all duration-300 ease-out ${
                  isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
