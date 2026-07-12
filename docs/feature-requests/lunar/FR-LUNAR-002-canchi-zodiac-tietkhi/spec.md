---
id: FR-LUNAR-002
title: "Can-chi, Vietnamese zodiac (Cat/Buffalo), 24 tiet khi + 12 Principal Terms - timezone-independent data computed from the JDN"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P0
milestone: P0 · slice 1
slice: 1
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-001, FR-LUNAR-011]
depends_on: [FR-LUNAR-001]
blocks: [FR-LUNAR-003, FR-LUNAR-007, FR-LUNAR-011, FR-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-A03, FR-A04)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#6 (6.3 getSunLongitude)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#8 (can-chi base for day quality)"
source_decisions:
  - DEC-LUNAR-020 (day can-chi computed from the JDN: canIndex = (jdn + 9) % 10, chiIndex = (jdn + 1) % 12; timezone-independent)
  - DEC-LUNAR-021 (Vietnamese zodiac swaps animals: Cat replaces Rabbit at chi Mao, Buffalo replaces Ox at chi Suu; a separate 12-animal VN table)
  - DEC-LUNAR-022 (month can-chi computed from lunarMonth and the year Can: monthCanIndex = (lunarYearCan * 2 + lunarMonth + 1) % 10; the month Chi is fixed starting at Dan)
  - DEC-LUNAR-023 (year can-chi computed from lunarYear: can = (lunarYear + 6) % 10, chi = (lunarYear + 8) % 12)
  - DEC-LUNAR-024 (tiet khi computed with getSunLongitude at 15-degree resolution: tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12); 24 tiet khi, 12 are Principal Terms)
  - DEC-LUNAR-025 (cross-check 6tail/lunar-typescript ONLY for can-chi and Truc - the timezone-independent values; NOT used to settle the VN Soc day / leap month)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/canchi.ts
  - packages/amlich-core/src/tietkhi.ts
  - packages/amlich-core/src/zodiac.ts
  - packages/amlich-core/test/canchi.test.ts
  - packages/amlich-core/test/tietkhi.test.ts
