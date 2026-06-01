import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TEAM_ID,
  MATCH_STATUS,
  ROLES,
  RSVP_STATUS,
} from '../mockData';
import { getDefaultTabForRole, useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const AppContext = createContext(null);

const DEFAULT_FIELDS = [
  { id: 1, number: 3, rainout: false },
  { id: 2, number: 5, rainout: false },
  { id: 3, number: 7, rainout: true },
];

export function AppProvider({ children }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [standings] = useState([]);
  const [matchResults] = useState([]);

  const actingUser = profile ?? {
    id: 0,
    name: 'Guest',
    email: '',
    role: ROLES.PLAYER,
    team_id: DEFAULT_TEAM_ID,
  };

  const activeRole = actingUser.role;
  const myTeamId = actingUser.team_id ?? null;

  useEffect(() => {
    if (profile?.id) {
      setActiveTab(getDefaultTabForRole(profile.role));
    }
  }, [profile?.id, profile?.role]);

  const nextMatch = useMemo(() => {
    const now = new Date();
    const teamMatches = matches
      .filter((m) => {
        const isUpcoming = new Date(m.match_date) >= now;
        if (activeRole === ROLES.ORGANIZER) return isUpcoming;
        return (
          isUpcoming &&
          myTeamId != null &&
          (m.home_team_id === myTeamId || m.away_team_id === myTeamId)
        );
      })
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    return teamMatches[0] ?? null;
  }, [matches, myTeamId, activeRole]);

  const teamPlayers = useMemo(() => {
    if (activeRole === ROLES.ORGANIZER) {
      return users.filter((u) => u.role === ROLES.PLAYER);
    }
    return users.filter(
      (u) => u.team_id === myTeamId && u.role === ROLES.PLAYER
    );
  }, [users, myTeamId, activeRole]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [teamsRes, usersRes, matchesRes, rsvpsRes, messagesRes] = await Promise.all([
      supabase.from('teams').select('*').order('id'),
      supabase.from('users').select('*').order('id'),
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('rsvps').select('*'),
      supabase.from('messages').select('*').order('id', { ascending: true }),
    ]);

    const errors = [
      teamsRes.error && `teams: ${teamsRes.error.message}`,
      usersRes.error && `users: ${usersRes.error.message}`,
      matchesRes.error && `matches: ${matchesRes.error.message}`,
      rsvpsRes.error && `rsvps: ${rsvpsRes.error.message}`,
      messagesRes.error && `messages: ${messagesRes.error.message}`,
    ].filter(Boolean);

    if (errors.length) {
      const hint = errors.some((e) => e.includes('permission') || e.includes('42501'))
        ? ' Sign in and run supabase/rls-policies-production.sql in the Supabase SQL Editor.'
        : errors.some((e) => e.includes('PGRST125') || e.includes('Invalid path'))
          ? ' Check VITE_SUPABASE_URL — it must be https://YOUR-REF.supabase.co (no /rest/v1, no dashboard link).'
          : errors.some((e) => e.includes('PGRST205'))
            ? ' A table is missing — re-run the schema SQL in Supabase.'
            : '';
      setError(`${errors.join(' · ')}.${hint}`);
      setLoading(false);
      return;
    }

    setTeams(teamsRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setMatches(matchesRes.data ?? []);
    setRsvps(rsvpsRes.data ?? []);
    setMessages(messagesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile) fetchAll();
  }, [profile, fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('touchline-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRsvps((prev) => {
              if (prev.some((r) => r.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setRsvps((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setRsvps((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateRsvp(matchId, userId, status) {
    const existing = rsvps.find((r) => r.match_id === matchId && r.user_id === userId);

    if (existing) {
      setRsvps((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, status } : r))
      );
      const { error: updateError } = await supabase
        .from('rsvps')
        .update({ status })
        .eq('id', existing.id);

      if (updateError) {
        setRsvps((prev) =>
          prev.map((r) => (r.id === existing.id ? existing : r))
        );
        console.error('RSVP update failed:', updateError.message);
      }
      return;
    }

    const optimistic = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      user_id: userId,
      status,
    };
    setRsvps((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('rsvps')
      .insert({ match_id: matchId, user_id: userId, status })
      .select()
      .single();

    if (insertError) {
      setRsvps((prev) => prev.filter((r) => r.id !== optimistic.id));
      console.error('RSVP insert failed:', insertError.message);
      return;
    }

    setRsvps((prev) =>
      prev.map((r) => (r.id === optimistic.id ? data : r))
    );
  }

  function getRsvpForUser(matchId, userId) {
    return (
      rsvps.find((r) => r.match_id === matchId && r.user_id === userId)?.status ??
      RSVP_STATUS.NO_RESPONSE
    );
  }

  function getRsvpsForMatch(matchId) {
    return rsvps.filter((r) => r.match_id === matchId);
  }

  async function sendMessage(text, senderName = actingUser.name) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timestamp = new Date().toISOString();
    const optimistic = {
      id: `temp-${Date.now()}`,
      text: trimmed,
      sender_name: senderName,
      timestamp,
    };

    setMessages((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        text: trimmed,
        sender_name: senderName,
        timestamp,
      })
      .select()
      .single();

    if (insertError) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      console.error('Message insert failed:', insertError.message);
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== optimistic.id);
      if (withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
      return [...withoutTemp, data];
    });
  }

  async function postponeMatch(matchId) {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.status === MATCH_STATUS.POSTPONED) return;

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, status: MATCH_STATUS.POSTPONED } : m
      )
    );

    const { error: matchError } = await supabase
      .from('matches')
      .update({ status: MATCH_STATUS.POSTPONED })
      .eq('id', matchId);

    if (matchError) {
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? match : m))
      );
      console.error('Postpone match failed:', matchError.message);
      return;
    }

    await sendMessage(
      `⚠️ Match on Field ${match.field_number} has been POSTPONED due to league scheduling. We'll share a new date soon.`,
      'League Office'
    );
  }

  function toggleFieldRainout(fieldNumber) {
    setFields((prev) =>
      prev.map((f) =>
        f.number === fieldNumber ? { ...f, rainout: !f.rainout } : f
      )
    );
  }

  async function nudgePlayer(userId) {
    const player = users.find((u) => u.id === userId);
    if (!player || !nextMatch) return;

    await sendMessage(
      `@${player.name.split(' ')[0]} — please RSVP for our upcoming match!`
    );
  }

  async function addPlayer(name, email) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || myTeamId == null) return;

    const { data, error: insertError } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        email: trimmedEmail,
        role: ROLES.PLAYER,
        team_id: myTeamId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Add player failed:', insertError.message);
      return;
    }

    setUsers((prev) => [...prev, data]);
  }

  async function removePlayer(userId) {
    const removedUser = users.find((u) => u.id === userId);
    const removedRsvps = rsvps.filter((r) => r.user_id === userId);

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setRsvps((prev) => prev.filter((r) => r.user_id !== userId));

    const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);

    if (deleteError) {
      if (removedUser) setUsers((prev) => [...prev, removedUser]);
      setRsvps((prev) => [...prev, ...removedRsvps]);
      console.error('Remove player failed:', deleteError.message);
    }
  }

  async function createMatch({ homeTeamId, awayTeamId, matchDate, fieldNumber }) {
    const homeTeam = teams.find((t) => t.id === homeTeamId);
    const awayTeam = teams.find((t) => t.id === awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: matchDate,
        field_number: Number(fieldNumber),
        status: MATCH_STATUS.SCHEDULED,
        assigned_home_kit: homeTeam.primary_kit_color,
        assigned_away_kit: awayTeam.away_kit_color,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create match failed:', insertError.message);
      return;
    }

    setMatches((prev) =>
      [...prev, data].sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
    );
  }

  const value = {
    activeRole,
    activeTab,
    setActiveTab,
    loading,
    error,
    refetch: fetchAll,
    actingUser,
    users,
    teams,
    matches,
    rsvps,
    messages,
    fields,
    standings,
    matchResults,
    nextMatch,
    teamPlayers,
    myTeamId,
    updateRsvp,
    getRsvpForUser,
    getRsvpsForMatch,
    sendMessage,
    postponeMatch,
    toggleFieldRainout,
    nudgePlayer,
    addPlayer,
    removePlayer,
    createMatch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
