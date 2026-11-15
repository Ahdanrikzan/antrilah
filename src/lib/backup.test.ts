import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  backupFilename,
  buildBackup,
  importBackup,
  parseBackup,
  sanitizeSettings,
} from './backup';
import { db, getSettings, saveSettings } from './db';
import { clearAllTickets, dayKey, issueTicket } from './queue';
import { makeTicket } from '../test/helpers';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n2EAAAAASUVORK5CYII=';

function rawTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'remote-1',
    dayKey: '2026-02-01',
    seq: 1,
    code: 'A-001',
    name: 'Test Customer',
    phone: '',
    note: '',
    status: 'waiting',
    createdAt: Date.now(),
    calledAt: null,
    completedAt: null,
    statusChangedAt: Date.now(),
    ...overrides,
  };
}

function backupDoc(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'antrilah',
    exportedAt: new Date().toISOString(),
    settings: { prefix: 'A' },
    tickets: [rawTicket()],
    ...overrides,
  });
}

describe('backup export', () => {
  it('builds a versioned document with sorted tickets and settings', async () => {
    await saveSettings({ businessName: 'Bike Shop' });
    await issueTicket({ name: 'Second' });
    await issueTicket({ name: 'First' });

    const backup = buildBackup(await getSettings(), await db.tickets.toArray());

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.settings.businessName).toBe('Bike Shop');
    expect(backup.tickets).toHaveLength(2);
    expect(backup.tickets.map((ticket) => ticket.seq)).toEqual([1, 2]);
    expect(backupFilename(new Date(2026, 0, 5))).toBe('antrilah-backup-2026-01-05.json');
  });
});

