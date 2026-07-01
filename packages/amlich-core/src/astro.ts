import { VN_TZ, MEEUS_NEW_MOON_EPOCH, MEEUS_SYNODIC_PER_K, J2000, JULIAN_CENTURY_DAYS, DR } from "./constants.js";

export function NewMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  let Jd1 = MEEUS_NEW_MOON_EPOCH + MEEUS_SYNODIC_PER_K * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * DR) +
    0.0021 * Math.sin(2 * DR * M) -
    0.4068 * Math.sin(Mpr * DR) +
    0.0161 * Math.sin(2 * DR * Mpr) -
    0.0004 * Math.sin(3 * DR * Mpr) +
    0.0104 * Math.sin(2 * DR * F) -
    0.0051 * Math.sin((M + Mpr) * DR) -
    0.0074 * Math.sin((M - Mpr) * DR) +
    0.0004 * Math.sin((2 * F + M) * DR) -
    0.0004 * Math.sin((2 * F - M) * DR) -
    0.0006 * Math.sin((2 * F + Mpr) * DR) +
    0.001 * Math.sin((2 * F - Mpr) * DR) +
    0.0005 * Math.sin((2 * Mpr + M) * DR);
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

export function SunLongitude(jdn: number): number {
  const T = (jdn - J2000) / JULIAN_CENTURY_DAYS;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M) +
    (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) +
    0.00029 * Math.sin(DR * 3 * M);
  let L = L0 + DL;
  L = L * DR;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return L;
}

export function getSunLongitude(dayNumber: number, tz: number = VN_TZ): number {
  return Math.floor((SunLongitude(dayNumber - 0.5 - tz / 24) / Math.PI) * 6);
}

export function getNewMoonDay(k: number, tz: number = VN_TZ): number {
  return Math.floor(NewMoon(k) + 0.5 + tz / 24);
}
