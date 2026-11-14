import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button, EmptyState, Field, Input, Panel, Skeleton, StatCard, Tag, Textarea } from '../components/ui';
import { Dialog } from '../components/Dialog';
import { db, saveSettings, type Settings, type Ticket } from '../lib/db';
import { clearAllTickets, clearToday, dayKey } from '../lib/queue';
import { useCopy, useQuery } from '../lib/hooks';
import { cx, joinUrl, percent } from '../lib/utils';
import { useToast } from '../components/Toast';

function Bars({ values, labels, tone }: { values: number[]; labels: string[]; tone: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1.5">
      {values.map((value, i) => (
        <div key={`${labels[i]}-${i}`} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-[9px] font-black text-ink/50">{value || ''}</span>
          <div
            className={cx('w-full rounded-t-[3px] border-2 border-ink transition-all', tone)}
            style={{ height: `${Math.max(5, (value / max) * 104)}px` }}
            title={`${labels[i]}: ${value}`}
          />
          <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-ink/40">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function InsightsPanel({ today, fallbackService }: { today: Ticket[]; fallbackService: number }) {
  const weekData = useQuery(() => {
    const end = dayKey();
    const start = dayKey(new Date(Date.now() - 6 * 86_400_000));
    return db.tickets.where('dayKey').between(start, end, true, true).toArray();
  }, []);
  const week = weekData ?? [];
  const weekLoading = weekData === undefined;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = dayKey(date);
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2),
      count: week.filter((t) => t.dayKey === key).length,
    };
  });

  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const hourCounts = hours.map((h) => today.filter((t) => new Date(t.createdAt).getHours() === h).length);
  const busiestIndex = hourCounts.indexOf(Math.max(...hourCounts));
  const busiestHour = hourCounts[busiestIndex] > 0 ? `${hours[busiestIndex]}:00` : '—';

  const done = today.filter((t) => t.status === 'done');
  const serviceSamples = done
    .filter((t) => t.calledAt && t.completedAt)
    .map((t) => t.completedAt! - t.calledAt!);
  const avgService = serviceSamples.length
    ? Math.round(serviceSamples.reduce((a, b) => a + b, 0) / serviceSamples.length / 60_000)
    : fallbackService;

  const waitSamples = today.filter((t) => t.calledAt).map((t) => t.calledAt! - t.createdAt);
  const avgWait = waitSamples.length
    ? Math.round(waitSamples.reduce((a, b) => a + b, 0) / waitSamples.length / 60_000)
    : 0;

  const missed = today.filter((t) => t.status === 'skipped' || t.status === 'cancelled').length;
  const noShowRate = percent(missed, Math.max(1, today.length));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Served" value={String(done.length)} sub={`${today.length} tickets issued`} tone="bg-lime" icon="check" />
        <StatCard label="Avg service" value={`${avgService}m`} sub={`${serviceSamples.length} completed tickets`} icon="clock" />
        <StatCard label="Avg wait" value={`${avgWait}m`} sub="from ticket to counter" tone="bg-yellow" icon="users" />
        <StatCard label="No-shows" value={`${noShowRate}%`} sub={`${missed} skipped or cancelled`} tone="bg-orange" icon="close" />
      </div>

      {today.length === 0 && (
        <Panel>
          <EmptyState
            kind="chart"
            title="No numbers yet today"
            copy="Insights fill in as soon as the first ticket is issued. The seven-day chart still shows previous days."
          />
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Tickets · last 7 days</h3>
            <span className="font-mono text-xs font-black text-ink/40">{week.length} total</span>
          </div>
          <div className="mt-5">
            {weekLoading ? (
              <Skeleton className="h-[136px] w-full" />
            ) : (
              <Bars values={days.map((d) => d.count)} labels={days.map((d) => d.label)} tone="bg-blue" />
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Arrivals</h3>
            <span className="rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]">
              Peak {busiestHour}
            </span>
          </div>
          <div className="mt-5">
            <Bars values={hourCounts} labels={hours.map((h) => `${h}`)} tone="bg-pink" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
            Tickets issued per hour, 08:00 – 19:00
          </p>
        </Panel>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4 bg-ink p-5 text-cream">
        <div>
          <h3 className="font-display text-lg font-black uppercase tracking-tight text-yellow">Day at a glance</h3>
          <p className="mt-1 text-xs font-medium text-cream/60">
            Counts cover the selected day. Numbering resets at local midnight.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag tone="lime">{today.filter((t) => t.status === 'waiting').length} waiting</Tag>
          <Tag tone="yellow">{today.filter((t) => t.status === 'serving').length} serving</Tag>
          <Tag tone="paper">{done.length} served</Tag>
          <Tag tone="orange">{missed} missed</Tag>
        </div>
      </Panel>
    </div>
  );
}

export function SharePanel({
  settings,
  onOpenSettings,
}: {
  settings: Settings;
  onOpenSettings: () => void;
}) {
  const url = joinUrl(settings.qrBaseUrl);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [copied, copy] = useCopy();

  useEffect(() => {
    let alive = true;
    setError('');
    QRCode.toDataURL(url, {
      margin: 1,
      width: 720,
      color: { dark: '#111111', light: '#FFFDF7' },
    })
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch((err) => {
        console.error('QR generation failed', err);
        if (alive) setError('Could not render the QR code in this browser.');
      });
    return () => {
      alive = false;
    };
  }, [url]);

  function download() {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr;
    link.download = 'antrilah-queue-qr.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-2xl border-3 border-ink bg-paper p-3 shadow-hard">
          {qr ? (
            <img src={qr} alt={`QR code that opens the join page at ${url}`} className="h-56 w-56" />
          ) : (
            <div className="grid h-56 w-56 place-items-center text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink/40">
              {error || 'Rendering QR…'}
            </div>
          )}
        </div>
        <div className="w-full">
          <Button className="w-full" onClick={download} disabled={!qr}>
            Download PNG
          </Button>
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">
            Generated on this device · no image service
          </p>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel className="p-6">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">QR check-in</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65">
            Print this code and stick it on the counter, the door or the receipt tray. Scanning it opens the
            join screen with this business’s name, live wait and number form ready to go.
          </p>

          <div className="mt-4 rounded-xl border-2 border-ink bg-cream/70 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-ink/45">Join link</p>
            <p className="mt-1 break-all font-mono text-xs font-semibold text-ink/80">{url}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(url)}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onOpenSettings}>
              Change public URL
            </Button>
            <Button size="sm" variant="yellow" href={url} target="_blank" rel="noreferrer">
              Preview ↗
            </Button>
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="font-display text-lg font-black uppercase tracking-tight">Three steps to a paperless line</h3>
          <ol className="mt-4 space-y-3">
            {[
              ['Print the code', 'Any printer, any size from 5 cm up. Keep the white margin so scanners lock on.'],
              ['Put it where people queue', 'Door, desk or table tent — the scan opens the join page instantly.'],
              ['Call numbers from the dashboard', 'Guests watch their own ticket; staff work the queue tab.'],
            ].map(([title, copy], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-mono text-[10px] font-black">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs font-medium leading-relaxed text-ink/55">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        {!settings.qrBaseUrl && (
          <div className="rounded-xl border-3 border-ink bg-violet/40 p-4 text-xs font-semibold leading-relaxed">
            The QR currently points at this browser’s address. Once the app is hosted, set a fixed public URL
            in Settings so printed codes keep working from anywhere.
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onSaved,
}: {
  settings: Settings;
  onSaved: (message: string) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const stored = useQuery(() => db.tickets.count(), []) ?? 0;

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveSettings({
        ...draft,
        avgServiceMinutes: Math.min(180, Math.max(1, Number(draft.avgServiceMinutes) || 5)),
        autoSkipMinutes: Math.min(600, Math.max(0, Number(draft.autoSkipMinutes) || 0)),
        autoCompleteMinutes: Math.min(600, Math.max(0, Number(draft.autoCompleteMinutes) || 0)),
        retentionDays: Math.min(3650, Math.max(0, Number(draft.retentionDays) || 0)),
      });
      onSaved('Business settings saved');
    } catch (error) {
      console.error(error);
      toast('Could not save settings — storage may be unavailable', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSave} className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Panel className="p-6">
        <h3 className="font-display text-xl font-black uppercase tracking-tight">Business settings</h3>
        <p className="mt-1 text-sm font-medium text-ink/60">
          Everything here is stored locally and shapes what customers see.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" className="sm:col-span-2">
            <Input
              value={draft.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              maxLength={60}
              required
            />
          </Field>

          <Field label="Counter / service label">
            <Input
              value={draft.serviceLabel}
              onChange={(e) => update('serviceLabel', e.target.value)}
              maxLength={40}
            />
          </Field>

          <Field label="Queue prefix" hint="A → A-001">
            <Input
              value={draft.prefix}
              onChange={(e) => update('prefix', e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
            />
          </Field>

          <Field label="Average service time" hint="minutes per customer">
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.avgServiceMinutes}
              onChange={(e) => update('avgServiceMinutes', Number(e.target.value))}
            />
          </Field>

          <Field label="Opening hours">
            <Input
              value={draft.openHours}
              onChange={(e) => update('openHours', e.target.value)}
              maxLength={60}
            />
          </Field>

          <Field label="Tagline" className="sm:col-span-2">
            <Input value={draft.tagline} onChange={(e) => update('tagline', e.target.value)} maxLength={120} />
          </Field>

          <Field label="Welcome note on the join page" className="sm:col-span-2">
            <Textarea
              value={draft.welcomeNote}
              onChange={(e) => update('welcomeNote', e.target.value)}
              maxLength={400}
            />
          </Field>

          <Field
            label="Public URL for QR codes"
            hint="optional — leave empty to use this address"
            className="sm:col-span-2"
          >
            <Input
              value={draft.qrBaseUrl}
              onChange={(e) => update('qrBaseUrl', e.target.value)}
              placeholder="https://queue.yourbusiness.com"
              inputMode="url"
            />
          </Field>
        </div>

        <div className="mt-5 rounded-xl border-2 border-ink/20 bg-cream/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/50">Automations</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/55">
            Automatic status updates run while the dashboard tab is open. Zero disables each rule.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Skip stale waiting" hint="min · 0 = off">
              <Input
                type="number"
                min={0}
                max={600}
                value={draft.autoSkipMinutes}
                onChange={(e) => update('autoSkipMinutes', Number(e.target.value))}
              />
            </Field>
            <Field label="Complete serving" hint="min · 0 = off">
              <Input
                type="number"
                min={0}
                max={600}
                value={draft.autoCompleteMinutes}
                onChange={(e) => update('autoCompleteMinutes', Number(e.target.value))}
              />
            </Field>
            <Field label="Keep history" hint="last N days · 0 = forever">
              <Input
                type="number"
                min={0}
                max={3650}
                value={draft.retentionDays}
                onChange={(e) => update('retentionDays', Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDraft(settings)}>
            Reset changes
          </Button>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel className="p-6">
          <h3 className="font-display text-lg font-black uppercase tracking-tight">Where the data lives</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65">
            {stored} ticket{stored === 1 ? '' : 's'} stored in this browser’s IndexedDB. Nothing is uploaded —
            Antrilah has no backend and no analytics.
          </p>
          <div className="mt-4 space-y-2">
            {[
              ['Storage', 'IndexedDB · Dexie'],
              ['Database', 'antrilah'],
              ['Backend', 'none'],
              ['License', 'MIT'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b-2 border-ink/10 pb-2 text-xs">
                <span className="font-bold uppercase tracking-[0.12em] text-ink/45">{k}</span>
                <span className="font-mono font-black">{v}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="border-pink p-6">
          <h3 className="font-display text-lg font-black uppercase tracking-tight">Danger zone</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65">
            Clearing data cannot be undone. Export a backup from the Data tab first.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await clearToday();
                  onSaved('Today’s queue cleared — numbering restarts at 001');
                } catch (error) {
                  console.error(error);
                  toast('Could not clear today’s tickets', 'error');
                }
              }}
            >
              Clear today’s tickets
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-ink/50"
              onClick={() => setConfirmWipe(true)}
            >
              Delete all tickets…
            </Button>
          </div>
        </Panel>

        <div className="rounded-xl border-3 border-ink bg-yellow p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]">Antrilah v1.1.0 · MIT</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-ink/65">
            Free forever. Fork it, host it, change it — no account, key or invoice required.
          </p>
        </div>
      </div>
    </form>

    <Dialog
      open={confirmWipe}
      title="Delete all tickets?"
      tone="pink"
      onClose={() => setConfirmWipe(false)}
      actions={
        <>
          <Button
            type="button"
            size="sm"
            variant="pink"
            onClick={async () => {
              try {
                await clearAllTickets();
                setConfirmWipe(false);
                onSaved('All tickets deleted');
              } catch (error) {
                console.error(error);
                toast('Could not delete the tickets', 'error');
              }
            }}
          >
            Delete everything
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmWipe(false)}>
            Cancel
          </Button>
        </>
      }
    >
      Every ticket on this device — today and all history — will be deleted and numbering restarts at 001.
      Business settings are kept. Export a backup first if you might need the data.
    </Dialog>
    </>
  );
}
