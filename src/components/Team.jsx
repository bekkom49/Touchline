import { useState } from 'react';
import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import {
  ROLES,
  RSVP_STATUS,
  formatMessageTime,
} from '../mockData';

const rsvpGroups = [
  { key: RSVP_STATUS.GOING, label: 'Going', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { key: RSVP_STATUS.OUT, label: 'Out', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  { key: RSVP_STATUS.NO_RESPONSE, label: 'No Response', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
];

function TeamChat({ onBack }) {
  const { actingUser, messages, sendMessage } = useApp();
  const [chatInput, setChatInput] = useState('');

  function handleSend(e) {
    e.preventDefault();
    sendMessage(chatInput);
    setChatInput('');
  }

  return (
    <div className="flex h-full flex-col animate-tab-in">
      <div className="shrink-0 border-b border-emerald-900/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-sm text-slate-300 hover:border-emerald-600/40 hover:text-white"
            aria-label="Back to roster"
          >
            ←
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Team Chat</h2>
            <p className="text-xs text-slate-400">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {messages.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No messages yet"
            description="Say hello to your squad — updates and alerts will show up here."
          />
        ) : (
          <div className="space-y-3 pb-2">
            {messages.map((msg) => {
              const isMe = msg.sender_name === actingUser.name;
              const isAlert = msg.text.startsWith('⚠️');
              return (
                <div
                  key={msg.id}
                  className={`animate-fade-in flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 transition-all duration-300 ${
                      isAlert
                        ? 'border border-red-500/40 bg-red-950/60 text-red-100'
                        : isMe
                          ? 'bg-emerald-600 text-emerald-950 shadow-md shadow-emerald-900/20'
                          : 'bg-slate-800 text-slate-100 hover:bg-slate-700/80'
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-[10px] font-bold opacity-70">{msg.sender_name}</p>
                    )}
                    <p className="text-sm leading-snug">{msg.text}</p>
                    <p className={`mt-1 text-[10px] ${isMe ? 'text-emerald-900/60' : 'text-slate-500'}`}>
                      {formatMessageTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="safe-bottom shrink-0 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3 backdrop-blur-sm"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Message the team..."
            className="input-interactive min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:brightness-100"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Team() {
  const {
    activeRole,
    teamPlayers,
    nextMatch,
    messages,
    getRsvpsForMatch,
    nudgePlayer,
    addPlayer,
    removePlayer,
  } = useApp();

  const [showChat, setShowChat] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');

  const matchRsvps = nextMatch ? getRsvpsForMatch(nextMatch.id) : [];

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

  const isCaptain = activeRole === ROLES.CAPTAIN;
  const hasRoster = teamPlayers.length > 0;

  if (showChat) {
    return <TeamChat onBack={() => setShowChat(false)} />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-4 pt-6 pb-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="page-header mb-0">
          <h2 className="text-lg font-bold text-white">Team</h2>
          <p className="text-sm text-slate-400">
            {nextMatch ? 'RSVPs for next match' : 'Roster overview'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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

      <button
        type="button"
        onClick={() => setShowChat(true)}
        className="card-interactive btn-interactive mb-4 flex w-full items-center justify-between rounded-2xl border border-emerald-600/30 bg-gradient-to-r from-emerald-950/60 to-slate-900 px-4 py-3.5 text-left shadow-md shadow-emerald-900/10 hover:border-emerald-500/50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-xl">
            💬
          </span>
          <div>
            <p className="text-sm font-bold text-white">Team Chat</p>
            <p className="text-xs text-slate-400">
              {messages.length === 0
                ? 'No messages yet — tap to open'
                : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <span className="text-emerald-400 transition-transform duration-300">→</span>
      </button>

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
    </div>
  );
}
