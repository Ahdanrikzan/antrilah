import swSource from '../../public/sw.js?raw';
import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './pwa';

describe('offline service worker', () => {
  it('precaches the shell and serves hashed assets cache-first', () => {
    expect(swSource).toMatch(/const VERSION = 'antrilah-v[\d.]+'/);
    expect(swSource).toContain('/*__PRECACHE__*/');
    expect(swSource).toContain('cache.addAll');
    expect(swSource).toContain('self.skipWaiting()');
    expect(swSource).toContain('clients.claim()');
    expect(swSource).toContain("request.mode === 'navigate'");
    expect(swSource).toContain('caches.match(request)');
    expect(swSource).toContain('caches.match(INDEX)');
    expect(swSource).toContain('self.location.origin');
  });

  it('does not register the worker from the development build', async () => {
    const register = vi.fn();
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    try {
      const cleanup = registerServiceWorker(() => {});
      await Promise.resolve();
      expect(register).not.toHaveBeenCalled();
      cleanup();
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'serviceWorker', descriptor);
      else delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
  });
});