describe('backup validation', () => {
  it('rejects malformed JSON and the wrong format marker', () => {
    expect(() => parseBackup('{ not json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ version: 2, tickets: [] }))).toThrow(
      /format marker/,
    );
  });

  it('rejects a backup from a newer app version', () => {
    expect(() => parseBackup(backupDoc({ version: BACKUP_VERSION + 1 }))).toThrow(/newer Antrilah/);
  });

  it('requires a tickets array and validates each ticket', () => {
    expect(() => parseBackup(backupDoc({ tickets: undefined }))).toThrow(/tickets array/);
    expect(() =>
      parseBackup(backupDoc({ tickets: [rawTicket({ dayKey: '05/01/2026' })] })),
    ).toThrow(/invalid day/);
    expect(() => parseBackup(backupDoc({ tickets: [rawTicket({ seq: 0 })] }))).toThrow(
      /invalid queue number/,
    );
  });

  it('sanitises ticket fields and drops duplicate ids', () => {
    const parsed = parseBackup(
      backupDoc({
        tickets: [
          rawTicket({ id: 'same', seq: 1, name: '  ', status: 'archived' }),
          rawTicket({ id: 'same', seq: 2, code: '' }),
        ],
      }),
    );

    expect(parsed.tickets).toHaveLength(1);
    expect(parsed.tickets[0].name).toBe('Walk-in');
    expect(parsed.tickets[0].status).toBe('waiting');
    expect(parsed.tickets[0].code).toBe('A-001');
  });

  it('sanitises branding and sound settings within safe limits', () => {
    const settings = sanitizeSettings({
      businessName: 'Shop',
      description: 'x'.repeat(500),
      brandColor: 'not-a-colour',
      logoDataUrl: 'javascript:alert(1)',
      soundVolume: 500,
      soundName: 'gong',
      soundEnabled: false,
    });

    expect(settings.description).toHaveLength(300);
    expect(settings.brandColor).toBe('#FFD93D');
    expect(settings.logoDataUrl).toBe('');
    expect(settings.soundVolume).toBe(100);
    expect(settings.soundName).toBe('chime');
    expect(settings.soundEnabled).toBe(false);

    const valid = sanitizeSettings({ logoDataUrl: TINY_PNG });
    expect(valid.logoDataUrl).toBe(TINY_PNG);
  });
});

describe('backup round-trip', () => {
  it('restores tickets, branding, counters and the next queue number', async () => {
    await saveSettings({
      businessName: 'Bike Shop',
      prefix: 'B',
      description: 'We fix bikes while you wait.',
      brandColor: '#5B7CFA',
      logoDataUrl: TINY_PNG,
      soundName: 'bell',
      soundOnJoin: true,
    });
    await issueTicket({ name: 'Maya Rivera' });
    await issueTicket({ name: 'Jon Park' });
    await issueTicket({ name: 'Maya Rivera' });

    const originalTickets = await db.tickets.toArray();
    const document = buildBackup(await getSettings(), originalTickets);
    const parsed = parseBackup(JSON.stringify(document));

    await clearAllTickets();
    const summary = await importBackup(parsed, { mode: 'replace', includeSettings: true });

    expect(summary).toMatchObject({ added: 3, skipped: 0, settingsApplied: true, days: 1 });
    expect(await db.tickets.count()).toBe(3);

    const settings = await getSettings();
    expect(settings.businessName).toBe('Bike Shop');
    expect(settings.brandColor).toBe('#5B7CFA');
    expect(settings.logoDataUrl).toBe(TINY_PNG);
    expect(settings.soundName).toBe('bell');

    const next = await issueTicket({ name: 'Next customer' });
    expect(next.code).toBe('B-004');
    expect(next.seq).toBe(4);
  });

  it('skips tickets that already exist when merging', async () => {
    await issueTicket({ name: 'Maya' });
    await issueTicket({ name: 'Jon' });
    const backup = parseBackup(JSON.stringify(buildBackup(await getSettings(), await db.tickets.toArray())));

    const summary = await importBackup(backup, { mode: 'merge', includeSettings: false });

    expect(summary).toMatchObject({ added: 0, skipped: 2, renumbered: 0 });
    expect(await db.tickets.count()).toBe(2);
  });

  it('renumbers a conflicting day + sequence and rebuilds the counter', async () => {
    const today = dayKey();
    await makeTicket({ id: 'local-ticket', dayKey: today, seq: 1, code: 'A-001' });

    const conflict = parseBackup(
      backupDoc({
        settings: { prefix: 'C' },
        tickets: [rawTicket({ id: 'remote-ticket', dayKey: today, seq: 1, code: 'A-001' })],
      }),
    );
    const summary = await importBackup(conflict, { mode: 'merge', includeSettings: true });

    expect(summary.renumbered).toBe(1);
    const remote = await db.tickets.get('remote-ticket');
    expect(remote).toMatchObject({ seq: 2, code: 'C-002' });

    const next = await issueTicket({ name: 'After merge' });
    expect(next.code).toBe('C-003');
  });

  it('replaces local tickets that are not in the backup', async () => {
    await issueTicket({ name: 'Backed up' });
    const backup = parseBackup(JSON.stringify(buildBackup(await getSettings(), await db.tickets.toArray())));
    await issueTicket({ name: 'Local only' });

    await importBackup(backup, { mode: 'replace', includeSettings: false });

    expect(await db.tickets.count()).toBe(1);
    expect((await db.tickets.toArray())[0].name).toBe('Backed up');
  });

  it('keeps the current settings when includeSettings is false', async () => {
    await saveSettings({ businessName: 'Current Shop' });
    const backup = parseBackup(
      backupDoc({ settings: { prefix: 'Z', businessName: 'Backup Shop' } }),
    );

    await importBackup(backup, { mode: 'replace', includeSettings: false });

    expect((await getSettings()).businessName).toBe('Current Shop');
    expect((await getSettings()).prefix).toBe('A');
  });

  it('normalises multiple serving tickets to the most recently called one', async () => {
    const day = '2026-02-01';
    const backup = parseBackup(
      backupDoc({
        tickets: [
          rawTicket({ id: 'serving-old', dayKey: day, seq: 1, status: 'serving', calledAt: 1_000 }),
          rawTicket({ id: 'serving-new', dayKey: day, seq: 2, status: 'serving', calledAt: 2_000 }),
        ],
      }),
    );

    await importBackup(backup, { mode: 'replace', includeSettings: false });

    const rows = await db.tickets.where('dayKey').equals(day).toArray();
    expect(rows.find((row) => row.id === 'serving-old')?.status).toBe('waiting');
    expect(rows.find((row) => row.id === 'serving-new')?.status).toBe('serving');
    expect(rows.filter((row) => row.status === 'serving')).toHaveLength(1);
  });

  it('continues numbering from imported tickets without an explicit counter', async () => {
    const day = '2026-02-01';
    const backup = parseBackup(
      backupDoc({
        settings: { prefix: 'D' },
        tickets: [
          rawTicket({ id: 'one', dayKey: day, seq: 1 }),
          rawTicket({ id: 'two', dayKey: day, seq: 2 }),
        ],
      }),
    );

    await importBackup(backup, { mode: 'replace', includeSettings: true });
    const counter = await db.counters.get(day);

    expect(counter).toMatchObject({ lastSeq: 2, issued: 2 });
  });
});
