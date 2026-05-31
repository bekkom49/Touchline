import { useApp } from '../context/AppContext';
import { ROLES } from '../mockData';

const roleOptions = [
  { value: ROLES.ORGANIZER, label: 'Organizer', icon: '🏟️' },
  { value: ROLES.CAPTAIN, label: 'Captain', icon: '⭐' },
  { value: ROLES.PLAYER, label: 'Player', icon: '⚽' },
];

export default function Header() {
  const { activeRole, setActiveRole, actingUser } = useApp();

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-emerald-900/40 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold shadow-lg shadow-emerald-900/40 transition-transform duration-300 ease-out hover:scale-105">
              TL
            </span>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">Touchline</h1>
              <p className="truncate text-xs text-slate-400 transition-colors duration-300">
                {actingUser.name}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <label htmlFor="role-switcher" className="sr-only">
            Switch role
          </label>
          <div className="relative">
            <select
              id="role-switcher"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              className="input-interactive appearance-none rounded-xl border border-emerald-600/50 bg-emerald-950/80 py-2 pl-3 pr-9 text-sm font-semibold text-emerald-100 shadow-inner shadow-black/20 transition-all duration-300 ease-out hover:border-emerald-500/70"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 transition-transform duration-300">
              ▾
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
