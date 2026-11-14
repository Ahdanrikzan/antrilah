import React from 'react';
import { db } from '../lib/db';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render crash shows a recoverable screen instead of a
 * blank page. Queue data is never touched unless the user explicitly clears it.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Antrilah: unhandled render error', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-cream p-6">
        <div className="w-full max-w-md rounded-2xl border-3 border-ink bg-paper p-7 shadow-hard">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-ink/45">Antrilah</p>
          <h1 className="mt-2 font-display text-2xl font-black uppercase leading-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
            The screen hit an unexpected error. Your queue is stored locally and is very likely intact —
            reloading usually fixes this.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-xl border-3 border-ink bg-yellow px-5 py-3 text-sm font-black uppercase tracking-wide shadow-hard-sm transition-transform hover:-translate-y-0.5"
          >
            Reload the app
          </button>

          <button
            type="button"
            onClick={async () => {
              const confirmed = window.confirm(
                'This permanently deletes every ticket and all settings on this device. Continue?',
              );
              if (!confirmed) return;
              await db.tickets.clear();
              await db.counters.clear();
              await db.settings.clear();
              window.location.reload();
            }}
            className="mt-2 w-full rounded-xl border-2 border-ink/20 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-ink/50 hover:border-ink/40"
          >
            Clear local data and restart
          </button>

          <details className="mt-4 rounded-lg border-2 border-ink/15 bg-cream p-3">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-ink/50">
              Technical detail
            </summary>
            <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-ink/60">
              {error.message}
            </p>
          </details>
        </div>
      </div>
    );
  }
}
