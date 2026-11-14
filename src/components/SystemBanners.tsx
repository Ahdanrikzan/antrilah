import { useOnline } from '../lib/hooks';

/** Shown only when the browser has lost its connection — the queue keeps working. */
export function OfflineBadge() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-4 z-[65] flex items-center gap-2 rounded-full border-3 border-ink bg-yellow px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] shadow-hard-sm"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-ink" />
      Offline — queue still works
    </div>
  );
}
