# Antrilah backup format

Antrilah exports one JSON document containing every ticket and the full business settings.
The same document is accepted by the importer, which validates it before touching IndexedDB.

- Format marker: `antrilah-backup`
- Current version: `2`
- Encoding: UTF-8 JSON
- Typical filename: `antrilah-backup-2026-11-14.json`

## Top level

```json
{
  "format": "antrilah-backup",
  "version": 2,
  "app": "antrilah",
  "exportedAt": "2026-11-14T09:41:07.512Z",
  "settings": { "...": "see below" },
  "tickets": []
}
```

| Field        | Type   | Required | Notes                                                    |
| ------------ | ------ | -------- | -------------------------------------------------------- |
| `format`     | string | yes      | Must be exactly `antrilah-backup`.                       |
| `version`    | number | yes      | Must be ≤ the version the app supports (currently `2`).   |
| `app`        | string | no       | Informational.                                           |
| `exportedAt` | string | no       | ISO timestamp, shown in the restore dialog.              |
| `settings`   | object | no       | Sanitised on import; missing fields fall back to defaults. |
| `tickets`    | array  | yes      | Up to 50 000 records.                                    |

## Ticket record

```json
{
  "id": "2026-11-14-0007-k3f9a1",
  "dayKey": "2026-11-14",
  "seq": 7,
  "code": "A-007",
  "name": "Maya Rivera",
  "phone": "+1 555 0100",
  "note": "",
  "status": "done",
  "createdAt": 1763114400000,
  "calledAt": 1763114820000,
  "completedAt": 1763115300000,
  "statusChangedAt": 1763115300000
}
```

| Field             | Type             | Required | Validation                                         |
| ----------------- | ---------------- | -------- | -------------------------------------------------- |
| `id`              | string           | no       | Generated when missing or empty; duplicates skipped. |
| `dayKey`          | string           | yes      | Must match `YYYY-MM-DD`.                           |
| `seq`             | integer ≥ 1      | yes      | Per-day queue number.                              |
| `code`            | string           | no       | Rebuilt from the prefix and `seq` when missing.    |
| `name`            | string           | no       | Defaults to `Walk-in`, trimmed to 60 chars.        |
| `phone`           | string           | no       | Trimmed to 32 chars.                               |
| `note`            | string           | no       | Trimmed to 120 chars.                              |
| `status`          | enum             | no       | `waiting`, `serving`, `done`, `skipped`, `cancelled`; unknown values become `waiting`. |
| `createdAt`       | number (epoch ms)| no       | Defaults to import time.                           |
| `calledAt`        | number \| null   | no       |                                                    |
| `completedAt`     | number \| null   | no       |                                                    |
| `statusChangedAt` | number           | no       | Falls back to `completedAt`, `calledAt`, `createdAt`. |

Times are epoch milliseconds in the exporting device's clock. `dayKey` is the **local**
calendar day of the device that issued the ticket, which is what numbering is based on.

## Settings object

| Field                 | Type   | Default                 | Range            |
| --------------------- | ------ | ----------------------- | ---------------- |
| `businessName`        | string | `Antrilah Queue`        | 1–60 chars       |
| `tagline`             | string | —                       | ≤ 120 chars      |
| `description`         | string | `""`                    | ≤ 300 chars      |
| `logoDataUrl`         | string | `""`                    | raster data URL, ≤ 400 000 chars |
| `brandColor`          | string | `#FFD93D`               | `#RRGGBB`        |
| `soundEnabled`        | boolean| `true`                  |                  |
| `soundOnCall`         | boolean| `true`                  |                  |
| `soundOnJoin`         | boolean| `false`                 |                  |
| `soundVolume`         | number | `60`                    | 0–100            |
| `soundName`           | string | `chime`                 | `chime`, `bell`, `blip` |
| `serviceLabel`        | string | `Front desk`            | ≤ 40 chars       |
| `prefix`              | string | `A`                     | A–Z / 0–9, ≤ 3   |
| `avgServiceMinutes`   | number | `6`                     | 1–180            |
| `openHours`           | string | `Mon–Sat · 9:00 – 18:00`| ≤ 60 chars       |
| `welcomeNote`         | string | —                       | ≤ 400 chars      |
| `qrBaseUrl`           | string | `""`                    | ≤ 200 chars      |
| `autoSkipMinutes`     | number | `0` (off)               | 0–600            |
| `autoCompleteMinutes` | number | `0` (off)               | 0–600            |
| `retentionDays`       | number | `0` (keep forever)      | 0–3650           |

`id` is always normalised to `app`; nothing else about the field is trusted.

## Import behaviour

1. The text is parsed and the shape validated. Failures throw a `BackupError` with a specific
   message and **no data is written**.
2. Duplicate `id` values inside the file are dropped (first wins).
3. **Merge**: existing tickets are kept; incoming records with an existing `id` are counted
   as skipped.
4. **Replace**: all local tickets and counters are deleted inside the transaction first.
5. **Number conflicts**: if a different ticket already uses the same `dayKey` + `seq` (typical
   of a merge), the incoming record is moved to the end of that day and its `code` is rebuilt
   from the prefix — the import summary reports the count as `renumbered`.
6. Cursors (`counters`) are rebuilt per imported day as `max(seq)` and the number of tickets,
   so the next issued number continues correctly.
7. **One ticket at the counter**: if a day ends up with more than one `serving` record after a
   merge, only the most recently called stays `serving`; the others return to `waiting` so no
   customer is silently dropped.
8. Settings are written only when "Restore business settings too" is enabled.

## Limits and safety

- Maximum 50 000 tickets per file.
- File type is not trusted; only the parsed content matters.
- Import is a single IndexedDB transaction: either the tickets land together or not at all.
- There is no server, so nothing is uploaded during export or import.

## Producing a backup by hand

Any JSON with the marker above is accepted, which makes synthetic or migrating data possible:

```json
{
  "format": "antrilah-backup",
  "version": 2,
  "settings": { "businessName": "Corner Café", "prefix": "C" },
  "tickets": [
    { "dayKey": "2026-11-14", "seq": 1, "name": "First guest", "status": "waiting" }
  ]
}
```

Append to an existing queue with **Merge**, or start clean with **Replace all**.
