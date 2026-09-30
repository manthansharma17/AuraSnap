# AURA-Snap Backend: Change Record

**Date:** 2026-09-29
**Scope:** New backend service in `backend/`. The frontend (`frontend/`) and the analyzer notebook (`hygiene_map_demo/`) were not modified.

---

## 1. Summary

Before this change the project had no backend. The frontend ran entirely on mock data and `localStorage`.

This change adds a complete API that implements every section of the *Data Contract for the Backend Team*:
accounts, category scores, trend, checks and alerts, cameras and recorder connection, and staff. It also adds the
pieces the contract needs but did not define: an ingest API for the camera analyzer, RTSP-to-HLS streaming, and
alert delivery to staff.

| Item | Status |
| --- | --- |
| Type check (`tsc --noEmit`, strict, no `any`) | Passes |
| Production build (`npm run build`) | Passes |
| End-to-end test (`npm run smoke`) | 53 of 53 checks pass |

---

## 2. Technology choices

| Choice | Reason |
| --- | --- |
| Node.js 22.13+ with Express 5 | Express 5 forwards rejected promises to the error handler, so no async route can leave an unhandled rejection. |
| TypeScript, strict mode | Required by the brief. `noUncheckedIndexedAccess` is also on. |
| SQLite via built-in `node:sqlite` | No database server and no native compile step on Windows. WAL mode and foreign keys are enabled. Moving to Postgres is recommended if the API runs on several servers. |
| Zod | Validation and sanitising (trimming, normalising phone numbers and emails) of every body, path parameter and query string. |
| bcryptjs (12 rounds), jsonwebtoken (HS256) | Password hashing and login tokens. |
| helmet, cors, express-rate-limit | Security headers, a CORS allow-list and brute-force protection. |
| ffmpeg (optional, external) | Converts RTSP camera feeds to HLS, which browsers can play. |

---

## 3. Files added

```
backend/
├── package.json, tsconfig.json, .env.example, .gitignore, README.md, CHANGES.md
├── scripts/smoke.mjs                      End-to-end test with a fake RTSP recorder
└── src/
    ├── server.ts                          Start-up, stream start, graceful shutdown
    ├── app.ts                             Middleware and route wiring (/api and /api/v1)
    ├── config.ts                          Validated environment settings (fails fast)
    ├── domain.ts                          Zones, roles, areas, category keys
    ├── types/express.d.ts                 Typed req.account and req.principal
    ├── db/database.ts                     Schema, connection, transaction helper
    ├── db/rows.ts                         Type-safe row readers
    ├── lib/                               errors, validate, time zone, crypto helpers
    ├── middleware/auth.ts                 requireUser (JWT), requireIngestKey (analyzer)
    ├── middleware/errorHandler.ts         Central error and 404 handling
    └── modules/
        ├── auth/                          register, login, token and analyzer-key logic
        ├── account/                       account info, analyzer key rotation
        ├── cameras/                       RTSP probe, discovery, stream manager, camera API
        ├── checks/                        checks, fix, summary, categories, trend, ingest
        ├── staff/                         staff CRUD
        └── notifications/                 failed-check alerts via webhook
```

Each module follows the same layering: routes → controller → service → repository.

---

## 4. Database schema

| Table | Purpose | Key points |
| --- | --- | --- |
| `accounts` | Restaurant accounts | Unique login id (email lower-cased, phone digits only), bcrypt hash, SHA-256 hash of the analyzer key |
| `recorders` | One recorder per account | Password encrypted with AES-256-GCM |
| `cameras` | Cameras per account | Ids `cam-1`, `cam-2`… stay stable across re-tests; random stream key; tamper-check result |
| `checks` | Pass/fail results from the analyzer | Stored in UTC plus the kitchen's local date for "today" and trend buckets; indexed by account and time |
| `staff` | Staff per account | `EMP-####` ids, shift times, alert preference |
| `notifications` | Alert log | Status `pending`, `sent`, `failed` or `skipped`, with the reason |

All data is scoped by account. Every query is parameterised, and deleting an account cascades to its data.

---

## 5. Endpoints

All routes answer under both `/api` and `/api/v1`.

### Contract endpoints

| Method | Path | Behaviour |
| --- | --- | --- |
| POST | `/api/auth/register` | 201 `{ token, name }`. 409 if the email or phone exists. Rate-limited. |
| POST | `/api/auth/login` | `{ token, name }`. 401 on wrong credentials, with the same response time whether or not the account exists. Rate-limited. |
| GET | `/api/categories` | Always six keys. Score is the pass rate over the last 24 hours. `detail` names any open issue and its camera. |
| GET | `/api/trend?days=N` | N from 1 to 90. One entry per day, oldest first. |
| GET | `/api/checks?limit=N` | N from 1 to 200 (default 50). Newest first. |
| GET | `/api/checks/summary` | `{ total, passed }` for today in the kitchen's time zone. |
| POST | `/api/checks/{id}/fix` | Returns the updated check. Repeating it is harmless. 409 for a passed check, 404 for another account's check. |
| GET | `/api/cameras` | Contract camera shape. |
| POST | `/api/network/test` | Real RTSP connection (see section 6). Returns `{ connected: true, cameras }` or `{ connected: false, error }`. |
| GET, POST | `/api/staff` | POST generates the next `EMP-####` id when none is sent. |
| PUT, DELETE | `/api/staff/{empId}` | PUT replaces all fields. DELETE returns 204. |

