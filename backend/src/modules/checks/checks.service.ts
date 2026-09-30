import { randomUUID } from 'node:crypto';
import { transaction } from '../../db/database.js';
import { CATEGORY_KEYS, CATEGORY_NAMES, type CategoryKey } from '../../domain.js';
import { conflict, notFound, unprocessable } from '../../lib/errors.js';
import { addDays, localDate, toIso, toIsoOrNull } from '../../lib/time.js';
import { cameraRepository } from '../cameras/cameras.repository.js';
import { toCameraDto } from '../cameras/cameras.service.js';
import type { CameraDto } from '../cameras/cameras.types.js';
import { notificationService } from '../notifications/notifications.service.js';
import { checkRepository, type CheckRecord } from './checks.repository.js';
import type { IngestCheckInput, VerificationInput } from './checks.schemas.js';

export interface CheckDto {
  id: string;
  cameraId: string;
  result: 'pass' | 'fail';
  message: string;
  at: string;
  fixedAt: string | null;
}

export interface CategoryDto {
  key: CategoryKey;
  score: number | null;
  detail: string;
  checkedAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const toCheckDto = (c: CheckRecord): CheckDto => ({
  id: c.id,
  cameraId: c.cameraId,
  result: c.result,
  message: c.message,
  at: toIso(c.at),
  fixedAt: toIsoOrNull(c.fixedAt),
});

const percent = (passed: number, total: number) => Math.round((passed / total) * 100);

export const checkService = {
  list(accountId: string, limit: number): CheckDto[] {
    return checkRepository.list(accountId, limit).map(toCheckDto);
  },

  summaryToday(accountId: string): { total: number; passed: number } {
    return checkRepository.summary(accountId, localDate(Date.now()));
  },

  fix(accountId: string, id: string): CheckDto {
    return transaction(() => {
      const check = checkRepository.find(accountId, id);
      if (!check) throw notFound('That check was not found.');
      if (check.result !== 'fail') throw conflict('Only failed checks can be marked as fixed.');
      if (check.fixedAt !== null) return toCheckDto(check);
      const now = Date.now();
      checkRepository.markFixed(accountId, id, now);
      return toCheckDto({ ...check, fixedAt: now });
    });
  },

  /** Scores are the pass rate of each category over the last 24 hours. */
  categories(accountId: string): CategoryDto[] {
    const stats = new Map(checkRepository.categoryWindow(accountId, Date.now() - DAY_MS).map((s) => [s.category, s]));
    return CATEGORY_KEYS.map((key) => {
      const s = stats.get(key);
      if (!s || s.total === 0) {
        return { key, score: null, detail: `No ${CATEGORY_NAMES[key].toLowerCase()} checks in the last 24 hours.`, checkedAt: null };
      }
      const open = s.openFailMessage
        ? `; open issue: ${s.openFailMessage}${s.openFailCamera ? ` (${s.openFailCamera})` : ''}.`
        : ', with no open issues.';
      return {
        key,
        score: percent(s.passed, s.total),
        detail: `${s.passed} of ${s.total} checks passed in the last 24 hours${open}`,
        checkedAt: toIso(s.lastAt),
      };
    });
  },

  /** Daily overall score: the average of each category's pass rate that day. Days without checks are left out. */
  trend(accountId: string, days: number): Array<{ date: string; score: number }> {
    const today = localDate(Date.now());
    const from = addDays(today, -(days - 1));
    const perDay = new Map<string, number[]>();
    for (const row of checkRepository.daily(accountId, from, today)) {
      if (row.total === 0) continue;
      const list = perDay.get(row.date) ?? [];
      list.push((row.passed / row.total) * 100);
      perDay.set(row.date, list);
    }
    return [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({ date, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }));
  },

  ingest(accountId: string, inputs: IngestCheckInput[]): CheckDto[] {
    const now = Date.now();
    const toDeliver: string[] = [];
    const created = transaction(() => {
      const cameras = new Map(cameraRepository.list(accountId).map((c) => [c.id, c]));
      return inputs.map((input, index) => {
        const camera = cameras.get(input.cameraId);
        if (!camera) {
          throw unprocessable('Unknown camera.', [{ path: `${index}.cameraId`, message: `No camera ${input.cameraId} on this account` }]);
        }
        const at = input.at ? Date.parse(input.at) : now;
        if (at > now + MAX_CLOCK_SKEW_MS) {
          throw unprocessable('Check time is in the future.', [{ path: `${index}.at`, message: 'Time is more than 5 minutes ahead of the server' }]);
        }
        const check: CheckRecord = {
          id: randomUUID(),
          accountId,
          cameraId: camera.id,
          category: input.category,
          result: input.result,
          message: input.message,
          at,
          localDate: localDate(at),
          fixedAt: null,
        };
        checkRepository.insert(check);
        toDeliver.push(...notificationService.queueForFailedCheck(check, camera));
        return check;
      });
    });
    notificationService.dispatch(toDeliver);
    return created.map(toCheckDto);
  },

  setVerification(accountId: string, cameraId: string, input: VerificationInput): CameraDto {
    const camera = cameraRepository.find(accountId, cameraId);
    if (!camera) throw notFound(`Camera ${cameraId} was not found.`);
    const at = input.verifiedAt ? Date.parse(input.verifiedAt) : Date.now();
    cameraRepository.setVerification(accountId, cameraId, input.feedVerified, at);
    return toCameraDto({ ...camera, feedVerified: input.feedVerified, verifiedAt: at });
  },
};
