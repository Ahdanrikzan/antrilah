import type { SoundName } from './db';

/**
 * Queue sounds are synthesised with the Web Audio API: no audio files, no
 * network requests and nothing to cache beyond this module.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

/** Call from a user gesture so mobile browsers allow later playback. */
export function primeAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

const NOTES: Record<SoundName, Array<{ frequency: number; start: number; length: number }>> = {
  chime: [
    { frequency: 880, start: 0, length: 0.22 },
    { frequency: 1174.66, start: 0.14, length: 0.34 },
  ],
  bell: [
    { frequency: 1046.5, start: 0, length: 0.5 },
    { frequency: 784, start: 0.16, length: 0.55 },
  ],
  blip: [
    { frequency: 660, start: 0, length: 0.12 },
    { frequency: 990, start: 0.1, length: 0.16 },
  ],
};

/**
 * Plays one of the built-in announcement sounds. Volume is 0–100; values above
 * 10 are capped so a dashboard set to 100 is loud but not painful.
 */
export function playSound(name: SoundName, volume: number): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const level = Math.max(0, Math.min(100, volume)) / 100;
  if (level <= 0) return;

  const notes = NOTES[name] ?? NOTES.chime;
  const now = ctx.currentTime;

  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = name === 'bell' ? 'triangle' : 'sine';
    oscillator.frequency.value = note.frequency;

    const start = now + note.start;
    const end = start + note.length;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, level * 0.22), start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
