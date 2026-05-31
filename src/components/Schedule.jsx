import { useState } from 'react';
import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import {
  ROLES,
  formatMatchDate,
  getTeamById,
} from '../mockData';

export default function Schedule() {
  const { teams, standings, matchResults, activeRole, createMatch } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    homeTeamId: '1',
    awayTeamId: '2',
    matchDate: '2026-06-21T10:00',
    fieldNumber: '3',
  });

  const sortedStandings = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    return gdB - gdA;
  });

  const sortedResults = [...matchResults].sort(
    (a, b) => new Date(b.match_date) - new Date(a.match_date)
  );

  function handleCreate(e) {
    e.preventDefault();
    createMatch({
      homeTeamId: Number(form.homeTeamId),
      awayTeamId: Number(form.awayTeamId),
      matchDate: new Date(form.matchDate).toISOString(),
      fieldNumber: form.fieldNumber,
    });
    setShowCreate(false);
  }

  return (
    <div className="page-shell">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h2 className="text-lg font-bold text-white">Schedule</h2>
          <p className="text-sm text-slate-400">Standings & results</p>
        </div>
        {activeRole === ROLES.ORGANIZER && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500"
          >
            {showCreate ? 'Close' : '+ Match'}
          </button>
        )}
      </div>

      {showCreate && activeRole === ROLES.ORGANIZER && (
        <form
          onSubmit={handleCreate}
          className="animate-fade-in mb-6 space-y-3 rounded-2xl border border-emerald-600/30 bg-emerald-950/20 p-4"
        >
          <p className="text-center text-sm font-bold text-emerald-300">Create Match</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Home</span>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
                className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-white"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Away</span>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
                className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-white"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-slate-500">Date & Time</span>
            <input
              type="datetime-local"
              value={form.matchDate}
              onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
              className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-slate-500">Field</span>
            <input
              type="number"
              min="1"
              value={form.fieldNumber}
              onChange={(e) => setForm({ ...form, fieldNumber: e.target.value })}
              className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            className="btn-interactive w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Schedule Match
          </button>
        </form>
      )}

      <section className="mb-6">
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-400">
          League Standings
        </h3>
        {sortedStandings.length === 0 ? (
          <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
            <EmptyState
              icon="🏆"
              title="No standings yet"
              description="Results will populate the table once matches are played."
            />
          </div>
        ) : (
          <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40 hover:border-emerald-600/30">
            <div className="grid grid-cols-[1.5rem_1fr_repeat(3,2rem)] gap-1 border-b border-slate-700/60 bg-slate-900/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>#</span>
              <span>Team</span>
              <span className="text-center">P</span>
              <span className="text-center">GD</span>
              <span className="text-center">Pts</span>
            </div>
            {sortedStandings.map((row, idx) => {
              const team = getTeamById(row.team_id);
              const gd = row.goals_for - row.goals_against;
              const isMyTeam = row.team_id === 1;
              return (
                <div
                  key={row.team_id}
                  className={`grid grid-cols-[1.5rem_1fr_repeat(3,2rem)] gap-1 border-b border-slate-700/30 px-3 py-2.5 transition-colors duration-300 last:border-0 hover:bg-slate-800/50 ${
                    isMyTeam ? 'bg-emerald-950/40' : ''
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                  <span className={`truncate text-sm font-semibold ${isMyTeam ? 'text-emerald-300' : 'text-white'}`}>
                    {team?.name}
                  </span>
                  <span className="text-center text-sm text-slate-300">{row.played}</span>
                  <span className={`text-center text-sm font-medium ${gd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {gd > 0 ? '+' : ''}{gd}
                  </span>
                  <span className="text-center text-sm font-bold text-white">{row.points}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-400">
          Match Results
        </h3>
        {sortedResults.length === 0 ? (
          <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40">
            <EmptyState
              icon="⚽"
              title="No results yet"
              description="Completed match scores will appear here."
            />
          </div>
        ) : (
          <div className="space-y-2">
            {sortedResults.map((result) => {
              const home = getTeamById(result.home_team_id);
              const away = getTeamById(result.away_team_id);
              return (
                <div
                  key={result.id}
                  className="card-interactive rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 hover:border-emerald-600/25 hover:bg-slate-800/60"
                >
                  <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    {formatMatchDate(result.match_date)}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 truncate text-right text-sm font-semibold text-white">
                      {home?.name}
                    </span>
                    <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold text-emerald-400 transition-colors duration-300">
                      {result.home_score} – {result.away_score}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-white">
                      {away?.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
