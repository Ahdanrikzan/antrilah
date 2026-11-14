import { db, getSettings, type DayCounter, type Settings, type Ticket, type TicketStatus } from './db';
import { broadcast } from './sync';
import { localDayKey } from './utils';

export const dayKey = localDayKey;

export function formatCode(prefix: string, seq: number): string {
  const clean = (prefix || 'A').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'A';
  return `${clean}-${String(seq).padStart(3, '0')}`;
}

/**
 * Legal moves between ticket states. Terminal states stay terminal, except
 * "skipped", which staff can revive if the customer turns up late.
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  waiting: ['serving', 'skipped', 'cancelled'],
  serving: ['done', 'skipped', 'cancelled', 'waiting'],
  skipped: ['waiting'],
  done: [],
  cancelled: [],
};

export class QueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueError';
  }
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from !== to && ALLOWED_TRANSITIONS[from].includes(to);
}

export interface IssueInput {
  name: string;
  phone?: string;
  note?: string;
}

/**
 * Issues the next ticket for today.
 *
 * Numbering is guaranteed by writing the day cursor (`counters`) in the same
 * read-write IndexedDB transaction as the ticket. IndexedDB serialises
 * overlapping read-write scopes across tabs, so two tabs tapping "take a
 * number" at the same time cannot receive the same number. The day's existing
 * tickets are also scanned as a safety net (imports, restored backups, or a
 * missing cursor).
 */
export async function issueTicket(input: IssueInput): Promise<Ticket> {
  const settings = await getSettings();
  const key = dayKey();

  const ticket = await db.transaction('rw', db.tickets, db.counters, async () => {
    const counter = await db.counters.get(key);
    const todays = await db.tickets.where('dayKey').equals(key).toArray();
    const highest = todays.reduce((max, row) => Math.max(max, row.seq), 0);
    const seq = Math.max(counter?.lastSeq ?? 0, highest, 0) + 1;
    const now = Date.now();

    const row: Ticket = {
      id: `${key}-${String(seq).padStart(4, '0')}-${Math.random().toString(36).slice(2, 8)}`,
      dayKey: key,
      seq,
      code: formatCode(settings.prefix, seq),
      name: input.name.trim().slice(0, 60) || 'Walk-in',
      phone: (input.phone ?? '').trim().slice(0, 32),
      note: (input.note ?? '').trim().slice(0, 120),
      status: 'waiting',
      createdAt: now,
      calledAt: null,
      completedAt: null,
      statusChangedAt: now,
    };

    await db.tickets.add(row);
    const nextCounter: DayCounter = {
      dayKey: key,
      lastSeq: seq,
      issued: (counter?.issued ?? 0) + 1,
    };
    await db.counters.put(nextCounter);
    return row;
  });

  broadcast();
  return ticket;
}

/**
 * Applies a status change after checking the transition table.
 * Calling a ticket to the counter also closes any other ticket still marked
 * "serving" on the same day, so exactly one ticket can own the counter.
 */
export async function setStatus(id: string, status: TicketStatus): Promise<void> {
  const changed = await db.transaction('rw', db.tickets, async () => {
    const ticket = await db.tickets.get(id);
    if (!ticket) throw new QueueError('That ticket no longer exists on this device.');
    if (ticket.status === status) return false;
    if (!canTransition(ticket.status, status)) {
      throw new QueueError(`A ${ticket.status} ticket cannot become ${status}.`);
    }

    const now = Date.now();

    if (status === 'serving') {
      const sameDay = await db.tickets.where('dayKey').equals(ticket.dayKey).toArray();
      for (const other of sameDay) {
        if (other.id !== id && other.status === 'serving') {
          await db.tickets.update(other.id, {
            status: 'done',
            completedAt: now,
            statusChangedAt: now,
          });
        }
      }
    }

    const patch: Partial<Ticket> = { status, statusChangedAt: now };
    if (status === 'serving') {
      patch.calledAt = now;
      patch.completedAt = null;
    }
    if (status === 'done' || status === 'skipped' || status === 'cancelled') {
      patch.completedAt = now;
    }
    if (status === 'waiting') {
      patch.calledAt = null;
      patch.completedAt = null;
    }

    await db.tickets.update(id, patch);
    return true;
  });

  if (changed) broadcast();
}

export const requeueTicket = (id: string) => setStatus(id, 'waiting');

/**
 * Completes whoever is being served, then calls the oldest waiting ticket.
 */
export async function callNext(): Promise<Ticket | null> {
  const key = dayKey();
  const next = await db.transaction('rw', db.tickets, async () => {
    const now = Date.now();
    const todays = await db.tickets.where('dayKey').equals(key).toArray();

    for (const current of todays.filter((t) => t.status === 'serving')) {
      await db.tickets.update(current.id, {
        status: 'done',
        completedAt: now,
        statusChangedAt: now,
      });
    }

    const target = todays
      .filter((t) => t.status === 'waiting')
      .sort((a, b) => a.seq - b.seq)[0];

    if (!target) return null;

    await db.tickets.update(target.id, {
      status: 'serving',
      calledAt: now,
      completedAt: null,
      statusChangedAt: now,
    });

    return {
      ...target,
      status: 'serving' as TicketStatus,
      calledAt: now,
      completedAt: null,
      statusChangedAt: now,
    };
  });

  broadcast();
  return next;
}

