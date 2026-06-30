import { convertLunar2Solar } from "@cyberskill/amlich-core";
import { FESTIVALS } from "./festivals";
import type { FestivalContent, ContentId } from "./types";

export { FESTIVALS };
export type { FestivalContent, ContentId } from "./types";

const FESTIVAL_MAP: Map<string, FestivalContent> = new Map(FESTIVALS.map(f => [f.id, f]));

export function getFestivalById(id: ContentId): FestivalContent | undefined {
  return FESTIVAL_MAP.get(id);
}

export function getFestivalByLunarDate(
  lunarDay: number,
  lunarMonth: number
): readonly FestivalContent[] {
  const results = FESTIVALS.filter(f => {
    if (f.lunarDay === null) return false;       // Thanh Minh, dam gio - khong match
    if (f.lunarDay !== lunarDay) return false;
    if (f.lunarMonth === null) return true;       // Mung Mot, Ram - match moi thang
    return f.lunarMonth === lunarMonth;
  });
  return results.slice().sort((a, b) => {
    const aSpec = a.lunarMonth !== null ? 0 : 1;
    const bSpec = b.lunarMonth !== null ? 0 : 1;
    return aSpec - bSpec;
  });
}

export function getAllFestivals(): readonly FestivalContent[] {
  return FESTIVALS;
}

export function buildFestivalDateSet(year: number): Set<string> {
  const result = new Set<string>();
  for (const f of FESTIVALS) {
    if (f.lunarDay === null) continue; // Thanh Minh, dam gio - bo qua
    if (f.lunarMonth === null) {
      // Mung Mot (1) va Ram (15): xuat hien moi thang am lich
      for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
        const [dd, mm, yy] = convertLunar2Solar(f.lunarDay, lunarMonth, year, 0, 7.0);
        if (dd !== 0 && yy === year) {        // loc sentinel [0,0,0] + giu trong nam duong
          result.add(toDateKey(dd, mm, yy));
        }
      }
    } else {
      // Dip co ngay am va thang am co dinh
      const [dd, mm, yy] = convertLunar2Solar(f.lunarDay, f.lunarMonth, year, 0, 7.0);
      if (dd !== 0) result.add(toDateKey(dd, mm, yy));
    }
  }
  return result;
}

function toDateKey(d: number, m: number, y: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
