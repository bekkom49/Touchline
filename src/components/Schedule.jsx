import { useState } from 'react';

import { useApp } from '../context/AppContext';

import EmptyState from './EmptyState';

import RecordMatchScores from './RecordMatchScores';

import MatchResultDetail from './MatchResultDetail';

import {

  formatMatchDate,

  getTeamById,

  isOrganizerRole,

  sortStandings,

} from '../mockData';



export default function Schedule() {

  const { teams, standings, matchResults, activeRole, createMatch, myTeamId } = useApp();

  const [showCreate, setShowCreate] = useState(false);

  const [showScores, setShowScores] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState(null);

  const [form, setForm] = useState({

    homeTeamId: '1',

    awayTeamId: '2',

    matchDate: '2026-06-21T10:00',

    fieldAddress: '',

  });

  const [createMessage, setCreateMessage] = useState('');

  const [createMessageOk, setCreateMessageOk] = useState(true);



  const sortedStandings = sortStandings(standings, teams);



  const sortedResults = [...matchResults].sort(

    (a, b) => new Date(b.match_date) - new Date(a.match_date)

  );



  async function handleCreate(e) {

    e.preventDefault();

    setCreateMessage('');

    const result = await createMatch({

      homeTeamId: Number(form.homeTeamId),

      awayTeamId: Number(form.awayTeamId),

      matchDate: new Date(form.matchDate).toISOString(),

      fieldAddress: form.fieldAddress,

    });

    if (result?.ok) {

      setCreateMessageOk(true);

      setCreateMessage('Match scheduled.');

      setShowCreate(false);

    } else {

      setCreateMessageOk(false);

      setCreateMessage(result?.error ?? 'Could not schedule match.');

    }

  }



  if (selectedMatch) {

    return (

      <MatchResultDetail

        match={selectedMatch}

        onBack={() => setSelectedMatch(null)}

      />

    );

  }



  return (

    <div className="page-shell">

      <div className="mb-5 flex items-center justify-between gap-3">

        <div className="page-header mb-0">

          <h2 className="text-lg font-bold text-white">Schedule</h2>

          <p className="text-sm text-slate-400">Standings & results</p>

        </div>

        {isOrganizerRole(activeRole) && (

          <div className="flex shrink-0 gap-2">

            <button

              type="button"

              onClick={() => {

                setShowScores((v) => !v);

                setShowCreate(false);

              }}

              className="btn-interactive rounded-xl border border-emerald-600/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40"

            >

              {showScores ? 'Close' : 'Score'}

            </button>

            <button

              type="button"

              onClick={() => {

                setShowCreate((v) => !v);

                setShowScores(false);

              }}

              className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500"

            >

              {showCreate ? 'Close' : '+ Match'}

            </button>

          </div>

        )}

      </div>



      {showScores && isOrganizerRole(activeRole) && <RecordMatchScores />}



      {showCreate && isOrganizerRole(activeRole) && (

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

            <span className="text-[10px] uppercase text-slate-500">Field address</span>

            <input

              type="text"

              required

              value={form.fieldAddress}

              onChange={(e) => setForm({ ...form, fieldAddress: e.target.value })}

              placeholder="e.g. 742 Evergreen Terrace, Springfield"

              className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"

            />

          </label>

          {createMessage && (

            <p className={`text-center text-xs ${createMessageOk ? 'text-emerald-400' : 'text-red-400'}`}>

              {createMessage}

            </p>

          )}

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

        {teams.length === 0 ? (

          <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">

            <EmptyState

              icon="🏆"

              title="No clubs yet"

              description="Standings appear once clubs are added to the league."

            />

          </div>

        ) : (

          <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40 hover:border-emerald-600/30">

            <div className="overflow-x-auto">

              <div className="min-w-[20rem]">

                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_repeat(5,1.75rem)] gap-1 border-b border-slate-700/60 bg-slate-900/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">

                  <span>#</span>

                  <span>Club</span>

                  <span className="text-center" title="Played">

                    P

                  </span>

                  <span className="text-center" title="Wins">

                    W

                  </span>

                  <span className="text-center" title="Draws">

                    D

                  </span>

                  <span className="text-center" title="Losses">

                    L

                  </span>

                  <span className="text-center" title="Points">

                    Pts

                  </span>

                </div>

                {sortedStandings.map((row, idx) => {

                  const team = getTeamById(teams, row.team_id);

                  const isMyTeam = myTeamId != null && row.team_id === myTeamId;

                  return (

                    <div

                      key={row.team_id}

                      className={`grid grid-cols-[1.5rem_minmax(0,1fr)_repeat(5,1.75rem)] gap-1 border-b border-slate-700/30 px-3 py-2.5 transition-colors duration-300 last:border-0 hover:bg-slate-800/50 ${

                        isMyTeam ? 'bg-emerald-950/40' : ''

                      }`}

                    >

                      <span className="text-xs font-bold text-slate-500">{idx + 1}</span>

                      <span

                        className={`truncate text-sm font-semibold ${isMyTeam ? 'text-emerald-300' : 'text-white'}`}

                      >

                        {team?.name ?? 'Unknown'}

                      </span>

                      <span className="text-center text-sm text-slate-300">{row.played}</span>

                      <span className="text-center text-sm text-slate-300">{row.wins}</span>

                      <span className="text-center text-sm text-slate-300">{row.draws}</span>

                      <span className="text-center text-sm text-slate-300">{row.losses}</span>

                      <span className="text-center text-sm font-bold text-white">{row.points}</span>

                    </div>

                  );

                })}

              </div>

            </div>

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

              description="Organizers can tap Score to enter final match results."

            />

          </div>

        ) : (

          <div className="space-y-2">

            {sortedResults.map((result) => {

              const home = getTeamById(teams, result.home_team_id);

              const away = getTeamById(teams, result.away_team_id);

              return (

                <button

                  type="button"

                  key={result.id}

                  onClick={() => setSelectedMatch(result)}

                  className="card-interactive w-full rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 text-left hover:border-emerald-600/25 hover:bg-slate-800/60"

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

                  <p className="mt-2 text-center text-[10px] text-emerald-500/80">

                    Tap for goals & assists

                  </p>

                </button>

              );

            })}

          </div>

        )}

      </section>

    </div>

  );

}


