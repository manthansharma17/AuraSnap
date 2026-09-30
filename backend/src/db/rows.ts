export type SqlValue = null | number | bigint | string | Uint8Array;
export type Row = Record<string, SqlValue>;

function column(row: Row, key: string): SqlValue {
  if (!(key in row)) throw new Error(`Query result has no column "${key}"`);
  return row[key] ?? null;
}

export function str(row: Row, key: string): string {
  const v = column(row, key);
  if (typeof v !== 'string') throw new Error(`Column "${key}" is not text`);
  return v;
}

export function strOrNull(row: Row, key: string): string | null {
  const v = column(row, key);
  return v === null ? null : str(row, key);
}

export function num(row: Row, key: string): number {
  const v = column(row, key);
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  throw new Error(`Column "${key}" is not numeric`);
}

export function numOrNull(row: Row, key: string): number | null {
  return column(row, key) === null ? null : num(row, key);
}

export function bool(row: Row, key: string): boolean {
  return num(row, key) !== 0;
}

export function asRow(value: unknown): Row | undefined {
  return value === undefined ? undefined : (value as Row);
}

export function asRows(value: unknown[]): Row[] {
  return value as Row[];
}
