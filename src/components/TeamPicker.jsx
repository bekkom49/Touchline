import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const FALLBACK_TEAMS = [
  { id: 1, name: 'Emerald City FC', primary_kit_color: 'Emerald Green', away_kit_color: 'White' },
  { id: 2, name: 'Harbor United', primary_kit_color: 'Navy Blue', away_kit_color: 'Sky Blue' },
  { id: 3, name: 'Riverside Rovers', primary_kit_color: 'Maroon', away_kit_color: 'Gold' },
  { id: 4, name: 'Summit Athletic', primary_kit_color: 'Black', away_kit_color: 'Orange' },
  { id: 5, name: 'Lakeside Lions', primary_kit_color: 'Teal', away_kit_color: 'Cream' },
  { id: 6, name: 'Metro Strikers', primary_kit_color: 'Purple', away_kit_color: 'Silver' },
  { id: 7, name: 'Canyon City SC', primary_kit_color: 'Forest Green', away_kit_color: 'Yellow' },
];

export function useTeams() {
  const [teams, setTeams] = useState(FALLBACK_TEAMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTeams() {
      const { data, error } = await supabase.from('teams').select('*').order('id');
      if (!mounted) return;
      if (!error && data?.length) setTeams(data);
      setLoading(false);
    }

    loadTeams();
    return () => {
      mounted = false;
    };
  }, []);

  return { teams, loading };
}

export default function TeamPicker({ teams, selectedId, onSelect, label = 'Choose your club' }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="max-h-48 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
        {teams.map((team) => {
          const selected = Number(selectedId) === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelect(team.id)}
              className={`card-interactive flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-300 ${
                selected
                  ? 'border-emerald-500/60 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-white">{team.name}</p>
                <p className="text-[10px] text-slate-500">
                  {team.primary_kit_color} / {team.away_kit_color}
                </p>
              </div>
              {selected && (
                <span className="text-xs font-bold text-emerald-400">Selected</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
