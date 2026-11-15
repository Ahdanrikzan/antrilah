import { lazy, Suspense, useEffect, useState } from 'react';
import { useHashRoute } from './lib/hooks';
import { applyUpdate, registerServiceWorker } from './lib/pwa';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { OfflineBadge } from './components/SystemBanners';
import Landing from './pages/Landing';
import Join from './pages/Join';
import Track from './pages/Track';

// The dashboard (and the QR encoder it carries) is split out of the landing bundle.
const Admin = lazy(() => import('./pages/Admin'));
const Display = lazy(() => import('./pages/Display'));

const TITLES: Record<string, string> = {
  admin: 'Dashboard · Antrilah',
  join: 'Take a number · Antrilah',
  ticket: 'Your ticket · Antrilah',
  display: 'Queue display · Antrilah',
};

function PageFallback() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b-3 border-ink">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <span className="h-9 w-9 animate-pulse rounded-lg border-3 border-ink bg-yellow" />
          <span className="h-4 w-28 animate-pulse rounded bg-ink/10" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
        <span className="sr-only">Loading the dashboard…</span>
        <div className="h-8 w-52 animate-pulse rounded bg-ink/10" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border-3 border-ink bg-paper" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="h-64 animate-pulse rounded-2xl border-3 border-ink bg-paper" />
          <div className="h-64 animate-pulse rounded-2xl border-3 border-ink bg-paper" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { parts } = useHashRoute();
  const [root, param] = parts;
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => registerServiceWorker(() => setUpdateReady(true)), []);

  useEffect(() => {
    document.title = TITLES[root] ?? 'Antrilah — open-source queue management, free forever';
    if (root === 'admin' || root === 'join' || root === 'ticket' || root === 'display') {
      window.scrollTo({ top: 0 });
    }
  }, [root, param]);

  return (
    <ErrorBoundary>
      <ToastProvider quiet={root === 'display'}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:border-3 focus:border-ink focus:bg-yellow focus:px-4 focus:py-2 focus:text-xs focus:font-black focus:uppercase focus:tracking-[0.12em]"
        >
          Skip to content
        </a>

        {root === 'admin' ? (
          <Suspense fallback={<PageFallback />}>
            <Admin />
          </Suspense>
        ) : root === 'display' ? (
          <Suspense fallback={<PageFallback />}>
            <Display />
          </Suspense>
        ) : root === 'join' ? (
          <Join />
        ) : root === 'ticket' && param ? (
          <Track id={param} />
        ) : (
          <Landing />
        )}

        <OfflineBadge />

        {updateReady && (
          <div
            role="status"
            className="fixed bottom-4 right-4 z-[75] flex items-center gap-2 rounded-xl border-3 border-ink bg-paper p-2 pl-3 shadow-hard-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em]">New version ready</p>
            <button
              type="button"
              onClick={() => void applyUpdate()}
              className="rounded-lg border-2 border-ink bg-lime px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
            >
              Reload
            </button>
            <button
              type="button"
              aria-label="Dismiss update notice"
              onClick={() => setUpdateReady(false)}
              className="px-1 text-xs font-black text-ink/40 hover:text-ink"
            >
              ✕
            </button>
          </div>
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}
