export const ZONES = ['Prep Station', 'Cooking Line', 'Wash Area', 'Storage', 'Service Pass'] as const;
export type Zone = (typeof ZONES)[number];

export const STAFF_AREAS = ['All areas', ...ZONES] as const;
export type StaffArea = (typeof STAFF_AREAS)[number];

export const ROLES = ['Manager', 'Supervisor', 'Chef', 'Kitchen staff', 'Cleaner'] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORY_KEYS = ['hygiene', 'floor', 'cold', 'oil', 'cross', 'pest'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_NAMES: Record<CategoryKey, string> = {
  hygiene: 'Personal Hygiene',
  floor: 'Floor & Surface Safety',
  cold: 'Cold Storage',
  oil: 'Cooking Oil Quality',
  cross: 'Cross-Contamination Control',
  pest: 'Pest Control',
};

export const isZone = (v: string | null): v is Zone => v !== null && (ZONES as readonly string[]).includes(v);
export const isCategoryKey = (v: string): v is CategoryKey => (CATEGORY_KEYS as readonly string[]).includes(v);
