import {
  db,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  TICKET_STATUSES,
  type Settings,
  type Ticket,
  type TicketStatus,
} from './db';
import { broadcast } from './sync';

export const BACKUP_FORMAT = 'antrilah-backup' as const;
export const BACKUP_VERSION = 2;
const MAX_TICKETS = 50_000;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  app: 'antrilah';
  exportedAt: string;
  settings: Settings;
  tickets: Ticket[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = asFinite(value);
  if (num === null) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

/** Accepts any shape and returns a clean Settings object with sane limits. */
export function sanitizeSettings(raw: unknown): Settings {
  const base = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...base };
  const input = raw as Record<string, unknown>;
  const prefix =
    asString(input.prefix, base.prefix)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3) || base.prefix;

  return {
    id: SETTINGS_ID,
    businessName: asString(input.businessName, base.businessName).slice(0, 60).trim() || base.businessName,
    tagline: asString(input.tagline, base.tagline).slice(0, 120),
    serviceLabel: asString(input.serviceLabel, base.serviceLabel).slice(0, 40),
    prefix,
    avgServiceMinutes: clampInt(input.avgServiceMinutes, 1, 180, base.avgServiceMinutes),
    openHours: asString(input.openHours, base.openHours).slice(0, 60),
    welcomeNote: asString(input.welcomeNote, base.welcomeNote).slice(0, 400),
    qrBaseUrl: asString(input.qrBaseUrl, '').slice(0, 200).trim(),
    autoSkipMinutes: clampInt(input.autoSkipMinutes, 0, 600, base.autoSkipMinutes),
    autoCompleteMinutes: clampInt(input.autoCompleteMinutes, 0, 600, base.autoCompleteMinutes),
    retentionDays: clampInt(input.retentionDays, 0, 3650, base.retentionDays),
  };
}

function sanitizeTicket(raw: unknown, index: number, fallbackPrefix: string): Ticket {
  if (!raw || typeof raw !== 'object') {
    throw new BackupError(`Ticket ${index + 1} is not an object.`);
  }
  const input = raw as Record<string, unknown>;

  const day = asString(input.dayKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new BackupError(`Ticket ${index + 1} has an invalid day (expected YYYY-MM-DD).`);
  }

  const seq = asFinite(input.seq);
  if (seq === null || seq < 1 || !Number.isInteger(seq)) {
    throw new BackupError(`Ticket ${index + 1} has an invalid queue number.`);
  }

  const statusCandidate = asString(input.status, 'waiting') as TicketStatus;
  const status = TICKET_STATUSES.includes(statusCandidate) ? statusCandidate : 'waiting';

  const createdAt = asFinite(input.createdAt) ?? Date.now();
  const calledAt = asFinite(input.calledAt);
  const completedAt = asFinite(input.completedAt);
  const statusChangedAt = asFinite(input.statusChangedAt) ?? completedAt ?? calledAt ?? createdAt;

  const code =
    asString(input.code).trim().slice(0, 12) ||
    `${fallbackPrefix}-${String(seq).padStart(3, '0')}`;

  const id = asString(input.id).trim().slice(0, 120) || `${day}-${seq}-imported-${index}`;

  return {
    id,
    dayKey: day,
    seq,
    code,
    name: asString(input.name, 'Walk-in').slice(0, 60).trim() || 'Walk-in',
    phone: asString(input.phone).slice(0, 32),
    note: asString(input.note).slice(0, 120),
    status,
    createdAt,
    calledAt,
    completedAt,
    statusChangedAt,
  };
}

export function buildBackup(settings: Settings, tickets: Ticket[]): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'antrilah',
    exportedAt: new Date().toISOString(),
    settings,
    tickets: tickets
      .slice()
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.seq - b.seq),
  };
}

export function backupFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  return `antrilah-backup-${stamp}.json`;
}

