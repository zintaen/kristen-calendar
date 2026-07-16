/**
 * Kieu du lieu loi cua amlich-core.
 *
 * QUAN TRONG (bai hoc tu independent audit 2026-06-27): convertSolar2Lunar / convertLunar2Solar tra ve
 * LABELED TUPLE, KHONG phai object. Moi consumer PHAI destructure tuple (`const [d, m, y, leap] = ...`),
 * KHONG duoc doc `.year` / `.month` (se ra undefined -> Invalid Date). Sentinel cho truong hop invalid la
 * `[0, 0, 0]` (mot mang, truthy) - PHAI kiem `d === 0 && m === 0 && y === 0`, KHONG kiem `=== null`.
 */

/** Ngay duong: [day, month, year]. Sentinel invalid = [0, 0, 0]. */
export type SolarDate = readonly [day: number, month: number, year: number];

/** Ngay am: [day, month, year, leap] voi leap la 0 | 1 (1 = thang nhuan). */
export type LunarDate = readonly [day: number, month: number, year: number, leap: 0 | 1];

/** Sentinel tra ve khi convertLunar2Solar gap dau vao khong hop le. */
export const INVALID_SOLAR: SolarDate = [0, 0, 0];

/** Kiem sentinel mot cach an toan (thay vi so sanh `=== null`). */
export function isInvalidSolar(s: SolarDate): boolean {
  return s[0] === 0 && s[1] === 0 && s[2] === 0;
}

/** Can-chi: index Can (0..9), index Chi (0..11), va nhan ghep "Can Chi". */
export interface CanChi {
  readonly canIndex: number;
  readonly chiIndex: number;
  readonly label: string;
}

/** Tiet khi: index 0..23 (chan = Trung khi), ten, co isTrungKhi. */
export interface TietKhi {
  readonly index: number;
  readonly name: string;
  readonly isTrungKhi: boolean;
}

/** Tuy chon cho nextOccurrences (TASK-LUNAR-004). */
export interface RecurrenceOptions {
  readonly fromYear: number;
  /** So lan xuat hien am lich (truoc khi fan-out theo leadTimes). */
  readonly count: number;
  /** Phien ban engine de cache key on dinh (OccurrenceCache). Bat buoc (TASK-LUNAR-004). */
  readonly engineVersion: string;
}

/** Chinh sach khi gio roi vao thang nhuan ma nam dich khong co thang nhuan do (TASK-LUNAR-004). */
export type LeapFallback = "REGULAR" | "SKIP" | "ASK";

/** Kenh nhac (TASK-LUNAR-004 section 10). */
export type ReminderChannel = "LOCAL" | "ZNS" | "PUSH";

/** Loai nhac (TASK-LUNAR-004 section 10). */
export type ReminderType = "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";

/** Tan suat (TASK-LUNAR-004 section 10). */
export type Recurrence = "MONTHLY" | "ANNUAL" | "ONCE";

/** Tuy bien thong bao ca nhan hoa (TASK-LUNAR-006, gop TASK-F05). Tinh tu template, khong AI o Phase 1. */
export interface NotificationStyle {
  readonly tone?: "warm" | "neutral" | "formal";
  readonly emoji?: string;
  readonly imageId?: string;
}

/**
 * Reminder - mo hinh du lieu nhac (TASK-LUNAR-004 la OWNER cua type nay).
 * Moi client/service khac (TASK-005/006/010/016/017/018) PHAI import type nay, KHONG redeclare (tranh drift).
 */
export interface Reminder {
  readonly id: string;
  readonly userId: string;
  readonly type: ReminderType;
  readonly title: string;
  /** Ngay am la nguon su that; nam null neu lap hang nam. */
  readonly lunarDay: number;
  readonly lunarMonth: number;
  readonly lunarYear: number | null;
  /** Cho gio roi thang nhuan. */
  readonly isLeapMonth: boolean;
  readonly leapFallback: LeapFallback;
  readonly recurrence: Recurrence;
  /** Vi du [0, 1] = dung ngay + truoc 1 ngay. */
  readonly leadTimes: readonly number[];
  readonly notifyTime: string;
  readonly channels: readonly ReminderChannel[];
  readonly linkedContentId?: string;
  readonly sharedWith?: readonly string[];
  readonly notificationStyle?: NotificationStyle;
  readonly enabled: boolean;
}

/**
 * Mot lan xuat hien da tinh ra ngay duong (TASK-LUNAR-004 section 3).
 * gregorianDate la chuoi "YYYY-MM-DD" (KHONG phai SolarDate tuple) vi fireAtLocal mang gio ban chinh xac.
 */
export interface Occurrence {
  readonly reminderId: string;
  readonly gregorianDate: string;    // "YYYY-MM-DD" tai Asia/Ho_Chi_Minh
  readonly lunarLabel: string;       // vi du "15/7 At Ty" hoac "16/2 (nhuan) At Suu"
  readonly leadDays: number;         // 0 = dung ngay
  readonly fireAtLocal: string;      // "YYYY-MM-DDTHH:mm:00+07:00"
  /** true neu da fallback tu thang nhuan sang thang thuong (DEC-LUNAR-042). */
  readonly fellBack: boolean;
  /** true neu da lui ve ngay cuoi thang am (clamp). */
  readonly dayClamped: boolean;
  /** true neu can nguoi dung chon thang cung (policy ASK). */
  readonly pendingUserChoice: boolean;
}
