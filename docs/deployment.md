# Deploying Antrilah

Antrilah is a static site. `npm run build` produces a `dist/` folder containing `index.html`,
hashed assets, the manifest, the icon and `sw.js`. There is no server, database, environment
variable or secret to configure.

## Build

```bash
npm install
npm run build
# dist/ now contains the deployable site
```

You can check it locally before uploading:

```bash
npm run preview   # http://localhost:3000
```

Because the build uses relative asset paths, the same `dist/` works at a domain root
(`https://example.com/`) or in a subdirectory (`https://example.com/queue/`).

## Choose a host

| Host | Setup |
| --- | --- |
| **GitHub Pages** | Settings → Pages → Source: *GitHub Actions*. The workflow in `.github/workflows/pages.yml` builds and deploys on every push to `main`. For a project site the URL is `https://<user>.github.io/<repo>/` — relative paths make that work without changes. |
| **Cloudflare Pages** | Connect the repo, framework preset *None*, build command `npm run build`, output directory `dist`. |
| **Netlify** | Build command `npm run build`, publish directory `dist`. |
| **Vercel** | Framework preset *Vite*, build command `npm run build`, output directory `dist`. |
| **nginx / Apache** | Copy the contents of `dist/` into the document root (or a subfolder). |
| **Local network** | `npm run preview -- --host 0.0.0.0`, then open `http://<machine-ip>:3000` on the counter device. |
| **No hosting at all** | Put `dist/` on a USB stick and open `index.html` — most browsers restrict service workers on `file://`, so offline caching and installation need HTTP(S). |

## HTTPS

Service workers — and therefore offline mode and "Install app" — require a secure context:
`https://` or `http://localhost`. GitHub Pages, Cloudflare Pages, Netlify and Vercel provide TLS
automatically. On a LAN or an internal server, put Antrilah behind HTTPS if you want offline
support; the queue itself still works without it.

## Subdirectory deployments

Nothing to change: the build uses `base: './'`. Upload the *contents* of `dist/` into the
subfolder and open that folder's URL. The service worker registers with a scope relative to its
own location (for example `/queue/`), so multiple copies on one domain do not fight over caches.

## nginx example

```nginx
server {
  listen 443 ssl;
  server_name queue.example.com;
  root /var/www/antrilah;

  # The app is a single page; hash routing needs no rewrites.
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Hashed assets never change — cache them hard.
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Always revalidate the service worker and the HTML shell.
  location = /sw.js {
    add_header Cache-Control "no-cache";
  }
  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
```

## Updating a deployment

1. `npm run build` and upload the new `dist/` (or push to `main` for the Pages workflow).
2. The new service worker installs in the background; open dashboards show a
   **New version ready → Reload** prompt.
3. On activation the old `antrilah-*` cache is deleted, so users do not keep stale assets.

If you change caching behaviour itself (rather than just the app code), bump `VERSION` in
`public/sw.js` so the new cache name is used.

Do not rename or move `sw.js` without updating `src/lib/pwa.ts`; the scope depends on its path.

## Verify the deployment

1. Open the site over HTTPS; the app renders and `#/join` issues a ticket.
2. DevTools → Application → Service Workers shows an activated worker, and Cache Storage shows
   one `antrilah-*` cache with the shell assets.
3. Reload once, switch the network to *Offline* in DevTools, reload again — the app still opens
   and issuing a ticket still works.
4. Open `#/admin` → **QR** and set **Change public URL** to the deployed address, so printed
   codes keep working.

## Custom domain and QR codes

The QR code points at the current address unless a public URL is set in **Admin → Settings** (or
**QR → Change public URL**). Set the final domain *before* printing posters; the setting is stored
locally, so each counter device needs it once (or restore a backup that includes settings).

## Troubleshooting

- **Blank page after upload** — check that `dist/index.html` and `dist/assets/` were uploaded
  together, and that the host serves `.js` files as `text/javascript`.
- **404s under a subpath** — confirm the build is current; older builds used absolute paths.
- **Offline mode does nothing** — the page must be served over HTTPS (or localhost), and the
  production build must be used (`npm run dev` intentionally has no service worker).
- **Old version keeps loading** — hard-reload once, or unregister the worker in DevTools; after
  that the update prompt handles future releases.
- **QR code points at localhost** — set the public URL in Settings, then reprint.
