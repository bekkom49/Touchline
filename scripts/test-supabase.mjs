import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl) {
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/i, '');
  return url;
}

function normalizeSupabaseKey(rawKey) {
  return rawKey.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
}

function loadEnv() {
  const env = readFileSync('.env', 'utf8');
  const vars = {};
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = loadEnv();
const url = normalizeSupabaseUrl(VITE_SUPABASE_URL ?? '');
const key = normalizeSupabaseKey(VITE_SUPABASE_ANON_KEY ?? '');

if (!url || !key || url.includes('YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) {
  console.error('FAIL: Update .env with real Supabase credentials.');
  process.exit(1);
}

console.log('Normalized URL host:', new URL(url).host);
console.log('Key length:', key.length);

const supabase = createClient(url, key);

const tables = ['teams', 'users', 'matches', 'rsvps', 'messages'];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.error(`FAIL ${table}:`, error.message, `(code: ${error.code})`);
    if (error.code === '42501' || error.message?.includes('permission')) {
      console.error('  → Run supabase/rls-policies.sql in the Supabase SQL Editor.');
    }
    if (error.code === 'PGRST205') {
      console.error('  → Table missing. Run the schema SQL from the setup instructions.');
    }
  } else {
    console.log(`OK   ${table}:`, `${data?.length ?? 0} row(s) sampled`);
  }
}
