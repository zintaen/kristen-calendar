import { VN_TZ, LUNAR_MONTH11_EPOCH_INT, SYNODIC_INDEX_K, EPOCH_INDEX_K } from "./constants.js";
import { jdFromDate } from "./jd.js";
import { getNewMoonDay, getSunLongitude } from "./astro.js";

export function getLunarMonth11(yy: number, tz: number = VN_TZ): number {
  const off = jdFromDate(31, 12, yy) - LUNAR_MONTH11_EPOCH_INT;
  const k = Math.floor(off / SYNODIC_INDEX_K);
  let nm = getNewMoonDay(k, tz);
  const sunLong = getSunLongitude(nm, tz);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, tz);
  }
  return nm;
}

export function getLeapMonthOffset(a11: number, tz: number = VN_TZ): number {
  const k = Math.floor((a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}
