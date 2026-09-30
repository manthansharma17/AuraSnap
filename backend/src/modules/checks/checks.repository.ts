import { db } from '../../db/database.js';
import { asRow, asRows, num, numOrNull, str, strOrNull, type Row } from '../../db/rows.js';
import type { CategoryKey } from '../../domain.js';

export interface CheckRecord {
  id: string;
  accountId: string;
  cameraId: string;
  category: CategoryKey;
  result: 'pass' | 'fail';
  message: string;
  at: number;
  localDate: string;
  fixedAt: number | null;
}

export interface CategoryWindowStats {
  category: CategoryKey;
  total: number;
  passed: number;
  lastAt: number;
  openFailMessage: string | null;
  openFailCamera: string | null;
}

export interface DailyCategoryStats {
  date: string;
  category: CategoryKey;
  total: number;
  passed: number;
}

const toCheck = (row: Row): CheckRecord => ({
  id: str(row, 'id'),
  accountId: str(row, 'account_id'),
  cameraId: str(row, 'camera_id'),
  category: str(row, 'category') as CategoryKey,
  result: str(row, 'result') === 'pass' ? 'pass' : 'fail',
  message: str(row, 'message'),
  at: num(row, 'at'),
  localDate: str(row, 'local_date'),
  fixedAt: numOrNull(row, 'fixed_at'),
});

const listStmt = db.prepare('SELECT * FROM checks WHERE account_id = ? ORDER BY at DESC, id LIMIT ?');
const findStmt = db.prepare('SELECT * FROM checks WHERE account_id = ? AND id = ?');
const insertStmt = db.prepare(
  `INSERT INTO checks (id, account_id, camera_id, category, result, message, at, local_date, fixed_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
);
const fixStmt = db.prepare(
  "UPDATE checks SET fixed_at = ? WHERE account_id = ? AND id = ? AND result = 'fail' AND fixed_at IS NULL",
);
const summaryStmt = db.prepare(
  "SELECT COUNT(*) AS total, COALESCE(SUM(result = 'pass'), 0) AS passed FROM checks WHERE account_id = ? AND local_date = ?",
);
const windowStmt = db.prepare(
  `SELECT c.category,
          COUNT(*) AS total,
          COALESCE(SUM(c.result = 'pass'), 0) AS passed,
          MAX(c.at) AS last_at,
          (SELECT o.message FROM checks o
            WHERE o.account_id = c.account_id AND o.category = c.category AND o.result = 'fail' AND o.fixed_at IS NULL
            ORDER BY o.at DESC LIMIT 1) AS open_message,
          (SELECT cam.name FROM checks o JOIN cameras cam ON cam.account_id = o.account_id AND cam.id = o.camera_id
            WHERE o.account_id = c.account_id AND o.category = c.category AND o.result = 'fail' AND o.fixed_at IS NULL
            ORDER BY o.at DESC LIMIT 1) AS open_camera
     FROM checks c
    WHERE c.account_id = ? AND c.at >= ?
    GROUP BY c.category`,
);
const dailyStmt = db.prepare(
  `SELECT local_date, category, COUNT(*) AS total, COALESCE(SUM(result = 'pass'), 0) AS passed
     FROM checks WHERE account_id = ? AND local_date >= ? AND local_date <= ?
    GROUP BY local_date, category ORDER BY local_date`,
);

export const checkRepository = {
  list(accountId: string, limit: number): CheckRecord[] {
    return asRows(listStmt.all(accountId, limit)).map(toCheck);
  },

  find(accountId: string, id: string): CheckRecord | undefined {
    const row = asRow(findStmt.get(accountId, id));
    return row && toCheck(row);
  },

  insert(c: CheckRecord): void {
    insertStmt.run(c.id, c.accountId, c.cameraId, c.category, c.result, c.message, c.at, c.localDate);
  },

  markFixed(accountId: string, id: string, at: number): boolean {
    return Number(fixStmt.run(at, accountId, id).changes) > 0;
  },

  summary(accountId: string, date: string): { total: number; passed: number } {
    const row = asRow(summaryStmt.get(accountId, date));
    return row ? { total: num(row, 'total'), passed: num(row, 'passed') } : { total: 0, passed: 0 };
  },

  categoryWindow(accountId: string, sinceMs: number): CategoryWindowStats[] {
    return asRows(windowStmt.all(accountId, sinceMs)).map((row) => ({
      category: str(row, 'category') as CategoryKey,
      total: num(row, 'total'),
      passed: num(row, 'passed'),
      lastAt: num(row, 'last_at'),
      openFailMessage: strOrNull(row, 'open_message'),
      openFailCamera: strOrNull(row, 'open_camera'),
    }));
  },

  daily(accountId: string, fromDate: string, toDate: string): DailyCategoryStats[] {
    return asRows(dailyStmt.all(accountId, fromDate, toDate)).map((row) => ({
      date: str(row, 'local_date'),
      category: str(row, 'category') as CategoryKey,
      total: num(row, 'total'),
      passed: num(row, 'passed'),
    }));
  },
};
