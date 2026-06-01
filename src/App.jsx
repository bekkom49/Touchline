import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Team from './components/Team';
import Schedule from './components/Schedule';

function LoadingScreen({ label = 'Loading Touchline…' }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <p className="text-sm font-medium text-slate-300">{label}</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-3xl">⚠️</p>
      <div>
        <p className="text-sm font-semibold text-white">Could not load data</p>
        <p className="mt-1 text-xs text-slate-400">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="btn-interactive rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
      >
        Retry
      </button>
    </div>
  );
}

function AppContent() {
  const { activeTab, loading, error, refetch } = useApp();

  if (loading) {
    return (
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950">
        <LoadingScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950">
        <ErrorScreen message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950 shadow-2xl shadow-black/40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-600/8 to-transparent"
        aria-hidden
      />

      <Header />

      <main className="relative min-h-0 flex-1 overflow-hidden pb-[4.75rem]">
        <div key={activeTab} className="animate-tab-in h-full">
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto overscroll-contain">
              <Dashboard />
            </div>
          )}
          {activeTab === 'team' && <Team />}
          {activeTab === 'schedule' && (
            <div className="h-full overflow-y-auto overscroll-contain">
              <Schedule />
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function AuthenticatedApp() {
  const { session, profile, authLoading, authError, signOut, retryProfile } = useAuth();

  if (authLoading) {
    return (
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950">
        <LoadingScreen label="Checking session…" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!profile) {
    return (
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-slate-950 px-6">
        <ErrorScreen
          message={
            authError ??
            'Your account is signed in but no profile was found. This can happen if RLS blocks profile reads — re-run supabase/rls-policies-production.sql, then retry.'
          }
          onRetry={retryProfile}
        />
        <button
          type="button"
          onClick={signOut}
          className="btn-interactive mx-auto mb-8 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
