import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { db } from '../lib/db';

/**
 * jsdom has no BroadcastChannel. A no-op implementation still lets the app's
 * same-tab listeners fire through lib/sync.ts without leaking handles between
 * test files.
 */
class TestBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
}

vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);

/**
 * Node 26 exposes an experimental global localStorage that jsdom does not
 * replace. Provide an in-memory Storage for components that persist flags.
 */
class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  if (!window[key]) {
    Object.defineProperty(window, key, { configurable: true, value: new MemoryStorage() });
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });
Element.prototype.scrollIntoView = vi.fn();

beforeEach(async () => {
  await db.delete();
  await db.open();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
