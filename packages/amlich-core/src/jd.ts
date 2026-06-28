import { GREGORIAN_SWITCH_JD } from "./constants.js";
import type { SolarDate } from "./types.js";

/**
 * STUB - chua implement. Day la P0 runway; implement theo FR-LUNAR-001 section 3 roi chay golden harness toi green.
 *
 * Julian Day Number tu ngay duong (xu ly chuyen Julian/Gregorian tai JD 2299161).
 * Tham chieu: PRD 6.3 jdFromDate(dd, mm, yy).
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  void dd; void mm; void yy;
  throw new Error("amlich-core: jdFromDate chua implement - xem FR-LUNAR-001 section 3");
}

/**
 * STUB - chua implement.
 * Nguoc cua jdFromDate. LUU Y (FR-LUNAR-001 audit fix): nhanh Gregorian dung `jd >= GREGORIAN_SWITCH_JD`,
 * de ngay switch 15/10/1582 (JD 2299161) khong roi nham nhanh Julian.
 */
export function jdToDate(jd: number): SolarDate {
  void jd; void GREGORIAN_SWITCH_JD;
  throw new Error("amlich-core: jdToDate chua implement - xem FR-LUNAR-001 section 3 (dung jd >= GREGORIAN_SWITCH_JD)");
}
