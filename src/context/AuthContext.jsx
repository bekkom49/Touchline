import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_TEAM_ID, ROLES } from '../mockData';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

function buildProfilePayload(authUser, { name, role }) {
  const teamId = role === ROLES.ORGANIZER ? null : DEFAULT_TEAM_ID;
  return {
    auth_id: authUser.id,
    name: name.trim(),
    email: authUser.email,
    role,
    team_id: teamId,
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
    const { data, error } = await supabase
      .from('users')
      .insert(
        buildProfilePayload(authUser, {
          name: authUser.user_metadata.name ?? authUser.email.split('@')[0],
          role: authUser.user_metadata.role,
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
          setAuthError(error.message);
          return;
        }

        setSession(data.session);

        if (data.session?.user) {
          try {
            await loadProfile(data.session.user);
          } catch (err) {
            setAuthError(err.message ?? 'Could not load your profile.');
          }
        }
      } catch (err) {
        if (mounted) {
          setAuthError(err.message ?? 'Session check failed.');
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
            setAuthError(err.message ?? 'Could not load your profile.');
            setProfile(null);
          });
        }, 0);
      } else {
        setProfile(null);
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false, role: null };
    }

    const userProfile = await loadProfile(data.user);
    if (!userProfile) {
      setAuthError('Account found, but no profile exists yet. Try signing up again or contact your organizer.');
      return { ok: false, role: null };
    }

    return { ok: true, role: userProfile.role };
  }

  async function signUp({ name, email, password, role }) {
    setAuthError(null);
    const teamId = role === ROLES.ORGANIZER ? null : DEFAULT_TEAM_ID;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          role,
          team_id: teamId,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false, needsEmailConfirm: false, role: null };
    }

    if (data.session?.user) {
      const userProfile = await loadProfile(data.session.user, { name, role });
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

  async function signOut() {
    setAuthError(null);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = {
    session,
    profile,
    authLoading,
    authError,
    setAuthError,
    signIn,
    signUp,
    signOut,
    retryProfile: async () => {
      if (!session?.user) return;
      setAuthError(null);
      await loadProfile(session.user);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
