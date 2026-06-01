export const ROLES = {
  ORGANIZER: 'Organizer',
  CAPTAIN: 'Captain',
  PLAYER: 'Player',
};

/** Match role strings from Supabase even if casing differs. */
export function normalizeRole(role) {
  if (!role) return ROLES.PLAYER;
  const value = String(role).trim();
  const match = Object.values(ROLES).find(
    (known) => known.toLowerCase() === value.toLowerCase()
  );
  return match ?? value;
}

export function isPlayerRole(role) {
  return normalizeRole(role) === ROLES.PLAYER;
}

export function isCaptainRole(role) {
  return normalizeRole(role) === ROLES.CAPTAIN;
}

export function isOrganizerRole(role) {
  return normalizeRole(role) === ROLES.ORGANIZER;
}

export const MATCH_STATUS = {
  SCHEDULED: 'Scheduled',
  POSTPONED: 'Postponed',
  COMPLETED: 'Completed',
};

/** Assumed match length when checking if a field is in use right now. */
export const MATCH_DURATION_MS = 90 * 60 * 1000;

export const RSVP_STATUS = {
  GOING: 'Going',
  OUT: 'Out',
  NO_RESPONSE: 'No Response',
};

/** Default team for captains when none chosen at signup. */
export const DEFAULT_TEAM_ID = 1;

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function buildClubInviteLink(inviteCode) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?invite=${encodeURIComponent(inviteCode)}`;
}

export function buildClubInviteEmail(team, inviteCode, recipientEmail = '') {
  const link = buildClubInviteLink(inviteCode);
  const subject = `Join ${team.name} on Touchline`;
  const body = [
    `You've been invited to join ${team.name} on Touchline!`,
    '',
    `Invite code: ${inviteCode}`,
    `Sign up link: ${link}`,
    '',
    'Create a Player account, then enter the code on the Team tab or during sign up.',
  ].join('\n');
  const params = new URLSearchParams({ subject, body });
  return recipientEmail
    ? `mailto:${encodeURIComponent(recipientEmail)}?${params}`
    : `mailto:?${params}`;
}

export function resolveSignupTeamId(role, teamId) {
  if (role === ROLES.ORGANIZER) return null;
  if (role === ROLES.PLAYER) {
    return teamId != null && teamId !== '' ? Number(teamId) : null;
  }
  return teamId != null && teamId !== '' ? Number(teamId) : DEFAULT_TEAM_ID;
}

export function getTeamById(teams, teamId) {
  return teams.find((t) => t.id === teamId);
}

function emptyStanding(teamId) {
  return {
    team_id: teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
  };
}

export function isCompletedMatch(match) {
  if (match.status === MATCH_STATUS.COMPLETED) return true;
  return match.home_score != null && match.away_score != null;
}

/** Build a standings row for every club; update from completed match scores when present. */
export function computeStandings(teams, matches) {
  const table = new Map(teams.map((t) => [t.id, emptyStanding(t.id)]));

  for (const match of matches) {
    if (!isCompletedMatch(match)) continue;

    const home = table.get(match.home_team_id);
    const away = table.get(match.away_team_id);
    if (!home || !away) continue;

    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);

    home.played += 1;
    away.played += 1;
    home.goals_for += homeScore;
    home.goals_against += awayScore;
    away.goals_for += awayScore;
    away.goals_against += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return teams.map((t) => table.get(t.id));
}

export function computeMatchResults(matches) {
  return matches.filter(isCompletedMatch);
}

export function sortStandings(rows, teams) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdB !== gdA) return gdB - gdA;
    const nameA = getTeamById(teams, a.team_id)?.name ?? '';
    const nameB = getTeamById(teams, b.team_id)?.name ?? '';
    return nameA.localeCompare(nameB);
  });
}

export function getUserById(users, userId) {
  return users.find((u) => u.id === userId);
}

