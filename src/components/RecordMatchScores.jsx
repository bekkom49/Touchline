import { useMemo, useState } from 'react';

import { useApp } from '../context/AppContext';

import {

  MATCH_STATUS,

  buildGoalRowsFromDb,

  formatMatchDate,

  getTeamById,

  getTeamSquad,

  isCompletedMatch,

  syncGoalRows,

} from '../mockData';



function GoalSideEntry({ teamName, squad, rows, onChange }) {

  if (rows.length === 0) return null;



  return (

    <div className="space-y-2">

      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">

        {teamName} goals

      </p>

      {rows.map((row, index) => (

        <div

          key={`${teamName}-goal-${index}`}

          className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-2"

        >

          <p className="mb-1.5 text-[10px] font-medium text-slate-500">

            Goal {index + 1}

          </p>

          <div className="grid gap-2 sm:grid-cols-2">

            <label className="block space-y-1">

              <span className="text-[10px] text-slate-500">Scorer</span>

              <select

                value={row.scorerId}

                onChange={(e) => onChange(index, 'scorerId', e.target.value)}

                className="input-interactive w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-white"

              >

                <option value="">Select scorer…</option>

                {squad.map((player) => (

                  <option key={player.id} value={player.id}>

                    {player.name}

                  </option>

                ))}

              </select>

            </label>

            <label className="block space-y-1">

              <span className="text-[10px] text-slate-500">Assist (optional)</span>

              <select

                value={row.assistId}

                onChange={(e) => onChange(index, 'assistId', e.target.value)}

                className="input-interactive w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-white"

              >

                <option value="">None</option>

                {squad

                  .filter((player) => String(player.id) !== row.scorerId)

                  .map((player) => (

                    <option key={player.id} value={player.id}>

                      {player.name}

                    </option>

                  ))}

              </select>

            </label>

          </div>

        </div>

      ))}

      {squad.length === 0 && (

        <p className="text-[10px] text-amber-400/90">

          No players on this club roster yet — add players before recording scorers.

        </p>

      )}

    </div>

  );

}