### Added endpoints

| Method | Path | Why |
| --- | --- | --- |
| GET | `/api/account` | Account details and whether an analyzer key exists. |
| POST | `/api/account/ingest-key` | Issues a new analyzer key and invalidates the old one. The key is shown only once. |
| PUT | `/api/cameras/{id}` | Set a camera's name and zone after discovery. |
| POST | `/api/ingest/checks` | The analyzer sends one check or up to 100: `{ cameraId, category, result, message, at? }`. |
| PUT | `/api/ingest/cameras/{id}/verification` | The analyzer reports the tamper check: `{ feedVerified, verifiedAt? }`. |
| GET | `/api/health` | Liveness check that also touches the database. |

### Access control

| Caller | Credential | Allowed |
| --- | --- | --- |
| Dashboard user | `Authorization: Bearer <token>` | All routes except `/api/ingest/*` |
| Camera analyzer | `X-Ingest-Key: <key>` | Only `/api/ingest/*` |

Sending both credentials returns 403.

### Error format

```json
{ "success": false, "error": "Readable message", "code": "VALIDATION_FAILED", "details": [{ "path": "phone", "message": "Enter a valid phone number" }] }
```

Status codes used: 400 malformed JSON, 401, 403, 404, 409 conflict, 413 body too large, 422 validation, 429 rate limit, 500.

---

## 6. Features in detail

**Recorder connection.** The test speaks RTSP directly to the recorder and handles Basic and Digest logins.
Without `channels`, it tries stream paths used by common brands (Hikvision, Dahua and generic `/live/chN`
styles) and counts channels until one is missing (up to `RTSP_MAX_CHANNELS`). With `channels`, it checks exactly
those paths. A wrong password, an unreachable address and a recorder with no streams each return a clear
`connected: false` message. On success the recorder and cameras are saved in one transaction.

**Video streaming.** Each camera runs one ffmpeg process that repackages RTSP to HLS without re-encoding. The
result is served at `/streams/<random key>/index.m3u8`. A crashed process restarts with increasing delays of up
to one minute. If ffmpeg is missing, the server logs a warning and `streamUrl` is `null`.

**Alerts.** When a failed check arrives, every staff member with `notify: true` whose area matches the camera's
zone (or is `All areas`) and whose shift covers the check time is alerted. Night shifts are handled. The alert is
recorded in the same transaction as the check and sent after it commits, as a POST to `NOTIFY_WEBHOOK_URL`. The
POST is signed in `X-Aura-Signature` when `NOTIFY_WEBHOOK_SECRET` is set.

**Time zones.** All times are returned as ISO 8601 with the kitchen's offset, for example
`2026-09-29T10:42:00+05:30`. "Today" and trend days follow `APP_TIMEZONE`, which defaults to `Asia/Kolkata`.

---

## 7. Differences from the data contract

| Topic | Contract | Implemented | Frontend impact |
| --- | --- | --- | --- |
| Error body | `{ "error": "..." }` | Same `error` string, plus `success`, `code` and `details` | None if the page reads only `error` |
| Category with no recent checks | Score is always a number | `score: null`, `checkedAt: null` | Skip nulls when averaging the overall score |
| Newly discovered camera | `zone` is always one of five | `zone: null` until set with `PUT /api/cameras/{id}` | Show "Unassigned" and offer a zone picker |
| Trend days with no checks | One entry per day | Days without checks are left out | The chart should allow gaps |
| Check id | `"c1"` | UUID | None, it is an opaque string |

---

## 8. Configuration

Settings are read from `.env`. See `.env.example` for all of them. The two required secrets are:

- `JWT_SECRET`: at least 32 random characters.
- `ENCRYPTION_KEY`: 64 hex characters, used for recorder passwords. Changing it makes saved recorder passwords unreadable.

The server refuses to start and lists the problem when a setting is missing or invalid.

---

## 9. Testing

`npm run smoke` starts the real server on a throwaway database with a fake Digest-protected RTSP recorder. It
checks:

- **Accounts:** register, duplicates, validation errors, malformed JSON, login, and bad or missing tokens.
- **Recorder and cameras:** wrong password, unreachable address, invalid input, discovery, stable ids on re-test, camera updates, and isolation between accounts.
- **Staff:** create, generated ids, duplicates, night shifts, validation, update, and delete.
- **Analyzer:** keys, unknown cameras, future timestamps, batch ingest, and the verification result.
- **Checks and scores:** check ordering and shape, today's summary, category scores and details, fix, trend, the `/api/v1` alias, 404s and CORS.

Two issues were found and fixed during testing. The `/api/v1` alias did not route because Express matched `/api`
first. One test expectation for the trend score was also wrong.

---

## 10. Known limitations and next steps

1. **The frontend is not wired to the API yet.** Pages still read `src/data/*.js` and `localStorage`.
2. **ffmpeg must be installed on the server for live video.** Cameras must send H.264, because browsers cannot play H.265 over HLS.
3. **ffmpeg receives the camera URL, including the password, as a command-line argument.** Other users on the same machine can see it in the process list. Run the server under its own account.
4. **The recorder address is user-supplied**, so the server will connect to any host and port it is given. This is needed to reach LAN recorders. Restrict outbound traffic at the network level if the API is public.
5. **SQLite suits a single server.** Move to Postgres to run several instances.
6. **Alert delivery needs a webhook.** Without `NOTIFY_WEBHOOK_URL`, alerts are logged as `skipped`.
