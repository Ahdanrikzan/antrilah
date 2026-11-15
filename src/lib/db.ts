import Dexie, { type Table } from 'dexie';
import { broadcast } from './sync';

export type TicketStatus = 'waiting' | 'serving' | 'done' | 'skipped' | 'cancelled';

export const TICKET_STATUSES: TicketStatus[] = ['waiting', 'serving', 'done', 'skipped', 'cancelled'];

export interface Ticket {
  id: string;
  /** Local calendar day, YYYY-MM-DD. Queue numbers reset every day. */
  dayKey: string;
  /** 1-based position within the day. */
  seq: number;
  /** Display code, e.g. A-014. */
  code: string;
  name: string;
  phone: string;
  note: string;
  status: TicketStatus;
  createdAt: number;
  calledAt: number | null;
  completedAt: number | null;
  /** Timestamp of the last status transition — powers "waiting for 12 min". */
  statusChangedAt: number;
}

/** Per-day numbering cursor. One row per day, written in the same transaction. */
export interface DayCounter {
  dayKey: string;
  lastSeq: number;
  issued: number;
}

export type SoundName = 'chime' | 'bell' | 'blip';

export interface Settings {
  id: 'app';
  businessName: string;
  tagline: string;
  /** Longer business description shown on the customer page and TV display. */
  description: string;
  serviceLabel: string;
  prefix: string;
  avgServiceMinutes: number;
  openHours: string;
  welcomeNote: string;
  /** Optional public base URL used when generating QR codes. */
  qrBaseUrl: string;
  /** Local data URL of the uploaded logo (never uploaded anywhere). */
  logoDataUrl: string;
  /** Brand accent used on customer pages and the display. */
  brandColor: string;
  /** Master switch for queue sounds in the dashboard and display. */
  soundEnabled: boolean;
  /** Play a sound when staff call the next ticket. */
  soundOnCall: boolean;
  /** Play a sound when a new customer joins the queue. */
  soundOnJoin: boolean;
  /** 0–100. */
  soundVolume: number;
  soundName: SoundName;
  /** Minutes after which an un-called waiting ticket is auto-skipped. 0 = off. */
  autoSkipMinutes: number;
  /** Minutes after which a called ticket is auto-completed. 0 = off. */
  autoCompleteMinutes: number;
  /** Purge tickets older than this many days. 0 = keep forever. */
  retentionDays: number;
}

/** Local recovery copy of tickets + settings, never uploaded. */
export interface Snapshot {
  id: string;
  createdAt: number;
  reason: string;
  ticketCount: number;
  /** Serialised backup document (see lib/backup.ts). */
  payload: string;
}

export const SETTINGS_ID = 'app' as const;

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  businessName: 'Antrilah Queue',
  tagline: 'Walk in, take a number, get on with your day.',
  description: '',
  serviceLabel: 'Front desk',
  prefix: 'A',
  avgServiceMinutes: 6,
  openHours: 'Mon–Sat · 9:00 – 18:00',
  welcomeNote:
    'Welcome! Take a number below to join the queue. Your ticket updates live on this page — position, wait time and the moment it is your turn.',
  qrBaseUrl: '',
  logoDataUrl: '',
  brandColor: '#FFD93D',
  soundEnabled: true,
  soundOnCall: true,
  soundOnJoin: false,
  soundVolume: 60,
  soundName: 'chime',
  autoSkipMinutes: 0,
  autoCompleteMinutes: 0,
  retentionDays: 0,
};

class AntrilahDB extends Dexie {
  tickets!: Table<Ticket, string>;
  settings!: Table<Settings, string>;
  counters!: Table<DayCounter, string>;
  snapshots!: Table<Snapshot, string>;

  constructor() {
    super('antrilah');

    this.version(1).stores({
      tickets: 'id, dayKey, status, createdAt, seq, code',
      settings: 'id',
    });

    this.version(2)
      .stores({
        tickets: 'id, dayKey, status, createdAt, seq, code, [dayKey+status]',
        settings: 'id',
        counters: 'dayKey',
      })
      .upgrade(async (tx) => {
        const tickets = (await tx.table('tickets').toArray()) as Ticket[];
        const byDay = new Map<string, { seq: number; issued: number }>();

        for (const ticket of tickets) {
          const current = byDay.get(ticket.dayKey) ?? { seq: 0, issued: 0 };
          current.seq = Math.max(current.seq, Number(ticket.seq) || 0);
          current.issued += 1;
          byDay.set(ticket.dayKey, current);
        }

        const counters = tx.table('counters');
        for (const [dayKey, value] of byDay) {
          await counters.put({ dayKey, lastSeq: value.seq, issued: value.issued });
        }

        await tx
          .table('tickets')
          .toCollection()
          .modify((ticket: Ticket) => {
            if (typeof ticket.statusChangedAt !== 'number') {
              ticket.statusChangedAt = ticket.completedAt ?? ticket.calledAt ?? ticket.createdAt ?? Date.now();
            }
          });
      });

    // v3 adds local recovery snapshots; nothing to migrate.
    this.version(3).stores({
      tickets: 'id, dayKey, status, createdAt, seq, code, [dayKey+status]',
      settings: 'id',
      counters: 'dayKey',
      snapshots: 'id, createdAt',
    });
  }
}

export const db = new AntrilahDB();

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get(SETTINGS_ID);
  return stored ? { ...DEFAULT_SETTINGS, ...stored, id: SETTINGS_ID } : DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, id: SETTINGS_ID };
  await db.settings.put(next);
  broadcast();
  return next;
}
