import { db, type Ticket, type TicketStatus } from '../lib/db';
import { dayKey, formatCode } from '../lib/queue';

let sequence = 0;

/**
 * Writes a ticket directly to IndexedDB. Queue-engine tests use issueTicket();
 * this helper is for UI fixtures where the exact status/time matters.
 */
export async function makeTicket(overrides: Partial<Ticket> = {}): Promise<Ticket> {
  const day = overrides.dayKey ?? dayKey();
  const now = overrides.createdAt ?? Date.now();
  const seq =
    overrides.seq ?? (await db.tickets.where('dayKey').equals(day).count()) + 1;
  const status: TicketStatus = overrides.status ?? 'waiting';
  const calledAt =
    overrides.calledAt ?? (status === 'serving' || status === 'done' ? now : null);
  const completedAt =
    overrides.completedAt ??
    (status === 'done' || status === 'skipped' || status === 'cancelled' ? now : null);

  sequence += 1;
  const ticket: Ticket = {
    id: `${day}-${String(seq).padStart(4, '0')}-fixture-${sequence}`,
    dayKey: day,
    seq,
    code: formatCode('A', seq),
    name: 'Walk-in',
    phone: '',
    note: '',
    status,
    createdAt: now,
    calledAt,
    completedAt,
    statusChangedAt: completedAt ?? calledAt ?? now,
    ...overrides,
  };

  await db.tickets.put(ticket);
  return ticket;
}
