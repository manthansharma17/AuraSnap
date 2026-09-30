import { randomUUID } from 'node:crypto';
import { config } from '../../config.js';
import { db } from '../../db/database.js';
import { asRows, str, type Row } from '../../db/rows.js';
import { hmacSha256 } from '../../lib/crypto.js';
import { localMinutes, shiftCovers, toIso } from '../../lib/time.js';
import type { CameraRecord } from '../cameras/cameras.types.js';
import type { CheckRecord } from '../checks/checks.repository.js';
import { staffRepository } from '../staff/staff.repository.js';

const insertStmt = db.prepare(
  `INSERT INTO notifications (id, account_id, check_id, emp_id, recipient, message, status, error, created_at, sent_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
);
const pendingStmt = db.prepare("SELECT id, recipient, message, emp_id, check_id FROM notifications WHERE id IN (SELECT value FROM json_each(?)) AND status = 'pending'");
const markStmt = db.prepare('UPDATE notifications SET status = ?, error = ?, sent_at = ? WHERE id = ?');

interface PendingNotification {
  id: string;
  recipient: string;
  message: string;
  empId: string;
  checkId: string;
}

const toPending = (row: Row): PendingNotification => ({
  id: str(row, 'id'),
  recipient: str(row, 'recipient'),
  message: str(row, 'message'),
  empId: str(row, 'emp_id'),
  checkId: str(row, 'check_id'),
});

async function deliver(n: PendingNotification): Promise<void> {
  const body = JSON.stringify({ to: n.recipient, message: n.message, empId: n.empId, checkId: n.checkId });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.notifyWebhookSecret) headers['x-aura-signature'] = hmacSha256(config.notifyWebhookSecret, body);
  try {
    const res = await fetch(config.notifyWebhookUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
    markStmt.run('sent', null, Date.now(), n.id);
  } catch (error) {
    markStmt.run('failed', error instanceof Error ? error.message.slice(0, 300) : 'Unknown error', null, n.id);
  }
}

export const notificationService = {
  /**
   * Records an alert for each on-shift staff member who asked for alerts in the camera's area.
   * Runs inside the caller's transaction; returns the ids to deliver once it commits.
   */
  queueForFailedCheck(check: CheckRecord, camera: CameraRecord): string[] {
    if (check.result !== 'fail' || camera.zone === null) return [];
    const minute = localMinutes(check.at);
    const recipients = staffRepository
      .alertableForZone(check.accountId, camera.zone)
      .filter((s) => shiftCovers(s.from, s.to, minute));
    const ids: string[] = [];
    const now = Date.now();
    for (const s of recipients) {
      const id = randomUUID();
      const recipient = s.phone || s.email;
      const message = `AURA-Snap alert, ${camera.zone} (${camera.name}): ${check.message}. Seen at ${toIso(check.at).slice(11, 16)}.`;
      const status = config.notifyWebhookUrl && recipient ? 'pending' : 'skipped';
      const error = status === 'skipped' ? (recipient ? 'NOTIFY_WEBHOOK_URL is not set' : 'No phone or email on file') : null;
      insertStmt.run(id, check.accountId, check.id, s.empId, recipient, message, status, error, now);
      if (status === 'pending') ids.push(id);
    }
    return ids;
  },

  /** Sends queued alerts in the background. Never throws. */
  dispatch(ids: string[]): void {
    if (ids.length === 0) return;
    const pending = asRows(pendingStmt.all(JSON.stringify(ids))).map(toPending);
    void Promise.allSettled(pending.map(deliver)).then((results) => {
      for (const r of results) if (r.status === 'rejected') console.error('[notify] delivery crashed', r.reason);
    });
  },
};
