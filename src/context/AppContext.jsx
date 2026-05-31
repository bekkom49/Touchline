import { createContext, useContext, useMemo, useState } from 'react';
import {
  CURRENT_USER_ID,
  MATCH_STATUS,
  MY_TEAM_ID,
  ROLES,
  RSVP_STATUS,
  fields as initialFields,
  matchResults as initialMatchResults,
  matches as initialMatches,
  messages as initialMessages,
  rsvps as initialRsvps,
  standings as initialStandings,
  teams as initialTeams,
  users as initialUsers,
  getUserById,
} from '../mockData';

const AppContext = createContext(null);

function getActingUser(activeRole) {
  if (activeRole === ROLES.ORGANIZER) {
    return getUserById(7) ?? initialUsers[0];
  }
  if (activeRole === ROLES.CAPTAIN) {
    return initialUsers.find((u) => u.role === ROLES.CAPTAIN && u.team_id === MY_TEAM_ID) ?? initialUsers[0];
  }
  return getUserById(CURRENT_USER_ID) ?? initialUsers[1];
}

export function AppProvider({ children }) {
  const [activeRole, setActiveRole] = useState(ROLES.PLAYER);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState(initialUsers);
  const [teams] = useState(initialTeams);
  const [matches, setMatches] = useState(initialMatches);
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [messages, setMessages] = useState(initialMessages);
  const [fields, setFields] = useState(initialFields);
  const [standings] = useState(initialStandings);
  const [matchResults] = useState(initialMatchResults);

  const actingUser = useMemo(() => getActingUser(activeRole), [activeRole]);

  const nextMatch = useMemo(() => {
    const teamMatches = matches
      .filter(
        (m) =>
          (m.home_team_id === MY_TEAM_ID || m.away_team_id === MY_TEAM_ID) &&
          new Date(m.match_date) >= new Date('2026-05-30T00:00:00')
      )
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    return teamMatches[0] ?? null;
  }, [matches]);

  const teamPlayers = useMemo(
    () => users.filter((u) => u.team_id === MY_TEAM_ID && u.role === ROLES.PLAYER),
    [users]
  );

  function updateRsvp(matchId, userId, status) {
    setRsvps((prev) => {
      const existing = prev.find((r) => r.match_id === matchId && r.user_id === userId);
      if (existing) {
        return prev.map((r) =>
          r.id === existing.id ? { ...r, status } : r
        );
      }
      return [
        ...prev,
        {
          id: Math.max(0, ...prev.map((r) => r.id)) + 1,
          match_id: matchId,
          user_id: userId,
          status,
        },
      ];
    });
  }

  function getRsvpForUser(matchId, userId) {
    return rsvps.find((r) => r.match_id === matchId && r.user_id === userId)?.status ?? RSVP_STATUS.NO_RESPONSE;
  }

  function getRsvpsForMatch(matchId) {
    return rsvps.filter((r) => r.match_id === matchId);
  }

  function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((m) => m.id)) + 1,
        text: trimmed,
        sender_name: actingUser.name,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function postponeMatch(matchId) {
    setMatches((prev) => {
      const match = prev.find((m) => m.id === matchId);
      if (!match || match.status === MATCH_STATUS.POSTPONED) return prev;

      setMessages((msgPrev) => [
        ...msgPrev,
        {
          id: Math.max(0, ...msgPrev.map((m) => m.id)) + 1,
          text: `⚠️ Match on Field ${match.field_number} has been POSTPONED due to league scheduling. We'll share a new date soon.`,
          sender_name: 'League Office',
          timestamp: new Date().toISOString(),
        },
      ]);

      return prev.map((m) =>
        m.id === matchId ? { ...m, status: MATCH_STATUS.POSTPONED } : m
      );
    });
  }

  function toggleFieldRainout(fieldNumber) {
    setFields((prev) =>
      prev.map((f) =>
        f.number === fieldNumber ? { ...f, rainout: !f.rainout } : f
      )
    );
  }

  function nudgePlayer(userId) {
    const player = users.find((u) => u.id === userId);
    if (!player || !nextMatch) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((m) => m.id)) + 1,
        text: `@${player.name.split(' ')[0]} — please RSVP for our upcoming match!`,
        sender_name: actingUser.name,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function addPlayer(name, email) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;

    setUsers((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((u) => u.id)) + 1,
        name: trimmedName,
        email: trimmedEmail,
        role: ROLES.PLAYER,
        team_id: MY_TEAM_ID,
      },
    ]);
  }

  function removePlayer(userId) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setRsvps((prev) => prev.filter((r) => r.user_id !== userId));
  }

  function createMatch({ homeTeamId, awayTeamId, matchDate, fieldNumber }) {
    const homeTeam = teams.find((t) => t.id === homeTeamId);
    const awayTeam = teams.find((t) => t.id === awayTeamId);
    if (!homeTeam || !awayTeam) return;

    setMatches((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((m) => m.id)) + 1,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: matchDate,
        field_number: Number(fieldNumber),
        status: MATCH_STATUS.SCHEDULED,
        assigned_home_kit: homeTeam.primary_kit_color,
        assigned_away_kit: awayTeam.away_kit_color,
      },
    ]);
  }

  const value = {
    activeRole,
    setActiveRole,
    activeTab,
    setActiveTab,
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
    myTeamId: MY_TEAM_ID,
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
