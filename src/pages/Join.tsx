import { useState } from 'react';
import { Button, Field, Icon, Input, Logo, Panel, Skeleton } from '../components/ui';
import { db, type Ticket } from '../lib/db';
import { getSettings } from '../lib/db';
import { dayKey, issueTicket } from '../lib/queue';
import { navigate, useQuery } from '../lib/hooks';
import { cx } from '../lib/utils';

const LAST_TICKET_KEY = 'antrilah:last-ticket';

export default function Join() {
  const settings = useQuery(() => getSettings(), []);
  const tickets = useQuery(() => db.tickets.where('dayKey').equals(dayKey()).toArray(), []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastTicketId] = useState(() => {
    try {
      return window.localStorage.getItem(LAST_TICKET_KEY);
    } catch {
      return null;
    }
  });
  const previous = useQuery<{ ticket: Ticket | null }>(
    async () => ({ ticket: lastTicketId ? ((await db.tickets.get(lastTicketId)) ?? null) : null }),
    [lastTicketId],
  );

  const today = tickets ?? [];
  const waiting = today.filter((t) => t.status === 'waiting');
  const serving = today.find((t) => t.status === 'serving');
  const avgMinutes = settings?.avgServiceMinutes ?? 6;
  const lineMinutes = Math.max(1, waiting.length * avgMinutes);
  const loading = settings === undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const ticket = await issueTicket({ name, phone });
      try {
        window.localStorage.setItem(LAST_TICKET_KEY, ticket.id);
      } catch {
        /* private mode — the tracking URL still works */
      }
      navigate(`/ticket/${ticket.id}`);
    } catch (err) {
      console.error(err);
      setError('Could not save the ticket on this device. Check that storage is available and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-3 border-ink bg-cream/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Logo />
          <Button href="#/admin" variant="ghost" size="sm" className="text-ink/45">
            <Icon name="settings" className="h-3.5 w-3.5" /> Staff
          </Button>
        </div>
      </header>

      <main id="main-content" className="relative">
        <div className="absolute inset-0 -z-10 bg-dots opacity-50" />
        <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-12">
          {/* Live status, first thing on the screen — even on a small phone. */}
          <section aria-label="Live queue status" className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border-3 border-ink bg-ink p-3 shadow-hard-sm">
              <p className="meta text-cream/50">Now serving</p>
              <p className="mt-1.5 font-mono text-2xl font-black leading-none text-yellow sm:text-3xl">
                {serving?.code ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border-3 border-ink bg-yellow p-3 shadow-hard-sm">
              <p className="meta">Waiting</p>
              <p className="mt-1.5 font-mono text-2xl font-black leading-none sm:text-3xl">{waiting.length}</p>
            </div>
            <div className="rounded-xl border-3 border-ink bg-paper p-3 shadow-hard-sm">
              <p className="meta">Est. wait</p>
              <p className="mt-1.5 font-mono text-2xl font-black leading-none sm:text-3xl">
                {waiting.length ? `${lineMinutes}m` : '0m'}
              </p>
            </div>
          </section>

          <div className="mt-7">
            <p className="meta">
              {settings?.serviceLabel ?? 'Front desk'}
              {settings?.openHours ? ` · ${settings.openHours}` : ''}
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,7vw,3rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
              {loading ? <Skeleton className="h-10 w-64" /> : settings?.businessName ?? 'Antrilah Queue'}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm font-medium leading-relaxed text-ink/65 sm:text-base">
              {settings?.welcomeNote ?? 'Take a number to join the queue. Your ticket updates live on this page.'}
            </p>
          </div>

          {previous?.ticket &&
            (previous.ticket.status === 'waiting' || previous.ticket.status === 'serving') && (
            <a
              href={`#/ticket/${previous.ticket.id}`}
              className="mt-5 flex items-center justify-between gap-3 rounded-xl border-3 border-ink bg-violet/40 px-4 py-3 transition-transform hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-paper">
                  <Icon name="ticket" className="h-4 w-4" />
                </span>
                <span>
                  <span className="meta block">You already hold a ticket</span>
                  <span className="font-mono text-lg font-black leading-none">{previous.ticket.code}</span>
                </span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em]">
                View <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </span>
            </a>
          )}

          <Panel className="mt-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="panel-title">Take a number</h2>
              <span className="rounded-full border-2 border-ink bg-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]">
                Free
              </span>
            </div>

            {loading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Field label="Your name" hint="Required">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Maya Rivera"
                    autoComplete="name"
                    autoCapitalize="words"
                    maxLength={60}
                    required
                  />
                </Field>

                <details className="group rounded-xl border-2 border-ink/15 bg-cream/50 px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-black uppercase tracking-[0.12em] text-ink/55">
                    Add contact
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink/35">
                      optional
                      <Icon name="plus" className="h-3.5 w-3.5 transition-transform group-open:rotate-45" />
                    </span>
                  </summary>
                  <div className="mt-3">
                    <Field label="Phone or email">
                      <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="So staff can reach you"
                        autoComplete="tel"
                        maxLength={32}
                      />
                    </Field>
                  </div>
                </details>

                {error && (
                  <p role="alert" className="rounded-lg border-2 border-ink bg-pink/40 px-3 py-2 text-xs font-semibold">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
                  {busy ? 'Issuing ticket…' : 'Get my number'}
                  {!busy && <Icon name="arrowRight" className="h-4 w-4" />}
                </Button>

                <p className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
                  Next up: {waiting.length + 1} in line · ticket saved on this device
                </p>
              </form>
            )}
          </Panel>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check" className="h-3 w-3" /> No app
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check" className="h-3 w-3" /> No sign-up
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check" className="h-3 w-3" /> Works offline
            </span>
          </div>

          <p className={cx('mt-6 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-ink/25')}>
            <a href="#/" className="underline decoration-2 underline-offset-2 hover:text-ink/60">
              About Antrilah
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
