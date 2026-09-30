import { db } from '../../db/database.js';
import { asRow, asRows, bool, num, numOrNull, str, strOrNull, type Row } from '../../db/rows.js';
import { isZone, type Zone } from '../../domain.js';
import type { CameraRecord, RecorderRecord } from './cameras.types.js';

const toCamera = (row: Row): CameraRecord => {
  const zone = strOrNull(row, 'zone');
  return {
    accountId: str(row, 'account_id'),
    id: str(row, 'id'),
    number: num(row, 'number'),
    name: str(row, 'name'),
    zone: isZone(zone) ? zone : null,
    rtspPath: str(row, 'rtsp_path'),
    streamKey: str(row, 'stream_key'),
    feedVerified: bool(row, 'feed_verified'),
    verifiedAt: numOrNull(row, 'verified_at'),
    createdAt: num(row, 'created_at'),
  };
};

const toRecorder = (row: Row): RecorderRecord => ({
  accountId: str(row, 'account_id'),
  address: str(row, 'address'),
  port: num(row, 'port'),
  username: str(row, 'username'),
  passwordEnc: str(row, 'password_enc'),
});

const listStmt = db.prepare('SELECT * FROM cameras WHERE account_id = ? ORDER BY number');
const listAllStmt = db.prepare('SELECT * FROM cameras ORDER BY account_id, number');
const findStmt = db.prepare('SELECT * FROM cameras WHERE account_id = ? AND id = ?');
const findByPathStmt = db.prepare('SELECT * FROM cameras WHERE account_id = ? AND rtsp_path = ?');
const maxNumberStmt = db.prepare('SELECT COALESCE(MAX(number), 0) AS n FROM cameras WHERE account_id = ?');
const insertStmt = db.prepare(
  `INSERT INTO cameras (account_id, id, number, name, zone, rtsp_path, stream_key, feed_verified, verified_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
);
const updateStmt = db.prepare('UPDATE cameras SET name = ?, zone = ? WHERE account_id = ? AND id = ?');
const verifyStmt = db.prepare('UPDATE cameras SET feed_verified = ?, verified_at = ? WHERE account_id = ? AND id = ?');
const recorderStmt = db.prepare('SELECT * FROM recorders WHERE account_id = ?');
const allRecordersStmt = db.prepare('SELECT * FROM recorders');
const upsertRecorderStmt = db.prepare(
  `INSERT INTO recorders (account_id, address, port, username, password_enc, updated_at) VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT(account_id) DO UPDATE SET address = excluded.address, port = excluded.port,
     username = excluded.username, password_enc = excluded.password_enc, updated_at = excluded.updated_at`,
);

export const cameraRepository = {
  list(accountId: string): CameraRecord[] {
    return asRows(listStmt.all(accountId)).map(toCamera);
  },

  listAll(): CameraRecord[] {
    return asRows(listAllStmt.all()).map(toCamera);
  },

  find(accountId: string, id: string): CameraRecord | undefined {
    const row = asRow(findStmt.get(accountId, id));
    return row && toCamera(row);
  },

  findByPath(accountId: string, rtspPath: string): CameraRecord | undefined {
    const row = asRow(findByPathStmt.get(accountId, rtspPath));
    return row && toCamera(row);
  },

  nextNumber(accountId: string): number {
    const row = asRow(maxNumberStmt.get(accountId));
    return (row ? num(row, 'n') : 0) + 1;
  },

  insert(c: Omit<CameraRecord, 'feedVerified' | 'verifiedAt'>): void {
    insertStmt.run(c.accountId, c.id, c.number, c.name, c.zone, c.rtspPath, c.streamKey, c.createdAt);
  },

  update(accountId: string, id: string, name: string, zone: Zone | null): void {
    updateStmt.run(name, zone, accountId, id);
  },

  setVerification(accountId: string, id: string, verified: boolean, at: number | null): void {
    verifyStmt.run(verified ? 1 : 0, at, accountId, id);
  },

  findRecorder(accountId: string): RecorderRecord | undefined {
    const row = asRow(recorderStmt.get(accountId));
    return row && toRecorder(row);
  },

  listRecorders(): RecorderRecord[] {
    return asRows(allRecordersStmt.all()).map(toRecorder);
  },

  upsertRecorder(r: RecorderRecord, updatedAt: number): void {
    upsertRecorderStmt.run(r.accountId, r.address, r.port, r.username, r.passwordEnc, updatedAt);
  },
};
