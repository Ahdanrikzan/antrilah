import { describe, expect, it, vi } from 'vitest';
import { db, getSettings, saveSettings } from './db';
import { clearAllTickets, issueTicket } from './queue';
import {
  createSnapshot,
  deleteSnapshot,
  ensureDailySnapshot,
  listSnapshots,
  resetApplication,
  restoreSnapshot,
} from './snapshots';

describe('recovery snapshots', () => {
  it('creates one automatic copy per local day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      await ensureDailySnapshot();
      await ensureDailySnapshot();
      expect(await listSnapshots()).toHaveLength(1);

      vi.setSystemTime(new Date(2026, 0, 2, 10, 0, 0));
      await ensureDailySnapshot();
      expect(await listSnapshots()).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps only the three newest copies', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      const first = await createSnapshot('First');
      vi.setSystemTime(new Date(2026, 0, 2, 10, 0, 0));
      await createSnapshot('Second');
      vi.setSystemTime(new Date(2026, 0, 3, 10, 0, 0));
      await createSnapshot('Third');
      vi.setSystemTime(new Date(2026, 0, 4, 10, 0, 0));
      await createSnapshot('Fourth');

      const copies = await listSnapshots();
      expect(copies).toHaveLength(3);
      expect(copies.map((copy) => copy.reason)).toEqual(['Fourth', 'Third', 'Second']);
      expect(copies.find((copy) => copy.id === first.id)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores tickets, settings and the numbering cursor', async () => {
    await saveSettings({ businessName: 'Snapshot Shop', prefix: 'S' });
    await issueTicket({ name: 'Maya Rivera' });
    await issueTicket({ name: 'Jon Park' });
    const snapshot = await createSnapshot('Test copy');

    await clearAllTickets();
    await saveSettings({ businessName: 'Changed Shop', prefix: 'X' });

    await restoreSnapshot(snapshot.id);

    expect(await db.tickets.count()).toBe(2);
    expect((await getSettings()).businessName).toBe('Snapshot Shop');
    expect((await getSettings()).prefix).toBe('S');

    const next = await issueTicket({ name: 'After restore' });
    expect(next.code).toBe('S-003');
  });

  it('deletes a single recovery copy', async () => {
    const snapshot = await createSnapshot('Delete me');
    expect(await listSnapshots()).toHaveLength(1);

    await deleteSnapshot(snapshot.id);
    expect(await listSnapshots()).toHaveLength(0);
  });

  it('resets all local tables', async () => {
    await issueTicket({ name: 'Maya' });
    await createSnapshot('Before reset');

    await resetApplication();
    await db.open();

    expect(await db.tickets.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(0);
    expect((await getSettings()).businessName).toBe('Antrilah Queue');
  });
});
