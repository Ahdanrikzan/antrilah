import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Injects the hashed build output into public/sw.js so the service worker can
 * precache the entire app shell for offline use. No Workbox, no extra runtime.
 */
function precacheServiceWorker(): Plugin {
  return {
    name: 'antrilah-precache',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      const entries = ['index.html', 'icon.svg', 'manifest.webmanifest'];

      try {
        for (const file of readdirSync(join(dist, 'assets'))) {
          entries.push(`assets/${file}`);
        }
      } catch {
        // No build assets — nothing to precache beyond the shell.
      }

      const urls = Array.from(new Set(entries)).map((file) => `./${file}`);
      const swPath = join(dist, 'sw.js');

      try {
        const source = readFileSync(swPath, 'utf8');
        if (!source.includes('[/*__PRECACHE__*/]')) {
          console.warn('Antrilah: precache marker missing from dist/sw.js');
          return;
        }
        writeFileSync(swPath, source.replace('[/*__PRECACHE__*/]', JSON.stringify(urls)));
      } catch (error) {
        console.warn('Antrilah: could not inject the precache manifest', error);
      }
    },
  };
}

export default defineConfig({
  // Relative base: the same build works at a domain root or under /sub/path/
  // (GitHub Pages project sites, shared hosting folders, USB sticks).
  base: './',
  plugins: [react(), precacheServiceWorker()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
