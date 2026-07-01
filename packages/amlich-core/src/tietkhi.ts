import { VN_TZ, TIET_KHI } from "./constants.js";
import type { TietKhi } from "./types.js";
import { SunLongitude } from "./astro.js";
import { canChiDay } from "./canchi.js";

export function tietKhiAt(jdn: number, tz: number = VN_TZ): TietKhi {
  const idx = Math.floor((SunLongitude(jdn - 0.5 - tz / 24) / Math.PI) * 12);
  const index = ((idx % 24) + 24) % 24;
  return { index, name: TIET_KHI[index]!, isTrungKhi: index % 2 === 0 };
}

export function tietKhiStartDiaChi(jdn: number, tz: number = VN_TZ): number {
  let jd = jdn;
  const currentIdx = tietKhiAt(jd, tz).index;
  while (tietKhiAt(jd - 1, tz).index === currentIdx) {
    jd -= 1;
  }
  return canChiDay(jd).chiIndex;
}