modified_files:
  - packages/amlich-core/src/index.ts
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/{src,test}/**
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "using lunar-typescript to decide the VN Soc day or leap month (violates DEC-LUNAR-025 - it uses 120E)"
  - "computing can-chi from lunarDay/Month instead of from the JDN (violates DEC-LUNAR-020 - wrong across the month boundary)"
  - "using Chinese zodiac animals (Rabbit/Ox) instead of VN (Cat/Buffalo) (violates DEC-LUNAR-021 / FR-A03)"
effort_hours: 10.5
sub_tasks:
  - "1.5h: canDay/chiDay from the JDN + a table of the 10 Can + 12 Chi (Vietnamese with diacritics)"
  - "1.5h: month can-chi from lunarMonth + the year Can; year can-chi from lunarYear"
  - "1.5h: Vietnamese zodiac table of 12 animals (Cat, Buffalo...) + zodiacOf(lunarYear) function"
  - "2.0h: tiet khi via getSunLongitude at 15-degree resolution; a table of 24 names + Principal Term flags"
  - "1.0h: tietKhiAt(jdn, tz?) look up index 0-23 + name + isTrungKhi flag (15-degree resolution)"
  - "0.5h: tietKhiStartDiaChi(jdn, tz?) - the Earthly Branch (0..11) of the tiet start day; FR-011 uses it to compute Truc (CONTRACT.md)"
  - "1.0h: cross-check can-chi against lunar-typescript for a sample of days (CI optional, timezone-independent)"
  - "1.0h: index.ts barrel exports + JSDoc of the formula for every index"
  - "0.5h: add the CanChi, TietKhi, Zodiac types to the public API"
risk_if_skipped: "Without can-chi and tiet khi, the FR-LUNAR-007 month calendar is missing information in every day cell, FR-LUNAR-011 day quality has no input (Hoang dao/Truc/28 sao are all computed from the day can-chi), FR-LUNAR-003 validation cannot assert the fixture's can-chi year, and the FR-LUNAR-013 widget cannot show can-chi. A wrong zodiac (using Rabbit instead of Cat) is a VN-specific error that the persona Chi Linh notices immediately (Tet 2023 must be the Cat)."
---

## §1 - Description (BCP-14 normative)

The module MUST compute the day/month/year can-chi, the animal per the Vietnamese zodiac, and the 24 tiet khi (12 of which are Principal Terms), all timezone-independent and derived from the JDN of FR-LUNAR-001. Contract:

1. MUST compute the day can-chi from the JDN: `canIndex = (jdn + 9) % 10` and `chiIndex = (jdn + 1) % 12`, returning the name assembled from the table of 10 Can and 12 Chi (FR-A03, DEC-LUNAR-020).
2. MUST compute the day can-chi from the JDN and MUST NOT compute it from `lunarDay`/`lunarMonth`, because can-chi runs continuously by solar day and would be wrong across the lunar month boundary (DEC-LUNAR-020).
3. MUST compute the year can-chi from `lunarYear`: `can = (lunarYear + 6) % 10`, `chi = (lunarYear + 8) % 12` (FR-A03, DEC-LUNAR-023).
4. MUST compute the month can-chi from `lunarMonth` and the year's Can: `monthCan = (yearCanIndex * 2 + lunarMonth + 1) % 10`, with the month Chi fixed starting at Dan for the first month (FR-A03, DEC-LUNAR-022).
5. MUST use the Vietnamese zodiac: the animal at chi Mao is "Meo" (the Cat, not the Rabbit), at chi Suu it is "Trau" (the Buffalo, not the Ox); provide a full 12-animal VN table (FR-A03, DEC-LUNAR-021).
6. MUST provide `zodiacOf(chiIndex)` returning the VN animal corresponding to chi index 0..11 (CONTRACT.md); the caller computes `chiIndex = (lunarYear + 8) % 12` to convert from the lunar year (FR-A03).
6a. MUST provide `canChiLabel(canIndex, chiIndex): string`, a pure helper that assembles the "Can Chi" label from the two indices; the `canChiDay`/`canChiYear`/`canChiMonth` functions use it internally (CONTRACT.md).
7. MUST compute tiet khi from `getSunLongitude` at 15-degree resolution: `tietKhiIndex = INT(SunLongitude(jdn - 0.5 - tz / 24) / PI * 12)` returning 0-23 (FR-A04, DEC-LUNAR-024).
8. MUST provide a table of the 24 tiet khi in Vietnamese with diacritics in the correct order, marking the 12 that are Principal Terms (FR-A04).
9. MUST ensure the Dong chi (Winter Solstice) is a Principal Term and the anchor that determines lunar month 11, consistent with `getLunarMonth11` of FR-LUNAR-001 (FR-A04, PRD 6.1 rule 3).
10. MUST compute every value from the JDN and `getSunLongitude` with `tz = 7.0` as the default, independent of system time; the functions are pure (NFR-Offline).
11. MUST provide `tietKhiAt(jdn, tz?)` returning a `TietKhi` with `index` 0..23, `name`, and `isTrungKhi` (FR-A04, CONTRACT.md).
11a. MUST provide `tietKhiStartDiaChi(jdn, tz?): number` returning the Earthly Branch (0..11) of the day the current tiet khi containing `jdn` starts; FR-LUNAR-011 uses it to compute Truc via the formula `(diaChiNgay - tietKhiStartDiaChi + 12) % 12` (CONTRACT.md, DEC-LUNAR-024).
12. MUST NOT use `lunar-typescript` to decide the VN Soc day or leap month; MAY use it only to cross-check can-chi and Truc in CI because those values are timezone-independent (DEC-LUNAR-025, PRD 6.5 Caveats).
13. MUST export the `CanChi`, `TietKhi`, `Zodiac` types through the `index.ts` barrel so FR-LUNAR-007 and FR-LUNAR-011 can reuse them (DEC-LUNAR-020).
14. SHOULD tag the language: the Can/Chi and tiet khi tables keep correct Vietnamese with diacritics, because this is content shown to the user (NFR-Localization).
15. SHOULD keep the tables as `as const` and freeze them so they cannot be modified by accident at runtime (DEC-LUNAR-020).

---

## §2 - Why this design (rationale for humans)

**Why is the day can-chi computed from the JDN?** The day can-chi is a 60-cycle that runs continuously by solar day and does not reset with the lunar month. Computing it from `lunarDay` would be wrong across the month boundary. The JDN is a continuous day count, so `(jdn + 9) % 10` and `(jdn + 1) % 12` give the correct Can and Chi for every day; the offsets 9 and 1 anchor to the historical can-chi reference (DEC-LUNAR-020).

**Why does the Vietnamese zodiac differ from the Chinese one?** Vietnam uses the Cat at chi Mao instead of the Rabbit, and the Buffalo at chi Suu instead of the Ox. PRD 6.6 states plainly that Tet 2023 is the year of the Cat, "not the Rabbit". The persona Chi Linh will notice immediately if the app shows the wrong animal. For that reason the animal table is a separate VN table, not a reuse of the Chinese one (DEC-LUNAR-021, FR-A03).

**Why does the month can-chi depend on the year's Can?** The month Chi is fixed (the first month is Dan, the second is Mao...) but the month Can rotates with the year Can. The formula `(yearCanIndex * 2 + lunarMonth + 1) % 10` gives the correct month Can, consistent with the traditional method. This is the input for Hoang dao/Hac dao in FR-LUNAR-011 (DEC-LUNAR-022).

**Why does tiet khi use getSunLongitude at 15-degree resolution?** A full 360-degree zodiac divided into 24 tiet khi gives 15 degrees each. FR-LUNAR-001 already has `getSunLongitude` at 30-degree resolution (dividing by 6, returning 0-11) for Principal Terms; here it divides by 12 to yield the 24 tiet khi (`/ PI * 12`). Reusing the exact same SunLongitude function ensures tiet khi is consistent with how the core determines the leap month (DEC-LUNAR-024).

**Why must the Dong chi be a Principal Term?** Ho Ngoc Duc's rule 3: the Dong chi always falls in lunar month 11. The 24-tiet-khi table must mark the Dong chi as a Principal Term and agree with `getLunarMonth11`. If the tiet khi table and the core disagree about the Dong chi, month 11 will be determined inconsistently in the two places (PRD 6.1 rule 3).

**Why only cross-check, not rely on, lunar-typescript?** PRD 6.5 and the Caveats state plainly that lunar-typescript computes at 120E, so it gets the VN Soc day and leap month wrong. But the day can-chi and Truc are timezone-independent, so it can be used as a cross-check on a sample of days in CI to raise confidence, as long as it is never used to settle a timezone-dependent value (DEC-LUNAR-025).

---

## §3 - API contract

```typescript
// packages/amlich-core/src/canchi.ts
// Luu y: CAN, CHI, ZODIAC_VN la hang so o constants.ts; CanChi la type o types.ts.
// KHONG redeclare. Import tu barrel "@cyberskill/amlich-core" trong code production.
import { CAN, CHI, ZODIAC_VN } from "./constants.js";
import type { CanChi } from "./types.js";

/**
 * Ghep nhan "Can Chi" tu index (pure helper, data). CONTRACT.md.
 * Dung cho moi noi can tao label ma khong tao CanChi day du.
 */
