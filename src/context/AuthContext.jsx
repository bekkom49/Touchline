import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ROLES, resolveSignupTeamId, isPlayerRole } from '../mockData';
import {
  supabase,
  clearStoredAuthSession,
  setAuthPersistence,
  formatSupabaseNetworkError,
  verifyAuthSessionPersisted,
  getAuthStorageDiagnostics,
} from '../supabaseClient';
import {
  AUTH_ERROR_STAGE,
  classifyAuthError,
  logAuthFailure,
} from '../authErrors';

const AuthContext = createContext(null);

function buildProfilePayload(authUser, { name, role, teamId }) {
  return {
    auth_id: authUser.id,
    name: name.trim(),
    email: authUser.email,
    role,
    team_id: resolveSignupTeamId(role, teamId),
  };
}

async function fetchProfileByAuthId(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchProfileByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureUserProfile(authUser, signupMeta) {
  let profile = await fetchProfileByAuthId(authUser.id);
  if (profile) return profile;

  if (signupMeta) {
    const { data, error } = await supabase
      .from('users')
      .insert(buildProfilePayload(authUser, signupMeta))
      .select()
      .single();

    if (!error) return data;

    profile = await fetchProfileByAuthId(authUser.id);
    if (profile) return profile;
  }

  profile = await fetchProfileByEmail(authUser.email);
  if (profile && !profile.auth_id) {
    const { data, error } = await supabase
      .from('users')
      .update({ auth_id: authUser.id })
      .eq('id', profile.id)
      .select()
      .single();

    if (!error) return data;
  }

  if (authUser.user_metadata?.role) {
    const metaTeamId = authUser.user_metadata.team_id;
    const metaRole = authUser.user_metadata.role;
    const { data, error } = await supabase
      .from('users')
      .insert(
        buildProfilePayload(authUser, {
          name: authUser.user_metadata.name ?? authUser.email.split('@')[0],
          role: metaRole,
          teamId: metaTeamId != null && metaTeamId !== '' ? Number(metaTeamId) : null,
        })
      )
      .select()
      .single();

    if (!error) return data;
    profile = await fetchProfileByAuthId(authUser.id);
    if (profile) return profile;
  }

  return null;
}

export function getDefaultTabForRole(role) {
  if (role === ROLES.ORGANIZER) return 'schedule';
  if (role === ROLES.CAPTAIN) return 'team';
  return 'dashboard';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authErrorDetail, setAuthErrorDetail] = useState(null);

  function applyAuthFailure(error, stage, context) {
    const classified = classifyAuthError(error, stage);
    const networkMessage = formatSupabaseNetworkError(classified.raw);
    const display = {
      ...classified,
      message: networkMessage !== classified.raw ? networkMessage : classified.message,
      diagnostics: getAuthStorageDiagnostics(),
    };
    logAuthFailure(context, display);
    setAuthErrorDetail(display);
    setAuthError(`${display.title}: ${display.message}`);
    return display;
  }

  function clearAuthFailure() {
    setAuthError(null);
    setAuthErrorDetail(null);
  }

  const loadProfile = useCallback(async (authUser, signupMeta) => {
    const userProfile = await ensureUserProfile(authUser, signupMeta);
    setProfile(userProfile);
    return userProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          applyAuthFailure(error, AUTH_ERROR_STAGE.SESSION, 'initSession.getSession');
          return;
        }

        setSession(data.session);

        if (data.session?.user) {
          try {
            await loadProfile(data.session.user);
          } catch (err) {
            applyAuthFailure(err, AUTH_ERROR_STAGE.PROFILE, 'initSession.loadProfile');
          }
        }
      } catch (err) {
        if (mounted) {
          applyAuthFailure(err, AUTH_ERROR_STAGE.SESSION, 'initSession');
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initSession();

    // Never await Supabase DB calls inside this callback — it deadlocks getSession().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (event === 'INITIAL_SESSION') return;

      if (nextSession?.user) {
        setTimeout(() => {
          loadProfile(nextSession.user).catch((err) => {
            applyAuthFailure(err, AUTH_ERROR_STAGE.PROFILE, 'onAuthStateChange.loadProfile');
            setProfile(null);
          });
        }, 0);
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          clearAuthFailure();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password, { staySignedIn = true } = {}) {
    clearAuthFailure();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      const detail = applyAuthFailure(
        new Error('Email and password are required.'),
        AUTH_ERROR_STAGE.AUTH,
        'signIn.validation'
      );
      return { ok: false, role: null, error: detail };
    }

    const storageDiag = getAuthStorageDiagnostics();
    if (storageDiag.usingMemoryFallback) {
      console.warn('[Touchline Auth] Browser blocked persistent storage.', storageDiag);
    }

    setAuthPersistence(staySignedIn);
    clearStoredAuthSession();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        const detail = applyAuthFailure(error, AUTH_ERROR_STAGE.AUTH, 'signIn.signInWithPassword');
        return { ok: false, role: null, error: detail };
      }

      if (!data.session) {
        const detail = applyAuthFailure(
          new Error('No session returned after sign-in.'),
          AUTH_ERROR_STAGE.SESSION,
          'signIn.noSession'
        );
        return { ok: false, role: null, error: detail };
      }

      setSession(data.session);

      const persisted = await verifyAuthSessionPersisted(supabase);
      if (!persisted.ok) {
        const stage = storageDiag.usingMemoryFallback
          ? AUTH_ERROR_STAGE.STORAGE
          : AUTH_ERROR_STAGE.SESSION;
        const detail = applyAuthFailure(
          persisted.error ?? new Error('Session could not be initialized.'),
          stage,
          'signIn.verifySession'
        );
        return { ok: false, role: null, error: detail };
      }

      let userProfile;
      try {
        userProfile = await loadProfile(data.user);
      } catch (profileErr) {
        const detail = applyAuthFailure(profileErr, AUTH_ERROR_STAGE.PROFILE, 'signIn.loadProfile');
        return { ok: false, role: null, error: detail };
      }

      if (!userProfile) {
        const detail = applyAuthFailure(
          new Error('Account found, but no profile exists yet.'),
          AUTH_ERROR_STAGE.PROFILE,
          'signIn.missingProfile'
        );
        return { ok: false, role: null, error: detail };
      }

      clearAuthFailure();
      return { ok: true, role: userProfile.role, error: null };
    } catch (err) {
      const detail = applyAuthFailure(err, AUTH_ERROR_STAGE.UNKNOWN, 'signIn.unexpected');
      return { ok: false, role: null, error: detail };
    }
  }

  async function signUp({ name, email, password, role, teamId }) {
    clearAuthFailure();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    const resolvedTeamId = resolveSignupTeamId(role, teamId);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
      options: {
        data: {
          name: name.trim(),
          role,
          team_id: resolvedTeamId,
        },
      },
    });

    if (error) {
      let message = formatSupabaseNetworkError(error.message);
      if (message === error.message && error.message === 'Database error saving new user') {
        message =
          'Sign-up failed while creating your profile. In Supabase, run supabase/new-project-setup.sql, then try again (or sign in if you already registered).';
      }
      applyAuthFailure({ ...error, message }, AUTH_ERROR_STAGE.AUTH, 'signUp');
      return { ok: false, needsEmailConfirm: false, role: null };
    }

    if (data.session?.user) {
      const userProfile = await loadProfile(data.session.user, {
        name,
        role,
        teamId: resolvedTeamId,
      });
      return {
        ok: true,
        needsEmailConfirm: false,
        role: userProfile?.role ?? role,
      };
    }

    return {
      ok: true,
      needsEmailConfirm: true,
      role,
    };
  }

  async function joinClub(teamId) {
    if (!session?.user || !isPlayerRole(profile?.role)) {
      return { ok: false, error: 'Only players can join a club.' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ team_id: Number(teamId) })
      .eq('auth_id', session.user.id)
      .select()
      .single();

    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }

    setProfile(data);
    setAuthError(null);
    return { ok: true, profile: data };
  }

  async function leaveClub() {
    if (!session?.user || !isPlayerRole(profile?.role)) {
      return { ok: false, error: 'Only players can leave a club.' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ team_id: null })
      .eq('auth_id', session.user.id)
      .select()
      .single();

    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }

    setProfile(data);
    setAuthError(null);
    return { ok: true, profile: data };
  }

  async function joinClubByInviteCode(code) {
    const normalized = String(code ?? '').trim().toUpperCase();
    if (!normalized) {
      return { ok: false, error: 'Enter an invite code.' };
    }

    const { data: team, error: lookupError } = await supabase
      .from('teams')
      .select('id, name, invite_code')
      .eq('invite_code', normalized)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!team) {
      return { ok: false, error: 'Invalid invite code.' };
    }

    return joinClub(team.id);
  }

  async function signOut() {
    clearAuthFailure();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = {
    session,
    profile,
    authLoading,
    authError,
    authErrorDetail,
    setAuthError: (message) => {
      if (!message) {
        clearAuthFailure();
        return;
      }
      setAuthError(message);
    },
    clearAuthFailure,
    signIn,
    signUp,
    signOut,
    joinClub,
    leaveClub,
    joinClubByInviteCode,
    retryProfile: async () => {
      if (!session?.user) return;
      clearAuthFailure();
      try {
        await loadProfile(session.user);
      } catch (err) {
        applyAuthFailure(err, AUTH_ERROR_STAGE.PROFILE, 'retryProfile');
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
