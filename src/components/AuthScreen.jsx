import { useEffect, useState } from 'react';
import { Calendar, Shield, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../mockData';
import TeamPicker, { useTeams } from './TeamPicker';
import {
  supabase,
  getAuthPersistencePreference,
  formatSupabaseNetworkError,
} from '../supabaseClient';

const roleOptions = [
  {
    value: ROLES.PLAYER,
    label: 'Player',
    description: 'RSVP to matches and join team chat',
    Icon: User,
  },
  {
    value: ROLES.CAPTAIN,
    label: 'Captain',
    description: 'Manage roster, RSVPs, and nudge players',
    Icon: Users,
  },
  {
    value: ROLES.ORGANIZER,
    label: 'Organizer',
    description: 'Schedule matches and manage the league',
    Icon: Calendar,
  },
];

async function lookupTeamIdByInviteCode(code) {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .eq('invite_code', normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export default function AuthScreen() {
  const { signIn, signUp, authError, authErrorDetail, setAuthError, clearAuthFailure } = useAuth();
  const { teams } = useTeams();
  const [mode, setMode] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(getAuthPersistencePreference);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.PLAYER,
    teamId: null,
    inviteCode: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setForm((prev) => ({ ...prev, inviteCode: invite.toUpperCase(), role: ROLES.PLAYER }));
      setMode('signup');
    }
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    clearAuthFailure();
    setSuccessMessage('');
  }

  function handleRoleChange(role) {
    setForm((prev) => ({
      ...prev,
      role,
      teamId: role === ROLES.PLAYER ? null : role === ROLES.CAPTAIN ? 1 : null,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    clearAuthFailure();
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        const result = await signIn(form.email, form.password, { staySignedIn });
        if (!result.ok) {
          console.error('[Touchline Auth] Login failed on client', result.error ?? authErrorDetail);
        }
      } else {
        if (!form.name.trim()) {
          setAuthError('Please enter your name.');
          return;
        }

        let teamId = form.teamId;

        if (form.inviteCode.trim()) {
          const invitedTeam = await lookupTeamIdByInviteCode(form.inviteCode);
          if (!invitedTeam) {
            setAuthError('Invalid invite code.');
            return;
          }
          teamId = invitedTeam.id;
        }

        const result = await signUp({ ...form, teamId });
        if (result.needsEmailConfirm) {
          setSuccessMessage('Account created! Check your email to confirm, then sign in.');
          switchMode('login');
        }
      }
    } catch (err) {
      setAuthError(formatSupabaseNetworkError(err?.message ?? String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-600/20 via-emerald-900/10 to-transparent"
        aria-hidden
      />

      <div className="safe-top relative flex flex-1 flex-col px-6 pb-8 pt-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-extrabold text-white shadow-xl shadow-emerald-900/40">
            TL
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Touchline</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your recreational soccer league, in your pocket.
          </p>
        </div>

        <div className="mb-6 flex rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`btn-interactive flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 ${
              mode === 'login'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`btn-interactive flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 ${
              mode === 'signup'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Full name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jordan Lee"
                  className="input-interactive w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Account type
                </span>
                <div className="space-y-2">
                  {roleOptions.map(({ value, label, description, Icon }) => {
                    const selected = form.role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRoleChange(value)}
                        className={`card-interactive flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                          selected
                            ? 'border-emerald-500/60 bg-emerald-950/40 shadow-md shadow-emerald-900/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-white">{label}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.role === ROLES.PLAYER && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Invite code (optional)
                    </span>
                    <input
                      type="text"
                      value={form.inviteCode}
                      onChange={(e) =>
                        setForm({ ...form, inviteCode: e.target.value.toUpperCase() })
                      }
                      placeholder="AB12CD34"
                      className="input-interactive w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm uppercase text-white placeholder:normal-case placeholder:text-slate-600"
                    />
                  </label>
                  {!form.inviteCode.trim() && (
                    <TeamPicker
                      teams={teams}
                      selectedId={form.teamId}
                      onSelect={(teamId) => setForm({ ...form, teamId })}
                      onSkip={() => setForm({ ...form, teamId: null })}
                      allowSkip
                      label="Join a club (optional)"
                    />
                  )}
                </>
              )}

              {form.role === ROLES.CAPTAIN && (
                <TeamPicker
                  teams={teams}
                  selectedId={form.teamId}
                  onSelect={(teamId) => setForm({ ...form, teamId })}
                  label="Your club"
                />
              )}
            </>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@email.com"
              className="input-interactive w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              className="input-interactive w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600"
            />
          </label>

          {mode === 'login' && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-950"
              />
              <span className="text-sm text-slate-300">Stay signed in</span>
            </label>
          )}

          {authError && (
            <div
              className="animate-fade-in rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              <p className="font-semibold text-red-100">
                {authErrorDetail?.title ?? 'Sign-in failed'}
              </p>
              <p className="mt-1">{authErrorDetail?.message ?? authError}</p>
              {authErrorDetail?.stage && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-red-300/70">
                  Reason: {authErrorDetail.stage}
                  {authErrorDetail.code ? ` · ${authErrorDetail.code}` : ''}
                </p>
              )}
              {authErrorDetail?.diagnostics?.usingMemoryFallback && (
                <p className="mt-2 text-xs text-red-200/90">
                  Private browsing may be blocking saved sessions on this device.
                </p>
              )}
            </div>
          )}

          {successMessage && (
            <div className="animate-fade-in rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-interactive mt-2 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign In'
                : `Create ${form.role} Account`}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield size={14} className="text-emerald-500" />
          <span>Secured with Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
}
