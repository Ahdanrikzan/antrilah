export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Local (not UTC) calendar day key, so "today" matches the counter's clock. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function labelDayKey(key: string): string {
  const today = localDayKey();
  if (key === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localDayKey(yesterday)) return 'Yesterday';
  return parseDayKey(key).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatClock(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function minutesBetween(from: number, to: number): number {
  return Math.max(0, Math.round((to - from) / 60_000));
}

export function humanWait(minutes: number): string {
  if (minutes <= 0) return 'any moment';
  if (minutes === 1) return 'about 1 min';
  if (minutes < 60) return `about ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `about ${h}h ${m}m` : `about ${h}h`;
}

export function waitLabel(ts: number | null | undefined, now: number): string {
  if (!ts) return '—';
  const mins = minutesBetween(ts, now);
  if (mins < 1) return 'just now';
  return `${mins} min`;
}

/** Public join URL for QR codes and share links. */
export function joinUrl(base?: string): string {
  const raw = (base ?? '').trim();
  const root = raw || `${window.location.origin}${window.location.pathname}`;
  return `${root.replace(/#.*$/, '').replace(/\/+$/, '')}/#/join`;
}

export function ticketUrl(id: string): string {
  const root = `${window.location.origin}${window.location.pathname}`
    .replace(/#.*$/, '')
    .replace(/\/+$/, '');
  return `${root}/#/ticket/${id}`;
}

/** Returns a valid #RRGGBB colour or the Antrilah yellow. */
export function safeColor(value: string | undefined, fallback = '#FFD93D'): string {
  return /^#[0-9a-f]{6}$/i.test((value ?? '').trim()) ? (value as string).trim() : fallback;
}

/** Picks ink or cream text for the supplied background, based on luminance. */
export function readableInk(hex: string): '#111111' | '#FFFDF7' {
  const colour = safeColor(hex);
  const r = parseInt(colour.slice(1, 3), 16);
  const g = parseInt(colour.slice(3, 5), 16);
  const b = parseInt(colour.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#FFFDF7';
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
