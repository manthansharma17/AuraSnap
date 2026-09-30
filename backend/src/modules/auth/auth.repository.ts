import { db } from '../../db/database.js';
import { asRow, num, str, strOrNull, type Row } from '../../db/rows.js';
import type { AccountRecord, AuthAccount } from './auth.types.js';

const toRecord = (row: Row): AccountRecord => ({
  id: str(row, 'id'),
  name: str(row, 'name'),
  loginId: str(row, 'login_id'),
  passwordHash: str(row, 'password_hash'),
  hasIngestKey: strOrNull(row, 'ingest_key_hash') !== null,
  createdAt: num(row, 'created_at'),
});

const byLoginId = db.prepare('SELECT * FROM accounts WHERE login_id = ?');
const byId = db.prepare('SELECT * FROM accounts WHERE id = ?');
const byIngestHash = db.prepare('SELECT id, name FROM accounts WHERE ingest_key_hash = ?');
const insert = db.prepare(
  'INSERT INTO accounts (id, name, login_id, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
);
const setIngestHash = db.prepare('UPDATE accounts SET ingest_key_hash = ? WHERE id = ?');

export const accountRepository = {
  findByLoginId(loginId: string): AccountRecord | undefined {
    const row = asRow(byLoginId.get(loginId));
    return row && toRecord(row);
  },

  findById(id: string): AccountRecord | undefined {
    const row = asRow(byId.get(id));
    return row && toRecord(row);
  },

  findByIngestKeyHash(hash: string): AuthAccount | undefined {
    const row = asRow(byIngestHash.get(hash));
    return row && { id: str(row, 'id'), name: str(row, 'name') };
  },

  create(account: { id: string; name: string; loginId: string; passwordHash: string; createdAt: number }): void {
    insert.run(account.id, account.name, account.loginId, account.passwordHash, account.createdAt);
  },

  setIngestKeyHash(id: string, hash: string): void {
    setIngestHash.run(hash, id);
  },
};