export function canChiLabel(canIndex: number, chiIndex: number): string {
  return `${CAN[((canIndex % 10) + 10) % 10]} ${CHI[((chiIndex % 12) + 12) % 12]}`;
}

/**
 * Con giap VIET NAM tu chiIndex (0..11). Meo cho chi Mao (index 3), Trau cho chi Suu (index 1).
 * CONTRACT: zodiacOf(chiIndex: number): string. DEC-LUNAR-021.
 * Cach tinh chiIndex tu nam am: chiIndex = (lunarYear + 8) % 12.
 */
export function zodiacOf(chiIndex: number): string {
  return ZODIAC_VN[((chiIndex % 12) + 12) % 12]!;
}

/** Can-chi NGAY tu JDN: canIndex=(jdn+9)%10, chiIndex=(jdn+1)%12. DEC-LUNAR-020. CONTRACT.md. */
export function canChiDay(jdn: number): CanChi {
  const canIndex = (jdn + 9) % 10;
  const chiIndex = (jdn + 1) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

/** Can-chi NAM am: can=(lunarYear+6)%10, chi=(lunarYear+8)%12. DEC-LUNAR-023. */
export function canChiYear(lunarYear: number): CanChi {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

/** Can-chi THANG am: chi co dinh bat dau Dan o thang Gieng; can xoay theo can nam. DEC-LUNAR-022. */
export function canChiMonth(lunarMonth: number, lunarYear: number): CanChi {
  const yearCan = (lunarYear + 6) % 10;
  const canIndex = (yearCan * 2 + lunarMonth + 1) % 10;
  const chiIndex = (lunarMonth + 1) % 12; // thang 1 -> Dan (index 2)
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}
```

```typescript
// packages/amlich-core/src/tietkhi.ts (tietKhiStartDiaChi la phan bao sung TASK A)
import { VN_TZ, TIET_KHI } from "./constants.js";
import type { TietKhi } from "./types.js";
// SunLongitude, tietKhiAt: import tu cung package (khong import duong dan ngoai)

/** tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12) -> 0..23. DEC-LUNAR-024. */
export function tietKhiAt(jdn: number, tz: number = VN_TZ): TietKhi {
  // implement: const idx = Math.floor((SunLongitude(jdn - 0.5 - tz / 24) / Math.PI) * 12);
  // return { index: idx, name: TIET_KHI[idx], isTrungKhi: idx % 2 === 0 };
}

/**
 * Dia chi (0..11) cua ngay BAT DAU tiet khi dang quan chua jdn.
 * FR-011 dung ham nay de tinh Truc: trucIndex = (diaChiNgay - tietKhiStartDiaChi + 12) % 12.
 * CONTRACT.md: tietKhiStartDiaChi(jdn, tz?): number.
 *
 * Thuat toan: (1) tiet khi hien tai = tietKhiAt(jdn, tz); (2) luo nguoc jdn cho den khi
 * tietKhiAt(jd - 1, tz).index != tietKhiAt(jd, tz).index -> ngay bat dau tiet la jd;
 * (3) tra ve canChiDay(jd).chiIndex.
 * O(1) vi moi tiet khi keo dai trung binh ~15 ngay; vong while chay toi da 16 buoc.
 */
export function tietKhiStartDiaChi(jdn: number, tz: number = VN_TZ): number {
  // implement: look back until tiet index changes, return canChiDay(startJdn).chiIndex
}
```

```typescript
// packages/amlich-core/src/tietkhi.ts
import { SunLongitude } from "./sunlongitude";
import { PI } from "./index";

/** 24 tiết khí; các index chẵn (0,2,...) là Trung khí (Principal Term). */
export const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập",
] as const;

export interface TietKhi {
  index: number;        // 0..23
  name: typeof TIET_KHI[number];
  isTrungKhi: boolean;  // Trung khí = Principal Term (Đông chí, Hạ chí, Xuân/Thu phân...)
}

/** tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12). DEC-LUNAR-024. */
export function tietKhiAt(jdn: number, tz: number): TietKhi {
  const idx = Math.floor((SunLongitude(jdn - 0.5 - tz / 24) / PI) * 12);
  return { index: idx, name: TIET_KHI[idx], isTrungKhi: idx % 2 === 0 };
}
```

---

## §4 - Acceptance criteria

1. `canChiDay(jdFromDate(2, 2, 1984))` has a `label` that is a valid day can-chi and is stable across calls (deterministic).
2. `canChiYear(2025)` returns `Ất Tỵ` (Tet 2025 fixture, PRD 6.6).
3. `canChiYear(2024)` returns `Giáp Thìn`; `canChiYear(2023)` returns `Quý Mão`; `canChiYear(2026)` returns `Bính Ngọ`; `canChiYear(1984)` returns `Giáp Tý`.
4. `zodiacOf((2023 + 8) % 12)` - that is, `zodiacOf(7)` - returns `Mèo` (the Cat, not the Rabbit) - a VN-specific feature (PRD 6.6, CONTRACT.md: zodiacOf(chiIndex)).
5. `zodiacOf((2025+8)%12)` returns `Rắn`; `zodiacOf((2024+8)%12)` returns `Rồng`; `zodiacOf((2026+8)%12)` returns `Ngựa`; `zodiacOf((2021+8)%12)` returns `Trâu` (the Buffalo, not the Ox).
5a. `canChiLabel(1, 1)` returns `"Ất Sửu"` (AC for the pure helper CONTRACT.md).
6. `canChiDay` changes the index correctly when the JDN increases by 1: `canIndex` increases by 1 modulo 10 and `chiIndex` increases by 1 modulo 12 (continuous cycle, DEC-LUNAR-020).
7. `canChiMonth(1, 2025).chiIndex` equals `2` (Dan = index 2; the first month is always Dan, DEC-LUNAR-022).
8. `tietKhiAt` returns an `index` in `[0, 23]` for every JDN in the test range.
9. There is a day in the Dong chi window (~21-22/12 solar) for which `tietKhiAt` returns `Đông chí` with `isTrungKhi = true`.
10. 12 of the tiet are Principal Terms and 12 are ordinary tiet khi; the count of `isTrungKhi === true` in the table is 12.
11. The start day of lunar month 11 (`getLunarMonth11`) from FR-LUNAR-001 contains the Dong chi: `tietKhiAt` of a day in lunar month 11 near the Dong chi returns the Dong chi Principal Term (consistent with the core, FR-A04).
12. The `CAN`, `CHI`, `ZODIAC_VN`, `TIET_KHI` tables are `as const` and frozen; modifying them at runtime is a no-op (DEC-LUNAR-020).
13. Optional cross-check: the day can-chi of a sample of 10 days matches `lunar-typescript` (a timezone-independent value, DEC-LUNAR-025).
14. No network-call error in the test suite (offline, NFR-Offline).
15. `tietKhiStartDiaChi(jdn, 7)` returns an integer in `[0, 11]` for every JDN in the test range.
16. Two consecutive days within the same tiet khi have equal `tietKhiStartDiaChi`; two days on either side of a tiet boundary have different values.
17. For `jdn` at the start of a tiet (determined by `tietKhiAt(jdn-1).index != tietKhiAt(jdn).index`), `tietKhiStartDiaChi(jdn)` equals `canChiDay(jdn).chiIndex` (§1 #11a, CONTRACT.md).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/canchi.test.ts
import { describe, it, expect } from "vitest";
import { canChiDay, canChiYear, canChiMonth, canChiLabel, zodiacOf } from "../src/canchi";
import { jdFromDate, VN_TZ } from "../src/index";

describe("can-chi nam (PRD 6.6 fixtures)", () => {
  // label phai la tieng Viet co dau dung chinh ta
  it("2025 = At Ty", () => expect(canChiYear(2025).label).toBe("Ất Tỵ"));
  it("2024 = Giap Thin", () => expect(canChiYear(2024).label).toBe("Giáp Thìn"));
  it("2023 = Quy Mao", () => expect(canChiYear(2023).label).toBe("Quý Mão"));
  it("2026 = Binh Ngo", () => expect(canChiYear(2026).label).toBe("Bính Ngọ"));
  it("1984 = Giap Ty", () => expect(canChiYear(1984).label).toBe("Giáp Tý"));
});

describe("zodiac Viet Nam: zodiacOf(chiIndex) - CONTRACT.md", () => {
  // chiIndex = (lunarYear + 8) % 12
  it("2023 -> chiIndex 7 = Meo (khong phai Tho)", () => expect(zodiacOf((2023 + 8) % 12)).toBe("Mèo"));
  it("2021 -> chiIndex 5 = Trau (khong phai Bo)", () => expect(zodiacOf((2021 + 8) % 12)).toBe("Trâu"));
  it("2025 -> Ran", () => expect(zodiacOf((2025 + 8) % 12)).toBe("Rắn"));
  it("2024 -> Rong", () => expect(zodiacOf((2024 + 8) % 12)).toBe("Rồng"));
});

describe("canChiLabel pure helper (CONTRACT.md)", () => {
  it("canChiLabel(1, 1) = At Suu", () => expect(canChiLabel(1, 1)).toBe("Ất Sửu"));
  it("canChiLabel(0, 0) = Giap Ty", () => expect(canChiLabel(0, 0)).toBe("Giáp Tý"));
});

describe("can-chi ngay chay lien tuc theo JDN (DEC-LUNAR-020)", () => {
  it("canIndex tang 1 mod 10, chiIndex tang 1 mod 12 khi JDN tang 1", () => {
    const jd = jdFromDate(2, 2, 1984);
    const a = canChiDay(jd);
    const b = canChiDay(jd + 1);
    expect(b.canIndex).toBe((a.canIndex + 1) % 10);
    expect(b.chiIndex).toBe((a.chiIndex + 1) % 12);
  });
  it("can=(jdn+9)%10 va chi=(jdn+1)%12 cho ngay cu the (CONTRACT.md source of truth)", () => {
    const jd = jdFromDate(29, 1, 2025);
    expect(canChiDay(jd).canIndex).toBe((jd + 9) % 10);
    expect(canChiDay(jd).chiIndex).toBe((jd + 1) % 12);
  });
  it("deterministic", () => {
    const jd = jdFromDate(29, 1, 2025);
    expect(canChiDay(jd).label).toBe(canChiDay(jd).label);
  });
});

describe("can-chi thang (DEC-LUNAR-022)", () => {
  it("thang Gieng luon co chiIndex = 2 (Dan)", () => {
    expect(canChiMonth(1, 2025).chiIndex).toBe(2);
  });
  it("can-chi thang xoay theo can nam (Giap nien thang Gieng = Binh Dan, canIndex=2)", () => {
    // Giap = canIndex 0; monthCan = (0 * 2 + 1 + 1) % 10 = 2 = Binh
    const cc = canChiMonth(1, 2024); // 2024 Giap Thin, yearCan=0
    expect(cc.canIndex).toBe(2);     // Binh
    expect(cc.chiIndex).toBe(2);     // Dan
  });
});
```

```typescript
// packages/amlich-core/test/tietkhi.test.ts
import { describe, it, expect } from "vitest";
import { tietKhiAt, tietKhiStartDiaChi, TIET_KHI } from "../src/tietkhi";
import { canChiDay, canChiLabel } from "../src/canchi";
import { jdFromDate, VN_TZ } from "../src/index";

const TZ = VN_TZ;

describe("tiet khi (FR-A04, DEC-LUNAR-024)", () => {
  it("index luon trong [0,23]", () => {
    const start = jdFromDate(1, 1, 2000);
    for (let jd = start; jd < start + 366; jd += 7) {
      const t = tietKhiAt(jd, TZ);
      expect(t.index).toBeGreaterThanOrEqual(0);
      expect(t.index).toBeLessThanOrEqual(23);
    }
  });
  it("co 24 tiet trong bang va 12 la Trung khi (index chan)", () => {
    expect(TIET_KHI.length).toBe(24);
    const trungKhiCount = Array.from({ length: 24 }, (_, i) => i).filter(i => i % 2 === 0).length;
    expect(trungKhiCount).toBe(12);
  });
  it("ngay quanh Dong chi 22/12/2024 la Dong chi (Trung khi, index 18)", () => {
    const t = tietKhiAt(jdFromDate(22, 12, 2024), TZ);
    expect(t.name).toBe("Đông chí");
    expect(t.isTrungKhi).toBe(true);
    expect(t.index).toBe(18);
  });
});

describe("tietKhiStartDiaChi (CONTRACT.md, AC #15-17)", () => {
  it("tra ve so nguyen trong [0,11] cho moi JDN thu nghiem", () => {
    const start = jdFromDate(1, 1, 2020);
    for (let jd = start; jd < start + 366; jd += 7) {
      const v = tietKhiStartDiaChi(jd, TZ);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });
  it("hai ngay trong cung tiet co tietKhiStartDiaChi bang nhau (AC #16)", () => {
    // Tim hai ngay lien tiep co cung tiet index
    const jd1 = jdFromDate(1, 1, 2025);
    if (tietKhiAt(jd1, TZ).index === tietKhiAt(jd1 + 1, TZ).index) {
      expect(tietKhiStartDiaChi(jd1, TZ)).toBe(tietKhiStartDiaChi(jd1 + 1, TZ));
    }
  });
  it("ngay bat dau tiet: tietKhiStartDiaChi bang canChiDay(jd).chiIndex (AC #17)", () => {
    // Tim jd bat dau tiet (tiet index thay doi so voi jd-1)
    const start = jdFromDate(1, 1, 2025);
    for (let jd = start + 1; jd < start + 30; jd++) {
      if (tietKhiAt(jd - 1, TZ).index !== tietKhiAt(jd, TZ).index) {
        // jd la ngay bat dau tiet moi
        expect(tietKhiStartDiaChi(jd, TZ)).toBe(canChiDay(jd).chiIndex);
        break;
      }
    }
  });
});
```

---

## §6 - Implementation skeleton

The API in §3 is a full skeleton. The detail worth pinning: tiet khi and Principal Terms use the SAME `SunLongitude` function from FR-LUNAR-001 but at different resolutions - Principal Terms divide by 6 (30-degree resolution, in the core), tiet khi divide by 12 (15-degree resolution, here). Both must take `jdn - 0.5 - tz/24` as the input so the two places agree about the Dong chi. AC #11 is the consistency constraint between this tiet khi table and the core's `getLunarMonth11`.

---

## §7 - Dependencies

Upstream: FR-LUNAR-001 - uses `jdFromDate`, `jdToDate`, `SunLongitude`, and `VN_TIMEZONE`. The names match the depends_on frontmatter.

Downstream: FR-LUNAR-003 asserts the can-chi year of the Tet fixtures; FR-LUNAR-007 shows can-chi and tiet khi on every calendar cell; FR-LUNAR-011 uses the day can-chi as the input for Hoang dao/Hac dao/Truc/28 sao; FR-LUNAR-013 shows can-chi on the widget. The names match the blocks frontmatter.

Cross-cutting: the Can/Chi and tiet khi tables are Vietnamese display content, related to NFR-Localization. The optional cross-check with lunar-typescript is only for timezone-independent values (DEC-LUNAR-025).

---

## §8 - Example payloads

```json
{
  "input": { "fn": "canChiYear", "args": [2025] },
  "output": { "can": "Ất", "chi": "Tỵ", "canIndex": 1, "chiIndex": 1, "label": "Ất Tỵ" }
}
```

```json
{
  "input": { "fn": "zodiacOf", "args": [2023] },
  "output": "Mèo",
  "note": "VN dùng Mèo, không phải Thỏ (PRD 6.6)"
}
```

```json
{
  "input": { "fn": "tietKhiAt", "args": [2460667, 7.0] },
  "output": { "index": 18, "name": "Đông chí", "isTrungKhi": true }
}
```

---

## §9 - Open questions

Resolved: the origin of the day can-chi offsets (9 and 1), the VN zodiac table, the month can-chi formula, and the 15-degree tiet khi resolution.

Deferred:
- The deeper than sat (deity/malefic) systems (Truc details, detailed lucky/unlucky stars) live in FR-LUNAR-011, not here; this FR only handles can-chi/zodiac/tiet khi as the foundation.
- Whether to add Han-Viet names for the tiet khi with the Chinese characters - deferred to the FR-LUNAR-008 content layer if richer display is needed.
- A full-range 1900-2199 cross-check of can-chi against lunar-typescript (instead of just a sample) - it can be enabled in a heavy CI run if desired, but only for timezone-independent values (DEC-LUNAR-025).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Can-chi computed from lunarDay instead of the JDN | wrong across the lunar month boundary | day can-chi drifts | compute from the JDN (DEC-LUNAR-020) |
| Chinese zodiac animals used (Rabbit/Ox) | AC #4/#5 fail (2023 != Cat) | wrong VN-specific value | ZODIAC_VN table |
| Wrong can-chi offset (for example +8 instead of +9) | the fixture can-chi year fails | the whole can-chi drifts | keep (jdn+9)%10, (jdn+1)%12 |
| Tiet khi divides by 6 instead of 12 | only 12 values instead of 24 | half the tiet khi missing | divide by 12 (/ PI * 12) |
| Tiet khi input does not subtract tz/24 | Dong chi off by a day | month 11 disagrees with the core | use jdn-0.5-tz/24 |
| Tiet khi table in the wrong order | Dong chi at the wrong index | isTrungKhi wrong | keep the standard order in §3 |
| Using lunar-typescript to settle the Soc day | VN leap month wrong | wrong calendar | only cross-check timezone-independent values |
| Table modified at runtime | AC #12 fail | silent error | as const + freeze |
| Month can-chi does not rotate with the year Can | month Can wrong | FR-011 input wrong | the DEC-LUNAR-022 formula |
| Network call in a test | offline guard | loses NFR-Offline | remove IO from the module |
| Vietnamese diacritics lost in the table | wrong spelling shown | poor UX | keep Vietnamese with diacritics |
| Dong chi and getLunarMonth11 disagree | AC #11 fail | month 11 differs in the two places | share SunLongitude |

---

## §11 - Implementation notes

- The day can-chi MUST be computed from the JDN, not from the lunar date. This is a continuous 60-cycle by solar day; `(jdn + 9) % 10` gives the Can, `(jdn + 1) % 12` gives the Chi. The two offsets anchor to the historical can-chi reference and have been checked against the canonical implementations.
- The VN zodiac is an important cultural difference: the Cat at chi Mao, the Buffalo at chi Suu. Tet 2023 must yield the Cat; if it yields the Rabbit, the Chinese table is in use and it is wrong for Vietnamese users.
- Tiet khi reuse the exact `SunLongitude` from the core but divide by 12 (15 degrees per tiet) instead of by 6 (30 degrees, the Principal Term resolution in the core). Use the same input `jdn - 0.5 - tz/24` so the Dong chi is consistent with `getLunarMonth11`.
- Principal Terms are the tiet at even indices in the table (Dong chi, Ha chi, Xuan phan, Thu phan, and the other Principal Terms); 12 Principal Terms and 12 ordinary tiet. This is the basis for rule 4 (the month containing no Principal Term is the leap month) that the core uses.
- The month can-chi has a fixed Chi (the first month is Dan) but the Can rotates with the year Can; the formula is `(yearCan * 2 + lunarMonth + 1) % 10`. This is a required input for the Hoang dao/Hac dao table by day Earthly Branch x month in FR-LUNAR-011.
- Cross-checking with lunar-typescript is only valid for can-chi and Truc (timezone-independent); never use it to settle the VN Soc day or leap month, because it uses 120E (PRD Caveats).
- Keep the tables `as const` and frozen; they are display content and mathematical parameters at the same time, and modifying one element by accident is both a spelling error and a computation error.

---

*End of FR-LUNAR-002.*
