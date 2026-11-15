import { describe, expect, it } from 'vitest';
import { db, DEFAULT_SETTINGS, getSettings, saveSettings, type Settings } from './db';
import { sanitizeSettings } from './backup';
import { dayKey, issueTicket } from './queue';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n2EAAAAASUVORK5CYII=';

describe('business settings', () => {
  it('starts from the documented defaults', async () => {
    const settings = await getSettings();

    expect(settings).toMatchObject(DEFAULT_SETTINGS);
    expect(settings.businessName).toBe('Antrilah Queue');
    expect(settings.brandColor).toBe('#FFD93D');
    expect(settings.soundName).toBe('chime');
    expect(settings.soundVolume).toBe(60);
  });

  it('merges partial saves instead of wiping unrelated fields', async () => {
    const saved = await saveSettings({ businessName: 'Bike Shop', prefix: 'B' });

    expect(saved.businessName).toBe('Bike Shop');
    expect(saved.prefix).toBe('B');
    expect(saved.tagline).toBe(DEFAULT_SETTINGS.tagline);
    expect(saved.autoSkipMinutes).toBe(DEFAULT_SETTINGS.autoSkipMinutes);
  });

  it('fills fields added after an older settings row was written', async () => {
    await db.settings.put({ id: 'app', businessName: 'Legacy Shop' } as Settings);

    const settings = await getSettings();
    expect(settings.businessName).toBe('Legacy Shop');
    expect(settings.brandColor).toBe(DEFAULT_SETTINGS.brandColor);
    expect(settings.description).toBe('');
    expect(settings.soundEnabled).toBe(true);
    expect(settings.soundOnJoin).toBe(false);
  });

  it('validates imported branding and sound limits', () => {
    const sanitized = sanitizeSettings({
      brandColor: '#123456',
      soundVolume: -20,
      soundOnCall: false,
      logoDataUrl: TINY_PNG,
      description: 'A short description',
    });

    expect(sanitized.brandColor).toBe('#123456');
    expect(sanitized.soundVolume).toBe(0);
    expect(sanitized.soundOnCall).toBe(false);
    expect(sanitized.logoDataUrl).toBe(TINY_PNG);
    expect(sanitized.description).toBe('A short description');
  });
});

describe('IndexedDB persistence', () => {
  it('keeps tickets, counters and settings after the database is closed and reopened', async () => {
    await saveSettings({ businessName: 'Persistent Shop', prefix: 'P' });
    const ticket = await issueTicket({ name: 'Maya Rivera' });

    db.close();
    await db.open();

    const restoredTicket = await db.tickets.get(ticket.id);
    expect(restoredTicket).toMatchObject({ code: 'P-001', name: 'Maya Rivera', status: 'waiting' });
    expect(await db.counters.get(dayKey())).toMatchObject({ lastSeq: 1, issued: 1 });
    expect((await getSettings()).businessName).toBe('Persistent Shop');

    const next = await issueTicket({ name: 'After reopen' });
    expect(next.code).toBe('P-002');
  });
});
