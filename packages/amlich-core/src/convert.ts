import { VN_TZ } from "./constants.js";
import type { LunarDate, SolarDate } from "./types.js";

// Khi implement convertLunar2Solar, import { INVALID_SOLAR } tu "./types.js" de tra sentinel [0,0,0].

/**
 * STUB - chua implement. FR-LUNAR-001 section 3; tra ve LABELED TUPLE [day, month, year, leap].
 *
 * Chuyen ngay duong -> am theo gio Viet Nam (tz mac dinh 7.0, kinh tuyen 105E).
 * leap = 1 neu la thang nhuan.
 */
export function convertSolar2Lunar(dd: number, mm: number, yy: number, tz: number = VN_TZ): LunarDate {
  void dd; void mm; void yy; void tz;
  throw new Error("amlich-core: convertSolar2Lunar chua implement - xem FR-LUNAR-001 section 3");
}

/**
 * STUB - chua implement. FR-LUNAR-001 section 3; tra ve LABELED TUPLE [day, month, year].
 *
 * Chuyen ngay am -> duong. leap = 1 neu thang nhuan. Dau vao khong hop le -> tra sentinel INVALID_SOLAR
 * ([0, 0, 0]); consumer PHAI kiem isInvalidSolar, KHONG kiem `=== null`.
 */
export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  leap: 0 | 1,
  tz: number = VN_TZ
): SolarDate {
  void lunarDay; void lunarMonth; void lunarYear; void leap; void tz;
  throw new Error("amlich-core: convertLunar2Solar chua implement - xem FR-LUNAR-001 section 3");
}
