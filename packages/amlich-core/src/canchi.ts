import { CAN, CHI, ZODIAC_VN } from "./constants.js";
import type { CanChi } from "./types.js";

export function canChiLabel(canIndex: number, chiIndex: number): string {
  return `${CAN[((canIndex % 10) + 10) % 10]} ${CHI[((chiIndex % 12) + 12) % 12]}`;
}

export function zodiacOf(chiIndex: number): string {
  return ZODIAC_VN[((chiIndex % 12) + 12) % 12]!;
}

export function canChiDay(jdn: number): CanChi {
  const canIndex = (jdn + 9) % 10;
  const chiIndex = (jdn + 1) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

export function canChiMonth(lunarMonth: number, lunarYear: number): CanChi {
  const yearCan = (lunarYear + 6) % 10;
  const canIndex = (yearCan * 2 + lunarMonth + 1) % 10;
  const chiIndex = (lunarMonth + 1) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

export function canChiYear(lunarYear: number): CanChi {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}
