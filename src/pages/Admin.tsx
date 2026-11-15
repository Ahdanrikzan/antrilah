import { useEffect, useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  Field,
  Icon,
  Input,
  LiveDot,
  Panel,
  Skeleton,
  SkeletonRows,
  StatCard,
  StatusPill,
  Tabs,
  Tag,
  type TabItem,
} from '../components/ui';
import { BrandLogo } from '../components/BrandLogo';
import { Dialog } from '../components/Dialog';
import { SetupWizard } from '../components/SetupWizard';
import { useToast } from '../components/Toast';
import { db, DEFAULT_SETTINGS, getSettings, saveSettings } from '../lib/db';
import {
  callNext,
  clearToday,
  dayKey,
  formatCode,
  issueTicket,
  listDays,
  recallTicket,
  runHousekeeping,
  seedDemoQueue,
  setStatus,
  type DaySummary,
} from '../lib/queue';
import { useLocalFlag, useNow, useQuery } from '../lib/hooks';
import { cx, formatClock, humanWait, labelDayKey, minutesBetween, percent, waitLabel } from '../lib/utils';
import { InsightsPanel, SettingsPanel, SharePanel } from './AdminPanels';
import { CustomersPanel } from './CustomersPanel';
import { DataPanel } from './DataPanel';
import { ensureDailySnapshot } from '../lib/snapshots';
import { playSound } from '../lib/sound';

type Tab = 'queue' | 'customers' | 'insights' | 'data' | 'share' | 'settings';

