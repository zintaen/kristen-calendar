import { VN_TZ, EPOCH_INDEX_K, SYNODIC_INDEX_K } from "./constants.js";
import type { LunarDate, SolarDate } from "./types.js";
import { jdFromDate, jdToDate } from "./jd.js";
import { getNewMoonDay } from "./astro.js";
import { getLunarMonth11, getLeapMonthOffset } from "./leap.js";

export function convertSolar2Lunar(dd: number, mm: number, yy: number, tz: number = VN_TZ): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap: 0 | 1 = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = 1;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  leap: 0 | 1,
  tz: number = VN_TZ
): SolarDate {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, tz);
    b11 = getLunarMonth11(lunarYear, tz);
  } else {
    a11 = getLunarMonth11(lunarYear, tz);
    b11 = getLunarMonth11(lunarYear + 1, tz);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (leap !== 0 || off >= leapOff) {
      off += 1;
    }
  }
  const k = Math.floor(0.5 + (a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  const monthStart = getNewMoonDay(k + off, tz);
  return jdToDate(monthStart + lunarDay - 1);
}