/** Re-announces the ticket currently at the counter. */
export async function recallTicket(id: string): Promise<void> {
  const now = Date.now();
  await db.tickets.update(id, { calledAt: now, statusChangedAt: now });
  broadcast();
}

export async function clearToday(): Promise<void> {
  const key = dayKey();
  await db.transaction('rw', db.tickets, db.counters, async () => {
    await db.tickets.where('dayKey').equals(key).delete();
    await db.counters.delete(key);
  });
  broadcast();
}

export async function clearAllTickets(): Promise<void> {
  await db.transaction('rw', db.tickets, db.counters, async () => {
    await db.tickets.clear();
    await db.counters.clear();
  });
  broadcast();
}

export interface DaySummary {
  dayKey: string;
  total: number;
  done: number;
  waiting: number;
}

/** Recent days that have tickets, plus today. Used by the admin day switcher. */
export async function listDays(limit = 12): Promise<DaySummary[]> {
  const keys = ((await db.tickets.orderBy('dayKey').uniqueKeys()) as string[]).slice();
  const today = dayKey();
  if (!keys.includes(today)) keys.push(today);

  const recent = keys.sort().reverse().slice(0, limit);

  return Promise.all(
    recent.map(async (key) => {
      const rows = await db.tickets.where('dayKey').equals(key).toArray();
      return {
        dayKey: key,
        total: rows.length,
        done: rows.filter((t) => t.status === 'done').length,
        waiting: rows.filter((t) => t.status === 'waiting').length,
      };
    }),
  );
}

/**
 * Automatic status updates. Runs on an interval in the dashboard and applies
 * only the rules that have been switched on in Settings (0 = disabled).
 * Returns the number of tickets changed.
 */
export async function runHousekeeping(settings: Settings): Promise<number> {
  const skipAfter = settings.autoSkipMinutes;
  const completeAfter = settings.autoCompleteMinutes;
  if (skipAfter <= 0 && completeAfter <= 0) return 0;

  const key = dayKey();
  const now = Date.now();

  const changed = await db.transaction('rw', db.tickets, async () => {
    let count = 0;
    const rows = await db.tickets.where('dayKey').equals(key).toArray();

    for (const ticket of rows) {
      if (
        skipAfter > 0 &&
        ticket.status === 'waiting' &&
        now - ticket.createdAt >= skipAfter * 60_000
      ) {
        await db.tickets.update(ticket.id, {
          status: 'skipped',
          completedAt: now,
          statusChangedAt: now,
        });
        count += 1;
        continue;
      }

      if (
        completeAfter > 0 &&
        ticket.status === 'serving' &&
        ticket.calledAt &&
        now - ticket.calledAt >= completeAfter * 60_000
      ) {
        await db.tickets.update(ticket.id, {
          status: 'done',
          completedAt: now,
          statusChangedAt: now,
        });
        count += 1;
      }
    }

    return count;
  });

  if (changed > 0) broadcast();
  return changed;
}

/**
 * Keeps the last `retentionDays` days (today included) and deletes everything
 * older than the window. retentionDays = 1 keeps only today.
 */
export async function purgeOldTickets(retentionDays: number): Promise<number> {
  if (retentionDays <= 0) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (retentionDays - 1));
  const cutoff = localDayKey(cutoffDate);

  const keys = ((await db.tickets.orderBy('dayKey').uniqueKeys()) as string[]).filter(
    (key) => key < cutoff,
  );
  if (!keys.length) return 0;

  const removed = await db.transaction('rw', db.tickets, db.counters, async () => {
    let count = 0;
    for (const key of keys) {
      count += await db.tickets.where('dayKey').equals(key).delete();
      await db.counters.delete(key);
    }
    return count;
  });

  if (removed > 0) broadcast();
  return removed;
}

/** Opt-in demo queue so the dashboard has something to show on a fresh install. */
export async function seedDemoQueue(settings: Settings): Promise<void> {
  const key = dayKey();
  const existing = await db.tickets.where('dayKey').equals(key).count();
  if (existing > 0) {
    throw new QueueError('Today already has tickets — clear the queue before loading the demo.');
  }

  const now = Date.now();
  const minute = 60_000;
  const names = ['Maya R.', 'Jonas K.', 'Priya S.', 'Tobias L.', 'Amara O.', 'Lena F.', 'Marco B.'];

  const rows: Ticket[] = names.map((name, i) => {
    const seq = i + 1;
    const createdAt = now - (70 - i * 8) * minute;
    const status: TicketStatus = i < 3 ? 'done' : i === 3 ? 'serving' : i === 6 ? 'skipped' : 'waiting';
    const calledAt = status === 'done' || status === 'serving' ? createdAt + 9 * minute : null;
    const completedAt = status === 'done' || status === 'skipped' ? createdAt + 16 * minute : null;

    return {
      id: `${key}-${String(seq).padStart(4, '0')}-demo${i}`,
      dayKey: key,
      seq,
      code: formatCode(settings.prefix, seq),
      name,
      phone: '',
      note: '',
      status,
      createdAt,
      calledAt,
      completedAt,
      statusChangedAt: completedAt ?? calledAt ?? createdAt,
    };
  });

  const maxSeq = rows.reduce((max, row) => Math.max(max, row.seq), 0);
  await db.transaction('rw', db.tickets, db.counters, async () => {
    await db.tickets.bulkPut(rows);
    await db.counters.put({ dayKey: key, lastSeq: maxSeq, issued: rows.length });
  });
  broadcast();
}
