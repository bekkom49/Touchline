import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import { buildFieldLocationStatuses } from '../mockData';

export default function FieldLocations() {
  const { matches, teams } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const locations = useMemo(
    () => buildFieldLocationStatuses(matches, teams, now),
    [matches, teams, now]
  );

  return (
    <section className="mt-6">
      <h3 className="mb-1 text-center text-sm font-bold uppercase tracking-wider text-slate-400">
        Field locations
      </h3>
      <p className="mb-3 text-center text-[10px] text-slate-500">
        Live availability at every venue organizers have used
      </p>

      {locations.length === 0 ? (
        <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
          <EmptyState
            icon="📍"
            title="No field addresses yet"
            description="Organizers add a venue address when scheduling a match."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => (
            <div
              key={location.key}
              className="card-interactive rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 hover:border-emerald-600/25"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-white">
                  {location.label}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    location.status === 'in_use'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {location.status === 'in_use' ? 'In use' : 'Available'}
                </span>
              </div>
              {location.status === 'in_use' && location.matchup && (
                <p className="mt-2 text-xs text-slate-300">
                  <span className="font-medium text-amber-200/90">Now playing: </span>
                  {location.matchup}
                </p>
              )}
              {location.status === 'available' && (
                <p className="mt-2 text-xs text-slate-500">No match in progress right now</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
