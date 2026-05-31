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

export const users = [
  { id: 1, name: 'Alex Morgan', email: 'alex@touchline.local', role: ROLES.CAPTAIN, team_id: 1 },
  { id: 2, name: 'Jordan Lee', email: 'jordan@touchline.local', role: ROLES.PLAYER, team_id: 1 },
  { id: 3, name: 'Sam Rivera', email: 'sam@touchline.local', role: ROLES.PLAYER, team_id: 1 },
  { id: 4, name: 'Casey Brooks', email: 'casey@touchline.local', role: ROLES.PLAYER, team_id: 1 },
  { id: 5, name: 'Riley Chen', email: 'riley@touchline.local', role: ROLES.PLAYER, team_id: 1 },
  { id: 6, name: 'Morgan Patel', email: 'morgan@touchline.local', role: ROLES.PLAYER, team_id: 1 },
  { id: 7, name: 'Taylor Kim', email: 'taylor@touchline.local', role: ROLES.ORGANIZER, team_id: null },
];

export const teams = [
  {
    id: 1,
    name: 'Emerald City FC',
    primary_kit_color: 'Emerald Green',
    away_kit_color: 'White',
  },
  {
    id: 2,
    name: 'Harbor United',
    primary_kit_color: 'Navy Blue',
    away_kit_color: 'Sky Blue',
  },
  {
    id: 3,
    name: 'Riverside Rovers',
    primary_kit_color: 'Maroon',
    away_kit_color: 'Gold',
  },
  {
    id: 4,
    name: 'Summit Athletic',
    primary_kit_color: 'Black',
    away_kit_color: 'Orange',
  },
];

export const fields = [
  { id: 1, number: 3, rainout: false },
  { id: 2, number: 5, rainout: false },
  { id: 3, number: 7, rainout: true },
];

export const matches = [
  {
    id: 1,
    home_team_id: 1,
    away_team_id: 2,
    match_date: '2026-06-07T10:00:00',
    field_number: 3,
    status: MATCH_STATUS.SCHEDULED,
    assigned_home_kit: 'Emerald Green',
    assigned_away_kit: 'Sky Blue',
  },
  {
    id: 2,
    home_team_id: 3,
    away_team_id: 1,
    match_date: '2026-06-14T11:30:00',
    field_number: 5,
    status: MATCH_STATUS.SCHEDULED,
    assigned_home_kit: 'Maroon',
    assigned_away_kit: 'White',
  },
];

export const rsvps = [
  { id: 1, match_id: 1, user_id: 2, status: RSVP_STATUS.GOING },
  { id: 2, match_id: 1, user_id: 3, status: RSVP_STATUS.GOING },
  { id: 3, match_id: 1, user_id: 4, status: RSVP_STATUS.OUT },
  { id: 4, match_id: 1, user_id: 5, status: RSVP_STATUS.NO_RESPONSE },
  { id: 5, match_id: 1, user_id: 6, status: RSVP_STATUS.GOING },
  { id: 6, match_id: 2, user_id: 2, status: RSVP_STATUS.NO_RESPONSE },
  { id: 7, match_id: 2, user_id: 3, status: RSVP_STATUS.NO_RESPONSE },
  { id: 8, match_id: 2, user_id: 4, status: RSVP_STATUS.NO_RESPONSE },
  { id: 9, match_id: 2, user_id: 5, status: RSVP_STATUS.NO_RESPONSE },
  { id: 10, match_id: 2, user_id: 6, status: RSVP_STATUS.NO_RESPONSE },
];

export const messages = [
  {
    id: 1,
    text: 'Practice moved to Thursday — same time, Field 5.',
    sender_name: 'Alex Morgan',
    timestamp: '2026-05-28T18:30:00',
  },
  {
    id: 2,
    text: 'Got it, see everyone there!',
    sender_name: 'Jordan Lee',
    timestamp: '2026-05-28T18:45:00',
  },
  {
    id: 3,
    text: 'Harbor United is tough — we need full squad Saturday.',
    sender_name: 'Alex Morgan',
    timestamp: '2026-05-29T09:15:00',
  },
];

export const standings = [
  { team_id: 1, played: 4, won: 3, drawn: 0, lost: 1, goals_for: 11, goals_against: 5, points: 9 },
  { team_id: 2, played: 4, won: 3, drawn: 0, lost: 1, goals_for: 9, goals_against: 6, points: 9 },
  { team_id: 3, played: 4, won: 2, drawn: 1, lost: 1, goals_for: 8, goals_against: 7, points: 7 },
  { team_id: 4, played: 4, won: 0, drawn: 1, lost: 3, goals_for: 3, goals_against: 13, points: 1 },
];

export const matchResults = [
  {
    id: 1,
    home_team_id: 1,
    away_team_id: 4,
    home_score: 4,
    away_score: 0,
    match_date: '2026-05-10T10:00:00',
  },
  {
    id: 2,
    home_team_id: 2,
    away_team_id: 1,
    home_score: 2,
    away_score: 1,
    match_date: '2026-05-17T10:00:00',
  },
  {
    id: 3,
    home_team_id: 1,
    away_team_id: 3,
    home_score: 3,
    away_score: 2,
    match_date: '2026-05-24T11:00:00',
  },
  {
    id: 4,
    home_team_id: 4,
    away_team_id: 2,
    home_score: 1,
    away_score: 3,
    match_date: '2026-05-24T13:00:00',
  },
];

export const MY_TEAM_ID = 1;
export const CURRENT_USER_ID = 2;

export function getTeamById(teamId) {
  return teams.find((t) => t.id === teamId);
}

export function getUserById(userId) {
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
