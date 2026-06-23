import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function showBootError(message) {
  const root = document.getElementById('root');
  if (!root) return;
  const safe = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#020617;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;">
      <div style="max-width:28rem;text-align:center;">
        <p style="font-size:2rem;margin:0 0 12px;">⚠️</p>
        <p style="font-weight:700;color:#fff;margin:0 0 8px;">Touchline could not start</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.5;margin:0;">${safe}</p>
      </div>
    </div>
  `;
}

function checkBuildEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

  if (!key) {
    return import.meta.env.PROD
      ? 'Missing VITE_SUPABASE_ANON_KEY on this deployment. Vercel → Settings → Environment Variables → add it → Redeploy.'
      : 'Missing VITE_SUPABASE_ANON_KEY in .env';
  }

  if (key.startsWith('sb_secret_')) {
    return 'VITE_SUPABASE_ANON_KEY must be the anon public key (eyJ…), never sb_secret_. The secret key must not be used in the browser.';
  }

  if (url.startsWith('sb_secret_') || url.startsWith('sb_publishable_')) {
    return 'VITE_SUPABASE_URL must be https://YOUR-REF.supabase.co (Supabase → Settings → API → Project URL). You pasted an API key in the URL field.';
  }

  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
  const canInfer = key.startsWith('eyJ');

  if (!validUrl && !canInfer) {
    return import.meta.env.PROD
      ? 'Invalid Supabase config on Vercel. Set VITE_SUPABASE_URL to https://etlbtgtaaqqdjuaykvuy.supabase.co and VITE_SUPABASE_ANON_KEY to your eyJ… anon key, then Redeploy.'
      : 'Invalid VITE_SUPABASE_URL in .env — use https://YOUR-REF.supabase.co';
  }

  return null;
}

async function boot() {
  const envError = checkBuildEnv();
  if (envError) {
    showBootError(envError);
    console.error('[Touchline]', envError);
    return;
  }

  try {
    const { default: App } = await import('./App.jsx');

    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    const message =
      error?.message ??
      'The app bundle failed to load. Hard-refresh or clear site data, then try again.';
    showBootError(message);
    console.error('[Touchline] Boot failed:', error);
  }
}

boot();
