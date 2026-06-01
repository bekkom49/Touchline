import { useMemo, useState } from 'react';
import { Copy, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildClubInviteEmail, buildClubInviteLink } from '../mockData';

export default function CreateClubPanel({ onClose }) {
  const { teams, actingUser, createClub } = useApp();
  const [mode, setMode] = useState('create');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOk, setMessageOk] = useState(true);
  const [createdClub, setCreatedClub] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [form, setForm] = useState({
    name: '',
    primaryKitColor: 'Emerald Green',
    awayKitColor: 'White',
  });

  const myClubs = useMemo(
    () => teams.filter((t) => t.created_by === actingUser.id),
    [teams, actingUser.id]
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessageOk(false);
      setMessage('Club name is required.');
      return;
    }

    setBusy(true);
    setMessage('');
    const result = await createClub(form);
    setBusy(false);

    if (!result.ok) {
      setMessageOk(false);
      setMessage(
        result.error ??
          'Could not create club. Run supabase/match-scores-and-captain-clubs.sql in Supabase, then try again.'
      );
      return;
    }

    setCreatedClub(result.team);
    setMessageOk(true);
    setMessage(`${result.team.name} created! Share the invite code below.`);
    setForm({ name: '', primaryKitColor: 'Emerald Green', awayKitColor: 'White' });
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setMessageOk(true);
      setMessage(`${label} copied to clipboard.`);
    } catch {
      setMessageOk(false);
      setMessage('Could not copy — select and copy manually.');
    }
  }

  function openInviteEmail(team) {
    const href = buildClubInviteEmail(team, team.invite_code, inviteEmail.trim());
    window.location.href = href;
  }

  return (
    <div className="animate-fade-in mb-6 space-y-4 rounded-2xl border border-emerald-600/30 bg-emerald-950/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-emerald-300">Manage Clubs</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-400 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${
            mode === 'create' ? 'bg-emerald-600 text-white' : 'text-slate-400'
          }`}
        >
          Create club
        </button>
        <button
          type="button"
          onClick={() => setMode('invite')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${
            mode === 'invite' ? 'bg-emerald-600 text-white' : 'text-slate-400'
          }`}
        >
          Send invites
        </button>
      </div>

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-slate-500">Club name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Northside United"
              className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Home kit</span>
              <input
                type="text"
                value={form.primaryKitColor}
                onChange={(e) => setForm({ ...form, primaryKitColor: e.target.value })}
                className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-slate-500">Away kit</span>
              <input
                type="text"
                value={form.awayKitColor}
                onChange={(e) => setForm({ ...form, awayKitColor: e.target.value })}
                className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-interactive w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create club'}
          </button>
        </form>
      )}

      {mode === 'invite' && (
        <div className="space-y-3">
          {myClubs.length === 0 ? (
            <p className="text-xs text-slate-400">
              Create a club first, then invite players with its code.
            </p>
          ) : (
            myClubs.map((club) => (
              <div
                key={club.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3"
              >
                <p className="text-sm font-bold text-white">{club.name}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {club.primary_kit_color} / {club.away_kit_color}
                </p>
                {club.invite_code ? (
                  <>
                    <p className="mt-2 text-xs text-slate-400">
                      Invite code:{' '}
                      <span className="font-mono font-bold text-emerald-400">{club.invite_code}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(club.invite_code, 'Invite code')}
                        className="btn-interactive inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[10px] font-bold text-slate-200"
                      >
                        <Copy size={12} />
                        Copy code
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(buildClubInviteLink(club.invite_code), 'Invite link')}
                        className="btn-interactive inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[10px] font-bold text-slate-200"
                      >
                        <Copy size={12} />
                        Copy link
                      </button>
                    </div>
                    <label className="mt-3 block space-y-1">
                      <span className="text-[10px] uppercase text-slate-500">Player email</span>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="player@email.com"
                        className="input-interactive w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openInviteEmail(club)}
                      className="btn-interactive mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <Mail size={14} />
                      Send invitation email
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-amber-400">
                    No invite code yet — run supabase/organizer-clubs.sql to enable invites.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {createdClub?.invite_code && mode === 'create' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3">
          <p className="text-xs font-bold text-emerald-300">Invite code for {createdClub.name}</p>
          <p className="mt-1 font-mono text-lg font-bold text-white">{createdClub.invite_code}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => copyText(createdClub.invite_code, 'Invite code')}
              className="btn-interactive rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white"
            >
              Copy code
            </button>
            <button
              type="button"
              onClick={() => setMode('invite')}
              className="btn-interactive rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[10px] font-bold text-emerald-300"
            >
              Send invite
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs ${messageOk ? 'text-emerald-400' : 'text-red-400'}`}>{message}</p>
      )}
    </div>
  );
}
