import { VN_TZ } from "./constants.js";

/**
 * STUB - chua implement. FR-LUNAR-001 section 3.
 * Ngay bat dau thang 11 am (chua Dong chi) cua nam yy. Dung LUNAR_MONTH11_EPOCH_INT (so nguyen 2415021).
 */
export function getLunarMonth11(yy: number, tz: number = VN_TZ): number {
  void yy; void tz;
  throw new Error("amlich-core: getLunarMonth11 chua implement - xem FR-LUNAR-001 section 3");
}

/**
 * STUB - chua implement. FR-LUNAR-001 section 3.
 * Vi tri thang nhuan tinh tu a11 (ngay bat dau thang 11). Thang dau tien (sau thang 11) KHONG chua Trung khi
 * la thang nhuan.
 */
export function getLeapMonthOffset(a11: number, tz: number = VN_TZ): number {
  void a11; void tz;
  throw new Error("amlich-core: getLeapMonthOffset chua implement - xem FR-LUNAR-001 section 3");
}
