import { config } from '../config.js';

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(tz, f);
  }
  return f;
}

function localParts(ms: number, tz: string): LocalParts {
  const out: LocalParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of formatter(tz).formatToParts(new Date(ms))) {
    if (part.type in out) out[part.type as keyof LocalParts] = Number(part.value);
  }
  return out;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** ISO 8601 with the kitchen's UTC offset, e.g. 2026-09-28T10:42:00+05:30 */
export function toIso(ms: number, tz: string = config.timezone): string {
  const p = localParts(ms, tz);
  const wholeSecondMs = Math.floor(ms / 1000) * 1000;
  const offset = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - wholeSecondMs) / 60000);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return (
    `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function toIsoOrNull(ms: number | null): string | null {
  return ms === null ? null : toIso(ms);
}

/** Calendar date (YYYY-MM-DD) in the kitchen's time zone. */
export function localDate(ms: number, tz: string = config.timezone): string {
  const p = localParts(ms, tz);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since local midnight in the kitchen's time zone. */
export function localMinutes(ms: number, tz: string = config.timezone): number {
  const p = localParts(ms, tz);
  return p.hour * 60 + p.minute;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Whether a shift covers a given minute of the day. Handles shifts that end after midnight. */
export function shiftCovers(from: string, to: string, minuteOfDay: number): boolean {
  const a = hhmmToMinutes(from);
  const b = hhmmToMinutes(to);
  return a <= b ? minuteOfDay >= a && minuteOfDay < b : minuteOfDay >= a || minuteOfDay < b;
}
