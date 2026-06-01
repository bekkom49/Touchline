import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import {
  computeMatchPlayerStats,
  formatMatchDate,
  formatMatchTime,
  formatMatchVenue,
  getMatchGoalsByTeam,
  getTeamById,
  getUserById,
} from '../mockData';

function GoalList({ teamName, goals, users }) {
  if (goals.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {teamName}
      </p>
      <ul className="space-y-1.5">
        {goals.map((goal, index) => {
          const scorer = getUserById(users, goal.scorer_id);
          const assist = goal.assist_id ? getUserById(users, goal.assist_id) : null;
          return (
            <li
              key={goal.id}
              className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2"
            >
              <p className="text-xs font-semibold text-white">
                {index + 1}. {scorer?.name ?? 'Unknown'}
              </p>
              {assist && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Assist: {assist.name}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MatchResultDetail({ match, onBack }) {
  const { teams, users, matchGoals } = useApp();

  const home = getTeamById(teams, match.home_team_id);
  const away = getTeamById(teams, match.away_team_id);
  const { home: homeGoals, away: awayGoals } = getMatchGoalsByTeam(match, matchGoals);
  const playerStats = computeMatchPlayerStats(match, matchGoals, users);
  const totalGoals = homeGoals.length + awayGoals.length;
  const expectedGoals =
    Number(match.home_score ?? 0) + Number(match.away_score ?? 0);

  return (
    <div className="flex h-full flex-col animate-tab-in bg-slate-950">
      <div className="shrink-0 border-b border-emerald-900/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-sm text-slate-300 hover:border-emerald-600/40 hover:text-white"
            aria-label="Back to schedule"
          >
            ←
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-white">Match stats</h2>
            <p className="text-xs text-slate-400">
              {formatMatchDate(match.match_date)} · {formatMatchTime(match.match_date)} ·{' '}
              {formatMatchVenue(match)}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/40 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex-1 truncate text-right text-sm font-semibold text-white">
              {home?.name}
            </span>
            <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-1 text-base font-extrabold text-emerald-400">
              {match.home_score} – {match.away_score}
            </span>
            <span className="flex-1 truncate text-sm font-semibold text-white">
              {away?.name}
            </span>
          </div>
        </div>

        <section className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
            Goals
          </h3>
          {totalGoals === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-4">
              <EmptyState
                icon="⚽"
                title={expectedGoals > 0 ? 'Scorers not recorded' : 'No goals'}
                description={
                  expectedGoals > 0
                    ? 'The scoreline was saved without goal details.'
                    : 'This match finished without any goals.'
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              <GoalList teamName={home?.name ?? 'Home'} goals={homeGoals} users={users} />
              <GoalList teamName={away?.name ?? 'Away'} goals={awayGoals} users={users} />
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
            Player stats
          </h3>
          {playerStats.length === 0 ? (
            <p className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-4 text-center text-xs text-slate-500">
              No player stats for this match yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40">
              <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] gap-2 border-b border-slate-700/60 bg-slate-900/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Player</span>
                <span className="text-center" title="Goals">
                  G
                </span>
                <span className="text-center" title="Assists">
                  A
                </span>
              </div>
              {playerStats.map((row) => {
                const club = getTeamById(teams, row.teamId);
                return (
                  <div
                    key={row.userId}
                    className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] gap-2 border-b border-slate-700/30 px-3 py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                      {club && (
                        <p className="truncate text-[10px] text-slate-500">{club.name}</p>
                      )}
                    </div>
                    <span className="text-center text-sm font-bold text-emerald-400">
                      {row.goals}
                    </span>
                    <span className="text-center text-sm text-slate-300">{row.assists}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
