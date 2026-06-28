import { VN_TZ } from "./constants.js";

/**
 * STUB - chua implement. Implement theo FR-LUNAR-001 section 3, dung dung hang so PRD 6.2.
 *
 * JD diem Soc (New Moon) thu k. Da thuc Meeus voi T, T2, T3 + chuoi hieu chinh C1 + deltat.
 * Ben trong dung MEEUS_NEW_MOON_EPOCH (2415020.75933) va MEEUS_SYNODIC_PER_K (29.53058868),
 * T = k / T_DIVISOR. KHONG dung EPOCH_INDEX_K / SYNODIC_INDEX_K o day.
 */
export function NewMoon(k: number): number {
  void k;
  throw new Error("amlich-core: NewMoon chua implement - xem FR-LUNAR-001 section 3");
}

/** STUB - kinh do mat troi (radian) tai jdn. Dung J2000 va JULIAN_CENTURY_DAYS. PRD 6.3. */
export function SunLongitude(jdn: number): number {
  void jdn;
  throw new Error("amlich-core: SunLongitude chua implement - xem FR-LUNAR-001 section 3");
}

/**
 * STUB - getSunLongitude(dayNumber, tz) = INT(SunLongitude(dayNumber - 0.5 - tz/24) / PI * 6) -> 0..11.
 * Do phan giai 30 do (xac dinh Trung khi). PRD 6.3.
 */
export function getSunLongitude(dayNumber: number, tz: number = VN_TZ): number {
  void dayNumber; void tz;
  throw new Error("amlich-core: getSunLongitude chua implement - xem FR-LUNAR-001 section 3");
}

/** STUB - getNewMoonDay(k, tz) = INT(NewMoon(k) + 0.5 + tz/24). PRD 6.3. */
export function getNewMoonDay(k: number, tz: number = VN_TZ): number {
  void k; void tz;
  throw new Error("amlich-core: getNewMoonDay chua implement - xem FR-LUNAR-001 section 3");
}
