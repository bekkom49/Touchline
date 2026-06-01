import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import EmptyState from './EmptyState';
import ClubChat from './ClubChat';
import CreateClubPanel from './CreateClubPanel';
import TeamPicker, { FALLBACK_TEAMS } from './TeamPicker';
import {
  RSVP_STATUS,
  getTeamById,
  isCaptainRole,
  isOrganizerRole,
  isPlayerRole,
} from '../mockData';

const rsvpGroups = [
  { key: RSVP_STATUS.GOING, label: 'Going', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { key: RSVP_STATUS.OUT, label: 'Out', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  { key: RSVP_STATUS.NO_RESPONSE, label: 'No Response', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
];

export default function Team() {
  const {
    activeRole,
    teamPlayers,
    clubMembers,
    clubMessages,
    teams,
    myTeamId,
    nextMatch,
    getRsvpsForMatch,
    nudgePlayer,
    addPlayer,
    removePlayer,
    joinClub,
    leaveClub,
    joinClubByInviteCode,
  } = useApp();
  const { setAuthError } = useAuth();

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showClubChat, setShowClubChat] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [clubBusy, setClubBusy] = useState(false);
  const [clubMessage, setClubMessage] = useState('');
  const [clubMessageOk, setClubMessageOk] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [pickedTeamId, setPickedTeamId] = useState(myTeamId ?? teams[0]?.id ?? 1);

  useEffect(() => {
    if (myTeamId) setPickedTeamId(myTeamId);
  }, [myTeamId]);

  const matchRsvps = nextMatch ? getRsvpsForMatch(nextMatch.id) : [];
  const isCaptain = isCaptainRole(activeRole);
  const isPlayer = isPlayerRole(activeRole);
  const isOrganizer = isOrganizerRole(activeRole);
  const clubTeams = teams.length > 0 ? teams : FALLBACK_TEAMS;
  const currentTeam = myTeamId ? getTeamById(clubTeams, myTeamId) : null;
  const hasRoster = teamPlayers.length > 0;

  async function handleJoinClub(teamId) {
    setClubBusy(true);
    setClubMessage('');
    setAuthError(null);
    const result = await joinClub(teamId);
    if (result.ok) {
      setClubMessageOk(true);
      setClubMessage('Club updated.');
    } else {
      setClubMessageOk(false);
      setClubMessage(result.error ?? 'Could not update club.');
    }
    setClubBusy(false);
  }

  async function handleLeaveClub() {
    setClubBusy(true);
    setClubMessage('');
    setAuthError(null);
    const result = await leaveClub();
    if (result.ok) {
      setClubMessageOk(true);
      setClubMessage('You left the club.');
    } else {
      setClubMessageOk(false);
      setClubMessage(result.error ?? 'Could not leave club.');
    }
    setClubBusy(false);
  }

  async function handleJoinByInvite(e) {
    e.preventDefault();
    setClubBusy(true);
    setClubMessage('');
    setAuthError(null);
    const result = await joinClubByInviteCode(inviteCode);
    if (result.ok) {
      setClubMessageOk(true);
      setClubMessage('Joined club with invite code.');
      setInviteCode('');
    } else {
      setClubMessageOk(false);
      setClubMessage(result.error ?? 'Invalid invite code.');
    }
    setClubBusy(false);
  }

  function getPlayerRsvp(userId) {
    return matchRsvps.find((r) => r.user_id === userId)?.status ?? RSVP_STATUS.NO_RESPONSE;
  }

  function playersByStatus(status) {
    return teamPlayers.filter((p) => getPlayerRsvp(p.id) === status);
  }

  function handleAddPlayer(e) {
    e.preventDefault();
    addPlayer(newPlayerName, newPlayerEmail);
    setNewPlayerName('');
    setNewPlayerEmail('');
    setShowAddPlayer(false);
  }

  if (showClubChat && currentTeam) {
    return <ClubChat team={currentTeam} onBack={() => setShowClubChat(false)} />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-4 pt-6 pb-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="page-header mb-0">
          <h2 className="text-lg font-bold text-white">Team</h2>
          <p className="text-sm text-slate-400">
            {currentTeam ? currentTeam.name : 'Your club & roster'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isCaptain && (
            <button
              type="button"
              onClick={() => setShowCreateClub((v) => !v)}
              className="btn-interactive rounded-xl border border-emerald-600/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40"
            >
              {showCreateClub ? 'Close' : '+ Club'}
            </button>
          )}
          {isCaptain && (
            <button
              type="button"
              onClick={() => setShowAddPlayer((v) => !v)}
              className="btn-interactive rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500"
            >
              {showAddPlayer ? 'Cancel' : '+ Add'}
            </button>
          )}
        </div>
      </div>

      {showCreateClub && isCaptain && (
        <CreateClubPanel onClose={() => setShowCreateClub(false)} />
      )}

      {!isOrganizer && (
        <div className="card-interactive mb-4 rounded-2xl border-2 border-emerald-600/40 bg-emerald-950/20 p-4 shadow-md shadow-emerald-900/10">
          <h3 className="mb-1 text-sm font-bold text-white">My Club</h3>
          {currentTeam && (
            <p className="mb-2 text-sm font-semibold text-emerald-400">{currentTeam.name}</p>
          )}

          {currentTeam ? (
            <>
              <p className="mb-3 text-xs text-slate-400">
                {currentTeam.primary_kit_color} / {currentTeam.away_kit_color}
                {' · '}
                {clubMembers.length} teammate{clubMembers.length !== 1 ? 's' : ''}
              </p>

              <button
                type="button"
                onClick={() => setShowClubChat(true)}
                className="card-interactive btn-interactive mb-3 flex w-full items-center justify-between rounded-2xl border border-emerald-600/30 bg-gradient-to-r from-emerald-950/60 to-slate-900 px-4 py-3.5 text-left shadow-md shadow-emerald-900/10 hover:border-emerald-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-xl">
                    💬
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Club Chat</p>
                    <p className="text-xs text-slate-400">
                      {clubMessages.length === 0
                        ? 'No messages yet — tap to open'
                        : `${clubMessages.length} message${clubMessages.length !== 1 ? 's' : ''} with ${currentTeam.name}`}
                    </p>
                  </div>
                </div>
                <span className="text-emerald-400 transition-transform duration-300">→</span>
              </button>

              {isPlayer && (
                <button
                  type="button"
                  disabled={clubBusy}
                  onClick={handleLeaveClub}
                  className="btn-interactive w-full rounded-xl border border-red-500/30 bg-red-950/30 py-2.5 text-sm font-bold text-red-300 hover:bg-red-950/50 disabled:opacity-40"
                >
                  Leave club
                </button>
              )}
            </>
          ) : isPlayer ? (
            <>
              <p className="mb-3 text-xs text-slate-400">
                You&apos;re not on a club yet — join with an invite code or pick a club below.
              </p>

              <form onSubmit={handleJoinByInvite} className="mb-3 space-y-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Invite code
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="AB12CD34"
                      className="input-interactive min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm uppercase text-white placeholder:normal-case placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={clubBusy || !inviteCode.trim()}
                      className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Join
                    </button>
                  </div>
                </label>
              </form>

              <TeamPicker
                teams={clubTeams}
                selectedId={pickedTeamId}
                onSelect={setPickedTeamId}
                label="Or browse clubs"
              />

              <button
                type="button"
                disabled={clubBusy || !pickedTeamId}
                onClick={() => handleJoinClub(pickedTeamId)}
                className="btn-interactive mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Join club
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">No club assigned to your captain profile yet.</p>
          )}

          {clubMessage && (
            <p className={`mt-2 text-xs ${clubMessageOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {clubMessage}
            </p>
          )}
        </div>
      )}

      {showAddPlayer && isCaptain && (
        <form
          onSubmit={handleAddPlayer}
          className="animate-fade-in mb-4 space-y-2 rounded-2xl border border-emerald-600/30 bg-emerald-950/30 p-3"
        >
          <input
            type="text"
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={newPlayerEmail}
            onChange={(e) => setNewPlayerEmail(e.target.value)}
            className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="btn-interactive w-full rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Add to Roster
          </button>
        </form>
      )}

      {nextMatch && (
        <>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
            RSVPs — next match
          </h3>
          {!hasRoster ? (
            <div className="card-interactive overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30">
              <EmptyState
                icon="👤"
                title="No players on roster"
                description="Captains can add players using the + Add button above."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {rsvpGroups.map((group) => {
                const players = playersByStatus(group.key);
                return (
                  <div
                    key={group.key}
                    className={`card-interactive rounded-xl border ${group.border} ${group.bg} p-3 hover:brightness-110`}
                  >
                    <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${group.color}`}>
                      {group.label} ({players.length})
                    </p>
                    {players.length === 0 ? (
                      <p className="py-2 text-center text-xs text-slate-500">No players in this group</p>
                    ) : (
                      <ul className="space-y-2">
                        {players.map((player) => (
                          <li
                            key={player.id}
                            className="card-interactive flex items-center justify-between rounded-xl bg-slate-900/50 px-3 py-2 transition-colors hover:bg-slate-900/70"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{player.name}</p>
                              <p className="truncate text-[10px] text-slate-500">{player.email}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {isCaptain && group.key === RSVP_STATUS.NO_RESPONSE && (
                                <button
                                  type="button"
                                  onClick={() => nudgePlayer(player.id)}
                                  className="btn-interactive rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30"
                                >
                                  Nudge
                                </button>
                              )}
                              {isCaptain && (
                                <button
                                  type="button"
                                  onClick={() => removePlayer(player.id)}
                                  className="btn-interactive rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
