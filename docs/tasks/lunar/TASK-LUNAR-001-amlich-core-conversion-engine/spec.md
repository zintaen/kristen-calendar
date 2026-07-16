---
id: TASK-LUNAR-001
title: "Core lunar engine - port the Ho Ngoc Duc algorithm to TypeScript, convertSolar2Lunar / convertLunar2Solar in Vietnam time (UTC+7, 105E), offline, zero-dependency"
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
related_frs: [TASK-LUNAR-002, TASK-LUNAR-003, TASK-LUNAR-004]
depends_on: []
blocks: [TASK-LUNAR-002, TASK-LUNAR-003, TASK-LUNAR-004, TASK-LUNAR-007, TASK-LUNAR-008, TASK-LUNAR-010, TASK-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (TASK-A01, TASK-A02, TASK-A06)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Offline, NFR-Performance)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#6 (Lunar spec 6.1-6.5)"
source_decisions:
  - DEC-LUNAR-010 (all calculations use meridian 105E with timeZone = 7.0; this is Ho Ngoc Duc's rule 5 and the reason VN differs from China)
  - DEC-LUNAR-011 (strict discipline of three separate epochs: index-k epoch 2415021.076998695, Meeus epoch 2415020.75933, getLunarMonth11 integer 2415021 - must not be mixed)
  - DEC-LUNAR-012 (zero runtime network: dates computed entirely on-device, no API calls; zero-dependency package)
  - DEC-LUNAR-013 (synodic constants split by role: 29.530588853 for index-k, 29.53058868 for the Meeus polynomial inside NewMoon)
  - DEC-LUNAR-014 (Julian/Gregorian switch at JD 2299161 in jdFromDate to cover the whole 1900-2199 range and beyond)
  - DEC-LUNAR-015 (API returns the tuple [day, month, year, isLeap] keeping Duc's original signature; isLeap is the fourth element, no struct split at the core layer)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/convert.ts
  - packages/amlich-core/src/newmoon.ts
  - packages/amlich-core/src/sunlongitude.ts
  - packages/amlich-core/src/leap.ts
  - packages/amlich-core/src/index.ts
  - packages/amlich-core/test/convert.test.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/{src,test}/**
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "network or fetch calls during date computation (violates DEC-LUNAR-012 / NFR-Offline)"
  - "hard-coding a timeZone other than 7.0 or a meridian other than 105E (violates DEC-LUNAR-010 / TASK-A01)"
  - "adding a runtime dependency to the amlich-core package.json (violates DEC-LUNAR-012 - zero-dependency)"
effort_hours: 16
sub_tasks:
  - "2.0h: jdFromDate + jdToDate with Julian/Gregorian switch at JD 2299161 (DEC-LUNAR-014)"
  - "3.0h: NewMoon(k) - Meeus polynomial T/T2/T3, the C1 correction series, deltat; constants 2415020.75933 + 29.53058868"
  - "2.0h: SunLongitude(jdn) + getSunLongitude(dayNumber, tz) returning 0-11 with J2000 2451545.0 / 36525, dr=PI/180"
  - "1.5h: getNewMoonDay(k, tz) + getLunarMonth11(yy, tz) using integer 2415021"
  - "2.0h: getLeapMonthOffset(a11, tz) - scan the months from a11 to find the month containing no Principal Term"
  - "2.5h: convertSolar2Lunar(dd,mm,yy,tz) - index-k epoch 2415021.076998695, assign lunarMonth/Year/leap"
  - "2.0h: convertLunar2Solar(lunarDay,lunarMonth,lunarYear,lunarLeap,tz) - inverse, fallback offset"
  - "1.0h: index.ts barrel + JSDoc for every constant, freeze constants"
risk_if_skipped: "This is the core asset that every other task builds on - TASK-LUNAR-002 (can-chi), TASK-LUNAR-003 (validation), TASK-LUNAR-004 (recurrence), TASK-LUNAR-007 (month calendar), TASK-LUNAR-010 (app shell) all import it directly. Getting any constant in 6.2 wrong makes the entire calendar wrong, and the error spreads to every reminder. Without the engine there is no product."
---

## §1 - Description (BCP-14 normative)

The engine MUST convert between solar and lunar in both directions for every date in the 1900-2199 range in Vietnam time, fully offline, and port every one of Ho Ngoc Duc's constants exactly. Contract:

1. MUST provide `convertSolar2Lunar(dd, mm, yy, tz)` returning `[lunarDay, lunarMonth, lunarYear, lunarLeap]` for every valid solar date in 1900-2199, with `tz = 7.0` as the Vietnam default (TASK-A01, DEC-LUNAR-010).
2. MUST provide `convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, tz)` returning `[dd, mm, yy]`, the exact inverse of `convertSolar2Lunar` across the whole range (TASK-A01, discussed in TASK-LUNAR-003).
3. MUST compute every moment at meridian 105E with `timeZone = 7.0`; MUST NOT use 120E or UTC+8, because this is rule 5 that determines the difference between VN and China (DEC-LUNAR-010, PRD 6.1).
4. MUST identify the leap month correctly: the first month after month 11 that contains no Principal Term is the leap month, taking the name of the month before it with the flag `lunarLeap = 1` (TASK-A02, PRD 6.1 rule 4).
5. MUST make `jdFromDate(dd, mm, yy)` handle the Julian-to-Gregorian switch at `JD 2299161`: dates from 15/10/1582 onward use Gregorian, earlier dates use Julian (DEC-LUNAR-014).
6. MUST compute `NewMoon(k)` with the Meeus polynomial using `T = k / 1236.85`, the powers `T2`, `T3`, epoch `2415020.75933`, per-k synodic coefficient `29.53058868`, the `C1` correction series, and the `deltat` term (PRD 6.2, 6.3, DEC-LUNAR-013).
7. MUST compute `SunLongitude(jdn)` using the J2000 epoch `2451545.0` divided by `36525`, with `dr = PI / 180`, returning radians, and `getSunLongitude(dayNumber, tz) = INT(SunLongitude(dayNumber - 0.5 - tz / 24) / PI * 6)` returning an integer 0-11 (PRD 6.3).
8. MUST compute `getNewMoonDay(k, tz) = INT(NewMoon(k) + 0.5 + tz / 24)` returning the JDN of the day containing the k-th Soc point (PRD 6.3).
9. MUST compute `getLunarMonth11(yy, tz)` using the integer constant `LUNAR_MONTH11_EPOCH_INT = 2415021` (not the decimal version) to find the start day of lunar month 11 containing the Dong chi (PRD 6.2, DEC-LUNAR-011).
10. MUST compute `getLeapMonthOffset(a11, tz)` by scanning the successive months from `a11`, counting months until it reaches a month where `getSunLongitude` repeats (does not increase) - that is the month containing no Principal Term (PRD 6.3).
11. MUST keep the three epochs and two synodic constants separate in the code, with every constant carrying JSDoc stating its role and value clearly; MUST NOT use one epoch in the formula of another (DEC-LUNAR-011, DEC-LUNAR-013).
12. MUST use `EPOCH_INDEX_K = 2415021.076998695` in `convertSolar2Lunar` and `getLeapMonthOffset` when deriving the index k from a JDN (PRD 6.2).
13. MUST work fully offline: MUST NOT call network, fetch, or read the system clock to compute dates; the functions are pure and deterministic on their input (TASK-A06, NFR-Offline, DEC-LUNAR-012).
14. MUST set the amlich-core `package.json` with empty `dependencies`; MUST NOT add a runtime dependency (DEC-LUNAR-012).
15. MUST set a performance target: one `convertSolar2Lunar` call < 5ms on the target device (NFR-Performance); the functions are O(1) with no allocation in the hot path.
16. MUST freeze all constants (for example `Object.freeze` or `as const`) so they cannot be modified by accident at runtime (DEC-LUNAR-011).
17. MUST export `INVALID_SOLAR: SolarDate` (the value `[0, 0, 0]`) and `isInvalidSolar(s): boolean` so callers check the sentinel correctly and do not compare `=== null` (CONTRACT.md).
18. SHOULD provide a public `jdToDate(jd)` so TASK-LUNAR-002 and TASK-LUNAR-003 can compute can-chi and round-trip from a JDN without re-implementing it (DEC-LUNAR-015).
19. SHOULD return `lunarLeap` as `0 | 1` rather than a boolean at the core layer to keep Duc's original signature; the UI layer then maps it to a "leap" label (TASK-A02, DEC-LUNAR-015).

---

## §2 - Why this design (rationale for humans)

**Why port by hand instead of using an existing library?** PRD 6.5 strongly recommends porting to TypeScript because it is only about 300 lines, gives full control, and matches the Vietnamese standard. Feature-rich libraries like `lunar-typescript` compute at 120E, so they give the wrong Soc day and leap month for VN. Porting by hand lets you pin every constant in 6.2 exactly and prove accuracy through TASK-LUNAR-003 (DEC-LUNAR-010, DEC-LUNAR-012).

**Why are 105E and timeZone = 7.0 non-negotiable?** This is Ho Ngoc Duc's rule 5. When a Soc point or Principal Term falls near midnight, a one-hour difference between Hanoi and Beijing pushes the day to a different date, makes month 11 (the one containing Dong chi) different, and shifts the whole chain of months. In 1984 the Dong chi fell on 21/12 Hanoi time but 22/12 Beijing time, so Tet 1985 in VN was one month earlier than in China. Hard-coding the wrong timezone makes the whole calendar wrong in 1985 and in 2007/2030/2053 (DEC-LUNAR-010, PRD 6.4).

**Why must the three epochs be separate?** This is the most common trap when porting. `convertSolar2Lunar` uses the index-k epoch `2415021.076998695` to derive k from a JDN. Inside `NewMoon` it uses the Meeus epoch `2415020.75933` with the polynomial. `getLunarMonth11` uses the integer `2415021`. The three values are nearly identical but not interchangeable; using one of the three by mistake shifts the date in certain years that only a full-range test catches (DEC-LUNAR-011).

**Why two different synodic constants?** `29.530588853` is used to convert between a JDN and the lunation index k (index-k). `29.53058868` is the per-k coefficient inside the Meeus polynomial of `NewMoon`. The two numbers serve two different mathematical roles; merging them into one gives the wrong Soc position (DEC-LUNAR-013).

**Why is the leap month determined by "contains no Principal Term"?** Per 6.1 rule 4, a leap year has 13 months; the leap month is the first month after month 11 that contains no Principal Term. `getSunLongitude` returns 0-11 indicating the sun's zodiac sector; if two consecutive Soc points give the same value, the month between them contains no Principal Term and is the leap month. `getLeapMonthOffset` scans to find that offset (PRD 6.3).

**Why zero-dependency and offline?** NFR-Offline requires dates to be computed without network, and TASK-A06 states plainly that no network call is used to compute dates. A pure-function package with no dependencies, deterministic on its input, is the only way to guarantee the app still runs in airplane mode or without signal, and it is the precondition for TASK-LUNAR-013 (the Swift Widget) to re-implement or bridge the same logic (DEC-LUNAR-012).

**Why return the tuple `[day, month, year, leap]`?** Keeping Duc's original signature reduces the risk of a translation error when porting, and lets TASK-LUNAR-003 compare directly against reference implementations. The core layer knows nothing about a "leap label" or display formatting; that is the job of TASK-LUNAR-007 and TASK-LUNAR-009. Separating concerns keeps the core small and testable (DEC-LUNAR-015).

---

## §3 - API contract

```typescript
// packages/amlich-core/src/constants.ts + types.ts  (nguon su that la scaffold, KHONG phai file nay)
// Ten hang so sau day phai khop chinh xac CONTRACT.md va src/constants.ts.

/** Mui gio mac dinh Viet Nam: kinh tuyen 105E (DEC-LUNAR-010). Xem CONTRACT: VN_TZ. */
export const VN_TZ = 7.0;

/** IANA timezone id (todayInHCM). */
export const VN_TZ_ID = "Asia/Ho_Chi_Minh";

/** Kinh tuyen tham chieu (do). */
export const VN_MERIDIAN = 105;

/** Synodic month trung binh, dung de index k (JDN <-> so tuan trang). PRD 6.2. */
export const SYNODIC_INDEX_K = 29.530588853;

/** Epoch index-k: mean new moon 1/1/1900 dang JD. Dung trong convertSolar2Lunar / getLeapMonthOffset. */
export const EPOCH_INDEX_K = 2415021.076998695;

/** Meeus mean-new-moon epoch, dung ben trong NewMoon(). PRD 6.2. CONTRACT: MEEUS_NEW_MOON_EPOCH. */
export const MEEUS_NEW_MOON_EPOCH = 2415020.75933;

/** He so synodic per-k cua Meeus, dung ben trong NewMoon(). PRD 6.2. CONTRACT: MEEUS_SYNODIC_PER_K. */
export const MEEUS_SYNODIC_PER_K = 29.53058868;

/** Epoch nguyen (integer) cho getLunarMonth11. CONTRACT: LUNAR_MONTH11_EPOCH_INT. */
export const LUNAR_MONTH11_EPOCH_INT = 2415021;

/** J2000 epoch trong SunLongitude. */
export const J2000 = 2451545.0;

/** So ngay mot Julian century. CONTRACT: JULIAN_CENTURY_DAYS. */
export const JULIAN_CENTURY_DAYS = 36525;

/** Mau so cho T trong NewMoon: T = k / T_DIVISOR. */
export const T_DIVISOR = 1236.85;

/** Degrees sang radians. */
export const DR = Math.PI / 180;

/** JD ngay chuyen Julian -> Gregorian (15/10/1582). PRD 6.3. */
export const GREGORIAN_SWITCH_JD = 2299161;

export type LunarDate = readonly [day: number, month: number, year: number, leap: 0 | 1];
export type SolarDate = readonly [day: number, month: number, year: number];
/** Sentinel cho solar khong hop le (lunarLeap khong khop): [0, 0, 0]. CONTRACT.md. */
export const INVALID_SOLAR: SolarDate;
/** Tra true khi SolarDate la sentinel [0,0,0]. CONTRACT.md. */
export function isInvalidSolar(s: SolarDate): boolean;

/** Ngày dương (dd/mm/yy) -> Julian Day Number, switch Julian/Gregorian tại 2299161. */
export function jdFromDate(dd: number, mm: number, yy: number): number;

/** JDN -> ngày dương (dd/mm/yy), nghịch đảo của jdFromDate. */
export function jdToDate(jd: number): SolarDate;

/** JD của điểm Sóc thứ k (đa thức Meeus T/T2/T3, chuỗi C1, deltat). */
export function NewMoon(k: number): number;

/** Kinh độ mặt trời (radian) tại jdn. */
export function SunLongitude(jdn: number): number;

/** = INT(SunLongitude(dayNumber - 0.5 - tz/24) / PI * 6), trả 0..11 (xác định Trung khí). */
export function getSunLongitude(dayNumber: number, tz: number): number;

/** = INT(NewMoon(k) + 0.5 + tz/24): JDN ngày chứa điểm Sóc thứ k. */
export function getNewMoonDay(k: number, tz: number): number;

/** Ngày (JDN) bắt đầu tháng 11 âm chứa Đông chí của năm dương yy. */
export function getLunarMonth11(yy: number, tz: number): number;

/** Vị trí tháng nhuận (offset tháng từ a11), 0 nếu không có. */
export function getLeapMonthOffset(a11: number, tz: number): number;

/** Solar -> lunar theo giờ Việt Nam (tz mặc định 7.0). */
export function convertSolar2Lunar(
  dd: number, mm: number, yy: number, tz?: number,
): LunarDate;

/** Lunar -> solar theo giờ Việt Nam (tz mặc định 7.0). */
export function convertLunar2Solar(
  lunarDay: number, lunarMonth: number, lunarYear: number, lunarLeap: 0 | 1, tz?: number,
): SolarDate;
```

```typescript
// packages/amlich-core/src/convert.ts  (port canonical, hằng số ở §3)

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < GREGORIAN_SWITCH_JD) {
    // trước 15/10/1582: dùng lịch Julian (DEC-LUNAR-014)
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd: number): SolarDate {
  let a: number, b: number, c: number;
  if (jd >= GREGORIAN_SWITCH_JD) {
    // 15/10/1582 (JD 2299161) trở đi dùng Gregorian; canonical Đức dùng jd > 2299160,
    // tức jd >= GREGORIAN_SWITCH_JD. Dùng dấu ">" sẽ đẩy đúng ngày switch sang nhánh Julian
    // và làm jdToDate(2299161) trả 5/10/1582 thay vì 15/10/1582 (DEC-LUNAR-014).
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

export function convertSolar2Lunar(
  dd: number, mm: number, yy: number, tz: number = VN_TZ,
): LunarDate {
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
  lunarDay: number, lunarMonth: number, lunarYear: number, lunarLeap: 0 | 1,
  tz: number = VN_TZ,
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
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0]; // tháng nhuận không khớp -> caller áp fallback (PRD 10)
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }
  const k = Math.floor(0.5 + (a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  const monthStart = getNewMoonDay(k + off, tz);
  return jdToDate(monthStart + lunarDay - 1);
}
```

```typescript
// packages/amlich-core/src/newmoon.ts

export function NewMoon(k: number): number {
  const T = k / 1236.85;           // Julian centuries từ 1900 (PRD 6.2)
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

export function getNewMoonDay(k: number, tz: number): number {
  return Math.floor(NewMoon(k) + 0.5 + tz / 24);
}
```

```typescript
// packages/amlich-core/src/sunlongitude.ts

export function SunLongitude(jdn: number): number {
  const T = (jdn - J2000) / JULIAN_CENTURY_DAYS;   // J2000 / 36525 (PRD 6.2)
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M) +
    (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) +
    0.00029 * Math.sin(DR * 3 * M);
  let L = L0 + DL;
  L = L * DR;
  L = L - PI * 2 * Math.floor(L / (PI * 2));   // chuẩn hóa về [0, 2PI)
  return L;
}

export function getSunLongitude(dayNumber: number, tz: number): number {
  return Math.floor((SunLongitude(dayNumber - 0.5 - tz / 24) / PI) * 6);
}
```

```typescript
// packages/amlich-core/src/leap.ts

export function getLunarMonth11(yy: number, tz: number): number {
  const off = jdFromDate(31, 12, yy) - LUNAR_MONTH11_EPOCH_INT;   // integer epoch (PRD 6.2)
  const k = Math.floor(off / SYNODIC_INDEX_K);
  let nm = getNewMoonDay(k, tz);
  const sunLong = getSunLongitude(nm, tz);                  // mặt trời tại điểm Sóc này
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, tz);
  }
  return nm;
}

export function getLeapMonthOffset(a11: number, tz: number): number {
  const k = Math.floor((a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K + 0.5);
  let last = 0;
  let i = 1; // bắt đầu từ tháng sau tháng 11
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}
```

---

## §4 - Acceptance criteria

1. `convertSolar2Lunar(29, 1, 2025, 7)` returns `[1, 1, 2025, 0]` (Tet 2025, fixture 6.6).
2. `convertSolar2Lunar(10, 2, 2024, 7)` returns `[1, 1, 2024, 0]` (Tet 2024).
3. `convertSolar2Lunar(2, 2, 1984, 7)` returns `[1, 1, 1984, 0]` (the reference point Duc published).
4. `convertLunar2Solar(1, 1, 2025, 0, 7)` returns `[29, 1, 2025]` (inverse of AC #1).
5. Round-trip: for any sample solar date in 1900-2199, `convertLunar2Solar(...convertSolar2Lunar(d, m, y, 7), 7)` returns exactly `[d, m, y]`.
6. `jdFromDate(15, 10, 1582)` returns `2299161` (the switch day, Gregorian branch); `jdFromDate(4, 10, 1582)` returns `2299160` via the Julian branch (the Julian day immediately before the switch - note that 14/10/1582 does NOT exist adjacent to it because Julian and Gregorian are 10 days apart at the 1582 reference point, `jdFromDate(14, 10, 1582)` falls into the Julian branch and returns `2299170`) (DEC-LUNAR-014).
7. `jdToDate(jdFromDate(dd, mm, yy))` returns `[dd, mm, yy]` for every test date (JDN inverse).
8. `getSunLongitude` always returns an integer in `[0, 11]` for every JDN in the range.
9. `getNewMoonDay(k, 7)` yields an integer JDN (not a real number) for every k corresponding to 1900-2199.
10. Year 1985 detects a leap month 2: there exists a lunar month `[*, 2, 1985, 1]` and its `convertLunar2Solar` falls between 21/03 and 19/04/1985 (fixture 6.6).
11. VN Tet 1985 = 21/01/1985: `convertLunar2Solar(1, 1, 1985, 0, 7)` returns `[21, 1, 1985]` (one month earlier than China, PRD 6.4).
12. Constants in the module are frozen: reassigning `EPOCH_INDEX_K` at runtime throws (strict mode) or has no effect (DEC-LUNAR-011, §1 #16).
13. The amlich-core `package.json` has empty `dependencies` (DEC-LUNAR-012).
14. Performance: the average `convertSolar2Lunar` call is < 5ms when measured over 10,000 calls (NFR-Performance).
15. No network-call error during the whole test suite (offline guard; DEC-LUNAR-012).
16. `convertLunar2Solar` with a non-matching leap flag (for example a month that is not the leap month of that year) returns `[0, 0, 0]` to tell the caller to apply a fallback (PRD 10, related to TASK-LUNAR-004).
17. `INVALID_SOLAR` equals `[0, 0, 0]`; `isInvalidSolar(INVALID_SOLAR)` returns `true`; `isInvalidSolar([29, 1, 2025])` returns `false` (CONTRACT.md, §1 #17).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/convert.test.ts
import { describe, it, expect } from "vitest";
import {
  convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate,
  getSunLongitude, GREGORIAN_SWITCH_JD, VN_TZ, INVALID_SOLAR, isInvalidSolar,
} from "../src/index";

const TZ = VN_TZ;

describe("Tet fixtures (PRD 6.6)", () => {
  it("29/01/2025 -> 1/1/2025 (At Ty)", () => {
    expect(convertSolar2Lunar(29, 1, 2025, TZ)).toEqual([1, 1, 2025, 0]);
  });
  it("17/02/2026 -> 1/1/2026 (Binh Ngo)", () => {
    expect(convertSolar2Lunar(17, 2, 2026, TZ)).toEqual([1, 1, 2026, 0]);
  });
  it("10/02/2024 -> 1/1/2024 (Giap Thin)", () => {
    expect(convertSolar2Lunar(10, 2, 2024, TZ)).toEqual([1, 1, 2024, 0]);
  });
  it("22/01/2023 -> 1/1/2023 (Quy Mao)", () => {
    expect(convertSolar2Lunar(22, 1, 2023, TZ)).toEqual([1, 1, 2023, 0]);
  });
  it("02/02/1984 -> 1/1/1984 (Giap Ty)", () => {
    expect(convertSolar2Lunar(2, 2, 1984, TZ)).toEqual([1, 1, 1984, 0]);
  });
});

describe("Julian/Gregorian switch (DEC-LUNAR-014)", () => {
  it("15/10/1582 = JD 2299161 (ngay switch)", () => {
    expect(jdFromDate(15, 10, 1582)).toBe(GREGORIAN_SWITCH_JD);
  });
  it("4/10/1582 = JD 2299160 qua nhanh Julian (ngay Julian lien truoc switch)", () => {
    expect(jdFromDate(4, 10, 1582)).toBe(2299160);
  });
  it("jdToDate(2299161) == 15/10/1582 (bien switch, bat off-by-one o nhanh Gregorian)", () => {
    // Bo guard "jd > GREGORIAN_SWITCH_JD" se day dung ngay switch sang nhanh Julian -> 5/10/1582.
    expect(jdToDate(GREGORIAN_SWITCH_JD)).toEqual([15, 10, 1582]);
  });
  it("jdToDate is the inverse of jdFromDate (gom ca ngay switch)", () => {
    for (const [d, m, y] of [[1, 1, 1900], [31, 12, 2199], [29, 1, 2025], [15, 10, 1582]] as const) {
      expect(jdToDate(jdFromDate(d, m, y))).toEqual([d, m, y]);
    }
  });
});

describe("Reverse + round-trip (NFR-Accuracy)", () => {
  it("L2S inverts S2L for Tet 2025", () => {
    expect(convertLunar2Solar(1, 1, 2025, 0, TZ)).toEqual([29, 1, 2025]);
  });
  it("round-trip identity sweep 1900-2199 (step 37 days)", () => {
    const start = jdFromDate(1, 1, 1900);
    const end = jdFromDate(31, 12, 2199);
    for (let jd = start; jd <= end; jd += 37) {
      const [d, m, y] = jdToDate(jd);
      const [ld, lm, ly, leap] = convertSolar2Lunar(d, m, y, TZ);
      expect(convertLunar2Solar(ld, lm, ly, leap, TZ)).toEqual([d, m, y]);
    }
  });
});

describe("1985 leap month 2 + early Tet (PRD 6.4 / 6.6)", () => {
  it("Tet VN 1985 = 21/01/1985 (som hon TQ mot thang)", () => {
    expect(convertLunar2Solar(1, 1, 1985, 0, TZ)).toEqual([21, 1, 1985]);
  });
  it("thang 2 nhuan 1985 ton tai va roi trong 21/03..19/04", () => {
    const solar = convertLunar2Solar(1, 2, 1985, 1, TZ);
    expect(solar).not.toEqual([0, 0, 0]);
    const jd = jdFromDate(solar[0], solar[1], solar[2]);
    expect(jd).toBeGreaterThanOrEqual(jdFromDate(21, 3, 1985));
    expect(jd).toBeLessThanOrEqual(jdFromDate(19, 4, 1985));
  });
});

describe("getSunLongitude bounds + perf", () => {
  it("luon tra 0..11", () => {
    const start = jdFromDate(1, 1, 1900);
    for (let jd = start; jd < start + 1200; jd += 11) {
      const v = getSunLongitude(jd, TZ);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });
  it("convertSolar2Lunar < 5ms trung binh tren 10k lan", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) convertSolar2Lunar(29, 1, 2025, TZ);
    const per = (performance.now() - t0) / 10_000;
    expect(per).toBeLessThan(5);
  });
});

describe("Leap mismatch -> [0,0,0] (PRD 10)", () => {
  it("co nhuan khong khop tra ve sentinel", () => {
    // 2025 khong co thang 5 nhuan -> yeu cau thang 5 nhuan tra ve [0,0,0]
    expect(convertLunar2Solar(1, 5, 2025, 1, TZ)).toEqual([0, 0, 0]);
  });
});

describe("INVALID_SOLAR / isInvalidSolar (CONTRACT.md, AC #17)", () => {
  it("INVALID_SOLAR === [0,0,0]", () => {
    expect(INVALID_SOLAR).toEqual([0, 0, 0]);
  });
  it("isInvalidSolar(INVALID_SOLAR) = true", () => {
    expect(isInvalidSolar(INVALID_SOLAR)).toBe(true);
  });
  it("isInvalidSolar([29,1,2025]) = false", () => {
    expect(isInvalidSolar([29, 1, 2025])).toBe(false);
  });
  it("convertLunar2Solar nhuan khong khop la isInvalidSolar", () => {
    const s = convertLunar2Solar(1, 5, 2025, 1, TZ);
    expect(isInvalidSolar(s)).toBe(true);
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is a full skeleton; the entire logic is ported verbatim. The one detail worth pinning down is the order of deriving k in `convertSolar2Lunar`: compute `k` from `EPOCH_INDEX_K`, take `getNewMoonDay(k + 1)`, and if it goes past `dayNumber`, step back to `getNewMoonDay(k)`. This is the spot most prone to an off-by-one; the TASK-LUNAR-003 round-trip sweep is the safety net that catches any drift at this step. The constants in §3 MUST be `Object.freeze`d in the `index.ts` barrel.

---

## §7 - Dependencies

Upstream: none. This is the lowest primitive of the system; depends_on is empty.

Downstream: TASK-LUNAR-002 uses `jdToDate` and `getSunLongitude` for can-chi and tiet khi; TASK-LUNAR-003 uses the whole API as the golden harness; TASK-LUNAR-004 calls `convertLunar2Solar` every year for the recurrence engine; TASK-LUNAR-007 uses `convertSolar2Lunar` to render the month calendar; TASK-LUNAR-008 anchors occasions to lunar dates; TASK-LUNAR-010 imports the core into the app shell; TASK-LUNAR-013 re-implements or bridges minimal logic to Swift. Every name in `blocks` matches the frontmatter.

Cross-cutting: the constants in §3 are the single source of truth for every downstream task; changing them here affects the whole system. This task's < 5ms performance is the precondition for TASK-LUNAR-007's NFR-Performance render of < 100ms.

---

## §8 - Example payloads

```json
{
  "input": { "fn": "convertSolar2Lunar", "args": [29, 1, 2025, 7.0] },
  "output": [1, 1, 2025, 0],
  "note": "Tet At Ty; leap = 0"
}
```

```json
{
  "input": { "fn": "convertLunar2Solar", "args": [1, 2, 1985, 1, 7.0] },
  "output": [21, 3, 1985],
  "note": "tháng 2 nhuận 1985; một trong các năm nhuận lịch sử"
}
```

```json
{
  "input": { "fn": "convertLunar2Solar", "args": [1, 5, 2025, 1, 7.0] },
  "output": [0, 0, 0],
  "note": "cờ nhuận không khớp -> sentinel cho caller áp fallback (PRD 10)"
}
```

---

## §9 - Open questions

Resolved within the scope of this task: the 1900-2199 range, meridian 105E, three epochs, tuple format, and the `[0,0,0]` sentinel for a non-matching leap flag.

Deferred (tied to the PRD Caveats):
- Accuracy in very distant years (before ~1200 or after 2199) when a Soc point falls near midnight may be off by 1 day; the published algorithm is a simplified version. This task does not extend the range; TASK-LUNAR-003 only commits to 1900-2199 and marks suspect years if any are found.
- The Hong Kong Observatory warns of a discrepancy around 28/9/2057 (China standard 120E); this is only relevant when cross-checking against China, and does not affect the VN result. Noted, not handled in the core.
- Whether to provide extra utility functions (for example computing lunar age, or the number of days between two lunar dates) - deferred to the tasks that need them, not added to the core in slice 1.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Wrong epoch used (for example the Meeus epoch in convertSolar2Lunar) | TASK-LUNAR-003 round-trip sweep fails in some years | non-systematic date drift | fix to the correct epoch per §3 |
| Two synodic constants merged into one | Soc point drifts, Tet fixture fails | wrong first day of the month | separate 29.530588853 and 29.53058868 |
| Hard-coded tz != 7.0 or 120E | 1985 and 2007/2030/2053 fail | the whole calendar follows China | lock VN_TIMEZONE = 7.0 |
| Missing Julian/Gregorian switch | jdFromDate wrong before 1582 | JDN off for ancient dates | branch `jd < 2299161` -> Julian |
| Off-by-one at the switch boundary in jdToDate (`jd > 2299161` instead of `>=`) | the 1900-2199 round-trip sweep does NOT catch it (every JDN >> the boundary); only exposed by the AC test on the switch day | `jdToDate(2299161)` returns 5/10/1582 instead of 15/10/1582 | use `jd >= GREGORIAN_SWITCH_JD` (equivalent to the canonical `jd > 2299160`); the switch-day test in §5 |
| getSunLongitude not normalized to [0,2PI) | returns outside [0,11] | wrong leap month | modulo 2PI inside SunLongitude |
| Off-by-one when deriving k | first day of the month off by 1 | wrong lunarDay | step back getNewMoonDay(k) when it goes past dayNumber |
| getLeapMonthOffset infinite loop | hangs on a year with corrupt data | hang | guard `i < 14` in the do-while |
| Non-matching leap flag in L2S | returns [0,0,0] | caller has not handled it | TASK-LUNAR-004 applies a regular-month fallback |
| Float precision accumulating in distant years | round-trip off by 1 day in distant years | rare wrong date | keep the 1900-2199 range, mark suspect |
| Constant modified at runtime | reassignment throws or is a no-op | silent error | Object.freeze + AC #12 test |
| Dependency added by accident | package.json deps not empty | loses zero-dep | AC #13 test guard |
| Network call in a test | offline guard catches it | loses NFR-Offline | remove any fetch/IO from the core |
| Input outside the solar range (for example yy < 1900) | the return value is still used but untested | not guaranteed | caller bounds the range before calling |

---

## §11 - Implementation notes

- The three epochs are the biggest trap: `EPOCH_INDEX_K = 2415021.076998695` for convertSolar2Lunar and getLeapMonthOffset, `MEEUS_NEW_MOON_EPOCH = 2415020.75933` only inside NewMoon, `LUNAR_MONTH11_EPOCH_INT = 2415021` as the integer for getLunarMonth11. Place the three constants next to each other in constants.ts with JSDoc on their roles so nobody uses one by mistake.
- The two synodic constants are the same kind of trap: `SYNODIC_INDEX_K = 29.530588853` is only for converting between a JDN and k; `MEEUS_SYNODIC_PER_K = 29.53058868` is the per-k coefficient in the Meeus polynomial. Do not merge them.
- `getSunLongitude` MUST take `dayNumber - 0.5 - tz/24`, not `dayNumber`; subtract 0.5 because a JDN starts at noon, subtract tz/24 to bring it to local time at 105E. A sign error here shifts the Principal Term.
- `getNewMoonDay` floors `NewMoon(k) + 0.5 + tz/24` to get the integer JDN of the day containing the Soc point; adding 0.5 and tz/24 for the same reason as above.
- The `getLeapMonthOffset` loop compares the `getSunLongitude` of successive Soc points; when the value repeats (does not increase), the month between them contains no Principal Term and is the leap month. It must guard `i < 14` so it does not hang on abnormal data.
- `convertLunar2Solar` returns `[0,0,0]` when the leap flag does not match the year; this is a deliberate sentinel for TASK-LUNAR-004 to apply a fallback rule (a leap-month time then goes to the regular month), not a thrown error.
- The 1900-2199 round-trip sweep is the cheapest safety net: it catches every off-by-one in deriving k, every epoch drift, and every timezone error that the sparse Tet fixtures never touch. Run it in CI on every commit that touches the core.
- Freeze the constants in the barrel and check with AC #12; a single accidental runtime edit of a value silently corrupts the whole calendar and is the hardest of all error types to debug.

---

*End of TASK-LUNAR-001.*
