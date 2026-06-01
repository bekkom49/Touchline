export const ROLES = {
  ORGANIZER: 'Organizer',
  CAPTAIN: 'Captain',
  PLAYER: 'Player',
};

export const MATCH_STATUS = {
  SCHEDULED: 'Scheduled',
  POSTPONED: 'Postponed',
};

export const RSVP_STATUS = {
  GOING: 'Going',
  OUT: 'Out',
  NO_RESPONSE: 'No Response',
};

/** Default team for players and captains (Emerald City FC). */
export const DEFAULT_TEAM_ID = 1;

export function getTeamById(teams, teamId) {
  return teams.find((t) => t.id === teamId);
}

export function getUserById(users, userId) {
  return users.find((u) => u.id === userId);
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