export default function RecordMatchScores() {

  const { teams, users, matches, matchGoals, submitMatchResult } = useApp();

  const [busyId, setBusyId] = useState(null);

  const [message, setMessage] = useState('');

  const [messageOk, setMessageOk] = useState(true);

  const [scores, setScores] = useState({});

  const [goalRows, setGoalRows] = useState({});



  const scoreableMatches = useMemo(

    () =>

      matches

        .filter(

          (m) =>

            m.status === MATCH_STATUS.SCHEDULED ||

            m.status === MATCH_STATUS.COMPLETED ||

            isCompletedMatch(m)

        )

        .filter((m) => m.status !== MATCH_STATUS.POSTPONED)

        .sort((a, b) => new Date(b.match_date) - new Date(a.match_date)),

    [matches]

  );



  function getScores(match) {

    const saved = scores[match.id];

    if (saved) return saved;

    return {

      home: match.home_score != null ? String(match.home_score) : '',

      away: match.away_score != null ? String(match.away_score) : '',

    };

  }



  function getGoals(match) {

    const saved = goalRows[match.id];

    if (saved) return saved;



    const { home: homeScore, away: awayScore } = getScores(match);

    const homeCount = homeScore === '' ? 0 : Number(homeScore);

    const awayCount = awayScore === '' ? 0 : Number(awayScore);



    if (

      match.home_score != null &&

      match.away_score != null &&

      matchGoals.some((g) => g.match_id === match.id)

    ) {

      return buildGoalRowsFromDb(match, matchGoals);

    }



    return {

      home: syncGoalRows([], homeCount),

      away: syncGoalRows([], awayCount),

    };

  }



  function setScore(matchId, side, value) {

    const cleaned = value.replace(/\D/g, '');

    const match = scoreableMatches.find((m) => m.id === matchId);

    setScores((prev) => {

      const current = prev[matchId] ?? {

        home: match?.home_score != null ? String(match.home_score) : '',

        away: match?.away_score != null ? String(match.away_score) : '',

      };

      const nextScores = { ...current, [side]: cleaned };

      const homeCount = nextScores.home === '' ? 0 : Number(nextScores.home);

      const awayCount = nextScores.away === '' ? 0 : Number(nextScores.away);



      setGoalRows((goalPrev) => {

        let currentGoals = goalPrev[matchId];

        if (!currentGoals && match) {

          if (matchGoals.some((g) => g.match_id === match.id)) {

            currentGoals = buildGoalRowsFromDb(match, matchGoals);

          } else {

            currentGoals = { home: [], away: [] };

          }

        }

        currentGoals ??= { home: [], away: [] };

        return {

          ...goalPrev,

          [matchId]: {

            home: syncGoalRows(currentGoals.home, homeCount),

            away: syncGoalRows(currentGoals.away, awayCount),

          },

        };

      });



      return { ...prev, [matchId]: nextScores };

    });

  }



  function setGoalField(matchId, side, index, field, value) {

    setGoalRows((prev) => {

      const match = scoreableMatches.find((m) => m.id === matchId);

      const current = prev[matchId] ?? getGoals(match);

      const sideRows = [...current[side]];

      sideRows[index] = { ...sideRows[index], [field]: value };

      if (field === 'scorerId' && value && sideRows[index].assistId === value) {

        sideRows[index].assistId = '';

      }

      return {

        ...prev,

        [matchId]: { ...current, [side]: sideRows },

      };

    });

  }



  function buildGoalPayload(match, goals) {

    const payload = [];

    for (const row of goals.home) {

      payload.push({

        team_id: match.home_team_id,

        scorer_id: Number(row.scorerId),

        assist_id: row.assistId ? Number(row.assistId) : null,

      });

    }

    for (const row of goals.away) {

      payload.push({

        team_id: match.away_team_id,

        scorer_id: Number(row.scorerId),

        assist_id: row.assistId ? Number(row.assistId) : null,

      });

    }

    return payload;

  }



  async function handleSubmit(match) {

    const { home, away } = getScores(match);

    const goals = getGoals(match);

    setBusyId(match.id);

    setMessage('');



    const result = await submitMatchResult(

      match.id,

      home,

      away,

      buildGoalPayload(match, goals)

    );



    setBusyId(null);

    if (result.ok) {

      setMessageOk(true);

      setMessage('Result saved — standings updated.');

    } else {

      setMessageOk(false);

      setMessage(result.error ?? 'Could not save result.');

    }

  }



  if (scoreableMatches.length === 0) {

    return (

      <p className="mb-6 text-center text-xs text-slate-500">

        Schedule a match first, then enter the final score here.

      </p>

    );

  }



  return (

    <div className="animate-fade-in mb-6 space-y-3 rounded-2xl border border-emerald-600/30 bg-emerald-950/20 p-4">

      <p className="text-center text-sm font-bold text-emerald-300">Record Match Results</p>

      <p className="text-center text-[10px] text-slate-500">

        Enter the final score, then name each scorer and optional assist.

      </p>



      <div className="space-y-3">

        {scoreableMatches.map((match) => {

          const home = getTeamById(teams, match.home_team_id);

          const away = getTeamById(teams, match.away_team_id);

          const { home: homeScore, away: awayScore } = getScores(match);

          const goals = getGoals(match);

          const homeSquad = getTeamSquad(users, match.home_team_id);

          const awaySquad = getTeamSquad(users, match.away_team_id);

          const done =

            match.status === MATCH_STATUS.COMPLETED || isCompletedMatch(match);

          const totalGoals =

            (homeScore === '' ? 0 : Number(homeScore)) +

            (awayScore === '' ? 0 : Number(awayScore));

          const showGoalEntry =

            homeScore !== '' && awayScore !== '' && totalGoals > 0;



          return (

            <div

              key={match.id}

              className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3"

            >

              <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500">

                {formatMatchDate(match.match_date)}
                {match.field_address?.trim() && (
                  <span> · {match.field_address.trim()}</span>
                )}

                {done && (

                  <span className="ml-1 text-emerald-400">· Completed</span>

                )}

              </p>

              <div className="flex items-center gap-2">

                <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold text-white">

                  {home?.name}

                </span>

                <input

                  type="text"

                  inputMode="numeric"

                  value={homeScore}

                  onChange={(e) => setScore(match.id, 'home', e.target.value)}

                  className="input-interactive w-12 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-white"

                  aria-label={`${home?.name} goals`}

                />

                <span className="text-xs text-slate-500">–</span>

                <input

                  type="text"

                  inputMode="numeric"

                  value={awayScore}

                  onChange={(e) => setScore(match.id, 'away', e.target.value)}

                  className="input-interactive w-12 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-white"

                  aria-label={`${away?.name} goals`}

                />

                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">

                  {away?.name}

                </span>

              </div>



              {showGoalEntry && (

                <div className="mt-3 space-y-3 border-t border-slate-700/50 pt-3">

                  <GoalSideEntry

                    teamName={home?.name ?? 'Home'}

                    squad={homeSquad}

                    rows={goals.home}

                    onChange={(index, field, value) =>

                      setGoalField(match.id, 'home', index, field, value)

                    }

                  />

                  <GoalSideEntry

                    teamName={away?.name ?? 'Away'}

                    squad={awaySquad}

                    rows={goals.away}

                    onChange={(index, field, value) =>

                      setGoalField(match.id, 'away', index, field, value)

                    }

                  />

                </div>

              )}



              <button

                type="button"

                disabled={busyId === match.id || homeScore === '' || awayScore === ''}

                onClick={() => handleSubmit(match)}

                className="btn-interactive mt-2 w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"

              >

                {busyId === match.id ? 'Saving…' : done ? 'Update result' : 'Save result'}

              </button>

            </div>

          );

        })}

      </div>



      {message && (

        <p className={`text-center text-xs ${messageOk ? 'text-emerald-400' : 'text-red-400'}`}>

          {message}

        </p>

      )}

    </div>

  );

}


