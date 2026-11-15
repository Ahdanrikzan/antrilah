import { db, getSettings, type Snapshot } from './db';
import { buildBackup, importBackup, parseBackup } from './backup';
import { localDayKey } from './utils';

/** Keep the three newest recovery copies; older ones are pruned automatically. */
const KEEP = 3;

export async function listSnapshots(): Promise<Snapshot[]> {
  return db.snapshots.orderBy('createdAt').reverse().toArray();
}

export async function pruneSnapshots(keep = KEEP): Promise<void> {
  const all = await listSnapshots();
  const extra = all.slice(keep);
  if (extra.length) await db.snapshots.bulkDelete(extra.map((snapshot) => snapshot.id));
}

/** Writes a full, validated backup document into the local snapshots table. */
export async function createSnapshot(reason: string): Promise<Snapshot> {
  const [settings, tickets] = await Promise.all([getSettings(), db.tickets.toArray()]);
  const snapshot: Snapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    reason,
    ticketCount: tickets.length,
    payload: JSON.stringify(buildBackup(settings, tickets)),
  };
  await db.snapshots.put(snapshot);
  await pruneSnapshots();
  return snapshot;
}

/** Creates at most one automatic copy per local day. */
export async function ensureDailySnapshot(): Promise<void> {
  const latest = await db.snapshots.orderBy('createdAt').last();
  if (latest && localDayKey(new Date(latest.createdAt)) === localDayKey()) return;
  await createSnapshot('Daily recovery copy');
}

export async function restoreSnapshot(id: string): Promise<void> {
  const snapshot = await db.snapshots.get(id);
  if (!snapshot) throw new Error('Recovery copy not found');
  const backup = parseBackup(snapshot.payload);
  await importBackup(backup, { mode: 'replace', includeSettings: true });
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}

/** Deletes every local table. The caller should reload the page afterwards. */
export async function resetApplication(): Promise<void> {
  await db.delete();
}
