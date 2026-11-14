import { useCallback, useEffect, useRef, useState } from 'react';
import { onSyncChange } from './sync';

/** Minimal hash router: #/admin, #/join, #/ticket/:id */
export function useHashRoute(): { path: string; parts: string[] } {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [hash, setHash] = useState(read);

  useEffect(() => {
    const onChange = () => setHash(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const path = hash.split('?')[0] || '/';
  return { path, parts: path.split('/').filter(Boolean) };
}

export function navigate(to: string): void {
  if (window.location.hash === `#${to}`) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}

/**
 * Reads IndexedDB and keeps the value fresh. Re-reads on local mutations
 * (broadcast), on changes from other tabs, on tab focus and on a slow poll,
 * which is enough for a local-first queue with no server.
 */
export function useQuery<T>(run: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>();
  const runRef = useRef(run);
  runRef.current = run;
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      runRef.current()
        .then((value) => {
          if (alive) setData(value);
        })
        .catch((error) => console.error('Antrilah read failed', error));
    };
    load();
    const unsubscribe = onSyncChange(load);
    const interval = window.setInterval(load, 4000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      alive = false;
      unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return data;
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => {
          window.prompt('Copy this link:', text);
        });
    } else {
      window.prompt('Copy this link:', text);
    }
  }, []);
  return [copied, copy];
}

/** Boolean flag persisted in localStorage (onboarding, dismissed tips). */
export function useLocalFlag(key: string): [boolean, (value?: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });

  const set = useCallback(
    (next = true) => {
      setValue(next);
      try {
        if (next) window.localStorage.setItem(key, '1');
        else window.localStorage.removeItem(key);
      } catch {
        /* private mode — the flag simply will not persist */
      }
    },
    [key],
  );

  return [value, set];
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}
