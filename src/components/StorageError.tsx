export function StorageError({ error }: { error: unknown }) {
  const detail = error instanceof Error ? error.message : String(error);

  return (
    <div className="grid min-h-screen place-items-center bg-cream p-6">
      <div className="w-full max-w-md rounded-2xl border-3 border-ink bg-paper p-7 shadow-hard">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-ink/45">Antrilah</p>
        <h1 className="mt-2 font-display text-2xl font-black uppercase leading-tight">
          Local storage is blocked
        </h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
          Antrilah keeps the whole queue in IndexedDB on this device. The browser refused to open the
          database, so the queue cannot start.
        </p>
        <ul className="mt-4 space-y-1.5 text-xs font-semibold text-ink/60">
          <li>• Leave private / incognito mode and reload</li>
          <li>• Allow site data for this address</li>
          <li>• Check that the device has free disk space</li>
        </ul>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 w-full rounded-xl border-3 border-ink bg-yellow px-5 py-3 text-sm font-black uppercase tracking-wide shadow-hard-sm transition-transform hover:-translate-y-0.5"
        >
          Try again
        </button>
        <details className="mt-4 rounded-lg border-2 border-ink/15 bg-cream p-3">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-ink/50">
            Technical detail
          </summary>
          <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-ink/60">{detail}</p>
        </details>
      </div>
    </div>
  );
}