export function getTeamSquad(users, teamId) {
  if (teamId == null) return [];
  return users
    .filter(
      (u) =>
        u.team_id === teamId &&
        (normalizeRole(u.role) === ROLES.PLAYER ||
          normalizeRole(u.role) === ROLES.CAPTAIN)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function syncGoalRows(existing, count) {
  const rows = [...(existing ?? [])];
  while (rows.length < count) {
    rows.push({ scorerId: '', assistId: '' });
  }
  while (rows.length > count) {
    rows.pop();
  }
  return rows;
}

export function buildGoalRowsFromDb(match, matchGoals) {
  const homeSaved = matchGoals
    .filter(
      (g) => g.match_id === match.id && g.team_id === match.home_team_id
    )
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      scorerId: String(g.scorer_id),
      assistId: g.assist_id ? String(g.assist_id) : '',
    }));
  const awaySaved = matchGoals
    .filter(
      (g) => g.match_id === match.id && g.team_id === match.away_team_id
    )
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      scorerId: String(g.scorer_id),
      assistId: g.assist_id ? String(g.assist_id) : '',
    }));

  const homeCount = Number(match.home_score) || 0;
  const awayCount = Number(match.away_score) || 0;

  return {
    home: syncGoalRows(homeSaved, homeCount),
    away: syncGoalRows(awaySaved, awayCount),
  };
}

export function formatGoalDetail(goal, users) {
  const scorer = users.find((u) => u.id === goal.scorer_id);
  const assist = goal.assist_id
    ? users.find((u) => u.id === goal.assist_id)
    : null;
  if (assist) {
    return `${scorer?.name ?? 'Unknown'} (assist: ${assist.name})`;
  }
  return scorer?.name ?? 'Unknown';
}

export function getMatchGoals(match, matchGoals) {
  return matchGoals
    .filter((g) => g.match_id === match.id)
    .sort((a, b) => a.id - b.id);
}

export function getMatchGoalsByTeam(match, matchGoals) {
  const goals = getMatchGoals(match, matchGoals);
  return {
    home: goals.filter((g) => g.team_id === match.home_team_id),
    away: goals.filter((g) => g.team_id === match.away_team_id),
  };
}

export function computeMatchPlayerStats(match, matchGoals, users) {
  const goals = getMatchGoals(match, matchGoals);
  const byUser = new Map();

  function bump(userId, field) {
    if (!userId) return;
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const existing = byUser.get(userId) ?? {
      userId,
      name: user.name,
      teamId: user.team_id,
      goals: 0,
      assists: 0,
    };
    existing[field] += 1;
    byUser.set(userId, existing);
  }

  for (const goal of goals) {
    bump(goal.scorer_id, 'goals');
    if (goal.assist_id) bump(goal.assist_id, 'assists');
  }

  return Array.from(byUser.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return a.name.localeCompare(b.name);
  });
}

export function normalizeFieldAddressKey(address) {
  return String(address ?? '').trim().toLowerCase();
}

export function isMatchInProgress(match, now = new Date(), durationMs = MATCH_DURATION_MS) {
  if (match.status === MATCH_STATUS.POSTPONED) return false;
  if (match.status === MATCH_STATUS.COMPLETED) return false;
  const start = new Date(match.match_date);
  const end = new Date(start.getTime() + durationMs);
  return now >= start && now < end;
}

/** Unique field addresses from all matches (case-insensitive dedupe). */
export function getUniqueFieldAddresses(matches) {
  const map = new Map();
  for (const match of matches) {
    const label = match.field_address?.trim();
    if (!label) continue;
    const key = normalizeFieldAddressKey(label);
    map.set(key, label);
  }
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getActiveMatchAtAddress(matches, addressKey, now = new Date()) {
  return matches.find((match) => {
    if (!match.field_address?.trim()) return false;
    if (normalizeFieldAddressKey(match.field_address) !== addressKey) return false;
    return isMatchInProgress(match, now);
  });
}

export function buildFieldLocationStatuses(matches, teams, now = new Date()) {
  return getUniqueFieldAddresses(matches).map(({ key, label }) => {
    const activeMatch = getActiveMatchAtAddress(matches, key, now);
    if (activeMatch) {
      const home = getTeamById(teams, activeMatch.home_team_id);
      const away = getTeamById(teams, activeMatch.away_team_id);
      return {
        key,
        label,
        status: 'in_use',
        activeMatch,
        matchup: `${home?.name ?? 'Home'} vs ${away?.name ?? 'Away'}`,
      };
    }
    return { key, label, status: 'available', activeMatch: null, matchup: null };
  });
}

export function formatMatchVenue(match) {
  return match.field_address?.trim() || 'Venue TBD';
}

export function formatMatchDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMatchTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMessageTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
