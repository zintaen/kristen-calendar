import type { Reminder } from "./types.js";

/**
 * FR-LUNAR-004 surface - reminder validation, normalization, cache staleness.
 * Reminder type itself lives in types.ts (FR-004 is owner). Cac ham duoi la STUB (throw).
 */

/** Loi validate mot Reminder (FR-LUNAR-004 section 3). */
export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/** Cache ngay duong da tinh san cho mot Reminder (FR-LUNAR-004 section 3). */
export interface OccurrenceCache {
  readonly reminderId: string;
  readonly gregorianDate: string;   // "YYYY-MM-DD"
  readonly lunarLabel: string;
  readonly computedAt: string;      // ISO instant
  readonly engineVersion: string;   // DEC-LUNAR-044 - invalidate khi core doi
}

/** STUB - tra danh sach loi: lunarDay 1..30, lunarMonth 1..12, RAM phai lunarDay==15, ONCE phai co lunarYear, leadTimes khong am, channels khong rong. FR-LUNAR-004 section 3. */
export function validateReminder(r: Reminder): ValidationError[] {
  void r;
  throw new Error("amlich-core: validateReminder chua implement - xem FR-LUNAR-004 section 3");
}

/** STUB - dat mac dinh on dinh: notifyTime "07:00", leadTimes [1], channels ["LOCAL"], enabled true, leapFallback "REGULAR", sort+dedupe leadTimes. FR-LUNAR-004 section 3. */
export function normalizeReminder(r: Partial<Reminder>): Reminder {
  void r;
  throw new Error("amlich-core: normalizeReminder chua implement - xem FR-LUNAR-004 section 3");
}

/** STUB - true khi cache.engineVersion khac engineVersion hien tai (DEC-LUNAR-044). FR-LUNAR-004 section 3. */
export function isCacheStale(c: OccurrenceCache, engineVersion: string): boolean {
  void c; void engineVersion;
  throw new Error("amlich-core: isCacheStale chua implement - xem FR-LUNAR-004 section 3");
}
