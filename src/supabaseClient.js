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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { normalizeSupabaseKey, normalizeSupabaseUrl };
