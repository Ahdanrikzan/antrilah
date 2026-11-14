import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Field, Panel, Skeleton, Tag, Textarea } from '../components/ui';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { db, getSettings, type Settings } from '../lib/db';
import {
  BACKUP_VERSION,
  BackupError,
  backupFilename,
  buildBackup,
  downloadJson,
  estimateStorage,
  importBackup,
  parseBackup,
  type BackupFile,
} from '../lib/backup';
import { purgeOldTickets } from '../lib/queue';
import { useCopy, useQuery } from '../lib/hooks';
import { cx, formatBytes } from '../lib/utils';

export function DataPanel({
  settings,
  onOpenSettings,
}: {
  settings: Settings;
  onOpenSettings: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [pasted, setPasted] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [includeSettings, setIncludeSettings] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [copied, copy] = useCopy();

  const counts = useQuery(
    async () => ({
      tickets: await db.tickets.count(),
      days: ((await db.tickets.orderBy('dayKey').uniqueKeys()) as string[]).length,
    }),
    [],
  );

  useEffect(() => {
    estimateStorage().then(setStorage).catch(() => undefined);
  }, []);

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const [current, tickets] = await Promise.all([getSettings(), db.tickets.toArray()]);
      downloadJson(buildBackup(current, tickets), backupFilename());
      toast(`Backup exported · ${tickets.length} tickets`, 'success');
    } catch (err) {
      console.error('Antrilah: export failed', err);
      setError('Export failed — localStorage or IndexedDB is unavailable.');
      toast('Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      const [current, tickets] = await Promise.all([getSettings(), db.tickets.toArray()]);
      copy(JSON.stringify(buildBackup(current, tickets), null, 2));
      toast('Backup JSON copied to clipboard');
    } catch (err) {
      console.error(err);
      toast('Could not copy the backup', 'error');
    }
  }

  async function handleFile(file: File) {
    setError('');
    try {
      const text = await file.text();
      setPending(parseBackup(text));
    } catch (err) {
      const message = err instanceof BackupError ? err.message : 'That file could not be read.';
      setError(message);
      toast(message, 'error');
    }
  }

  function previewPasted() {
    setError('');
    try {
      const backup = parseBackup(pasted);
      setPending(backup);
    } catch (err) {
      const message = err instanceof BackupError ? err.message : 'That JSON could not be read.';
      setError(message);
      toast(message, 'error');
    }
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const summary = await importBackup(pending, { mode, includeSettings });
      toast(
        `Restored ${summary.added} ticket${summary.added === 1 ? '' : 's'}${
          summary.renumbered ? ` · ${summary.renumbered} renumbered` : ''
        }${summary.skipped ? ` · ${summary.skipped} already present` : ''}`,
        'success',
      );
      setPending(null);
      setPasted('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('Antrilah: import failed', err);
      setError('Import failed while writing to IndexedDB. Your existing data was not removed.');
      toast('Import failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    if (settings.retentionDays <= 0) {
      toast('Set a retention window in Settings first', 'error');
      return;
    }
    setConfirmPurge(false);
    setBusy(true);
    try {
      const removed = await purgeOldTickets(settings.retentionDays);
      toast(
        removed
          ? `Deleted ${removed} ticket${removed === 1 ? '' : 's'} outside the ${settings.retentionDays}-day window`
          : 'Nothing outside the retention window',
        'success',
      );
    } catch (err) {
      console.error(err);
      toast('Cleanup failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  const usagePercent =
    storage && storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight">Export backup</h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink/65">
                One JSON file with every ticket and all business settings. Keep it on a drive, email it to
                yourself, or drop it into another browser to move the queue.
              </p>
            </div>
            <Tag tone="lime">v{BACKUP_VERSION}</Tag>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border-2 border-ink bg-cream/70 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">Tickets</p>
              {counts ? (
                <p className="font-mono text-2xl font-black">{counts.tickets}</p>
              ) : (
                <Skeleton className="mt-1 h-6 w-12" />
              )}
            </div>
            <div className="rounded-xl border-2 border-ink bg-cream/70 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">Days of history</p>
              {counts ? (
                <p className="font-mono text-2xl font-black">{counts.days}</p>
              ) : (
                <Skeleton className="mt-1 h-6 w-12" />
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border-2 border-ink bg-paper p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">Local storage</p>
              <p className="font-mono text-[11px] font-black">
                {storage ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}` : 'measuring…'}
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream">
              <div
                className="h-full border-r-2 border-ink bg-blue transition-all"
                style={{ width: `${Math.max(2, usagePercent)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-ink/45">
              Tickets themselves are small; this is the whole origin’s quota.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleExport} disabled={busy}>
              {busy ? 'Working…' : 'Download JSON backup'}
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={busy}>
              {copied ? 'Copied ✓' : 'Copy JSON'}
            </Button>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
            Filename: antrilah-backup-{new Date().toISOString().slice(0, 10)}.json
          </p>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-xl font-black uppercase tracking-tight">Restore backup</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink/65">
            Import an Antrilah JSON file or paste its contents. Records are validated before anything is
            written, and the numbering cursor is rebuilt so new tickets continue correctly.
          </p>

          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label="Choose a backup file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full cursor-pointer rounded-xl border-3 border-dashed border-ink/40 bg-cream/60 px-3 py-3 text-xs font-semibold file:mr-3 file:rounded-lg file:border-2 file:border-ink file:bg-yellow file:px-3 file:py-1.5 file:text-[10px] file:font-black file:uppercase file:tracking-[0.1em]"
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={mode === 'merge'}
              onClick={() => setMode('merge')}
              className={cx(
                'rounded-xl border-2 border-ink p-3 text-left transition-colors',
                mode === 'merge' ? 'bg-lime' : 'bg-paper hover:bg-cream',
              )}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.12em]">Merge</span>
              <span className="mt-0.5 block text-[11px] font-medium text-ink/60">
                Add missing tickets, keep what is here.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={mode === 'replace'}
              onClick={() => setMode('replace')}
              className={cx(
                'rounded-xl border-2 border-ink p-3 text-left transition-colors',
                mode === 'replace' ? 'bg-pink' : 'bg-paper hover:bg-cream',
              )}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.12em]">Replace all</span>
              <span className="mt-0.5 block text-[11px] font-medium text-ink/70">
                Wipe local tickets, then restore.
              </span>
            </button>
          </div>

          <div className="mt-3">
            <Checkbox
              label="Restore business settings too"
              hint="Name, prefix, hours, automations and QR URL from the backup."
              checked={includeSettings}
              onChange={setIncludeSettings}
            />
          </div>

          <details className="mt-3 rounded-xl border-2 border-ink/20 bg-cream/60 p-3">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-ink/50">
              Paste JSON instead
            </summary>
            <div className="mt-3">
              <Field label="Backup JSON">
                <Textarea
                  value={pasted}
                  onChange={(event) => setPasted(event.target.value)}
                  placeholder='{"format":"antrilah-backup","version":2,…}'
                  className="min-h-[120px] font-mono text-[11px]"
                />
              </Field>
              <Button size="sm" variant="outline" className="mt-2" onClick={previewPasted} disabled={!pasted.trim()}>
                Validate pasted JSON
              </Button>
            </div>
          </details>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border-2 border-ink bg-pink/40 px-3 py-2 text-xs font-semibold">
              {error}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Backup health</h2>
          <ul className="mt-3 space-y-2 text-xs font-medium text-ink/65">
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-ink/40">✱</span>
              Automatic because the data is local: nothing can disappear from a server you do not control.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-ink/40">✱</span>
              Clearing browser data, using a different browser or a private window starts a fresh queue — export
              first.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-ink/40">✱</span>
              Backups never leave the device unless you move the file yourself.
            </li>
          </ul>
          <Button size="sm" variant="outline" className="mt-4" onClick={onOpenSettings}>
            Open settings
          </Button>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">History cleanup</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink/65">
            Retention is set to{' '}
            <strong className="font-black">
              {settings.retentionDays > 0 ? `${settings.retentionDays} days` : 'keep everything'}
            </strong>
            . Deleting old days cannot be undone — export a backup first.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmPurge(true)}
              disabled={busy || settings.retentionDays <= 0}
            >
              Delete tickets older than {settings.retentionDays || '—'}{' '}
              {settings.retentionDays === 1 ? 'day' : 'days'}
            </Button>
            <Tag>{counts?.tickets ?? 0} stored</Tag>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
            Everything above was generated on this device.
          </p>
        </Panel>
      </div>

      <Dialog
        open={confirmPurge}
        title="Delete old history?"
        tone="pink"
        onClose={() => setConfirmPurge(false)}
        actions={
          <>
            <Button size="sm" variant="pink" onClick={handlePurge} disabled={busy}>
              Delete old tickets
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmPurge(false)}>
              Cancel
            </Button>
          </>
        }
      >
        Every ticket older than {settings.retentionDays} {settings.retentionDays === 1 ? 'day' : 'days'} will be
        permanently deleted from this device — the last {settings.retentionDays}{' '}
        {settings.retentionDays === 1 ? 'day is' : 'days are'} kept. Today, current customers and your settings are
        untouched. Export a backup first if you may need the data.
      </Dialog>

      <Dialog
        open={pending !== null}
        title={pending ? `Restore ${pending.tickets.length} tickets?` : 'Restore backup'}
        tone={mode === 'replace' ? 'pink' : 'paper'}
        onClose={() => setPending(null)}
        actions={
          <>
            <Button size="sm" onClick={confirmImport} disabled={busy}>
              {busy ? 'Restoring…' : mode === 'replace' ? 'Replace and restore' : 'Merge into queue'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-2">
            <p>
              <strong className="font-black">{pending.settings.businessName}</strong> · exported{' '}
              {new Date(pending.exportedAt).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <p>
              {pending.tickets.length} tickets across{' '}
              {new Set(pending.tickets.map((ticket) => ticket.dayKey)).size} day(s).
              {mode === 'replace'
                ? ' Every ticket currently on this device will be deleted first.'
                : ' Tickets already on this device are kept.'}
              {includeSettings ? ' Business settings will be overwritten.' : ' Business settings stay as they are.'}
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
