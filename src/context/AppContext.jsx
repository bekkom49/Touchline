import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TEAM_ID,
  MATCH_STATUS,
  ROLES,
  RSVP_STATUS,
  generateInviteCode,
  normalizeRole,
  computeStandings,
  computeMatchResults,
} from '../mockData';
import { getDefaultTabForRole, useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const {
    profile,
    joinClub: authJoinClub,
    leaveClub: authLeaveClub,
    joinClubByInviteCode: authJoinClubByInviteCode,
    retryProfile,
  } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchGoals, setMatchGoals] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [messages, setMessages] = useState([]);

  const standings = useMemo(
    () => computeStandings(teams, matches),
    [teams, matches]
  );

  const matchResults = useMemo(
    () => computeMatchResults(matches),
    [matches]
  );

  const actingUser = profile
    ? { ...profile, role: normalizeRole(profile.role) }
    : {
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

  const clubMembers = useMemo(() => {
    if (myTeamId == null) return [];
    return users.filter(
      (u) =>
        u.team_id === myTeamId &&
        (u.role === ROLES.PLAYER || u.role === ROLES.CAPTAIN)
    );
  }, [users, myTeamId]);

  const globalMessages = useMemo(
    () => messages.filter((m) => m.team_id == null),
    [messages]
  );

  const clubMessages = useMemo(
    () => messages.filter((m) => m.team_id === myTeamId),
    [messages, myTeamId]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [teamsRes, usersRes, matchesRes, goalsRes, rsvpsRes, messagesRes] =
      await Promise.all([
      supabase.from('teams').select('*').order('id'),
      supabase.from('users').select('*').order('id'),
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('match_goals').select('*').order('id'),
      supabase.from('rsvps').select('*'),
      supabase.from('messages').select('*').order('id', { ascending: true }),
    ]);

    const goalsMissingTable =
      goalsRes.error &&
      (goalsRes.error.message.includes('match_goals') ||
        goalsRes.error.message.includes('PGRST205'));

    const errors = [
      teamsRes.error && `teams: ${teamsRes.error.message}`,
      usersRes.error && `users: ${usersRes.error.message}`,
      matchesRes.error && `matches: ${matchesRes.error.message}`,
      goalsRes.error &&
        !goalsMissingTable &&
        `match_goals: ${goalsRes.error.message}`,
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
    setMatchGoals(goalsMissingTable ? [] : goalsRes.data ?? []);
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

  async function sendMessage(text, { senderName = actingUser.name, teamId = null } = {}) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timestamp = new Date().toISOString();
    const optimistic = {
      id: `temp-${Date.now()}`,
      text: trimmed,
      sender_name: senderName,
      timestamp,
      team_id: teamId,
    };

    setMessages((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        text: trimmed,
        sender_name: senderName,
        timestamp,
        team_id: teamId,
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

  async function sendGlobalMessage(text, senderName = actingUser.name) {
    return sendMessage(text, { senderName, teamId: null });
  }

  async function sendClubMessage(text) {
    if (myTeamId == null) return;
    return sendMessage(text, { teamId: myTeamId });
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

    await sendGlobalMessage(
      `⚠️ Match at ${match.field_address?.trim() || 'the scheduled venue'} has been POSTPONED due to league scheduling. We'll share a new date soon.`,
      'League Office'
    );
  }

  async function nudgePlayer(userId) {
    const player = users.find((u) => u.id === userId);
    if (!player || !nextMatch) return;

    await sendClubMessage(
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

  async function createMatch({ homeTeamId, awayTeamId, matchDate, fieldAddress }) {
    const homeTeam = teams.find((t) => t.id === homeTeamId);
    const awayTeam = teams.find((t) => t.id === awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const address = fieldAddress?.trim();
    if (!address) {
      console.error('Create match failed: field address is required.');
      return { ok: false, error: 'Enter the field address.' };
    }

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: matchDate,
        field_number: 1,
        field_address: address,
        status: MATCH_STATUS.SCHEDULED,
        assigned_home_kit: homeTeam.primary_kit_color,
        assigned_away_kit: awayTeam.away_kit_color,
      })
      .select()
      .single();

    if (insertError) {
      const needsMigration = insertError.message.includes('field_address');
      const message = needsMigration
        ? `${insertError.message} — run supabase/match-field-address.sql in Supabase SQL Editor.`
        : insertError.message;
      console.error('Create match failed:', message);
      return { ok: false, error: message };
    }

    setMatches((prev) =>
      [...prev, data].sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
    );
    return { ok: true, match: data };
  }

  async function joinClub(teamId) {
    const result = await authJoinClub(teamId);
    if (result.ok) await fetchAll();
    return result;
  }

  async function leaveClub() {
    const result = await authLeaveClub();
    if (result.ok) await fetchAll();
    return result;
  }

  async function joinClubByInviteCode(code) {
    const result = await authJoinClubByInviteCode(code);
    if (result.ok) await fetchAll();
    return result;
  }

  async function submitMatchResult(matchId, homeScore, awayScore, goalEntries = []) {
    if (activeRole !== ROLES.ORGANIZER) {
      return { ok: false, error: 'Only organizers can record match results.' };
    }

    const home = Number(homeScore);
    const away = Number(awayScore);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      return { ok: false, error: 'Enter valid whole-number scores.' };
    }

    const match = matches.find((m) => m.id === matchId);
    if (!match) {
      return { ok: false, error: 'Match not found.' };
    }

    const homeGoals = goalEntries.filter((g) => g.team_id === match.home_team_id);
    const awayGoals = goalEntries.filter((g) => g.team_id === match.away_team_id);

    if (homeGoals.length !== home || awayGoals.length !== away) {
      return { ok: false, error: 'Enter a scorer for each goal.' };
    }

    for (const goal of goalEntries) {
      if (!goal.scorer_id) {
        return { ok: false, error: 'Select who scored each goal.' };
      }
      if (goal.assist_id && goal.assist_id === goal.scorer_id) {
        return { ok: false, error: 'Scorer and assist must be different players.' };
      }
    }

    const existing = matches.find((m) => m.id === matchId);
    const { data, error } = await supabase
      .from('matches')
      .update({
        home_score: home,
        away_score: away,
        status: MATCH_STATUS.COMPLETED,
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      const needsMigration =
        error.message.includes('home_score') ||
        error.message.includes('match_status');
      return {
        ok: false,
        error: needsMigration
          ? `${error.message} — run supabase/match-scores-and-captain-clubs.sql in Supabase SQL Editor.`
          : error.message,
      };
    }

    const { error: deleteGoalsError } = await supabase
      .from('match_goals')
      .delete()
      .eq('match_id', matchId);

    if (deleteGoalsError) {
      const needsGoalsMigration =
        deleteGoalsError.message.includes('match_goals') ||
        deleteGoalsError.message.includes('PGRST205');
      return {
        ok: false,
        error: needsGoalsMigration
          ? `${deleteGoalsError.message} — run supabase/match-goals.sql in Supabase SQL Editor.`
          : deleteGoalsError.message,
      };
    }

    let savedGoals = [];
    if (goalEntries.length > 0) {
      const rows = goalEntries.map((g) => ({
        match_id: matchId,
        team_id: g.team_id,
        scorer_id: g.scorer_id,
        assist_id: g.assist_id || null,
      }));

      const { data: insertedGoals, error: insertGoalsError } = await supabase
        .from('match_goals')
        .insert(rows)
        .select();

      if (insertGoalsError) {
        return {
          ok: false,
          error: insertGoalsError.message.includes('match_goals')
            ? `${insertGoalsError.message} — run supabase/match-goals.sql in Supabase SQL Editor.`
            : insertGoalsError.message,
        };
      }

      savedGoals = insertedGoals ?? [];
    }

    setMatches((prev) => prev.map((m) => (m.id === matchId ? data : m)));
    setMatchGoals((prev) => [
      ...prev.filter((g) => g.match_id !== matchId),
      ...savedGoals,
    ]);

    return { ok: true, match: data, previous: existing, goals: savedGoals };
  }

  async function createClub({ name, primaryKitColor, awayKitColor }) {
    if (activeRole !== ROLES.CAPTAIN) {
      return { ok: false, error: 'Only captains can create clubs.' };
    }
    if (!actingUser.id) {
      return { ok: false, error: 'You must be signed in to create a club.' };
    }

    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        primary_kit_color: primaryKitColor.trim(),
        away_kit_color: awayKitColor.trim(),
        invite_code: inviteCode,
        created_by: actingUser.id,
      })
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const { error: assignError } = await supabase
      .from('users')
      .update({ team_id: data.id })
      .eq('id', actingUser.id);

    if (assignError) {
      return { ok: false, error: assignError.message };
    }

    setTeams((prev) => [...prev, data].sort((a, b) => a.id - b.id));
    await retryProfile();
    await fetchAll();
    return { ok: true, team: data };
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
    matchGoals,
    rsvps,
    messages,
    globalMessages,
    clubMessages,
    clubMembers,
    standings,
    matchResults,
    nextMatch,
    teamPlayers,
    myTeamId,
    updateRsvp,
    getRsvpForUser,
    getRsvpsForMatch,
    sendMessage,
    sendGlobalMessage,
    sendClubMessage,
    postponeMatch,
    nudgePlayer,
    addPlayer,
    removePlayer,
    createMatch,
    submitMatchResult,
    joinClub,
    leaveClub,
    joinClubByInviteCode,
    createClub,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
