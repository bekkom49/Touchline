import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { ROLES } from '../mockData';

const roleLabels = {
  [ROLES.ORGANIZER]: 'Organizer',
  [ROLES.CAPTAIN]: 'Captain',
  [ROLES.PLAYER]: 'Player',
};

export default function Header() {
  const { signOut } = useAuth();
  const { actingUser, activeRole } = useApp();

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-emerald-900/40 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold shadow-lg shadow-emerald-900/40">
              TL
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-white">Touchline</h1>
              <p className="truncate text-xs text-slate-400">{actingUser.name}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-emerald-600/40 bg-emerald-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            {roleLabels[activeRole] ?? activeRole}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="btn-interactive flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:border-red-500/40 hover:text-red-300"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
