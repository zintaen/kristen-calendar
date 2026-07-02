/**
 * FR-LUNAR-004 - khoa moc thoi gian ve Asia/Ho_Chi_Minh (DEC-LUNAR-043).
 *
 * Moi phep tinh am lich PHAI dung gio Viet Nam (kinh tuyen 105E, tz = 7.0), khong phu thuoc
 * TZ cua thiet bi/server. todayInHCM tra SolarDate TUPLE [day, month, year] theo gio VN du
 * process.env.TZ dat o dau (AC #12).
 */
import type { SolarDate } from "./types.js";
import { VN_TZ_ID } from "./constants.js";

// VN_TZ / VN_TZ_ID la nguon canonical o constants.ts; tz.ts chi cung todayInHCM de tranh trung export.

/**
 * "Hom nay" theo gio Viet Nam, khong le thuoc TZ thiet bi. Tra SolarDate tuple [day, month, year].
 * Dung Intl.DateTimeFormat voi timeZone tuong minh nen dung du process.env.TZ la gi (AC #12).
 */
export function todayInHCM(now: Date = new Date()): SolarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ_ID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value);
  return [get("day"), get("month"), get("year")];
}
