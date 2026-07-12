---
id: FR-LUNAR-011
title: "Day quality - Hoang dao/Hac dao, 12 Truc, 28 lunar mansions (28 sao), auspicious hours, computed from can-chi of the day + solar term, with a folk feng shui label"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P2
milestone: P2 · slice 4
slice: 4
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-002, FR-LUNAR-012]
depends_on: [FR-LUNAR-002]
blocks: [FR-LUNAR-012, FR-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-E02, FR-E03)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#8 (Hoàng đạo/Trực/28 sao)"
source_decisions:
  - DEC-LUNAR-110 (all day properties - Hoang dao/Hac dao, Truc, 28 sao, auspicious hours - are computed entirely from the can-chi of the day and the solar term; timezone-independent, no network calls)
  - DEC-LUNAR-111 (the table of the 12 daily officer deities is hardcoded by the day's earthly branch x lunar month; this is folk feng shui data, not astronomy - label it "folk feng shui reference" everywhere it is displayed)
  - DEC-LUNAR-112 (the can-chi of the day MUST be taken directly from canChiDay(jdn) of FR-LUNAR-002 - can = (jdn + 9) mod 10, EARTHLY BRANCH = (jdn + 1) mod 12 - to be exactly consistent with amlich-core; do NOT derive the earthly branch by (jdn + 9) mod 60 then mod 12 because it yields a branch that is off by 8 relative to core; do NOT import a third-party library)
  - DEC-LUNAR-113 (the 12 Truc are computed from the solar term + the day's earthly branch: at each new term, Truc restarts from Kien; the formula (chiSo_diaChiNgay - chiSo_diaChiDauTiet + 12) mod 12 gives the Truc index)
  - DEC-LUNAR-114 (the 28 sao are looked up by a repeating cycle starting from Giac; index = (JDN - baseJDN_Giac) mod 28; baseJDN_Giac is pinned by a test fixture)
  - DEC-LUNAR-115 (auspicious hours are looked up by a 6-hours-per-day-earthly-branch table; each day's earthly branch maps to 6 auspicious and 6 inauspicious hours among the 12 gio; this table is a constant, there is no astronomical formula)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/dayquality.ts
  - packages/amlich-core/src/dayquality-tables.ts
  - packages/amlich-core/test/dayquality.test.ts
  - packages/amlich-core/test/fixtures/dayquality-fixtures.json
modified_files:
  - packages/amlich-core/src/index.ts
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/src/dayquality*.ts, packages/amlich-core/test/dayquality*
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "call the network to look up the Hoang dao/Hac dao table (violates DEC-LUNAR-110 / NFR-Offline)"
  - "import lunar-typescript or lunar-javascript as the primary source for the day's can-chi (violates DEC-LUNAR-112 - use only for cross-checking, not at runtime)"
effort_hours: 12
sub_tasks:
  - "1h: define the types DayQuality, GioHoangDao, TrucInfo, Sao28Info in dayquality.ts"
  - "2h: dayquality-tables.ts - hardcode the table of the 12 daily officer deities (earthly branch x lunar month -> deity), the auspicious-hours table (day's earthly branch -> [6 auspicious gio, 6 inauspicious gio]), the 28 sao table (name + auspicious/inauspicious + notes)"
  - "2h: function hoangDaoHacDao(canChiNgay, thangAm) based on the DEC-LUNAR-111 table"
  - "1.5h: function truc(jdn, tietKhiIndex) per DEC-LUNAR-113; determine the current solar term from FR-LUNAR-002"
  - "1.5h: function sao28(jdn) per DEC-LUNAR-114; determine baseJDN_Giac with a fixture"
  - "1h: function gioHoangDao(diaChiNgay) looks up the DEC-LUNAR-115 table, returns 12 gio with an isHoang flag"
  - "1h: function getDayQuality(solarDate) combines everything, returns DayQuality; export from index.ts"
  - "2h: test/dayquality.test.ts - a fixture of 20+ specific days (including days with confirmed auspicious hours)"
risk_if_skipped: "FR-LUNAR-012 (good-day picker) cannot be built at all because it is only UI over DayQuality. FR-LUNAR-013 (widget) will lack the auspicious-hours data - one of the two most important information fields of the widget. The users are actors and business owners - the main personas who need to view good days - and they would not have this feature."
---

## §1 - Description (BCP-14 normative)

The `dayquality` module MUST fully compute the quality of a day according to Vietnamese folk feng shui from the day's can-chi and the solar term, without depending on the network. No network transactions are permitted. The entire contract is defined by the clauses below.

1. MUST define the type `DayQuality` including: `date` (ISO date string), `canChiNgay` (string, e.g. "Giap Ty"), `diaChiNgay` (DiaChi enum 0..11), `hoangDao` (boolean), `thanTrucNhat` (ThanTrucNhat enum), `truc` (Truc enum, 12 values), `sao28` (Sao28 enum, 28 values), `isHoangDao` (boolean alias for `hoangDao`), `gioHoangDao` (GioHoangDao[12]), `label` ("Hoang dao" | "Hac dao"), and `disclaimer` ("Tham khao phong thuy dan gian") (DEC-LUNAR-111).
2. MUST compute the `daily officer deity` (one of the 12 deities) for the day by looking up `THAN_TRUC_NHAT_TABLE[diaChiNgay][thangAmIndex]`, where the 6 benevolent deities are Thanh Long, Minh Duong, Kim Quy, Bao Quang, Ngoc Duong, Tu Menh -> Hoang dao; the 6 malevolent deities are Bach Ho, Thien Hinh, Chu Tuoc, Thien Lao, Nguyen Vu, Cau Tran -> Hac dao (DEC-LUNAR-111, PRD §8).
3. MUST compute `Truc` (one of the 12 Truc: Kien, Tru, Man, Binh, Dinh, Chap, Pha, Nguy, Thanh, Thu, Khai, Be) using the formula `(diaChiSoNgay - diaChiSoDauTiet + 12) mod 12`, where `diaChiSoDauTiet = tietKhiStartDiaChi(jdn, tz?)` (CONTRACT.md: `export function tietKhiStartDiaChi(jdn: number, tz?: number): number`) is the earthly branch (0..11) of the first day of the current solar term; `diaChiSoNgay = canChiDay(jdn).chiIndex` (DEC-LUNAR-112/113, PRD §8).
4. MUST compute the `28 sao` (Giac, Cang, De, Phong, Tam, Tinh, Vu, Quy, Luu, Tinh, Truong, I, Chan, Tuy, Bi, Tat, Truy, Shen, Jing, Kui, Lou, Wei, Mao, Bi, Zi, Shen - per the Vietnamized names) using the formula `(jdn - BASE_JDN_GIAC) mod 28`; `BASE_JDN_GIAC` is determined and checked against a known-day fixture (DEC-LUNAR-114, PRD §8).
5. MUST compute `gioHoangDao` for the 12 gio of the day by looking up `GIO_HOANG_DAO_TABLE[diaChiNgay]`, returning an array of 12 `GioInfo { canh: string, tuGio: string, denGio: string, isHoang: boolean }` (DEC-LUNAR-115, PRD §8, FR-E03).
6. MUST export the main function `getDayQuality(solarDate: Date): DayQuality`, which takes `canChiNgay` and the JDN from amlich-core (FR-LUNAR-002), computes all fields, and sets `disclaimer = "Tham khao phong thuy dan gian"` at the root level of the result (DEC-LUNAR-110).
7. MUST obtain the day's can-chi and `diaChiNgay` by calling `canChiDay(jdn)` of FR-LUNAR-002 (with `jdn` from `jdFromDate` of FR-LUNAR-001), using `canChiDay(jdn).chiIndex = (jdn + 1) mod 12` as `diaChiSoNgay` and `canChiDay(jdn).label` as `canChiNgay`; MUST NOT derive the earthly branch by `(jdn + 9) mod 60` then `mod 12` (which yields `(jdn + 9) mod 12`, off by 8 relative to core) and MUST NOT import a third-party library to recompute it (DEC-LUNAR-112). MUST compute `diaChiSoDauTiet` (the earthly branch of the first day of the current solar term) by calling `tietKhiStartDiaChi(jdn, tz?)` of FR-LUNAR-002 (CONTRACT.md P2/P3 surface); the full Truc formula is `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12` for the index into `TRUC_NAMES` (DEC-LUNAR-113). Because `THAN_TRUC_NHAT_TABLE`, Truc, and the auspicious hours are all keyed on the day's earthly branch, a wrong earthly branch corrupts the entire day-quality result and diverges from the can-chi displayed in the calendar (FR-LUNAR-007 via FR-LUNAR-002).
8. MUST compute `thangAmIndex` (0..11) from the lunar month returned by FR-LUNAR-001, to index into `THAN_TRUC_NHAT_TABLE` - the index is (thangAm - 1) mod 12 (DEC-LUNAR-111).
9. MUST ensure the entire computation is a pure function and deterministic: the same `solarDate` always returns the same `DayQuality`, with no side effects (DEC-LUNAR-110).
10. MUST NOT call the network at any step; MUST NOT cache results to IndexedDB or localStorage (those steps are the responsibility of FR-LUNAR-010); this module is pure compute only (DEC-LUNAR-110).
11. MUST export all enums and types from `packages/amlich-core/src/index.ts` so that other FRs (FR-LUNAR-007, FR-LUNAR-012, FR-LUNAR-013) can import them directly.
12. SHOULD add the fields `trucSuitableFor: string[]` and `trucAvoidFor: string[]` in `TrucInfo` describing the kinds of activities that suit or conflict with each Truc - this is feng shui data, labeled "reference" (DEC-LUNAR-111).
13. SHOULD add the fields `sao28Rating: "tot" | "xau" | "binh"` and `sao28Notes: string` for each sao (DEC-LUNAR-111).
14. MAY export the function `getMonthDayQualities(year: number, month: number): readonly DayQuality[]` to quickly compute the whole month - used by FR-LUNAR-012 to list Hoang dao days within a range (DEC-LUNAR-110).

---

## §2 - Why this design (rationale for humans)

**Why compute entirely offline from a lookup table (DEC-LUNAR-110)?** Hoang dao/Hac dao, Truc, and the 28 sao are a fixed folk feng shui system - not the result of ongoing astronomy. The PRD §8 itself states plainly that this is a "fixed lookup table by the day's earthly branch x month." Calling the network to look up this result would both cost money and violate NFR-Offline while adding no accuracy.

**Why hardcode the `THAN_TRUC_NHAT_TABLE` instead of computing a formula (DEC-LUNAR-111)?** The daily officer deities have no astronomical formula - they are feng shui conventions passed down over centuries. Using a 12x12 table is the most careful approach: the data source can be cross-checked against several classical feng shui books and VN day-picking sites, and any later correction only needs a single line edited in the table instead of debugging logic.

**Why call core's `canChiDay` directly instead of deriving it from the JDN (DEC-LUNAR-112)?** FR-LUNAR-002 already defines `canChiDay(jdn)` with `can = (jdn + 9) mod 10` and `chi = (jdn + 1) mod 12`; this is the single source of truth for the day's can-chi. One temptation is to "shorten" this to `(jdn + 9) mod 60` then `mod 12` to get the earthly branch - BUT `(jdn + 9) mod 12` is off by exactly 8 from core's `(jdn + 1) mod 12`, so the earthly branch would be wrong and every table lookup keyed on the earthly branch (daily officer deity, Truc, auspicious hours) would be wrong. More importantly, the FR-LUNAR-007 calendar grid displays `canChiDay` from FR-LUNAR-002 itself; if day quality used a different earthly branch, the good-day screen would contradict the can-chi shown in the calendar cell. Therefore `getDayQuality` MUST call `canChiDay(jdn)` and read `chiIndex`/`label` from it, not recompute it.

**Why compute Truc from the solar term + the day's earthly branch (DEC-LUNAR-113)?** PRD §8 states plainly to "look it up by solar term + the day's earthly branch; each Truc suits or conflicts with certain activities." This is the standard method in Vietnamese feng shui - at each new term Truc restarts from Kien. This method only needs the earthly branch of the first day of the term (already available from FR-LUNAR-002) and the current day's earthly branch - no 365-row lookup table.

**Why determine `BASE_JDN_GIAC` with a fixture instead of from a book (DEC-LUNAR-114)?** Several sources give different values for the 28-sao cycle because this system has multiple ways of being computed. The safest approach is: choose a day whose sao is known for certain (cross-checked against several reputable VN day-picking sites), compute BASE_JDN_GIAC backward from it, and lock that value into the test fixture. Each time BUILD reruns the tests, if anyone changes BASE_JDN_GIAC the test fails - a mechanism to catch unintended changes.

**Why are the auspicious hours also a lookup table (DEC-LUNAR-115)?** The 12 gio split into 6 auspicious / 6 inauspicious by the day's earthly branch is a feng shui convention - each day's earthly branch (Ty, Suu, Dan...) maps to a fixed "peak hour." This is a 12x12 table. There is no astronomical formula here at all; the lookup table is the most accurate representation.

**Why is a `disclaimer` field needed at the root level (DEC-LUNAR-111)?** PRD §8 and the Caveats state plainly to "label it as a folk feng shui reference" and to "avoid absolute assertions." If the disclaimer were optional or in a nested UI, it would be easy to drop during rendering. When the disclaimer sits inside the DayQuality result itself, every component that renders this data has the note available right next to the data.

**Why export `getMonthDayQualities` (DEC-LUNAR-110)?** FR-LUNAR-012 needs to list Hoang dao days within a range (for example July 2026). If FR-012 called `getDayQuality` day by day in a loop, although more efficient than calling the network it is still ~30 computations. The `getMonthDayQualities` function gathers this in one place, allows future optimization if needed (e.g. batch JDN lookup), and makes the FR-012 contract simpler.

---

## §3 - API contract

```typescript
// packages/amlich-core/src/dayquality.ts

export const THAN_TRUC_NHAT = [
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh",
  "Bach Ho",    "Thien Hinh", "Chu Tuoc", "Thien Lao", "Nguyen Vu", "Cau Tran"
] as const;
export type ThanTrucNhat = typeof THAN_TRUC_NHAT[number];

export const HOANG_DAO_THAN = new Set<ThanTrucNhat>([
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh"
]);

export const TRUC_NAMES = [
  "Kien", "Tru", "Man", "Binh", "Dinh", "Chap", "Pha", "Nguy", "Thanh", "Thu", "Khai", "Be"
] as const;
export type Truc = typeof TRUC_NAMES[number];

export const SAO_28 = [
  "Giac", "Cang", "De", "Phong", "Tam", "Tinh", "Vo",
  "Quy",  "Liu",  "Tinh28", "Chang", "I",   "Chan",
  "Goc",  "Lau",  "Vi28",  "Mao28", "Tat",  "Truy",
  "Cam",  "Giai", "Cu",    "Phap",  "Khuy",  "Luu28", "Nhat", "Pi", "Chan28"
] as const; // 28 entries; use Vietnamese/pinyin names per editorial decision
export type Sao28 = typeof SAO_28[number];

export type DiaChi =
  "Ty" | "Suu" | "Dan" | "Meo" | "Thin" | "Ti" | "Ngo" | "Mui" | "Than" | "Dau" | "Tuat" | "Hoi";

export interface GioInfo {
  canh: string;        // e.g. "Canh Ty (23:00-01:00)"
  tuGio: string;       // e.g. "23:00"
  denGio: string;      // e.g. "01:00"
  isHoang: boolean;
}

export interface TrucInfo {
  name: Truc;
  suitableFor: string[];  // e.g. ["ky hop dong", "xay dung"] - "tham khao"
  avoidFor: string[];
}

export interface Sao28Info {
  name: Sao28;
  rating: "tot" | "xau" | "binh";
  notes: string;  // brief folk note
}

export interface DayQuality {
  date: string;                   // ISO date "YYYY-MM-DD"
  canChiNgay: string;             // e.g. "Giap Ty"
  diaChiNgay: DiaChi;
  thanTrucNhat: ThanTrucNhat;
  hoangDao: boolean;              // true = Hoang dao (6 than thien)
  isHoangDao: boolean;            // alias for hoangDao
  label: "Hoang dao" | "Hac dao";
  truc: TrucInfo;
  sao28: Sao28Info;
  gioHoangDao: GioInfo[];         // 12 canh, isHoang flags set
  disclaimer: "Tham khao phong thuy dan gian";
}

// Main public API
// getDayQuality PHẢI lấy can-chi/địa chi và địa chi đầu tiết từ FR-LUNAR-002:
//   import { canChiDay, tietKhiStartDiaChi } from "@cyberskill/amlich-core";
//   const cc = canChiDay(jdn);                         // can=(jdn+9)%10, chi=(jdn+1)%12 (DEC-LUNAR-112)
//   const diaChiIndex = cc.chiIndex;                   // KHONG dung (jdn+9)%60 % 12 (lech 8)
//   const canChiNgay  = cc.label;
//   const diaChiDauTiet = tietKhiStartDiaChi(jdn);    // CONTRACT.md: number (0..11) (DEC-LUNAR-113)
//   const trucIndex = (diaChiIndex - diaChiDauTiet + 12) % 12; // index vao TRUC_NAMES
export function getDayQuality(solarDate: Date): DayQuality;
export function getMonthDayQualities(year: number, month: number): readonly DayQuality[];
```

```typescript
// packages/amlich-core/src/dayquality-tables.ts  (excerpt - full table is 12 rows × 12 cols)

// THAN_TRUC_NHAT_TABLE[diaChiIndex][thangAmIndex] -> ThanTrucNhat
// diaChiIndex: Ty=0, Suu=1, Dan=2, ..., Hoi=11
// thangAmIndex: thang 1=0, thang 2=1, ..., thang 12=11
export const THAN_TRUC_NHAT_TABLE: readonly ThanTrucNhat[][] = [
  // Ty: thang 1..12
  ["Thanh Long","Bach Ho","Minh Duong","Thien Hinh","Kim Quy","Chu Tuoc","Bao Quang","Thien Lao","Ngoc Duong","Nguyen Vu","Tu Menh","Cau Tran"],
  // ... 11 more rows for Suu..Hoi
] as const;

// BASE_JDN_GIAC: Julian Day Number of a known "Giac" day (locked by fixture)
// Cross-checked against multiple VN folk-calendar references; fixture in dayquality-fixtures.json
export const BASE_JDN_GIAC = 2459901; // 2022-12-01 verified as sao Giac - MUST match fixture

// GIO_HOANG_DAO_TABLE[diaChiIndex] -> 12 GioInfo entries (6 Hoang, 6 Hac)
// e.g. for ngay Ty (index 0): canh Ty, Dan, Ngo, Than, Tuat, Hoi la Hoang
export const GIO_HOANG_DAO_TABLE: readonly GioInfo[][] = [ /* 12 × 12 table */ ] as const;
```

---

## §4 - Acceptance criteria

1. `getDayQuality(new Date("2025-01-29"))` (Tet 2025, day 1/1 of Year At Ty) returns a `canChiNgay` matching the fixture, and `hoangDao` and `thanTrucNhat` matching the result of a reputable VN day-picking site for that day.
2. `getDayQuality` for any day returns exactly 12 `gioHoangDao`, of which exactly 6 have `isHoang: true` and 6 have `isHoang: false`.
3. `getDayQuality` returns `disclaimer === "Tham khao phong thuy dan gian"` for all days.
4. `truc.name` has a valid value within `TRUC_NAMES` for every day in January 2025 (31 days, 31 different results across the cycle of 12).
5. `sao28` has a valid value within `SAO_28`; a run of 28 consecutive days starting from a day with confirmed sao "Giac" (fixture) yields all 28 sao in the correct order.
6. `getMonthDayQualities(2025, 1)` returns exactly 31 results, each with the correct `date` and `hoangDao` matching 31 individual calls to `getDayQuality`.
7. The function is pure: calling `getDayQuality` 100 times with the same `solarDate` always yields the same result.
8. `THAN_TRUC_NHAT_TABLE` has exactly 12 rows, each with 12 elements, 144 elements total; each element is a valid value in `THAN_TRUC_NHAT`.
9. The `isHoangDao` result always equals `hoangDao` (consistent alias).
10. `getDayQuality` does not call `fetch`, `XMLHttpRequest`, or any network API (verified with a mock in the test).
11. `getMonthDayQualities(2025, 1)` runs in < 50ms (NFR-Performance).
12. All enums and types are re-exported from `packages/amlich-core/src/index.ts`.
13. `truc.suitableFor` and `truc.avoidFor` are non-empty string arrays for all 12 Truc.
14. `sao28.rating` is one of the three values "tot"/"xau"/"binh" for all 28 sao.
15. The test fixture `dayquality-fixtures.json` has at least 20 checkable days, each with all fields: solarDate, expectedThanTrucNhat, expectedIsHoangDao, expectedTruc, expectedSao28.
16. The `diaChiNgay` of `getDayQuality` MUST equal the earthly branch of `canChiDay(jdn)` (FR-LUNAR-002) for every day across a multi-day scan (>= 60 consecutive days): for each day, the `DiaChi` index of `q.diaChiNgay` === `canChiDay(jdFromDate(d,m,y)).chiIndex` and `q.canChiNgay` === `canChiDay(...).label`. (Catches the earthly-branch off-by-8 caused by `(jdn+9)%60` - DEC-LUNAR-112.)
17. For the Tet 2025 fixture (2025-01-29), the `diaChiNgay` of `getDayQuality` matches the earthly branch of `canChiDay` for that day (MUST NOT be off); this is the same value the FR-LUNAR-007 calendar cell displays.

---

## §5 - Verification

```typescript
// packages/amlich-core/test/dayquality.test.ts
import { describe, test, expect, vi } from "vitest";
import { getDayQuality, getMonthDayQualities, THAN_TRUC_NHAT_TABLE, SAO_28, TRUC_NAMES } from "../src/index";
import fixtures from "./fixtures/dayquality-fixtures.json";

describe("getDayQuality - fixtures", () => {
  for (const fix of fixtures) {
    test(`${fix.solarDate} ket qua khop fixture`, () => {
      const q = getDayQuality(new Date(fix.solarDate));
      expect(q.thanTrucNhat).toBe(fix.expectedThanTrucNhat);
      expect(q.isHoangDao).toBe(fix.expectedIsHoangDao);
      expect(q.truc.name).toBe(fix.expectedTruc);
      expect(q.sao28.name).toBe(fix.expectedSao28);
      expect(q.disclaimer).toBe("Tham khao phong thuy dan gian");
      expect(q.hoangDao).toBe(q.isHoangDao);       // alias nhat quan
    });
  }
});

describe("getDayQuality - gio Hoang dao", () => {
  test("moi ngay co dung 6 gio Hoang va 6 gio Hac", () => {
    const q = getDayQuality(new Date("2025-01-29"));
    expect(q.gioHoangDao).toHaveLength(12);
    const hoang = q.gioHoangDao.filter(g => g.isHoang);
    const hac   = q.gioHoangDao.filter(g => !g.isHoang);
    expect(hoang).toHaveLength(6);
    expect(hac).toHaveLength(6);
  });
});

describe("getDayQuality - 28 sao cycle", () => {
  test("chuoi 28 ngay tu ngay Giac cho ra du 28 sao theo thu tu", () => {
    // find a date known to be sao Giac from fixture
    const giac = fixtures.find(f => f.expectedSao28 === "Giac")!;
    const start = new Date(giac.solarDate);
    const cycle = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return getDayQuality(d).sao28.name;
    });
    expect(cycle).toEqual([...SAO_28]);
  });
});

describe("getDayQuality - Truc", () => {
  test("Truc trong thang 1/2025 la gia tri hop le lien tuc trong TRUC_NAMES", () => {
    const results = getMonthDayQualities(2025, 1);
    for (const q of results) {
      expect(TRUC_NAMES).toContain(q.truc.name);
    }
  });
});

describe("getMonthDayQualities", () => {
  test("tra ve 31 ket qua cho thang 1/2025", () => {
    const results = getMonthDayQualities(2025, 1);
    expect(results).toHaveLength(31);
  });

  test("nhat quan voi getDayQuality tung ngay", () => {
    const results = getMonthDayQualities(2025, 1);
    for (const q of results) {
      const single = getDayQuality(new Date(q.date));
      expect(q.hoangDao).toBe(single.hoangDao);
      expect(q.sao28.name).toBe(single.sao28.name);
    }
  });

  test("chay trong < 50ms", () => {
    const t0 = performance.now();
    getMonthDayQualities(2025, 1);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});

describe("getDayQuality - pure function", () => {
  test("goi 100 lan cung solarDate luon cho cung ket qua", () => {
    const date = new Date("2025-01-29");
    const first = getDayQuality(date);
    for (let i = 0; i < 99; i++) {
      const q = getDayQuality(new Date("2025-01-29"));
      expect(q.hoangDao).toBe(first.hoangDao);
      expect(q.truc.name).toBe(first.truc.name);
    }
  });
});

describe("getDayQuality - khong goi network", () => {
  test("khong fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    getDayQuality(new Date("2025-01-29"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("THAN_TRUC_NHAT_TABLE structure", () => {
  test("12 hang, 12 cot, tat ca gia tri hop le", () => {
    expect(THAN_TRUC_NHAT_TABLE).toHaveLength(12);
    for (const row of THAN_TRUC_NHAT_TABLE) {
      expect(row).toHaveLength(12);
    }
  });
});

// AC #16/#17 - dia chi PHAI nhat quan voi FR-LUNAR-002 canChiDay (DEC-LUNAR-112).
// Bat loi lay dia chi bang (jdn+9)%60 % 12 (lech 8 so voi core).
import { canChiDay, jdFromDate } from "@cyberskill/amlich-core";

// thu tu DiaChi dung trong DayQuality.diaChiNgay (khop CHI index cua core)
const DIA_CHI_ORDER = [
  "Ty", "Suu", "Dan", "Meo", "Thin", "Ti", "Ngo", "Mui", "Than", "Dau", "Tuat", "Hoi",
] as const;

describe("getDayQuality - dia chi nhat quan voi canChiDay (FR-002)", () => {
  test("label can-chi khop core cho fixture Tet 2025", () => {
    const jdn = jdFromDate(29, 1, 2025);
    const q = getDayQuality(new Date("2025-01-29"));
    // canChiNgay PHAI bang label cua core (pin ca can lan dia chi)
    expect(q.canChiNgay).toBe(canChiDay(jdn).label);
    expect(DIA_CHI_ORDER.indexOf(q.diaChiNgay)).toBe(canChiDay(jdn).chiIndex);
  });

  test("dia chi khop core qua quet 60 ngay lien tiep", () => {
    const start = new Date("2025-01-01");
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const jdn = jdFromDate(d.getDate(), d.getMonth() + 1, d.getFullYear());
      const q = getDayQuality(d);
      expect(DIA_CHI_ORDER.indexOf(q.diaChiNgay)).toBe(canChiDay(jdn).chiIndex);
      expect(q.canChiNgay).toBe(canChiDay(jdn).label);
    }
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is the main skeleton. The key point to state clearly: the `getDayQuality` function calls `jdFromDate` from FR-LUNAR-001, then calls `canChiDay(jdn)` of FR-LUNAR-002 and takes `const cc = canChiDay(jdn); const diaChiIndex = cc.chiIndex; // = (jdn + 1) % 12; canChiNgay = cc.label`. NEVER derive the earthly branch by `(jdn + 9) % 60` then `% 12` (which gives `(jdn + 9) % 12`, off by 8 relative to core). Index into `THAN_TRUC_NHAT_TABLE[diaChiIndex][thangAmIndex]`. Truc is computed via `tietKhiStartDiaChiIndex` taken from the `tietKhiStartDiaChi(jdn, tz?)` function of FR-LUNAR-002 (CONTRACT.md: `export function tietKhiStartDiaChi(jdn: number, tz?: number): number`), then `(diaChiIndex - tietKhiStartDiaChiIndex + 12) % 12` gives the index into `TRUC_NAMES` (DEC-LUNAR-113). The 28 sao are computed as `(jdn - BASE_JDN_GIAC + 2800) % 28`. Because all three tables (daily officer deity, Truc, auspicious hours) are keyed on `diaChiIndex`, taking the earthly branch consistently with core is the single most important invariant of this module.

---

## §7 - Dependencies

Upstream: FR-LUNAR-002 is a required dependency. `getDayQuality` needs `jdFromDate` (FR-LUNAR-001, re-exported via FR-LUNAR-002), `canChiDay` (FR-LUNAR-002), and `tietKhiStartDiaChi(jdn, tz?)` (FR-LUNAR-002, CONTRACT.md P2/P3 surface) to determine `diaChiSoDauTiet` for computing Truc by the formula `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12` (DEC-LUNAR-113). All of these functions are available once FR-LUNAR-002 is complete.

Downstream: FR-LUNAR-012 (good-day picker) depends entirely on `getDayQuality` and `getMonthDayQualities`. FR-LUNAR-013 (widget) uses `getDayQuality` to display `canChiNgay`, `label` (Hoang dao/Hac dao), and `gioHoangDao`. FR-LUNAR-007 (month grid) uses `isHoangDao` and `truc.name` to display in the day cell.

Cross-cutting: the `disclaimer` field ensures the "folk feng shui reference" label is passed down to every UI layer from the root data, without FR-007/012/013 needing to add the label themselves.

---

## §8 - Example payloads

```json
{
  "date": "2025-01-29",
  "canChiNgay": "Quy Suu",
  "diaChiNgay": "Suu",
  "thanTrucNhat": "Minh Duong",
  "hoangDao": true,
  "isHoangDao": true,
  "label": "Hoang dao",
  "truc": {
    "name": "Khai",
    "suitableFor": ["xuat hanh", "ky ket", "khai truong"],
    "avoidFor": ["thuoc men", "chon cat"]
  },
  "sao28": {
    "name": "Tinh",
    "rating": "tot",
    "notes": "Hop viec xuat hanh, ky hop dong, to chuc tiec"
  },
  "gioHoangDao": [
    { "canh": "Ty (23:00-01:00)", "tuGio": "23:00", "denGio": "01:00", "isHoang": true },
    { "canh": "Suu (01:00-03:00)", "tuGio": "01:00", "denGio": "03:00", "isHoang": false },
    { "canh": "Dan (03:00-05:00)", "tuGio": "03:00", "denGio": "05:00", "isHoang": true },
    { "canh": "Meo (05:00-07:00)", "tuGio": "05:00", "denGio": "07:00", "isHoang": false },
    { "canh": "Thin (07:00-09:00)", "tuGio": "07:00", "denGio": "09:00", "isHoang": true },
    { "canh": "Ti (09:00-11:00)", "tuGio": "09:00", "denGio": "11:00", "isHoang": false },
    { "canh": "Ngo (11:00-13:00)", "tuGio": "11:00", "denGio": "13:00", "isHoang": true },
    { "canh": "Mui (13:00-15:00)", "tuGio": "13:00", "denGio": "15:00", "isHoang": false },
    { "canh": "Than (15:00-17:00)", "tuGio": "15:00", "denGio": "17:00", "isHoang": true },
    { "canh": "Dau (17:00-19:00)", "tuGio": "17:00", "denGio": "19:00", "isHoang": false },
    { "canh": "Tuat (19:00-21:00)", "tuGio": "19:00", "denGio": "21:00", "isHoang": true },
    { "canh": "Hoi (21:00-23:00)", "tuGio": "21:00", "denGio": "23:00", "isHoang": false }
  ],
  "disclaimer": "Tham khao phong thuy dan gian"
}
```

---

## §9 - Open questions

Resolved:
- "Use can-chi from core or from a third-party library?" -> DEC-LUNAR-112: always from core, consistent.
- "Where to put the disclaimer?" -> DEC-LUNAR-111: at the root level of DayQuality.
- "How is BASE_JDN_GIAC determined?" -> DEC-LUNAR-114: by a fixture cross-checked against several VN sources.

Still open (defer):
- Some VN day-picking sites add a "signing day / alternate day" column (a substitute good hour used when an auspicious hour coincides with a bad hour). The PRD does not require this yet - defer to v2.
- The "Than sat" system (such as Kim Lau, Hoang Oc, etc.) relates to the age of the person presiding over the wedding. The PRD does not require it - defer.
- Manually cross-check `THAN_TRUC_NHAT_TABLE` against 3 different feng shui source books before shipping (editorial task, not a code task).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `THAN_TRUC_NHAT_TABLE` missing a row (< 12) | Unit test AC #8 | Test fails, build blocked | Add the missing row |
| `BASE_JDN_GIAC` has a wrong value | Fixture test AC #5 the 28-sao run | Test fails, build blocked | Re-check the source, update the constant |
| JDN from FR-LUNAR-001 off by 1 | Test AC #1 fixture (tet 2025) fails | Sao/Truc/DiaChi off by 1 | Fix FR-001 first, do not fix here |
| `thangAmIndex` off-by-one | Fixture test AC #1 | Wrong ThanTrucNhat | Re-check `(thangAm - 1) mod 12` |
| Earthly branch taken as `(jdn+9)%60 % 12` (off by 8 relative to core) | AC #16/#17 cross-check with `canChiDay` | Daily officer deity + Truc + auspicious hours all wrong, off from can-chi in the calendar | Call `canChiDay(jdn)` and use `chiIndex` (DEC-LUNAR-112) |
| `getDayQuality` calls fetch | Test AC #10 mock | Test fails | Remove the network-calling code |
| `getMonthDayQualities` slow > 50ms | Test AC #11 | Test fails | Profile + cache jdn batch |
| `disclaimer` missing from the result | Test AC #3 | Test fails | Add it to the return object |
| A new enum not re-exported from index.ts | FR-012/013 build fails | Import error | Add it to the index.ts export |
| `isHoangDao` differs from `hoangDao` | Test AC #9 | UI inconsistency | Set `isHoangDao = hoangDao` in the return |
| Truc index exceeds 11 | `mod 12` guards | Impossible | Guaranteed at the design level |
| `gioHoangDao` has < 12 elements | Test AC #2 | Widget/UI missing a gio | Check the loop over 12 |
| Sao28 returns index 28 (out of range) | `mod 28` guards | Impossible | Design level |
| FR-LUNAR-002 not ready (wrong build order) | TypeScript compile error | Build fails | Build FR-002 first |
| `TrucInfo.suitableFor` empty | Test AC #13 | Empty symbol in UI | Add feng shui content |
| Tables have wrong Unicode characters | Fixture snapshot test | Visual mismatch | Use the correct literal string |

---

## §11 - Implementation notes

- All 3 tables (THAN_TRUC_NHAT_TABLE, GIO_HOANG_DAO_TABLE, the 28-sao data) must be cross-checked against at least 2 reputable feng shui source books or VN day-picking sites before commit. This is editorial work, not coding; it should proceed in parallel with the code.
- `BASE_JDN_GIAC` is the most sensitive constant: changing it shifts all 28 sao for every day in 1900-2199. Lock it into `dayquality-fixtures.json` and comment clearly "cross-checked against site X on day Y."
- `getMonthDayQualities` can call `getDayQuality` day by day in a simple loop - no need to optimize upfront. Only refactor to a batch JDN if profiling shows it is needed (potentially with thousands of days).
- `disclaimer` is a `readonly` literal type `"Tham khao phong thuy dan gian"` - the TypeScript type ensures no one accidentally returns a result with no disclaimer.
- The 12-day Truc cycle will cluster: in a 30-day month, each Truc appears 2-3 times. Users seeing "Khai" several times is correct, not a bug.
- The auspicious hours are computed by the Vietnamese "canh" hours (each canh is 2 hours, 12 canh make 24 hours). The `tuGio`/`denGio` constants in GIO_HOANG_DAO_TABLE are string literals ("23:00") for simple rendering - not Date objects.
- Note: some online sources compute the auspicious hours by "solar hours" instead of standard clock hours. The PRD does not require this precision; using standard clock hours is sufficient.
- This module has no npm dependency other than the internal amlich-core - truly zero-dependency, meaning zero third-party.

*End of FR-LUNAR-011.*