/** Validate arbitrary JSON text and return a typed, sanitised backup. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BackupError('That file does not look like an Antrilah backup.');
  }

  const input = raw as Record<string, unknown>;
  if (input.format !== BACKUP_FORMAT) {
    throw new BackupError('Missing the "antrilah-backup" format marker — pick a file exported from Antrilah.');
  }

  const version = asFinite(input.version);
  if (version === null) throw new BackupError('The backup version is missing.');
  if (version > BACKUP_VERSION) {
    throw new BackupError(`That backup was made by a newer Antrilah (v${version}). Update the app first.`);
  }

  if (!Array.isArray(input.tickets)) throw new BackupError('The backup has no tickets array.');
  if (input.tickets.length > MAX_TICKETS) {
    throw new BackupError(`That backup has too many tickets (${input.tickets.length}). The limit is ${MAX_TICKETS}.`);
  }

  const settings = sanitizeSettings(input.settings);
  const seen = new Set<string>();
  const tickets: Ticket[] = [];

  input.tickets.forEach((entry, index) => {
    const ticket = sanitizeTicket(entry, index, settings.prefix);
    if (seen.has(ticket.id)) return;
    seen.add(ticket.id);
    tickets.push(ticket);
  });

  return {
    format: BACKUP_FORMAT,
    version,
    app: 'antrilah',
    exportedAt: asString(input.exportedAt, new Date().toISOString()),
    settings,
    tickets,
  };
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  includeSettings: boolean;
}

export interface ImportSummary {
  added: number;
  skipped: number;
  renumbered: number;
  settingsApplied: boolean;
  days: number;
}

/**
 * Writes a validated backup into IndexedDB and rebuilds the per-day counters so
 * numbering continues exactly where the restored queue left off. Tickets whose
 * day/number already exists are renumbered to the end of that day, so a merge
 * can never produce duplicate queue numbers.
 */
export async function importBackup(
  backup: BackupFile,
  options: ImportOptions,
): Promise<ImportSummary> {
  let added = 0;
  let skipped = 0;
  let renumbered = 0;

  await db.transaction('rw', db.tickets, db.counters, async () => {
    if (options.mode === 'replace') {
      await db.tickets.clear();
      await db.counters.clear();
    }

    const existing = new Set((await db.tickets.toArray()).map((t) => t.id));
    const usedByDay = new Map<string, Set<number>>();
    const maxByDay = new Map<string, number>();

    for (const ticket of backup.tickets) {
      if (existing.has(ticket.id)) {
        skipped += 1;
        continue;
      }

      let used = usedByDay.get(ticket.dayKey);
      if (!used) {
        const rows = await db.tickets.where('dayKey').equals(ticket.dayKey).toArray();
        used = new Set(rows.map((row) => row.seq));
        usedByDay.set(ticket.dayKey, used);
        maxByDay.set(
          ticket.dayKey,
          rows.reduce((max, row) => Math.max(max, row.seq), 0),
        );
      }

      let seq = ticket.seq;
      let code = ticket.code;
      if (used.has(seq)) {
        seq = Math.max(maxByDay.get(ticket.dayKey) ?? 0, ...used, 0) + 1;
        code = `${backup.settings.prefix}-${String(seq).padStart(3, '0')}`;
        renumbered += 1;
      }

      used.add(seq);
      maxByDay.set(ticket.dayKey, Math.max(maxByDay.get(ticket.dayKey) ?? 0, seq));

      await db.tickets.put({ ...ticket, seq, code });
      existing.add(ticket.id);
      added += 1;
    }

    for (const [key] of usedByDay) {
      const all = await db.tickets.where('dayKey').equals(key).toArray();

      // Restore invariant: at most one ticket can be at the counter per day.
      // Extra "serving" records go back to the waiting list instead of being lost.
      const serving = all
        .filter((row) => row.status === 'serving')
        .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0));
      for (const extra of serving.slice(1)) {
        await db.tickets.update(extra.id, {
          status: 'waiting',
          calledAt: null,
          completedAt: null,
          statusChangedAt: Date.now(),
        });
      }

      await db.counters.put({
        dayKey: key,
        lastSeq: all.reduce((max, row) => Math.max(max, row.seq), 0),
        issued: all.length,
      });
    }
  });

  let settingsApplied = false;
  if (options.includeSettings) {
    await db.settings.put({ ...backup.settings, id: SETTINGS_ID });
    settingsApplied = true;
  }

  broadcast();

  return {
    added,
    skipped,
    renumbered,
    settingsApplied,
    days: new Set(backup.tickets.map((t) => t.dayKey)).size,
  };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}