const TABS: Array<TabItem<Tab>> = [
  { id: 'queue', label: 'Queue', icon: 'queue' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'data', label: 'Data', icon: 'data' },
  { id: 'share', label: 'QR', icon: 'qr' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function waitTone(minutes: number, average: number): string {
  if (minutes >= average * 2.5) return 'bg-pink';
  if (minutes >= average) return 'bg-yellow';
  return 'bg-lime';
}

function DayStrip({
  days,
  active,
  onSelect,
}: {
  days: DaySummary[] | undefined;
  active: string;
  onSelect: (key: string) => void;
}) {
  if (!days) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-12 w-28 rounded-xl" />
        <Skeleton className="h-12 w-24 rounded-xl" />
        <Skeleton className="h-12 w-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <p className="meta mb-2 flex items-center gap-1.5">
        <Icon name="history" className="h-3 w-3" /> History
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {days.map((day) => {
          const isActive = day.dayKey === active;
          return (
            <button
              key={day.dayKey}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelect(day.dayKey)}
              className={cx(
                'shrink-0 rounded-xl border-2 border-ink px-3 py-2 text-left transition-all duration-150',
                isActive
                  ? 'bg-ink text-cream shadow-hard-sm'
                  : 'bg-paper hover:-translate-y-0.5 hover:bg-cream',
              )}
            >
              <span className="block text-[10px] font-black uppercase leading-none tracking-[0.12em]">
                {labelDayKey(day.dayKey)}
              </span>
              <span
                className={cx(
                  'mt-1 block font-mono text-sm font-black leading-none',
                  isActive ? 'text-yellow' : 'text-ink/55',
                )}
              >
                {day.done}/{day.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading the queue…</span>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="rounded-2xl border-3 border-ink bg-paper shadow-hard">
            <SkeletonRows rows={3} />
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const today = dayKey();
  const [tab, setTab] = useState<Tab>('queue');
  const [viewDay, setViewDay] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');

  const [onboarded, markOnboarded] = useLocalFlag('antrilah:onboarded');
  const [setupDismissed, dismissSetup] = useLocalFlag('antrilah:setup-dismissed');
  const [shareVisited, markShareVisited] = useLocalFlag('antrilah:share-visited');
  const [showWizard, setShowWizard] = useState(false);
  const onboardingChecked = useRef(false);

  const settings = useQuery(() => getSettings(), []);
  const days = useQuery(() => listDays(12), []);
  const activeDay = viewDay ?? today;
  const isToday = activeDay === today;

  const tickets = useQuery(() => db.tickets.where('dayKey').equals(activeDay).toArray(), [activeDay]);
  const allTickets = useQuery(() => db.tickets.count(), []);
  const activeTickets = (tickets ?? []).slice().sort((a, b) => a.seq - b.seq);

  const now = useNow(1000);
  const waiting = activeTickets.filter((t) => t.status === 'waiting');
  const serving = activeTickets.find((t) => t.status === 'serving') ?? null;
  const served = activeTickets.filter((t) => t.status === 'done');
  const missed = activeTickets.filter((t) => t.status === 'skipped' || t.status === 'cancelled').length;
  const avgServiceMinutes = settings?.avgServiceMinutes ?? 6;

  const waitSamples = activeTickets.filter((t) => t.calledAt).map((t) => minutesBetween(t.createdAt, t.calledAt!));
  const avgWaitToday = waitSamples.length
    ? Math.round(waitSamples.reduce((a, b) => a + b, 0) / waitSamples.length)
    : waiting.length * avgServiceMinutes;

  const serviceSamples = served
    .filter((t) => t.calledAt && t.completedAt)
    .map((t) => minutesBetween(t.calledAt!, t.completedAt!));
  const archivedServiceMinutes = serviceSamples.length
    ? Math.round(serviceSamples.reduce((a, b) => a + b, 0) / serviceSamples.length)
    : 0;

  const loading = settings === undefined || tickets === undefined;
  const nextNumber = `${(settings?.prefix ?? 'A').toUpperCase()}-${String(
    activeTickets.reduce((max, ticket) => Math.max(max, ticket.seq), 0) + 1,
  ).padStart(3, '0')}`;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Keeps one local recovery copy per day, pruned to the newest three.
  useEffect(() => {
    void ensureDailySnapshot().catch((error) => console.error('Antrilah: snapshot failed', error));
  }, []);

  // Visual (and optional audio) alert when someone new joins while staff watch.
  const lastWaiting = useRef<number | null>(null);
  useEffect(() => {
    if (!isToday || loading) {
      lastWaiting.current = null;
      return;
    }
    const count = waiting.length;
    if (lastWaiting.current !== null && count > lastWaiting.current) {
      const added = count - lastWaiting.current;
      toast(`${added} new customer${added === 1 ? '' : 's'} joined the queue`, 'default');
      const current = settingsRef.current;
      if (current?.soundEnabled && current.soundOnJoin) {
        playSound(current.soundName, current.soundVolume);
      }
    }
    lastWaiting.current = count;
  }, [waiting.length, isToday, loading, toast]);

  // Automatic status updates: opt-in rules from Settings run while the dashboard is open.
  useEffect(() => {
    const run = async () => {
      const current = settingsRef.current;
      if (!current) return;
      try {
        const changed = await runHousekeeping(current);
        if (changed > 0) {
          toast(`${changed} ticket${changed === 1 ? '' : 's'} updated automatically`, 'success');
        }
      } catch (error) {
        console.error('Antrilah: housekeeping failed', error);
      }
    };
    void run();
    const id = window.setInterval(run, 30_000);
    return () => window.clearInterval(id);
  }, [toast]);

  // First run: the setup wizard instead of an empty dashboard with no explanation.
  useEffect(() => {
    if (onboardingChecked.current || !settings || !tickets) return;
    onboardingChecked.current = true;
    if (!onboarded) setShowWizard(true);
  }, [settings, tickets, onboarded]);

  function openTab(next: Tab) {
    setTab(next);
    if (next === 'share') markShareVisited();
  }

  async function runAction(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      toast(message, 'success');
    } catch (error) {
      console.error('Antrilah: action failed', error);
      toast('Action failed — local storage may be unavailable', 'error');
    }
  }

  function playCallCue() {
    const current = settingsRef.current;
    if (current?.soundEnabled && current.soundOnCall) playSound(current.soundName, current.soundVolume);
  }

  async function handleCallNext() {
    try {
      const next = await callNext();
      if (next) playCallCue();
      toast(next ? `Now serving ${next.code}` : 'Nobody is waiting right now', next ? 'success' : 'default');
    } catch (error) {
      console.error(error);
      toast('Could not call the next ticket', 'error');
    }
  }

  async function handleAddWalkIn(event: React.FormEvent) {
    event.preventDefault();
    if (!addName.trim()) return;
    try {
      const ticket = await issueTicket({ name: addName, phone: addPhone });
      setAddName('');
      setAddPhone('');
      toast(`${ticket.code} added to the queue`, 'success');
    } catch (error) {
      console.error(error);
      toast('Could not issue a ticket — storage may be unavailable', 'error');
    }
  }

  const stats = isToday
    ? [
        {
          label: 'Waiting',
          value: String(waiting.length).padStart(2, '0'),
          sub: waiting.length ? `~${waiting.length * avgServiceMinutes} min of line` : 'The line is clear',
          tone: 'bg-yellow',
          icon: 'users' as const,
        },
        {
          label: 'Now serving',
          value: serving?.code ?? '—',
          sub: serving ? `${waitLabel(serving.calledAt, now)} at the counter` : 'Nobody called yet',
          tone: 'bg-lime',
          icon: 'bolt' as const,
        },
        {
          label: 'Served',
          value: String(served.length),
          sub: `${activeTickets.length} ticket${activeTickets.length === 1 ? '' : 's'} issued`,
          tone: 'bg-paper',
          icon: 'check' as const,
        },
        {
          label: 'Avg wait',
          value: `${avgWaitToday}m`,
          sub: `${missed} missed · ${settings?.serviceLabel ?? 'front desk'}`,
          tone: 'bg-violet/60',
          icon: 'clock' as const,
        },
      ]
    : [
        {
          label: 'Tickets',
          value: String(activeTickets.length),
          sub: labelDayKey(activeDay),
          tone: 'bg-yellow',
          icon: 'ticket' as const,
        },
        {
          label: 'Served',
          value: String(served.length),
          sub: `${percent(served.length, activeTickets.length)}% completion`,
          tone: 'bg-lime',
          icon: 'check' as const,
        },
        {
          label: 'Missed',
          value: String(missed),
          sub: 'Skipped or cancelled',
          tone: 'bg-paper',
          icon: 'close' as const,
        },
        {
          label: 'Avg service',
          value: `${archivedServiceMinutes}m`,
          sub: 'Called → completed',
          tone: 'bg-violet/60',
          icon: 'clock' as const,
        },
      ];

  const configured = !!settings && settings.businessName !== DEFAULT_SETTINGS.businessName;
  const setupItems = [
    { label: 'Name your business', done: configured, action: () => setShowWizard(true) },
    { label: 'Issue the first ticket', done: (allTickets ?? 0) > 0, action: () => setTab('queue') },
    { label: 'Test the QR check-in', done: shareVisited, action: () => openTab('share') },
  ];
  const setupComplete = setupItems.every((item) => item.done);
  const showSetup = !setupComplete && !setupDismissed && isToday && !loading;

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b-3 border-ink bg-cream/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo settings={settings} compact />
              <div className="min-w-0 border-l-2 border-ink/10 pl-3">
                <p className="truncate font-display text-sm font-black uppercase leading-none tracking-tight">
                  {settings?.businessName ?? 'Antrilah Queue'}
                </p>
                <p className="meta mt-1 truncate">
                  {isToday ? (settings?.openHours ?? 'Staff dashboard') : `Viewing ${labelDayKey(activeDay)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-2.5 py-1 font-mono text-xs font-black tabular-nums lg:inline-flex">
                <Icon name="clock" className="h-3 w-3 opacity-50" />
                {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Button href="#/join" size="sm" variant="outline" className="hidden sm:inline-flex">
                Join page
              </Button>
              <Button
                href="#/display"
                size="sm"
                variant="ghost"
                aria-label="Open the waiting-room display"
                title="Display mode — big numbers for a TV or tablet"
                className="px-2 text-ink/40"
              >
                <Icon name="display" className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Open the setup wizard"
                title="Setup wizard — name, numbering, hours and QR"
                onClick={() => setShowWizard(true)}
                className="px-2 text-ink/40"
              >
                <Icon name="sparkles" className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs
            items={TABS.map((item) =>
              item.id === 'queue' && isToday && waiting.length > 0
                ? { ...item, count: waiting.length }
                : item,
            )}
            value={tab}
            onChange={openTab}
            label="Dashboard sections"
            className="pb-2"
          />
        </div>
      </header>

      <main id="main-content" className={cx('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8', isToday && tab === 'queue' && 'pb-28 lg:pb-8')}>
        {tab === 'queue' && (
          <>
            {loading ? (
              <QueueSkeleton />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="meta flex items-center gap-2">
                      {isToday ? (
                        <>
                          <LiveDot label="Live queue" />
                        </>
                      ) : (
                        'Archived day'
                      )}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                      {isToday ? 'Today at the counter' : labelDayKey(activeDay)}
                    </h1>
                    <p className="mt-1.5 text-xs font-medium text-ink/50">
                      {isToday
                        ? `${waiting.length} waiting · ${served.length} served · ${missed} missed`
                        : `${activeTickets.length} tickets · read only`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isToday && (
                      <Button size="sm" variant="outline" onClick={() => setViewDay(null)}>
                        Back to today
                      </Button>
                    )}
                  </div>
                </div>

                <DayStrip
                  days={days}
                  active={activeDay}
                  onSelect={(key) => setViewDay(key === today ? null : key)}
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat) => (
                    <StatCard
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      sub={stat.sub}
                      tone={stat.tone}
                      icon={stat.icon}
                    />
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
                  <div className="space-y-5">
                    <Panel className="overflow-hidden">
                      <div className="flex items-center justify-between border-b-3 border-ink bg-ink px-5 py-3 text-cream">
                        <span className="meta text-cream/60">At the counter</span>
                        {serving ? (
                          <LiveDot label="Serving" />
                        ) : (
                          <span className="meta text-cream/35">{isToday ? 'Idle' : 'Closed'}</span>
                        )}
                      </div>

                      {serving ? (
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="meta">Now serving</p>
                              <p
                                key={serving.id}
                                aria-live="polite"
                                className="animate-pop font-mono text-[clamp(3.2rem,10vw,4.8rem)] font-black leading-[0.82] tracking-[-0.05em]"
                              >
                                {serving.code}
                              </p>
                              <p className="mt-2 truncate text-base font-bold">{serving.name}</p>
                              <p className="mt-0.5 text-[11px] font-semibold text-ink/50">
                                Called {formatClock(serving.calledAt)} · waited {waitLabel(serving.createdAt, now)}
                                {serving.phone ? ` · ${serving.phone}` : ''}
                              </p>
                            </div>
                            <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-center">
                              <p className="meta">Serving for</p>
                              <p className="font-mono text-xl font-black leading-none tabular-nums">
                                {duration(now - (serving.calledAt ?? now))}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-2 sm:grid-cols-3">
                            <Button
                              onClick={() => runAction(() => setStatus(serving.id, 'done'), `${serving.code} marked as served`)}
                            >
                              <Icon name="check" className="h-4 w-4" /> Done
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => runAction(() => recallTicket(serving.id), `${serving.code} recalled`)}
                            >
                              Recall
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-ink/50"
                              onClick={() => runAction(() => setStatus(serving.id, 'skipped'), `${serving.code} skipped`)}
                            >
                              Skip
                            </Button>
                          </div>

                          <Button className="mt-2 w-full" variant="pink" onClick={handleCallNext}>
                            Call next <Icon name="arrowRight" className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="px-5 py-8 text-center sm:px-6">
                          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-3 border-ink bg-cream">
                            <Icon name="bolt" className="h-6 w-6 text-ink/40" />
                          </span>
                          <p className="panel-title mt-4">{isToday ? 'Counter is clear' : 'Day closed'}</p>
                          <p className="mx-auto mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-ink/55">
                            {!isToday
                              ? 'Archived days are read only. Switch back to today to run the queue.'
                              : waiting.length
                                ? `${waiting.length} ticket${waiting.length === 1 ? '' : 's'} waiting to be called.`
                                : 'No one is in line yet. Share the QR code and the first number appears here.'}
                          </p>
                          {isToday && (
                            <Button
                              className="mt-4 w-full max-w-xs"
                              onClick={handleCallNext}
                              disabled={!waiting.length}
                            >
                              Call next <Icon name="arrowRight" className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </Panel>

                    <Panel className="overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-ink px-5 py-3">
                        <div>
                          <h2 className="panel-title">{isToday ? 'Up next' : 'All tickets'}</h2>
                          <p className="meta mt-0.5">
                            {isToday
                              ? `${waiting.length} waiting · first in, first served`
                              : `${labelDayKey(activeDay)} · read only`}
                          </p>
                        </div>
                        {isToday && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCallNext}
                            disabled={!waiting.length}
                            className="hidden lg:inline-flex"
                          >
                            Call next
                          </Button>
                        )}
                      </div>

                      {activeTickets.length === 0 ? (
                        <EmptyState
                          title="No one in line"
                          copy="Open the join page on a phone, or load a demo queue to see the dashboard with customers waiting."
                          actions={
                            isToday ? (
                              <>
                                <Button size="sm" href="#/join">
                                  Take the first number
                                </Button>
                                <Button
                                  size="sm"
                                  variant="violet"
                                  onClick={async () => {
                                    if (!settings) return;
                                    await runAction(() => seedDemoQueue(settings), 'Demo queue loaded');
                                  }}
                                >
                                  Load demo queue
                                </Button>
                              </>
                            ) : undefined
                          }
                        />
                      ) : !isToday ? (
                        <ul className="divide-y-2 divide-ink/10">
                          {activeTickets.map((ticket) => (
                            <li key={ticket.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                              <span className="w-16 font-mono text-xs font-black">{ticket.code}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">{ticket.name}</p>
                                <p className="meta mt-0.5 normal-case tracking-normal">
                                  {formatClock(ticket.createdAt)}
                                  {ticket.calledAt ? ` · called ${formatClock(ticket.calledAt)}` : ''}
                                  {ticket.completedAt ? ` · closed ${formatClock(ticket.completedAt)}` : ''}
                                </p>
                              </div>
                              <StatusPill status={ticket.status} />
                            </li>
                          ))}
                        </ul>
                      ) : waiting.length === 0 ? (
                        <EmptyState
                          kind="ticket"
                          title="Everyone has been called"
                          copy="The waiting list is empty. New numbers will appear here the moment someone joins."
                          actions={
                            <Button size="sm" variant="outline" href="#/join">
                              Open the join page
                            </Button>
                          }
                        />
                      ) : (
                        <ul className="divide-y-2 divide-ink/10">
                          {waiting.map((ticket, index) => {
                            const waited = minutesBetween(ticket.createdAt, now);
                            return (
                              <li
                                key={ticket.id}
                                className="group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-yellow/10 sm:px-5"
                              >
                                <span
                                  className={cx(
                                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-ink font-mono text-[11px] font-black',
                                    index === 0 ? 'bg-lime' : 'bg-cream',
                                  )}
                                >
                                  {index === 0 ? <Icon name="bolt" className="h-4 w-4" /> : index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="font-mono text-sm font-black">{ticket.code}</span>
                                    <span className="truncate text-sm font-semibold text-ink/80">{ticket.name}</span>
                                  </div>
                                  <p className="meta mt-0.5 normal-case tracking-normal">
                                    waiting {waitLabel(ticket.createdAt, now)}
                                    {ticket.phone ? ` · ${ticket.phone}` : ''}
                                    {ticket.note ? ` · ${ticket.note}` : ''}
                                  </p>
                                </div>
                                <span
                                  className={cx(
                                    'rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-black tabular-nums',
                                    waitTone(waited, avgServiceMinutes),
                                  )}
                                  title={`Waiting ${waited} min · average service ${avgServiceMinutes} min`}
                                >
                                  {waited}m
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="lime"
                                    onClick={() => {
                                      playCallCue();
                                      void runAction(() => setStatus(ticket.id, 'serving'), `Now serving ${ticket.code}`);
                                    }}
                                  >
                                    Serve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="px-2 text-ink/35 hover:text-ink"
                                    title={`Skip ${ticket.code}`}
                                    aria-label={`Skip ticket ${ticket.code}`}
                                    onClick={() => runAction(() => setStatus(ticket.id, 'skipped'), `${ticket.code} skipped`)}
                                  >
                                    <Icon name="close" className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isToday && (served.length > 0 || missed > 0) && (
                        <details className="group border-t-3 border-ink bg-cream/60">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
                            <span className="meta-strong">
                              Closed today · {served.length} served · {missed} missed
                            </span>
                            <Icon
                              name="plus"
                              className="h-4 w-4 shrink-0 text-ink/40 transition-transform group-open:rotate-45"
                            />
                          </summary>
                          <div className="flex flex-wrap gap-1.5 px-5 pb-4">
                            {[...served, ...activeTickets.filter((t) => t.status === 'skipped' || t.status === 'cancelled')]
                              .sort((a, b) => b.seq - a.seq)
                              .slice(0, 20)
                              .map((ticket) =>
                                ticket.status === 'skipped' ? (
                                  <button
                                    key={ticket.id}
                                    type="button"
                                    title={`${ticket.name} · put back in line`}
                                    onClick={() =>
                                      runAction(() => setStatus(ticket.id, 'waiting'), `${ticket.code} is back in line`)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-paper px-2 py-1 font-mono text-[10px] font-bold transition-colors hover:bg-lime"
                                  >
                                    {ticket.code}
                                    <Icon name="history" className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <span
                                    key={ticket.id}
                                    className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink/20 bg-paper px-2 py-1 font-mono text-[10px] font-bold"
                                    title={`${ticket.name} · ${formatClock(ticket.completedAt ?? ticket.createdAt)}`}
                                  >
                                    {ticket.code}
                                    <span
                                      aria-hidden
                                      className={cx(
                                        'h-1.5 w-1.5 rounded-full',
                                        ticket.status === 'done' ? 'bg-blue' : 'bg-orange',
                                      )}
                                    />
                                  </span>
                                ),
                              )}
                          </div>
                        </details>
                      )}
                    </Panel>
                  </div>

                  <div className="space-y-5">
                    {isToday ? (
                      <>
                        <Panel className="p-5">
                          <div className="flex items-center justify-between">
                            <h2 className="panel-title">Add a walk-in</h2>
                            <Icon name="plus" className="h-4 w-4 text-ink/30" />
                          </div>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-ink/50">
                            For customers who would rather not scan. Issues the next number.
                          </p>
                          <form onSubmit={handleAddWalkIn} className="mt-3 space-y-3">
                            <Field label="Name">
                              <Input
                                value={addName}
                                onChange={(event) => setAddName(event.target.value)}
                                placeholder="Walk-in name"
                                maxLength={60}
                              />
                            </Field>
                            <Field label="Contact" hint="optional">
                              <Input
                                value={addPhone}
                                onChange={(event) => setAddPhone(event.target.value)}
                                placeholder="Phone or email"
                                maxLength={32}
                              />
                            </Field>
                            <Button type="submit" size="sm" variant="yellow" className="w-full" disabled={!addName.trim()}>
                              Issue {nextNumber}
                            </Button>
                          </form>
                        </Panel>

                        <Panel className="p-5">
                          <h2 className="panel-title">Today</h2>
                          <dl className="mt-3 space-y-2.5">
                            {[
                              ['Next number', nextNumber],
                              ['Average service', `${avgServiceMinutes} min`],
                              ['Line estimate', waiting.length ? humanWait(waiting.length * avgServiceMinutes) : 'clear'],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-baseline justify-between gap-3">
                                <dt className="meta">{label}</dt>
                                <dd className="font-mono text-sm font-black">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="mt-4">
                            <div className="flex items-baseline justify-between">
                              <p className="meta">Day completion</p>
                              <p className="font-mono text-[11px] font-black text-ink/60">
                                {served.length}/{activeTickets.length || 0}
                              </p>
                            </div>
                            <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream">
                              <div
                                className="h-full border-r-2 border-ink bg-lime transition-all duration-500"
                                style={{ width: `${Math.max(2, percent(served.length, activeTickets.length))}%` }}
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" href="#/join">
                              Open join page
                            </Button>
                            <Button size="sm" variant="outline" href="#/display">
                              Display
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openTab('share')}>
                              QR code
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-ink/40"
                              onClick={() => setConfirmClear(true)}
                            >
                              Clear today
                            </Button>
                          </div>
                        </Panel>

                        {showSetup && (
                          <Panel className="overflow-hidden">
                            <div className="flex items-center justify-between border-b-3 border-ink bg-yellow px-5 py-3">
                              <p className="font-display text-sm font-black uppercase tracking-tight">Set up your queue</p>
                              <button
                                type="button"
                                onClick={() => dismissSetup()}
                                aria-label="Dismiss setup checklist"
                                className="rounded-md p-1 text-ink/50 hover:text-ink"
                              >
                                <Icon name="close" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <ul className="divide-y-2 divide-ink/10">
                              {setupItems.map((item) => (
                                <li key={item.label}>
                                  <button
                                    type="button"
                                    onClick={item.action}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink/5"
                                  >
                                    <span
                                      className={cx(
                                        'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink',
                                        item.done ? 'bg-lime' : 'bg-paper',
                                      )}
                                    >
                                      {item.done && <Icon name="check" className="h-3 w-3" />}
                                    </span>
                                    <span
                                      className={cx(
                                        'flex-1 text-xs font-semibold',
                                        item.done && 'text-ink/40 line-through',
                                      )}
                                    >
                                      {item.label}
                                    </span>
                                    {!item.done && <Icon name="arrowRight" className="h-3.5 w-3.5 text-ink/30" />}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div className="border-t-2 border-ink/10 p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowWizard(true)}
                              >
                                <Icon name="sparkles" className="h-3.5 w-3.5" /> Open setup wizard
                              </Button>
                            </div>
                          </Panel>
                        )}

                        <Panel className="bg-ink p-5 text-cream">
                          <p className="meta text-cream/50">Backup</p>
                          <p className="mt-1 text-sm font-semibold leading-relaxed text-cream/80">
                            This queue lives only in this browser. Export a JSON backup before clearing data or
                            switching machines.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="yellow" onClick={() => openTab('data')}>
                              <Icon name="download" className="h-3.5 w-3.5" /> Export
                            </Button>
                            <Button size="sm" variant="ghost" className="text-cream/70 hover:bg-cream/10" onClick={() => openTab('data')}>
                              Restore
                            </Button>
                          </div>
                        </Panel>
                      </>
                    ) : (
                      <>
                        <Panel className="p-5">
                          <h2 className="panel-title">Day summary</h2>
                          <dl className="mt-3 space-y-2.5">
                            {[
                              ['Tickets issued', String(activeTickets.length)],
                              ['Served', String(served.length)],
                              ['Missed', String(missed)],
                              ['Avg service', `${archivedServiceMinutes} min`],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-baseline justify-between gap-3">
                                <dt className="meta">{label}</dt>
                                <dd className="font-mono text-sm font-black">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Tag tone="yellow">{activeTickets.length} tickets</Tag>
                            <Tag tone="lime">{served.length} served</Tag>
                          </div>
                        </Panel>
                        <Panel className="p-5">
                          <h2 className="panel-title">Read-only history</h2>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-ink/55">
                            Past days are kept for reporting. They cannot be edited, so totals stay accurate.
                          </p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => setViewDay(null)}>
                            Back to today
                          </Button>
                        </Panel>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'customers' && (
          <div>
            <TabHeader
              eyebrow="Customers"
              title="Customer history"
              copy="Names are optional. Search everyone who left one, spot repeat visitors and open a full visit history — all from tickets on this device."
            />
            <CustomersPanel />
          </div>
        )}

        {tab === 'insights' && (
          <div>
            <TabHeader
              eyebrow="Reports"
              title="Queue insights"
              copy="Pick any day to review served, skipped and cancelled numbers, with seven-day volume and a JSON export. Everything is calculated on this device."
            />
            <InsightsPanel
              today={activeTickets}
              fallbackService={avgServiceMinutes}
              day={activeDay}
              onPickDay={(key) => setViewDay(key === today ? null : key)}
            />
          </div>
        )}

        {tab === 'data' &&
          (settings ? (
            <div>
              <TabHeader
                eyebrow="Ownership"
                title="Data & privacy"
                copy="Export everything, import a backup, restore an automatic recovery copy, delete selected days or reset the app. Nothing leaves this browser."
              />
              <DataPanel settings={settings} onOpenSettings={() => setTab('settings')} />
            </div>
          ) : (
            <LoadingPanel label="Loading data tools…" />
          ))}

        {tab === 'share' &&
          (settings ? (
            <div>
              <TabHeader
                eyebrow="Check-in"
                title="QR & sharing"
                copy="One square for the door. Customers scan it, take a number and follow their ticket from their own phone."
              />
              <SharePanel settings={settings} onOpenSettings={() => setTab('settings')} />
            </div>
          ) : (
            <LoadingPanel label="Loading QR tools…" />
          ))}

        {tab === 'settings' &&
          (settings ? (
            <div>
              <TabHeader
                eyebrow="Configuration"
                title="Business settings"
                copy="Branding, numbering, wait estimates, sounds and the automations that run while this dashboard is open."
              />
              <SettingsPanel
                settings={settings}
                onSaved={(message) => toast(message, 'success')}
                onOpenWizard={() => setShowWizard(true)}
              />
            </div>
          ) : (
            <LoadingPanel label="Loading settings…" />
          ))}

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-ink/30">
          {humanWait(avgWaitToday)} average wait · local-first · no backend
        </p>
      </main>

      {isToday && tab === 'queue' && !loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-3 border-ink bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="meta">{serving ? `Serving ${serving.code}` : 'Counter free'}</p>
              <p className="font-mono text-base font-black leading-tight">
                {waiting.length} waiting
                {waiting.length > 0 && ` · ~${waiting.length * avgServiceMinutes}m`}
              </p>
            </div>
            <Button onClick={handleCallNext} disabled={!waiting.length} size="md">
              Call next <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SetupWizard
        open={showWizard}
        settings={settings ?? DEFAULT_SETTINGS}
        onClose={() => {
          markOnboarded();
          setShowWizard(false);
        }}
        onQrSeen={markShareVisited}
        onFinish={async (next) => {
          await saveSettings(next);
          markOnboarded();
          setShowWizard(false);
          setTab('queue');
          setViewDay(null);
          const nextSeq = activeTickets.reduce((max, ticket) => Math.max(max, ticket.seq), 0) + 1;
          toast(`Setup saved — ${formatCode(next.prefix, nextSeq)} is next`, 'success');
        }}
      />

      <Dialog
        open={confirmClear}
        title="Clear today's queue?"
        tone="pink"
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <Button
              size="sm"
              variant="pink"
              onClick={async () => {
                const count = activeTickets.length;
                await runAction(
                  () => clearToday(),
                  `Cleared ${count} ticket${count === 1 ? '' : 's'} — numbering restarts at 001`,
                );
                setConfirmClear(false);
              }}
            >
              Clear the queue
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
              Keep my tickets
            </Button>
          </>
        }
      >
        This deletes all {activeTickets.length} ticket{activeTickets.length === 1 ? '' : 's'} issued today and resets
        numbering to 001. Previous days stay in history. This cannot be undone — export a backup first if you need
        the data.
      </Dialog>

    </div>
  );
}

function TabHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-5">
      <p className="meta">{eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-ink/50 sm:text-sm">{copy}</p>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/40">
        <span className="h-2 w-2 animate-blink rounded-full bg-ink/30" /> {label}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
