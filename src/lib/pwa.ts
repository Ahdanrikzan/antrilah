/**
 * Service worker registration + update handling.
 * Registration only happens in production builds — dev keeps Vite's HMR intact.
 */
export function registerServiceWorker(onUpdateReady: () => void): () => void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => {};

  let cancelled = false;
  const cleanups: Array<() => void> = [];

  const start = async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      if (cancelled) return;

      if (registration.waiting && navigator.serviceWorker.controller) onUpdateReady();

      const onUpdateFound = () => {
        const installing = registration.installing;
        if (!installing) return;
        const onStateChange = () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdateReady();
          }
        };
        installing.addEventListener('statechange', onStateChange);
        cleanups.push(() => installing.removeEventListener('statechange', onStateChange));
      };

      registration.addEventListener('updatefound', onUpdateFound);
      cleanups.push(() => registration.removeEventListener('updatefound', onUpdateFound));
    } catch (error) {
      console.warn('Antrilah: service worker registration failed', error);
    }
  };

  if (document.readyState === 'complete') void start();
  else {
    const onLoad = () => void start();
    window.addEventListener('load', onLoad);
    cleanups.push(() => window.removeEventListener('load', onLoad));
  }

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}

/** Asks a waiting service worker to take over, then reloads. */
export async function applyUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);

  if (registration?.waiting) {
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.setTimeout(reload, 1500);
    return;
  }

  window.location.reload();
}
