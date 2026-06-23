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

function inferProjectUrlFromJwt(jwt) {
  if (!jwt || !jwt.includes('.')) return null;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const ref = payload?.ref;
    if (ref && /^[a-z0-9-]+$/i.test(ref)) {
      return `https://${ref}.supabase.co`;
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveSupabaseConfig() {
  let url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
  const key = normalizeSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!url || !key) {
    const hint = import.meta.env.PROD
      ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables, then redeploy.'
      : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart npm run dev.';
    throw new Error(`Missing Supabase environment variables. ${hint}`);
  }

  if (
    url.includes('YOUR_SUPABASE_URL_HERE') ||
    key.includes('YOUR_SUPABASE_ANON_KEY_HERE')
  ) {
    throw new Error(
      'Supabase credentials are still placeholders. Update .env with your real Project URL and anon key, then restart npm run dev.'
    );
  }

  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be the anon PUBLIC key (eyJ…), never sb_secret_. Secret keys must not be used in the browser.'
    );
  }

  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);

  if (!validUrl) {
    const inferred = inferProjectUrlFromJwt(key);
    if (inferred) {
      console.warn(
        `[Touchline] Invalid VITE_SUPABASE_URL ("${url}"). Using ${inferred} from your anon key — update .env / Vercel env with the Project URL from Supabase → Settings → API.`
      );
      url = inferred;
    } else if (url.startsWith('sb_publishable_') || url.startsWith('sb_secret_') || url.startsWith('eyJ')) {
      throw new Error(
        'VITE_SUPABASE_URL is wrong — use the Project URL from Supabase → Settings → API (https://YOUR-REF.supabase.co). Put the anon public key in VITE_SUPABASE_ANON_KEY only.'
      );
    } else {
      throw new Error(
        `VITE_SUPABASE_URL must be https://YOUR-REF.supabase.co (got: ${url}). Copy it from Supabase → Settings → API.`
      );
    }
  }

  return { url, key };
}

const { url: supabaseUrl, key: supabaseAnonKey } = resolveSupabaseConfig();

const AUTH_PERSIST_PREF_KEY = 'touchline-stay-signed-in';

function canUseStorage(storage) {
  if (!storage) return false;
  try {
    const probe = '__touchline_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const storageAvailability = {
  local: typeof window !== 'undefined' && canUseStorage(window.localStorage),
  session: typeof window !== 'undefined' && canUseStorage(window.sessionStorage),
};

const memoryStore = new Map();

export function getAuthStorageDiagnostics() {
  return {
    localStorage: storageAvailability.local,
    sessionStorage: storageAvailability.session,
    usingMemoryFallback: !storageAvailability.local && !storageAvailability.session,
    origin: typeof window !== 'undefined' ? window.location.origin : null,
    staySignedIn: getAuthPersistencePreference(),
  };
}

export function getAuthPersistencePreference() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(AUTH_PERSIST_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}

let persistentSession = getAuthPersistencePreference();

function getPrimaryStorage() {
  if (typeof window === 'undefined') return null;
  if (persistentSession && storageAvailability.local) return window.localStorage;
  if (storageAvailability.session) return window.sessionStorage;
  if (storageAvailability.local) return window.localStorage;
  return null;
}

function readFromAllStorages(key) {
  if (typeof window !== 'undefined') {
    if (storageAvailability.local) {
      try {
        const value = window.localStorage.getItem(key);
        if (value != null) return value;
      } catch (err) {
        console.warn('[Touchline Auth] localStorage read failed:', err);
      }
    }
    if (storageAvailability.session) {
      try {
        const value = window.sessionStorage.getItem(key);
        if (value != null) return value;
      } catch (err) {
        console.warn('[Touchline Auth] sessionStorage read failed:', err);
      }
    }
  }

  return memoryStore.get(key) ?? null;
}

function writeToStorages(key, value) {
  const primary = getPrimaryStorage();
  let wrote = false;

  if (primary) {
    try {
      primary.setItem(key, value);
      wrote = true;
    } catch (err) {
      console.error('[Touchline Auth] primary storage write failed:', err);
    }
  }

  if (persistentSession && storageAvailability.local && primary !== window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      wrote = true;
    } catch (err) {
      console.warn('[Touchline Auth] localStorage mirror write failed:', err);
    }
  }

  memoryStore.set(key, value);
  return wrote;
}

function removeFromAllStorages(key) {
  memoryStore.delete(key);
  if (typeof window === 'undefined') return;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

const authStorage = {
  getItem(key) {
    return readFromAllStorages(key);
  },
  setItem(key, value) {
    writeToStorages(key, value);
  },
  removeItem(key) {
    removeFromAllStorages(key);
  },
};

export function setAuthPersistence(staySignedIn) {
  persistentSession = staySignedIn;
  if (typeof window !== 'undefined' && storageAvailability.local) {
    try {
      localStorage.setItem(AUTH_PERSIST_PREF_KEY, staySignedIn ? 'true' : 'false');
    } catch (err) {
      console.warn('[Touchline Auth] could not save stay-signed-in preference:', err);
    }
  }
}

function getAuthStorageKey() {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

export function clearStoredAuthSession() {
  removeFromAllStorages(getAuthStorageKey());
}

export async function verifyAuthSessionPersisted(supabaseClient) {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    return { ok: false, error, session: null };
  }
  if (!data.session) {
    return {
      ok: false,
      error: new Error('Session was not saved after sign-in.'),
      session: null,
    };
  }
  return { ok: true, error: null, session: data.session };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    storageKey: getAuthStorageKey(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export function formatSupabaseNetworkError(message, url = supabaseUrl) {
  if (!message || !/failed to fetch|network error|fetch failed|networkrequestfailed/i.test(message)) {
    return message;
  }

  let host = 'your-project.supabase.co';
  try {
    host = new URL(url).hostname;
  } catch {
    // keep default
  }

  return `Cannot reach Supabase (${host}). Check Wi‑Fi or cellular data. If this only fails on mobile, confirm you are opening the same app URL as on desktop (not a stale bookmark).`;
}

export { normalizeSupabaseKey, normalizeSupabaseUrl, supabaseUrl };
