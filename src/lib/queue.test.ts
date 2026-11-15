import { describe, expect, it, vi } from 'vitest';
import { db } from './db';
import { saveSettings } from './db';
import {
  QueueError,
  callNext,
  clearToday,
  dayKey,
  deleteDay,
  formatCode,
  issueTicket,
  recallTicket,
  setStatus,
} from './queue';
import { makeTicket } from '../test/helpers';

describe('formatCode', () => {
  it('normalises the prefix and pads the sequence', () => {
    expect(formatCode('b', 7)).toBe('B-007');
    expect(formatCode('ab!', 12)).toBe('AB-012');
    expect(formatCode('', 1)).toBe('A-001');
    expect(formatCode('LONG', 1000)).toBe('LON-1000');
  });
});

describe('issueTicket', () => {
  it('issues sequential numbered tickets using the configured prefix', async () => {
    await saveSettings({ prefix: 'b' });

    const first = await issueTicket({ name: 'Maya Rivera' });
    const second = await issueTicket({ name: 'Jon Park' });
    const third = await issueTicket({ name: 'Maya Rivera' });

    expect([first.code, second.code, third.code]).toEqual(['B-001', 'B-002', 'B-003']);
    expect([first.seq, second.seq, third.seq]).toEqual([1, 2, 3]);
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    expect(first.dayKey).toBe(dayKey());
    expect(first.status).toBe('waiting');
    expect(first.name).toBe('Maya Rivera');
  });

  it('never hands out duplicate numbers under concurrent issuance', async () => {
    const tickets = await Promise.all(
      Array.from({ length: 24 }, (_, index) => issueTicket({ name: `Customer ${index + 1}` })),
    );

    const sequences = tickets.map((ticket) => ticket.seq).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    expect(new Set(tickets.map((ticket) => ticket.code)).size).toBe(24);
    expect(new Set(tickets.map((ticket) => ticket.id)).size).toBe(24);

    expect(await db.tickets.count()).toBe(24);
    expect(await db.counters.get(dayKey())).toMatchObject({ lastSeq: 24, issued: 24 });
  });

  it('restarts numbering on the next local day while keeping history', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      const first = await issueTicket({ name: 'Day one A' });
      const second = await issueTicket({ name: 'Day one B' });
      expect([first.seq, second.seq]).toEqual([1, 2]);

      vi.setSystemTime(new Date(2026, 0, 2, 9, 0, 0));
      const nextDay = await issueTicket({ name: 'Day two' });

      expect(nextDay.dayKey).toBe('2026-01-02');
      expect(nextDay.seq).toBe(1);
      expect(nextDay.code).toBe('A-001');
      expect(await db.tickets.where('dayKey').equals('2026-01-01').count()).toBe(2);
      expect(await db.counters.get('2026-01-02')).toMatchObject({ lastSeq: 1, issued: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('status transitions', () => {
  it('moves waiting → serving → done and rejects impossible moves', async () => {
    const ticket = await issueTicket({ name: 'Maya' });

    await setStatus(ticket.id, 'serving');
    const serving = await db.tickets.get(ticket.id);
    expect(serving?.status).toBe('serving');
    expect(serving?.calledAt).toEqual(expect.any(Number));

    await setStatus(ticket.id, 'done');
    const done = await db.tickets.get(ticket.id);
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toEqual(expect.any(Number));

    await expect(setStatus(ticket.id, 'serving')).rejects.toBeInstanceOf(QueueError);
    await expect(setStatus(ticket.id, 'waiting')).rejects.toThrow(/cannot become waiting/);
    expect((await db.tickets.get(ticket.id))?.status).toBe('done');
  });

  it('allows a skipped customer to return to the line', async () => {
    const ticket = await issueTicket({ name: 'Late arrival' });
    await setStatus(ticket.id, 'skipped');
    expect((await db.tickets.get(ticket.id))?.status).toBe('skipped');

    await setStatus(ticket.id, 'waiting');
    const requeued = await db.tickets.get(ticket.id);
    expect(requeued?.status).toBe('waiting');
    expect(requeued?.calledAt).toBeNull();
    expect(requeued?.completedAt).toBeNull();
  });

  it('keeps exactly one serving ticket per day', async () => {
    const first = await issueTicket({ name: 'First' });
    const second = await issueTicket({ name: 'Second' });
    const third = await issueTicket({ name: 'Third' });

    await setStatus(first.id, 'serving');
    await setStatus(second.id, 'serving');

    const rows = await db.tickets.where('dayKey').equals(dayKey()).toArray();
    const serving = rows.filter((row) => row.status === 'serving');
    expect(serving.map((row) => row.id)).toEqual([second.id]);
    expect(rows.find((row) => row.id === first.id)?.status).toBe('done');
    expect(rows.find((row) => row.id === third.id)?.status).toBe('waiting');
  });

  it('recalls the current ticket without changing its status', async () => {
    const ticket = await issueTicket({ name: 'Recall me' });
    await setStatus(ticket.id, 'serving');
    const before = (await db.tickets.get(ticket.id))?.calledAt;
    await new Promise((resolve) => window.setTimeout(resolve, 5));

    await recallTicket(ticket.id);
    const after = await db.tickets.get(ticket.id);
    expect(after?.status).toBe('serving');
    expect(after?.calledAt).toBeGreaterThan(before ?? 0);
  });
});

describe('callNext', () => {
  it('closes the current ticket and calls the oldest waiting one', async () => {
    const first = await issueTicket({ name: 'First' });
    const second = await issueTicket({ name: 'Second' });
    const third = await issueTicket({ name: 'Third' });

    const calledFirst = await callNext();
    expect(calledFirst?.id).toBe(first.id);
    expect((await db.tickets.get(first.id))?.status).toBe('serving');

    const calledSecond = await callNext();
    expect(calledSecond?.id).toBe(second.id);

    const rows = await db.tickets.where('dayKey').equals(dayKey()).toArray();
    expect(rows.find((row) => row.id === first.id)?.status).toBe('done');
    expect(rows.find((row) => row.id === second.id)?.status).toBe('serving');
    expect(rows.find((row) => row.id === third.id)?.status).toBe('waiting');
    expect(rows.filter((row) => row.status === 'serving')).toHaveLength(1);

    const calledThird = await callNext();
    expect(calledThird?.id).toBe(third.id);

    const empty = await callNext();
    expect(empty).toBeNull();
    expect((await db.tickets.get(second.id))?.status).toBe('done');
    expect((await db.tickets.get(third.id))?.status).toBe('done');
  });
});

describe('day cleanup', () => {
  it('clears today, resets numbering and keeps previous days', async () => {
    const yesterday = '2026-01-01';
    await makeTicket({ dayKey: yesterday, seq: 1, code: 'A-001' });

    await issueTicket({ name: 'Today A' });
    await issueTicket({ name: 'Today B' });
    await clearToday();

    expect(await db.tickets.where('dayKey').equals(dayKey()).count()).toBe(0);
    expect(await db.tickets.where('dayKey').equals(yesterday).count()).toBe(1);

    const next = await issueTicket({ name: 'Fresh start' });
    expect(next.seq).toBe(1);
    expect(next.code).toBe('A-001');
  });

  it('deletes a single day without touching the rest', async () => {
    const oldDay = '2026-01-01';
    const olderDay = '2025-12-31';
    await makeTicket({ dayKey: oldDay, seq: 1 });
    await makeTicket({ dayKey: oldDay, seq: 2 });
    await makeTicket({ dayKey: olderDay, seq: 1 });
    const today = await issueTicket({ name: 'Today' });

    expect(await deleteDay(oldDay)).toBe(2);
    expect(await db.tickets.where('dayKey').equals(oldDay).count()).toBe(0);
    expect(await db.tickets.where('dayKey').equals(olderDay).count()).toBe(1);
    expect(await db.tickets.get(today.id)).toBeDefined();
  });
});
