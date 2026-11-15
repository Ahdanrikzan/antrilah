import { useState } from 'react';
import { Button, Icon, Panel, Skeleton, StatusPill } from '../components/ui';
import { BrandLogo } from '../components/BrandLogo';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { db, getSettings, type Ticket } from '../lib/db';
import { dayKey, setStatus } from '../lib/queue';
import { useCopy, useNow, useQuery } from '../lib/hooks';
import { cx, formatClock, humanWait, minutesBetween, ticketUrl } from '../lib/utils';

const STEPS = ['Issued', 'In the queue', 'Your turn', 'Served'];

export default function Track({ id }: { id: string }) {
  const now = useNow(1000);
  const toast = useToast();
  const settings = useQuery(() => getSettings(), []);
  const result = useQuery<{ ticket: Ticket | null }>(
    async () => ({ ticket: (await db.tickets.get(id)) ?? null }),
    [id],
  );
  const ticket = result?.ticket ?? null;
  const ticketDay = ticket?.dayKey ?? dayKey();
  const today = useQuery(() => db.tickets.where('dayKey').equals(ticketDay).toArray(), [ticketDay]);
  const [copied, copy] = useCopy();
  const [confirming, setConfirming] = useState(false);
  const avgMinutes = settings?.avgServiceMinutes ?? 6;

  if (result === undefined) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="border-b-3 border-ink">
          <div className="mx-auto flex h-14 max-w-2xl items-center px-4 sm:h-16 sm:px-6">
            <BrandLogo settings={settings} compact />
          </div>
        </header>
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 sm:py-10" aria-busy="true">
          <span className="sr-only">Loading your ticket…</span>
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-4">
        <Panel className="max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-3 border-ink bg-yellow">
            <Icon name="ticket" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black uppercase leading-tight">Ticket not found</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/60">
            This ticket is not stored on this device. If the queue was cleared, take a fresh number.
          </p>
          <Button href="#/join" className="mt-5">
            Take a number
          </Button>
        </Panel>
      </div>
    );
  }

  const queue = (today ?? []).filter((row) => row.dayKey === ticket.dayKey);
  const waitingAhead = queue.filter((row) => row.status === 'waiting' && row.seq < ticket.seq).length;
  const waitingTotal = queue.filter((row) => row.status === 'waiting').length;
  const position = ticket.status === 'waiting' ? waitingAhead + 1 : 0;
  const etaMinutes = waitingAhead * avgMinutes;
  const isClosed = ticket.status === 'done' || ticket.status === 'skipped' || ticket.status === 'cancelled';
  const done = ticket.status === 'done';
  const stepIndex = done ? 3 : ticket.status === 'serving' ? 2 : 1;
  const progress = done ? 100 : ticket.status === 'serving' ? 78 : Math.max(10, 55 - waitingAhead * 9);

  const headline = done
    ? 'All done — thank you'
    : ticket.status === 'serving'
      ? 'It’s your turn'
      : ticket.status === 'skipped'
        ? 'You missed your call'
        : ticket.status === 'cancelled'
          ? 'Ticket cancelled'
          : waitingAhead === 0
            ? 'You’re next in line'
            : `You’re #${position} in line`;

  const subline = done
    ? 'Your ticket has been closed. Thanks for waiting — take another number any time.'
    : ticket.status === 'serving'
      ? `Head to the ${settings?.serviceLabel?.toLowerCase() ?? 'counter'} and show ticket ${ticket.code}.`
      : ticket.status === 'skipped'
        ? 'Ask the desk to put you back in line, or take a new number below.'
        : ticket.status === 'cancelled'
          ? 'This ticket was cancelled. Take a new number whenever you are ready.'
          : waitingAhead === 0
            ? 'You are first in line — stay nearby, staff will call your number next.'
            : `About ${humanWait(etaMinutes)} to go. This page updates itself as the line moves.`;

  const heroTone = done
    ? 'bg-blue text-cream'
    : ticket.status === 'serving'
      ? 'bg-lime'
      : ticket.status === 'skipped'
        ? 'bg-orange'
        : ticket.status === 'cancelled'
          ? 'bg-paper'
          : waitingAhead === 0
            ? 'bg-lime'
            : 'bg-yellow';

  const heroIcon = done
    ? 'check'
    : ticket.status === 'serving'
      ? 'bolt'
      : ticket.status === 'skipped'
        ? 'close'
        : ticket.status === 'cancelled'
          ? 'close'
          : 'clock';

  const heroTextTone = done ? 'text-cream/75' : 'text-ink/70';
  const heroMetaTone = done ? 'text-cream/55' : 'text-ink/45';

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="border-b-3 border-ink bg-cream/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <BrandLogo settings={settings} compact />
          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="meta block">{settings?.businessName ?? 'Your ticket'}</span>
              <span className="block font-mono text-xs font-black">{ticket.code}</span>
            </span>
            <Button href="#/join" size="sm" variant="outline">
              New ticket
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="meta">{settings?.businessName ?? 'Antrilah Queue'}</p>
          <StatusPill status={ticket.status} />
        </div>

        <section
          aria-live="polite"
          className={cx('mt-3 rounded-2xl border-3 border-ink p-5 shadow-hard sm:p-6', heroTone)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={cx('meta', heroMetaTone)}>
                {ticket.status === 'waiting' ? 'Your place in line' : 'Ticket status'}
              </p>
              <h1
                className={cx(
                  'mt-1 font-display text-[clamp(1.75rem,6.5vw,2.6rem)] font-black uppercase leading-[0.95] tracking-[-0.02em]',
                  done && 'text-cream',
                )}
              >
                {headline}
              </h1>
              <p className={cx('mt-2 max-w-md text-sm font-medium leading-relaxed', heroTextTone)}>{subline}</p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-3 border-ink bg-paper text-ink">
              <Icon name={heroIcon} className="h-5 w-5" />
            </span>
          </div>
        </section>

        <Panel className="mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b-3 border-ink px-5 py-3">
            <p className="meta">Your number</p>
            <p className="meta">{formatClock(ticket.createdAt)}</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-mono text-[clamp(3.4rem,15vw,5.4rem)] font-black leading-[0.82] tracking-[-0.05em]">
              {ticket.code}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink/70">
              {ticket.name}
              {settings?.serviceLabel ? ` · ${settings.serviceLabel}` : ''}
            </p>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-cream">
              <div
                className={cx(
                  'h-full border-r-2 border-ink transition-all duration-700',
                  done ? 'bg-blue' : ticket.status === 'serving' ? 'bg-lime' : 'bg-yellow',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Panel>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            [
              ticket.status === 'waiting' ? 'Position' : 'Queue',
              ticket.status === 'waiting' ? `#${position}` : isClosed ? '—' : 'Now',
              'bg-paper',
            ],
            ['People ahead', ticket.status === 'waiting' ? String(waitingAhead) : '0', 'bg-paper'],
            [
              ticket.status === 'serving' ? 'Counter' : 'Est. wait',
              ticket.status === 'serving'
                ? settings?.serviceLabel ?? 'Desk'
                : isClosed
                  ? '—'
                  : waitingAhead === 0
                    ? 'Next'
                    : `${etaMinutes}m`,
              'bg-yellow',
            ],
          ].map(([label, value, tone]) => (
            <div key={label} className={cx('rounded-xl border-3 border-ink p-3 shadow-hard-sm', tone)}>
              <p className="meta">{label}</p>
              <p className="mt-1 truncate font-mono text-xl font-black leading-none sm:text-2xl">{value}</p>
            </div>
          ))}
        </div>

        <Panel className="mt-3 p-4 sm:p-5" flat>
          <ol className="flex items-start gap-1">
            {STEPS.map((step, index) => {
              const active = index <= stepIndex && !(ticket.status === 'cancelled' && index > 0);
              return (
                <li key={step} className="flex flex-1 items-start gap-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      className={cx(
                        'grid h-6 w-6 place-items-center rounded-full border-2 border-ink',
                        active ? 'bg-lime text-ink' : 'bg-paper text-ink/25',
                      )}
                    >
                      {active ? <Icon name="check" className="h-3 w-3" /> : <span className="font-mono text-[9px] font-black">{index + 1}</span>}
                    </span>
                    <span
                      className={cx(
                        'text-[9px] font-black uppercase leading-tight tracking-[0.06em]',
                        active ? 'text-ink' : 'text-ink/30',
                      )}
                    >
                      {step}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className={cx('mt-3 h-[3px] flex-1 rounded-full', index < stepIndex ? 'bg-ink' : 'bg-ink/15')}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>

        {!isClosed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(ticketUrl(ticket.id))}>
              <Icon name="link" className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button size="sm" variant="ghost" className="text-ink/45 underline" onClick={() => setConfirming(true)}>
              Leave the queue
            </Button>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/35">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime ring-1 ring-ink" />
              updates automatically
            </span>
          </div>
        )}

        <details className="group mt-3 rounded-xl border-2 border-ink/15 bg-paper/60 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-ink/45">
            Ticket details
            <Icon name="plus" className="h-3.5 w-3.5 transition-transform group-open:rotate-45" />
          </summary>
          <dl className="mt-3 space-y-2 text-xs">
            {[
              ['Issued', formatClock(ticket.createdAt)],
              ['Called', formatClock(ticket.calledAt)],
              ['Average service', `${avgMinutes} min`],
              ['Still waiting', `${waitingTotal} ${waitingTotal === 1 ? 'person' : 'people'}`],
              ['Waited so far', `${minutesBetween(ticket.createdAt, now)} min`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b-2 border-ink/10 pb-2 last:border-0">
                <dt className="meta">{label}</dt>
                <dd className="font-mono text-xs font-black">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-ink/50">
            Keep this tab open (or bookmark the link) to follow your place. Nothing is uploaded — the ticket lives in
            this browser.
          </p>
        </details>

        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-ink/25">
          <a href="#/" className="underline decoration-2 underline-offset-2 hover:text-ink/60">
            About Antrilah
          </a>
          {' · '}
          free &amp; open source
        </p>
      </main>

      <Dialog
        open={confirming}
        title="Leave the queue?"
        tone="pink"
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button
              variant="pink"
              size="sm"
              onClick={async () => {
                try {
                  await setStatus(ticket.id, 'cancelled');
                  setConfirming(false);
                  toast('Ticket cancelled', 'success');
                } catch (error) {
                  console.error(error);
                  toast('Could not cancel — storage may be unavailable', 'error');
                }
              }}
            >
              Yes, cancel it
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Keep my place
            </Button>
          </>
        }
      >
        Your ticket {ticket.code} will be cancelled. You would need a new number to rejoin the line.
      </Dialog>
    </div>
  );
}
