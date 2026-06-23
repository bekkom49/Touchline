/**
 * Runs before `vite build` — fails the deploy if Supabase env is missing or swapped.
 * Vercel must define these under Project → Settings → Environment Variables.
 */
import { readFileSync, existsSync } from 'fs';

function loadEnvFile() {
  if (!existsSync('.env')) return {};
  const vars = {};
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

function inferProjectUrlFromJwt(jwt) {
  if (!jwt?.includes('.')) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')
    );
    const ref = payload?.ref;
    if (ref && /^[a-z0-9-]+$/i.test(ref)) return `https://${ref}.supabase.co`;
  } catch {
    // ignore
  }
  return null;
}

const fileEnv = loadEnvFile();
const url = (process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? '').trim();
const key = (process.env.VITE_SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY ?? '').trim();

const errors = [];

if (!key) {
  errors.push('VITE_SUPABASE_ANON_KEY is missing.');
} else if (key.startsWith('sb_secret_')) {
  errors.push(
    'VITE_SUPABASE_ANON_KEY must be the anon PUBLIC key (starts with eyJ…), never sb_secret_ (that is server-only).'
  );
}

if (key.startsWith('sb_secret_')) {
  errors.push('Remove sb_secret_ from the frontend — it must never be in Vite env vars.');
}

const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
const inferred = key.startsWith('eyJ') ? inferProjectUrlFromJwt(key) : null;

if (!validUrl) {
  if (url.startsWith('sb_secret_') || url.startsWith('sb_publishable_')) {
    errors.push(
      `VITE_SUPABASE_URL must be the Project URL (https://YOUR-REF.supabase.co), not "${url.slice(0, 20)}…".`
    );
  } else if (!url && !inferred) {
    errors.push('VITE_SUPABASE_URL is missing and could not be inferred from the anon key.');
  } else if (url && !inferred) {
    errors.push(`VITE_SUPABASE_URL is invalid: "${url}"`);
  }
}

if (errors.length) {
  console.error('\n[Touchline] Supabase environment check FAILED:\n');
  for (const err of errors) console.error(`  • ${err}`);
  console.error(`
Fix in Vercel → Project → Settings → Environment Variables:
  VITE_SUPABASE_URL      = https://YOUR-REF.supabase.co   (Project URL)
  VITE_SUPABASE_ANON_KEY = eyJ…                          (anon public key)

Then Redeploy. Local dev: copy .env.example → .env\n`);
  process.exit(1);
}

const resolvedUrl = validUrl ? url : inferred;
console.log(`[Touchline] Supabase env OK → ${resolvedUrl}`);
