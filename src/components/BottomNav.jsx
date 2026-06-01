import { Calendar, Home, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', Icon: Home },
  { id: 'team', label: 'Team', Icon: Users },
  { id: 'schedule', label: 'Schedule', Icon: Calendar },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const { Icon } = tab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-interactive flex min-w-[4.5rem] flex-col items-center gap-1.5 px-4 py-3 transition-colors duration-300 ease-out ${
                isActive ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                className="transition-all duration-300 ease-out"
              />
              <span className="text-xs font-medium leading-none transition-colors duration-300">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
