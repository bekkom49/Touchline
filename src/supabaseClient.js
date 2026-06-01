import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  let url = rawUrl.trim().replace(/^["']|["']$/g, '');
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/i, '');

  if (url.includes('supabase.com/dashboard')) {
    throw new Error(
      'Use your Project URL from Supabase Settings → API (https://xxxxx.supabase.co), not the dashboard browser link.'
    );
  }

  return url;
}

function normalizeSupabaseKey(rawKey) {
  if (!rawKey) return rawKey;
  return rawKey.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

const AUTH_PERSIST_PREF_KEY = 'touchline-stay-signed-in';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

if (
  supabaseUrl.includes('YOUR_SUPABASE_URL_HERE') ||
  supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')
) {
  throw new Error(
    'Supabase credentials are still placeholders. Update .env with your real Project URL and anon key, then restart npm run dev.'
  );
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  console.warn(
    `[Touchline] Supabase URL should look like https://your-project-ref.supabase.co (got: ${supabaseUrl})`
  );
}

export function getAuthPersistencePreference() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(AUTH_PERSIST_PREF_KEY) !== 'false';
}

let persistentSession = getAuthPersistencePreference();

function getActiveAuthStorage() {
  if (typeof window === 'undefined') return null;
  return persistentSession ? window.localStorage : window.sessionStorage;
}

const dynamicAuthStorage = {
  getItem(key) {
    return getActiveAuthStorage()?.getItem(key) ?? null;
  },
  setItem(key, value) {
    getActiveAuthStorage()?.setItem(key, value);
  },
  removeItem(key) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

/** Call before sign-in so the session is stored in localStorage or sessionStorage. */
export function setAuthPersistence(staySignedIn) {
  persistentSession = staySignedIn;
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_PERSIST_PREF_KEY, staySignedIn ? 'true' : 'false');
  }
}

function getAuthStorageKey() {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/** Clear saved auth tokens from both storages (e.g. before a new sign-in). */
export function clearStoredAuthSession() {
  const key = getAuthStorageKey();
  dynamicAuthStorage.removeItem(key);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: dynamicAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { normalizeSupabaseKey, normalizeSupabaseUrl };
