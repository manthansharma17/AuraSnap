import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  login_id         TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  ingest_key_hash  TEXT UNIQUE,
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recorders (
  account_id    TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,
  port          INTEGER NOT NULL,
  username      TEXT NOT NULL,
  password_enc  TEXT NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cameras (
  account_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  id             TEXT NOT NULL,
  number         INTEGER NOT NULL,
  name           TEXT NOT NULL,
  zone           TEXT,
  rtsp_path      TEXT NOT NULL,
  stream_key     TEXT NOT NULL UNIQUE,
  feed_verified  INTEGER NOT NULL DEFAULT 0,
  verified_at    INTEGER,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (account_id, id),
  UNIQUE (account_id, rtsp_path)
);

CREATE TABLE IF NOT EXISTS checks (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL,
  camera_id   TEXT NOT NULL,
  category    TEXT NOT NULL,
  result      TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  message     TEXT NOT NULL,
  at          INTEGER NOT NULL,
  local_date  TEXT NOT NULL,
  fixed_at    INTEGER,
  FOREIGN KEY (account_id, camera_id) REFERENCES cameras(account_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_checks_account_at   ON checks(account_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_account_date ON checks(account_id, local_date);

CREATE TABLE IF NOT EXISTS staff (
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  emp_id      TEXT NOT NULL,
  emp_number  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  area        TEXT NOT NULL,
  from_time   TEXT NOT NULL,
  to_time     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  notify      INTEGER NOT NULL,
  PRIMARY KEY (account_id, emp_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  check_id    TEXT NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  emp_id      TEXT NOT NULL,
  recipient   TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error       TEXT,
  created_at  INTEGER NOT NULL,
  sent_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
`;

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
db.exec(SCHEMA);

let depth = 0;

/** Runs fn inside a single SQLite transaction. Nested calls join the outer transaction. */
export function transaction<T>(fn: () => T): T {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth++;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    depth--;
  }
}
