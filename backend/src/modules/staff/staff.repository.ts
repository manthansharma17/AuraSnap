import { db } from '../../db/database.js';
import { asRow, asRows, bool, num, str, type Row } from '../../db/rows.js';
import type { Role, StaffArea } from '../../domain.js';

export interface StaffMember {
  empId: string;
  name: string;
  role: Role;
  area: StaffArea;
  from: string;
  to: string;
  phone: string;
  email: string;
  notify: boolean;
}

const toStaff = (row: Row): StaffMember => ({
  empId: str(row, 'emp_id'),
  name: str(row, 'name'),
  role: str(row, 'role') as Role,
  area: str(row, 'area') as StaffArea,
  from: str(row, 'from_time'),
  to: str(row, 'to_time'),
  phone: str(row, 'phone'),
  email: str(row, 'email'),
  notify: bool(row, 'notify'),
});

const listStmt = db.prepare('SELECT * FROM staff WHERE account_id = ? ORDER BY emp_number');
const findStmt = db.prepare('SELECT * FROM staff WHERE account_id = ? AND emp_id = ?');
const maxStmt = db.prepare('SELECT COALESCE(MAX(emp_number), 1035) AS n FROM staff WHERE account_id = ?');
const insertStmt = db.prepare(
  `INSERT INTO staff (account_id, emp_id, emp_number, name, role, area, from_time, to_time, phone, email, notify)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const updateStmt = db.prepare(
  `UPDATE staff SET name = ?, role = ?, area = ?, from_time = ?, to_time = ?, phone = ?, email = ?, notify = ?
   WHERE account_id = ? AND emp_id = ?`,
);
const deleteStmt = db.prepare('DELETE FROM staff WHERE account_id = ? AND emp_id = ?');
const alertableStmt = db.prepare(
  "SELECT * FROM staff WHERE account_id = ? AND notify = 1 AND (area = ? OR area = 'All areas')",
);

export const empNumber = (empId: string) => Number(empId.slice(4));

export const staffRepository = {
  list(accountId: string): StaffMember[] {
    return asRows(listStmt.all(accountId)).map(toStaff);
  },

  find(accountId: string, empId: string): StaffMember | undefined {
    const row = asRow(findStmt.get(accountId, empId));
    return row && toStaff(row);
  },

  nextEmpId(accountId: string): string {
    const row = asRow(maxStmt.get(accountId));
    return `EMP-${(row ? num(row, 'n') : 1035) + 1}`;
  },

  insert(accountId: string, s: StaffMember): void {
    insertStmt.run(accountId, s.empId, empNumber(s.empId), s.name, s.role, s.area, s.from, s.to, s.phone, s.email, s.notify ? 1 : 0);
  },

  update(accountId: string, s: StaffMember): void {
    updateStmt.run(s.name, s.role, s.area, s.from, s.to, s.phone, s.email, s.notify ? 1 : 0, accountId, s.empId);
  },

  delete(accountId: string, empId: string): boolean {
    return Number(deleteStmt.run(accountId, empId).changes) > 0;
  },

  /** Staff who asked for alerts and work in this zone (or in all areas). */
  alertableForZone(accountId: string, zone: string): StaffMember[] {
    return asRows(alertableStmt.all(accountId, zone)).map(toStaff);
  },
};
