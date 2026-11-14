/**
 * Tiny cross-tab / same-tab change signal.
 * Every mutation in the app calls broadcast(); views subscribe with onSyncChange
 * and re-read IndexedDB, so a customer's tracking tab stays live while staff
 * work in the dashboard tab.
 */
const CHANNEL_NAME = 'antrilah-sync';

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function ensureChannel(): void {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = () => {
    listeners.forEach((cb) => cb());
  };
}

export function onSyncChange(cb: () => void): () => void {
  ensureChannel();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function broadcast(): void {
  ensureChannel();
  listeners.forEach((cb) => cb());
  channel?.postMessage({ t: Date.now() });
}
