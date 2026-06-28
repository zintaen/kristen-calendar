import type { Occurrence, Reminder, RecurrenceOptions, SolarDate } from "./types.js";

/**
 * Ngay hom nay theo lich Asia/Ho_Chi_Minh, tra ve [day, month, year].
 * Implement that (khong phai lunar logic) - dung de FR-016/017 khoa ngay VN thay vi gio thiet bi/server.
 */
export function todayInHCM(now: Date = new Date()): SolarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value);
  return [get("day"), get("month"), get("year")];
}

/**
 * STUB - chua implement. FR-LUNAR-004 section 3.
 *
 * Sinh cac lan xuat hien ngay duong cho mot Reminder am lich. Luu ngay am, goi convertLunar2Solar moi nam.
 * Tong so phan tu tra ve = opt.count * reminder.leadTimes.length (sau fan-out lead-time).
 * Xu ly fallback thang nhuan theo reminder.leapFallback (REGULAR/SKIP/ASK); ONCE + SKIP phai break, khong loop vo han.
 */
export function nextOccurrences(reminder: Reminder, opt: RecurrenceOptions): readonly Occurrence[] {
  void reminder; void opt;
  throw new Error("amlich-core: nextOccurrences chua implement - xem FR-LUNAR-004 section 3");
}

/** STUB - gop occurrence cua nhieu Reminder, sort theo fireAtLocal tang dan (FR-LUNAR-005 cat 64 dau). FR-LUNAR-004 section 3. */
export function mergeAndSort(all: readonly Occurrence[]): readonly Occurrence[] {
  void all;
  throw new Error("amlich-core: mergeAndSort chua implement - xem FR-LUNAR-004 section 3");
}
