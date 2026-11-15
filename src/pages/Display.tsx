import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { db, DEFAULT_SETTINGS, getSettings, type Settings } from '../lib/db';
import { dayKey } from '../lib/queue';
import { useNow, useQuery } from '../lib/hooks';
import { readableInk, safeColor } from '../lib/utils';
import { playSound, primeAudio } from '../lib/sound';

const SOUND_KEY = 'antrilah:display-sound';

function BrandMark({ settings }: { settings: Settings }) {
  if (settings.logoDataUrl) {
    return (
      <img
        src={settings.logoDataUrl}
        alt={`${settings.businessName} logo`}
        className="h-14 w-14 rounded-xl border-2 border-cream/25 bg-cream object-contain p-1 sm:h-16 sm:w-16"
      />
    );
  }
  return (
    <span
      className="grid h-14 w-14 place-items-center rounded-xl border-2 border-cream/25 font-display text-2xl font-black sm:h-16 sm:w-16"
      style={{ backgroundColor: safeColor(settings.brandColor), color: readableInk(settings.brandColor) }}
    >
      {settings.businessName.trim().charAt(0).toUpperCase() || 'A'}
    </span>
  );
}

export default function Display() {
  const settings = useQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS;
  const today = dayKey();
  const tickets = useQuery(() => db.tickets.where('dayKey').equals(today).toArray(), [today]) ?? [];
  const now = useNow(1000);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastCode = useRef<string | null>(null);

  const waiting = tickets.filter((ticket) => ticket.status === 'waiting').sort((a, b) => a.seq - b.seq);
  const serving = tickets.find((ticket) => ticket.status === 'serving') ?? null;
  const recent = tickets
    .filter((ticket) => ticket.status === 'done')
    .sort((a, b) => (b.completedAt ?? b.statusChangedAt) - (a.completedAt ?? a.statusChangedAt))
    .slice(0, 5);

  const brand = safeColor(settings.brandColor);
  const brandInk = readableInk(brand);
  const code = serving?.code ?? '—';
  // Scale with the code length so long prefixes stay on one line inside the panel.
  const codeFontSize = `clamp(3.5rem, ${Math.round((85 / Math.max(3, code.length)) * 10) / 10}vw, 22rem)`;

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // A dark canvas behind the full-height panel avoids a cream flash on overscroll.
  useEffect(() => {
    const previousBackground = document.body.style.backgroundColor;
    const previousColour = document.body.style.colorScheme;
    document.body.style.backgroundColor = '#111111';
    document.body.style.colorScheme = 'dark';
    return () => {
      document.body.style.backgroundColor = previousBackground;
      document.body.style.colorScheme = previousColour;
    };
  }, []);

  useEffect(() => {
    if (!serving) return;
    const changed = lastCode.current !== null && lastCode.current !== serving.code;
    lastCode.current = serving.code;
    if (changed && soundOn && settings.soundEnabled) {
      playSound(settings.soundName, settings.soundVolume);
    }
  }, [serving, soundOn, settings.soundEnabled, settings.soundName, settings.soundVolume]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    } catch {
      /* private mode — the toggle simply will not persist */
    }
    if (next) {
      primeAudio();
      playSound(settings.soundName, settings.soundVolume);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('Antrilah: fullscreen unavailable', error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-cream">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-cream/15 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <BrandMark settings={settings} />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-black uppercase tracking-tight sm:text-2xl">
              {settings.businessName}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50">
              {settings.openHours || 'Queue display'}
              {settings.serviceLabel ? ` · ${settings.serviceLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border-2 border-cream/20 px-3 py-1.5 font-mono text-sm font-black tabular-nums text-cream/80 sm:inline-flex">
            {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-cream/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cream/80 transition-colors hover:bg-cream/10"
          >
            <Icon name={soundOn ? 'bolt' : 'close'} className="h-3.5 w-3.5" />
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-cream/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cream/80 transition-colors hover:bg-cream/10"
          >
            <Icon name="display" className="h-3.5 w-3.5" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <main className="grid flex-1 gap-0 lg:grid-cols-[1.55fr_1fr]">
        <h1 className="sr-only">Waiting-room queue status</h1>
        <section className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <p
            className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]"
            style={{ backgroundColor: brand, color: brandInk }}
          >
            Now serving
          </p>

          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-4 whitespace-nowrap font-mono font-black leading-[0.78] tracking-[-0.06em] text-cream"
            style={{ fontSize: codeFontSize }}
          >
            {code}
          </p>

          <p className="mt-3 text-lg font-semibold text-cream/70 sm:text-2xl">
            {serving
              ? `Please proceed to ${settings.serviceLabel || 'the counter'}`
              : waiting.length
                ? 'The next number will be called shortly'
                : 'Queue is open — take a number at the counter'}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3 border-t-2 border-cream/15 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cream/55">Waiting</p>
              <p className="font-mono text-3xl font-black leading-none text-cream sm:text-4xl">{waiting.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cream/55">Served today</p>
              <p className="font-mono text-3xl font-black leading-none text-cream sm:text-4xl">
                {tickets.filter((ticket) => ticket.status === 'done').length}
              </p>
            </div>
            <p className="ml-auto max-w-xs text-right text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-cream/50">
              Updates automatically · no names shown · runs on this device
            </p>
          </div>
        </section>

        <aside className="grid content-start gap-6 border-t-4 border-cream/15 px-5 py-6 sm:px-8 lg:border-l-4 lg:border-t-0">
          <div>
            <h2 className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.22em] text-cream/55">
              Up next
              <span className="font-mono text-xs">{waiting.length}</span>
            </h2>
            {waiting.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-cream/40">Nobody waiting right now.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {waiting.slice(0, 4).map((ticket, index) => (
                  <li
                    key={ticket.id}
                    className="flex items-baseline justify-between gap-3 rounded-xl border-2 border-cream/15 px-3 py-2"
                  >
                    <span className="font-mono text-2xl font-black leading-none sm:text-3xl">{ticket.code}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-cream/50">
                      {index === 0 ? 'next' : `${index + 1} ahead`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h2 className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.22em] text-cream/55">
              Just served
              <Icon name="check" className="h-3.5 w-3.5" />
            </h2>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-cream/40">Completed numbers will appear here.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {recent.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="rounded-lg border-2 border-cream/15 px-2.5 py-1 font-mono text-lg font-black text-cream/55 line-through decoration-cream/30 decoration-2"
                  >
                    {ticket.code}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-cream/15 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-cream/50 sm:px-8">
        <span>Scan the counter QR code to take a number</span>
        <a href="#/admin" className="underline decoration-2 underline-offset-2 hover:text-cream/60">
          Staff dashboard
        </a>
      </footer>
    </div>
  );
}
