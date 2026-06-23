/**
 * Auth error classification for login/signup UI and logging.
 */

export const AUTH_ERROR_STAGE = {
  AUTH: 'auth',
  SESSION: 'session',
  PROFILE: 'profile',
  NETWORK: 'network',
  STORAGE: 'storage',
  UNKNOWN: 'unknown',
};

export function classifyAuthError(error, stage = AUTH_ERROR_STAGE.UNKNOWN) {
  const message = error?.message ?? String(error ?? 'Unknown error');
  const code = error?.code ?? error?.status ?? null;

  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return {
      stage: AUTH_ERROR_STAGE.NETWORK,
      code,
      title: 'Network error',
      message:
        'Could not reach the server. Check your connection (Wi‑Fi or cellular) and try again.',
      raw: message,
    };
  }

  if (/invalid login credentials|invalid email or password/i.test(message)) {
    return {
      stage: AUTH_ERROR_STAGE.AUTH,
      code,
      title: 'Invalid credentials',
      message: 'Email or password is incorrect. Check for typos and try again.',
      raw: message,
    };
  }

  if (/email not confirmed|confirm your email/i.test(message)) {
    return {
      stage: AUTH_ERROR_STAGE.AUTH,
      code,
      title: 'Email not confirmed',
      message:
        'Confirm your email from the signup message, then sign in again. In Supabase you can disable email confirmation for testing.',
      raw: message,
    };
  }

  if (stage === AUTH_ERROR_STAGE.STORAGE) {
    return {
      stage: AUTH_ERROR_STAGE.STORAGE,
      code,
      title: 'Session storage blocked',
      message:
        'This browser blocked saving your session (common in Private Browsing). Turn off private mode or allow site data, then try again.',
      raw: message,
    };
  }

  if (stage === AUTH_ERROR_STAGE.SESSION) {
    return {
      stage: AUTH_ERROR_STAGE.SESSION,
      code,
      title: 'Session failed to start',
      message:
        'Sign-in succeeded but the session could not be saved. Close other tabs, disable private browsing, and try again.',
      raw: message,
    };
  }

  if (stage === AUTH_ERROR_STAGE.PROFILE) {
    return {
      stage: AUTH_ERROR_STAGE.PROFILE,
      code,
      title: 'Profile not found',
      message:
        'Signed in, but your league profile is missing or blocked. Re-run supabase/new-project-setup.sql or contact your organizer.',
      raw: message,
    };
  }

  return {
    stage,
    code,
    title: 'Sign-in failed',
    message,
    raw: message,
  };
}

export function logAuthFailure(context, details) {
  console.error(`[Touchline Auth] ${context}`, details);
}
