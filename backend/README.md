# AURA-Snap API

Node 22.13+ (tested on 24), Express 5, TypeScript, SQLite (`node:sqlite`, no native build), Zod validation.

## Run

```sh
cp .env.example .env      # then fill JWT_SECRET and ENCRYPTION_KEY (commands are in the file)
npm install
npm run dev               # or: npm run build && npm start
npm run smoke             # end-to-end test of every endpoint (throwaway DB + fake RTSP recorder)
```

For live video, install ffmpeg and keep `STREAMS_ENABLED=true`. Cameras must send H.264 for browsers to play the HLS output.

## Who calls what

| Caller | Auth header | Routes |
| --- | --- | --- |
| Dashboard (frontend) | `Authorization: Bearer <token from login>` | everything below except `/api/ingest/*` |
| Camera analyzer | `X-Ingest-Key: <key>` | `/api/ingest/*` only |

Get an analyzer key with `POST /api/account/ingest-key` (logged in). Calling it again replaces the old key.

## Endpoints

All routes also answer under `/api/v1`.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, id, password }` → 201 `{ token, name }` |
| POST | `/api/auth/login` | `{ id, password }` → `{ token, name }` |
| GET | `/api/account` | `{ name, id, hasIngestKey, createdAt }` |
| POST | `/api/account/ingest-key` | 201 `{ ingestKey }` |
| GET | `/api/categories` | six categories; score = pass rate over the last 24 h, `null` when no checks |
| GET | `/api/trend?days=7\|14\|30` | daily average of category pass rates, oldest first, days without checks omitted |
| GET | `/api/checks?limit=50` | newest first, limit 1–200 |
| GET | `/api/checks/summary` | `{ total, passed }` for today in `APP_TIMEZONE` |
| POST | `/api/checks/{id}/fix` | marks a fail as fixed (idempotent); 409 for a pass |
| GET | `/api/cameras` | |
| PUT | `/api/cameras/{id}` | `{ name?, zone? }` |
| POST | `/api/network/test` | `{ address, port, username, password, channels? }` |
| GET/POST | `/api/staff` | |
| PUT/DELETE | `/api/staff/{empId}` | PUT replaces all fields; DELETE → 204 |
| POST | `/api/ingest/checks` | one check or an array of up to 100: `{ cameraId, category, result, message, at? }` |
| PUT | `/api/ingest/cameras/{id}/verification` | `{ feedVerified, verifiedAt? }` (the tamper check result) |
| GET | `/api/health` | |

Errors: `{ "success": false, "error": "Readable message", "code": "VALIDATION_FAILED", "details": [{ "path", "message" }] }`.

## Recorder discovery

`POST /api/network/test` speaks RTSP to the recorder (Basic and Digest auth). Without `channels` it tries common
stream paths (Hikvision, Dahua and generic `/live/chN` style) and walks channels 1, 2, 3… until one is missing.
With `channels: [{ path, name?, zone? }]` it checks exactly those. On success the recorder is saved with its
password encrypted (AES-256-GCM) and the cameras get stable ids (`cam-1`, `cam-2`…). Discovered cameras have
`zone: null` until set with `PUT /api/cameras/{id}`.

## Alerts

When a failed check arrives, each staff member with `notify: true` whose area is the camera's zone (or
`All areas`) and whose shift covers the check time gets an alert. Alerts are POSTed as JSON
`{ to, message, empId, checkId }` to `NOTIFY_WEBHOOK_URL` (connect your SMS/email gateway there), signed with
`X-Aura-Signature` when `NOTIFY_WEBHOOK_SECRET` is set. Every alert is recorded in the `notifications` table with
its delivery status.
