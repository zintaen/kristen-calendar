/**
 * FR-LUNAR-004 surface - reminder validation, normalization, cache staleness.
 *
 * Reminder type itself lives in types.ts (FR-004 la owner); day chi la cac ham thuan tinh toan,
 * zero-dependency, khong I/O (NFR-Offline). Consumer import type Reminder tu "@cyberskill/amlich-core",
 * KHONG redeclare (tranh drift schema xuong FR-005/006/016/017/018).
 */
import type { Reminder, ReminderChannel, LeapFallback } from "./types.js";

// Re-export core types qua reminder.ts de khop CONTRACT (§5 import { type Reminder, type SolarDate } from "./reminder").
export type {
  Reminder,
  ReminderType,
  Recurrence,
  ReminderChannel,
  LeapFallback,
  NotificationStyle,
  SolarDate,
  LunarDate,
} from "./types.js";

/** Loi validate mot Reminder (FR-LUNAR-004 §1 #12). */
export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/** Cache ngay duong da tinh san cho mot Reminder (FR-LUNAR-004 §3, DEC-LUNAR-044). */
export interface OccurrenceCache {
  readonly reminderId: string;
  readonly gregorianDate: string; // "YYYY-MM-DD"
  readonly lunarLabel: string;
  readonly computedAt: string; // ISO instant
  readonly engineVersion: string; // DEC-LUNAR-044 - invalidate khi core doi
}

/**
 * Tra danh sach loi (rong = hop le). FR-LUNAR-004 §1 #12, AC #14.
 * lunarDay 1..30, lunarMonth 1..12, RAM phai lunarDay==15, MUNG_MOT phai lunarDay==1,
 * ONCE phai co lunarYear, leadTimes khong am, channels khong rong.
 */
export function validateReminder(r: Reminder): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!(r.lunarDay >= 1 && r.lunarDay <= 30)) {
    errors.push({ field: "lunarDay", code: "LUNAR_DAY_RANGE", message: "lunarDay phai trong 1..30" });
  }
  if (!(r.lunarMonth >= 1 && r.lunarMonth <= 12)) {
    errors.push({ field: "lunarMonth", code: "LUNAR_MONTH_RANGE", message: "lunarMonth phai trong 1..12" });
  }
  if (r.type === "RAM" && r.lunarDay !== 15) {
    errors.push({ field: "lunarDay", code: "RAM_DAY_MISMATCH", message: "RAM (Ram) phai co lunarDay = 15" });
  }
  if (r.type === "MUNG_MOT" && r.lunarDay !== 1) {
    errors.push({ field: "lunarDay", code: "MUNG_MOT_DAY_MISMATCH", message: "MUNG_MOT phai co lunarDay = 1" });
  }
  if (r.recurrence === "ONCE" && (r.lunarYear === null || r.lunarYear === undefined)) {
    errors.push({ field: "lunarYear", code: "ONCE_NEEDS_YEAR", message: "ONCE phai co lunarYear cu the" });
  }
  if (r.leadTimes.some((n) => n < 0)) {
    errors.push({ field: "leadTimes", code: "LEAD_NEGATIVE", message: "leadTimes khong duoc chua so am" });
  }
  if (r.channels.length === 0) {
    errors.push({ field: "channels", code: "NO_CHANNEL", message: "channels khong duoc rong" });
  }
  return errors;
}

/** Sort tang dan + loai trung + bo so am. */
function normalizeLeadTimes(input: readonly number[] | undefined): number[] {
  if (!input || input.length === 0) return [1];
  const cleaned = Array.from(new Set(input.filter((n) => Number.isFinite(n) && n >= 0)));
  cleaned.sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : [1];
}

/**
 * Dat mac dinh on dinh (FR-LUNAR-004 §1 #13, AC #15):
 * notifyTime "07:00", leadTimes [1], channels ["LOCAL"], enabled true, leapFallback "REGULAR",
 * isLeapMonth false, sort+dedupe leadTimes. lunarYear -> null cho ANNUAL/MONTHLY neu khong cung.
 */
export function normalizeReminder(r: Partial<Reminder>): Reminder {
  const recurrence = r.recurrence ?? "ANNUAL";
  const lunarYear = recurrence === "ONCE" ? (r.lunarYear ?? null) : (r.lunarYear ?? null);
  const channels: readonly ReminderChannel[] =
    r.channels && r.channels.length > 0 ? r.channels : (["LOCAL"] as const);
  const leapFallback: LeapFallback = r.leapFallback ?? "REGULAR";

  const base: Reminder = {
    id: r.id ?? "",
    userId: r.userId ?? "",
    type: r.type ?? "CUSTOM",
    title: r.title ?? "",
    lunarDay: r.lunarDay ?? 1,
    lunarMonth: r.lunarMonth ?? 1,
    lunarYear,
    isLeapMonth: r.isLeapMonth ?? false,
    leapFallback,
    recurrence,
    leadTimes: normalizeLeadTimes(r.leadTimes),
    notifyTime: r.notifyTime ?? "07:00",
    channels,
    enabled: r.enabled ?? true,
  };
  // Optional fields: chi gan khi co gia tri (exactOptionalPropertyTypes: true).
  const out: Reminder = {
    ...base,
    ...(r.linkedContentId !== undefined ? { linkedContentId: r.linkedContentId } : {}),
    ...(r.sharedWith !== undefined ? { sharedWith: r.sharedWith } : {}),
    ...(r.notificationStyle !== undefined ? { notificationStyle: r.notificationStyle } : {}),
  };
  return out;
}

/** true khi cache.engineVersion khac engineVersion hien tai (DEC-LUNAR-044, AC #13). */
export function isCacheStale(c: OccurrenceCache, engineVersion: string): boolean {
  return c.engineVersion !== engineVersion;
}
