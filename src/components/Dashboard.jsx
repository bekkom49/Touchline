import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import {
  MATCH_STATUS,
  ROLES,
  RSVP_STATUS,
  formatMatchDate,
  formatMatchTime,
  getTeamById,
} from '../mockData';

function KitBadge({ label, color }) {
  return (
    <div className="card-interactive rounded-xl border border-slate-700/40 bg-slate-800/80 px-3 py-2.5 hover:border-emerald-600/30 hover:bg-slate-800">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white">{color}</p>
    </div>
  );
}

export default function Dashboard() {
  const {
    activeRole,
    actingUser,
    nextMatch,
    myTeamId,
    updateRsvp,
    getRsvpForUser,
    postponeMatch,
    fields,
    toggleFieldRainout,
  } = useApp();

  if (!nextMatch) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <h2 className="text-lg font-bold text-white">Dashboard</h2>
          <p className="text-sm text-slate-400">Your next match at a glance</p>
        </div>
        <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
          <EmptyState
            icon="📭"
            title="No upcoming matches"
            description="Check the Schedule tab or ask your organizer to add one."
          />
        </div>
      </div>
    );
  }

  const isHome = nextMatch.home_team_id === myTeamId;
  const opponentId = isHome ? nextMatch.away_team_id : nextMatch.home_team_id;
  const opponent = getTeamById(opponentId);
  const myKit = isHome ? nextMatch.assigned_home_kit : nextMatch.assigned_away_kit;
  const opponentKit = isHome ? nextMatch.assigned_away_kit : nextMatch.assigned_home_kit;
  const isPostponed = nextMatch.status === MATCH_STATUS.POSTPONED;
  const field = fields.find((f) => f.number === nextMatch.field_number);
  const userRsvp = getRsvpForUser(nextMatch.id, actingUser.id);
  const canRsvp = activeRole === ROLES.PLAYER && !isPostponed;
  const isOrganizer = activeRole === ROLES.ORGANIZER;

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="text-lg font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400">Your next match at a glance</p>
      </div>

      <article
        className={`card-interactive overflow-hidden rounded-2xl border shadow-xl transition-all duration-500 ease-out ${
          isPostponed
            ? 'border-red-500/50 bg-gradient-to-br from-red-950/80 to-slate-900 shadow-red-900/20 hover:border-red-400/60'
            : 'border-emerald-600/30 bg-gradient-to-br from-emerald-950/60 to-slate-900 shadow-emerald-900/20 hover:border-emerald-500/50'
        }`}
      >
        <div
          className={`px-4 py-3 transition-colors duration-500 ${
            isPostponed ? 'bg-red-600/30' : 'bg-emerald-600/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Next Match
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all duration-300 ${
                isPostponed
                  ? 'bg-red-500 text-white'
                  : 'bg-emerald-500 text-emerald-950'
              }`}
            >
              {nextMatch.status}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {isHome ? 'Home vs' : 'Away @'}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-white">
              {opponent?.name}
            </p>
          </div>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Kickoff
              </p>
              <p className="text-sm font-semibold text-white">
                {formatMatchDate(nextMatch.match_date)}
              </p>
              <p className="text-lg font-bold text-emerald-400">
                {formatMatchTime(nextMatch.match_date)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Field
              </p>
              <p className="text-2xl font-extrabold text-white">#{nextMatch.field_number}</p>
              {field?.rainout && (
                <p className="text-xs font-semibold text-amber-400 transition-colors duration-300">
                  ⚠ Rainout watch
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KitBadge label="Your kit" color={myKit} />
            <KitBadge label="Opponent kit" color={opponentKit} />
          </div>

          {canRsvp && (
            <div className="space-y-2">
              <p className="text-center text-xs font-medium text-slate-400">Your RSVP</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateRsvp(nextMatch.id, actingUser.id, RSVP_STATUS.GOING)}
                  className={`btn-interactive flex-1 rounded-xl py-3 text-sm font-bold ${
                    userRsvp === RSVP_STATUS.GOING
                      ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30'
                      : 'border border-emerald-600/40 bg-emerald-950/50 text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-950/70'
                  }`}
                >
                  Going
                </button>
                <button
                  type="button"
                  onClick={() => updateRsvp(nextMatch.id, actingUser.id, RSVP_STATUS.OUT)}
                  className={`btn-interactive flex-1 rounded-xl py-3 text-sm font-bold ${
                    userRsvp === RSVP_STATUS.OUT
                      ? 'bg-slate-600 text-white shadow-lg shadow-slate-900/40'
                      : 'border border-slate-600/40 bg-slate-800/50 text-slate-300 hover:border-slate-500/60 hover:bg-slate-800/70'
                  }`}
                >
                  Out
                </button>
              </div>
            </div>
          )}

          {isPostponed && (
            <div className="animate-fade-in rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-center">
              <p className="text-sm font-medium text-red-200">
                This match has been postponed. RSVPs are closed.
              </p>
            </div>
          )}

          {activeRole === ROLES.CAPTAIN && !isPostponed && (
            <p className="text-center text-xs text-slate-400">
              Switch to Team tab to view roster RSVPs and nudge players.
            </p>
          )}

          {isOrganizer && !isPostponed && (
            <button
              type="button"
              onClick={() => postponeMatch(nextMatch.id)}
              className="btn-interactive w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500"
            >
              Postpone Match
            </button>
          )}
        </div>
      </article>

      {isOrganizer && (
        <section className="mt-6">
          <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wider text-slate-400">
            Field Rainout Status
          </h3>
          <div className="space-y-2">
            {fields.map((fieldItem) => (
              <button
                key={fieldItem.id}
                type="button"
                onClick={() => toggleFieldRainout(fieldItem.number)}
                className="card-interactive btn-interactive flex w-full items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 hover:border-emerald-600/30 hover:bg-slate-800/80"
              >
                <span className="font-semibold text-white">Field #{fieldItem.number}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all duration-300 ${
                    fieldItem.rainout
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {fieldItem.rainout ? 'Rainout' : 'Open'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
