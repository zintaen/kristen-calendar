import { CAN, CHI, ZODIAC_VN } from "./constants.js";
import type { CanChi } from "./types.js";

/** Ghep nhan "Can Chi" tu index (pure helper, data). */
export function canChiLabel(canIndex: number, chiIndex: number): string {
  return `${CAN[((canIndex % 10) + 10) % 10]} ${CHI[((chiIndex % 12) + 12) % 12]}`;
}

/** Con giap VIET NAM tu chiIndex (Meo cho Mao, Trau cho Suu). Pure helper, data. */
export function zodiacOf(chiIndex: number): string {
  return ZODIAC_VN[((chiIndex % 12) + 12) % 12]!;
}

/**
 * STUB - chua implement. FR-LUNAR-002 section 3 la OWNER cua cong thuc nay.
 *
 * Can-chi NGAY tu JDN, cong thuc canonical: canIndex = (jdn + 9) % 10, chiIndex = (jdn + 1) % 12.
 * CANH BAO (independent audit): day la nguon su that. FR-LUNAR-011 (day-quality) PHAI lay dia chi tu
 * canChiDay(jdn).chiIndex = (jdn + 1) % 12, KHONG duoc suy tu ((jdn+9)%60)%12 (lech +8).
 */
export function canChiDay(jdn: number): CanChi {
  void jdn;
  throw new Error("amlich-core: canChiDay chua implement - xem FR-LUNAR-002 section 3 (can=(jdn+9)%10, chi=(jdn+1)%12)");
}

/** STUB - can-chi THANG am theo ngu ho don (Can thang tu Can nam). FR-LUNAR-002 section 3. */
export function canChiMonth(lunarMonth: number, lunarYear: number): CanChi {
  void lunarMonth; void lunarYear;
  throw new Error("amlich-core: canChiMonth chua implement - xem FR-LUNAR-002 section 3");
}

/** STUB - can-chi NAM am. FR-LUNAR-002 section 3. */
export function canChiYear(lunarYear: number): CanChi {
  void lunarYear;
  throw new Error("amlich-core: canChiYear chua implement - xem FR-LUNAR-002 section 3");
}
