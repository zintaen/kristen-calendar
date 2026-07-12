---
id: FR-LUNAR-004
title: "Reminder data model + recurrence engine - store the lunar date, auto-generate the solar date each year, leap-month fallback, timezone lock Asia/Ho_Chi_Minh"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P1
milestone: P1 · slice 2
slice: 2
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-001, FR-LUNAR-005, FR-LUNAR-006]
depends_on: [FR-LUNAR-001]
blocks: [FR-LUNAR-005, FR-LUNAR-006, FR-LUNAR-016, FR-LUNAR-017, FR-LUNAR-018]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-B02, FR-B06)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#10 (Data Model, recurrence rule)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#11 (Notification Architecture)"
source_decisions:
  - DEC-LUNAR-040 (store the Reminder by lunarDay/lunarMonth + isLeapMonth, NOT the solar date; the solar date is a derived value, not the source value)
  - DEC-LUNAR-041 (the recurrence engine generates occurrences by calling convertLunar2Solar for each targetLunarYear, not by interpolating from the previous one)
  - DEC-LUNAR-042 (leap-month fallback: a death anniversary in a leap month whose target year has no such leap month -> observe it in the corresponding regular month, FALLBACK_REGULAR by default but the user may choose)
  - DEC-LUNAR-043 (all calculations locked to Asia/Ho_Chi_Minh / tz=7.0; do NOT use the device's local Date to derive the lunar date)
  - DEC-LUNAR-044 (OccurrenceCache is a pure cache, can be cleared and recomputed at any time; computedAt + engineVersion to invalidate when the core changes)
  - DEC-LUNAR-045 (MONTHLY recurrence generates 12 occurrences/year from lunarDay; ANNUAL generates 1/year; ONCE fixes exactly the lunarYear entered)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/recurrence.ts
  - packages/amlich-core/src/reminder.ts
  - packages/amlich-core/src/tz.ts
  - packages/amlich-core/test/recurrence.test.ts
  - packages/amlich-core/test/fixtures/recurrence.json
modified_files:
  - packages/amlich-core/src/index.ts
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/{src,test}/**
  - bash: cd packages/amlich-core && pnpm test recurrence
disallowed_tools:
  - network calls to compute dates (violates DEC-LUNAR-043 / NFR-Offline)
  - using the device's local-time `new Date()` to derive lunar/solar occurrences (violates DEC-LUNAR-043 - must lock Asia/Ho_Chi_Minh)
  - storing the computed solar date as the Reminder's source value (violates DEC-LUNAR-040 - store only the lunar date)
effort_hours: 12
sub_tasks:
  - "1.0h: tz.ts - normalize the time reference to Asia/Ho_Chi_Minh, helper todayInHCM(now?: Date): SolarDate returning the tuple [day, month, year] on-device independent of the machine TZ (CONTRACT signature)"
  - "2.0h: reminder.ts - full Reminder type (type/recurrence ENUM, leadTimes, channels, isLeapMonth, sharedWith...), validate() + normalize()"
  - "2.5h: recurrence.ts - nextOccurrences(reminder, opt: RecurrenceOptions {fromYear, count, engineVersion}) calling convertLunar2Solar for each targetLunarYear, folding in lead-time"
  - "2.0h: leap-month fallback - detect a target year that has no leap month as entered, apply the LeapFallback policy (REGULAR default / SKIP / ASK)"
  - "1.0h: MONTHLY expander - generate a Ram/Mung Mot occurrence each month in the lunar year, handling the leap month repeating the day"
  - "1.0h: OccurrenceCache - compute, store computedAt+engineVersion, invalidate, rebuild"
  - "1.5h: recurrence.test.ts - fixture for the 1985 leap month 2 death anniversary, a day-30 short-month death anniversary, MONTHLY 12 times, round-trip vs FR-001"
  - "1.0h: index.ts barrel export + doc comment for the fallback policy and timezone lock"
risk_if_skipped: "Without this model there is nothing to remind - it is the data source that FR-LUNAR-005 (the rolling-64 scheduler) and FR-LUNAR-006 (reminder management) read from. If the recurrence is wrong, a grandparent's death anniversary is reminded on the wrong date every year, breaking the product's core duty. If Asia/Ho_Chi_Minh is not locked, a user traveling abroad sees the wrong lunar date. FR-LUNAR-016/017/018 (Zalo, ZNS, family sync) all reuse exactly this Reminder type, so a schema error here spreads to the commercial downstream."
---

## §1 - Description (BCP-14 normative)

This module defines the `Reminder` type (along with `User`, `OccurrenceCache`) and the recurrence engine that generates solar dates from lunar dates, locking every calculation to Asia/Ho_Chi_Minh. This is the contract:

1. MUST store each repeating `Reminder` by `lunarDay` + `lunarMonth` + `isLeapMonth`, and MUST NOT store the solar date as the source value; the solar date is always derived via `convertLunar2Solar` (DEC-LUNAR-040, FR-B02).
2. MUST support the `recurrence` ENUM `MONTHLY | ANNUAL | ONCE`: `ANNUAL` sets `lunarYear = null` (repeats yearly), `ONCE` keeps the entered `lunarYear` (fixed once), `MONTHLY` ignores `lunarMonth` and repeats `lunarDay` every lunar month (DEC-LUNAR-045, FR-B02).
3. MUST support the `type` ENUM `RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL`; `RAM` implies `lunarDay = 15`, `MUNG_MOT` implies `lunarDay = 1`, `GIO` is a personal death anniversary, `CUSTOM` is a custom lunar reminder, `FESTIVAL` links to `FestivalContent` (PRD section 10).
4. MUST generate occurrences via `nextOccurrences(reminder, opt)` with `opt: RecurrenceOptions { fromYear, count, engineVersion }` (signature §3), calling `convertLunar2Solar(lunarDay, lunarMonth, targetLunarYear, isLeap)` independently for each `targetLunarYear`, and MUST NOT interpolate from the previous occurrence (DEC-LUNAR-041). `count` is the number of LUNAR occurrences to scan (before multiplying by lead-time); the total `Occurrence` returned is `count * leadTimes.length`.
5. MUST apply the leap-month fallback rule: when a death anniversary is entered in a leap month (`isLeapMonth = true`) but the `targetLunarYear` has no such leap month, the engine MUST compute the occurrence in the corresponding regular month (`FALLBACK_REGULAR`) by default, and mark `fellBack = true` so the UI can ask the user to confirm (DEC-LUNAR-042, PRD section 10).
6. MUST let the user choose the fallback policy via the `leapFallback` ENUM `REGULAR | SKIP | ASK`: `REGULAR` observes the regular month, `SKIP` skips that year, `ASK` returns the occurrence in the `pending_user_choice` state (DEC-LUNAR-042).
7. MUST handle a death anniversary falling on a day that does not exist in the target lunar month (for example day 30 when the target month has only 29 days): the engine MUST clamp back to the last day of that lunar month and mark `dayClamped = true` (FR-B02 edge case).
8. MUST lock every calculation to `timeZone = 7.0` (meridian 105E, Asia/Ho_Chi_Minh) via `tz.ts`, and MUST NOT use the device's local-time `new Date()` to derive the lunar date or determine "today" (DEC-LUNAR-043, FR-B06).
9. MUST assign each occurrence a `notifyTime` (default "07:00") and an array `leadTimes: number[]` in days (for example `[0, 1]` = on the day + 1 day before); each (occurrence x leadTime) pair generates its own reminder point (FR-B04, preparing for FR-LUNAR-005).
10. MUST generate each reminder point as an `Occurrence` carrying `reminderId`, `gregorianDate` (ISO date), `lunarLabel` (display string), `leadDays`, and `fireAtLocal` (datetime in Vietnam time) for FR-LUNAR-005 to sort (PRD section 11).
11. MUST provide `OccurrenceCache { reminderId, gregorianDate, lunarLabel, computedAt, engineVersion }`; the cache MAY be cleared and recomputed at any time, and MUST invalidate when the amlich-core `engineVersion` changes (DEC-LUNAR-044).
12. MUST provide `validateReminder(r)` returning a list of errors: `lunarDay` outside 1..30, `lunarMonth` outside 1..12, `RAM` with `lunarDay != 15`, `ONCE` missing `lunarYear`, `leadTimes` containing a negative number, empty `channels`.
13. MUST provide `normalizeReminder(r)` setting stable defaults: `notifyTime = "07:00"`, `leadTimes = [1]` (1 day before), `channels = ["LOCAL"]`, `enabled = true`, `leapFallback = "REGULAR"`, sort+dedupe `leadTimes`.
14. MUST keep this module zero-dependency and purely computational (no I/O, no storage); reading/writing storage belongs to the app layer (FR-LUNAR-010), sending notifications belongs to FR-LUNAR-005 (NFR-Offline).
15. MUST set the historical reference point as a fixture: a death anniversary entered on 16/02 in the leap month 2 of 1985 (At Suu) must generate the correct occurrence in the range 21/03-19/04/1985; a MONTHLY day-15 death anniversary must generate 12 or 13 occurrences in a year with a leap month (PRD section 6.6).
16. SHOULD expose `engineVersion` (the semver of amlich-core) so OccurrenceCache and FR-LUNAR-018 (cloud sync) know when to recompute on the client.

---

## §2 - Why this design (rationale for humans)

**Why store the lunar date, not the solar date (§1 #1, DEC-LUNAR-040)?** A death anniversary is a fixed lunar date, but the corresponding solar date changes every year. If you store the solar date, next year it is wrong. Storing `lunarDay/lunarMonth/isLeapMonth` once and computing the solar date each year is the only way to match the nature of a death anniversary, and it matches the recurrence rule in PRD section 10.

**Why call convertLunar2Solar each year, not interpolate (§1 #4, DEC-LUNAR-041)?** The gap between two consecutive death anniversaries measured in solar days is not fixed - it varies because of the lunar year length and the position of the leap month. Adding 354 or 384 days both drift. Calling the lunar engine again for each `targetLunarYear` is the only way to get a result that matches the Ho Ngoc Duc calendar, and it is cheap because FR-LUNAR-001 covers a 1-day conversion in < 5ms.

**Why the leap-month fallback (§1 #5, #6, DEC-LUNAR-042)?** Someone who died in a leap month (for example the leap month 2) raises a real question: which day do you observe in years that have no leap month 2? The common custom is to observe it in the corresponding regular month, so `FALLBACK_REGULAR` is a reasonable default. But this is a family's cultural decision, so the engine marks `fellBack` and lets the UI ask again, rather than deciding silently.

**Why add dayClamped (§1 #7)?** A lunar month can have only 29 days. A day-30 death anniversary falling in a year where that month is short has no day 30. Clamping back to the last day of the month (29) and reporting `dayClamped` keeps the reminder happening close to the right day, rather than jumping to the next month or disappearing.

**Why lock Asia/Ho_Chi_Minh (§1 #8, DEC-LUNAR-043)?** The main persona is an actor who often films far away and may be in a different timezone. If you derive the lunar date by device time, "today is the first of the lunar month" will be wrong abroad. Locking every calculation to `tz = 7.0` (105E) keeps the lunar calendar correct in Vietnam time everywhere, true to the spirit of FR-B06.

**Why split lead-time into multiple reminder points (§1 #9, #10)?** The PRD allows reminders "on the day / 1 day before / 3 days before / 1 week before". Each item is its own notification at its own moment. Pre-generating them as `Occurrence` with a `fireAtLocal` lets FR-LUNAR-005 simply merge, sort by time, and cut the nearest 64 - matching the iOS 64-pending budget.

**Why must OccurrenceCache invalidate by engineVersion (§1 #11, DEC-LUNAR-044)?** If an amlich-core bug fix changes a Meeus constant, every cached date may change. Attaching `engineVersion` to the cache allows detecting that the core changed and recomputing, rather than serving stale wrong dates. The cache is only speed, never truth.

**Why zero-dependency, purely computational (§1 #14)?** Same reason as FR-LUNAR-001: three clients (web, iOS, Zalo) all import this module. Keeping it I/O-free means it runs identically everywhere, is testable with static fixtures, and does not pull in each platform's different storage API.

---

## §3 - API contract

```typescript
// packages/amlich-core/src/reminder.ts
// QUAN TRONG: moi consumer import type Reminder tu "@cyberskill/amlich-core"; KHONG redeclare.

export type ReminderType = "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
export type Recurrence = "MONTHLY" | "ANNUAL" | "ONCE";
export type ReminderChannel = "LOCAL" | "ZNS" | "PUSH";   // CONTRACT ten la ReminderChannel, khong phai Channel
export type LeapFallback = "REGULAR" | "SKIP" | "ASK";

export interface User {
  id: string;
  displayName: string;
  locale: "vi-VN";                 // PRD section 10
  timezone: "Asia/Ho_Chi_Minh";    // locked, DEC-LUNAR-043
  theme: "purple";
  phone?: string;                  // cho ZNS (FR-LUNAR-017)
  consentFlags: Record<string, boolean>;
}

export interface Reminder {
  readonly id: string;
  readonly userId: string;
  readonly type: ReminderType;
  readonly title: string;
  readonly lunarDay: number;               // 1..30
  readonly lunarMonth: number;             // 1..12
  readonly lunarYear: number | null;       // null neu ANNUAL/MONTHLY; CONTRACT: number|null, khong phai optional
  readonly isLeapMonth: boolean;           // cho dam gio roi thang nhuan
  readonly leapFallback: LeapFallback;     // DEC-LUNAR-042
  readonly recurrence: Recurrence;
  readonly leadTimes: readonly number[];   // ngay; [0,1] = dung ngay + truoc 1 ngay
  readonly notifyTime: string;             // "HH:mm", gio Viet Nam
  readonly channels: readonly ReminderChannel[];
  readonly linkedContentId?: string;       // FR-LUNAR-008 FestivalContent
  readonly sharedWith?: readonly string[]; // FR-LUNAR-018 family sharing; optional theo CONTRACT
  readonly enabled: boolean;
  readonly notificationStyle?: NotificationStyle;  // FR-F05 (FR-LUNAR-006 fold); optional
}

/** FR-F05 - tong giong + emoji cho body thong bao. FR-LUNAR-006 set; FR-LUNAR-005 doc; FR-LUNAR-015 (P2) co the thay render. */
export interface NotificationStyle {
  tone: "warm" | "neutral" | "formal";
  emoji: string;
  imageId?: string;                // P1 chi emoji + anh dung san; upload rieng cho FR-LUNAR-019 (PDPL)
}

export interface ValidationError { field: string; code: string; message: string; }
export function validateReminder(r: Reminder): ValidationError[];
export function normalizeReminder(r: Partial<Reminder>): Reminder;
```

```typescript
// packages/amlich-core/src/recurrence.ts
import { convertLunar2Solar, convertSolar2Lunar } from "./convert";

// Occurrence: 8 truong, CONTRACT chinh xac - khop CONTRACT.md §P0/P1 surface
export interface Occurrence {
  readonly reminderId: string;
  readonly gregorianDate: string;      // "YYYY-MM-DD" tai Asia/Ho_Chi_Minh - STRING, khong phai SolarDate tuple
  readonly lunarLabel: string;         // vi du "15/7 At Ty" hoac "16/2 (nhuan) At Suu"
  readonly leadDays: number;           // 0 = dung ngay
  readonly fireAtLocal: string;        // "YYYY-MM-DDTHH:mm:00+07:00"
  readonly fellBack: boolean;          // DEC-LUNAR-042 - da ap fallback thang nhuan
  readonly dayClamped: boolean;        // §1 #7 - lui ve ngay cuoi thang am
  readonly pendingUserChoice: boolean; // leapFallback = ASK
}

// RecurrenceOptions: engineVersion la REQUIRED (khong optional) - CONTRACT
export interface RecurrenceOptions {
  readonly fromYear: number;          // nam DUONG bat dau quet
  readonly count: number;             // so occurrence am muon (truoc khi nhan lead-time); tong Occurrence tra = count * leadTimes.length
  readonly engineVersion: string;     // REQUIRED - CONTRACT; khong phai optional
}

/** Sinh cac occurrence sap toi cho mot Reminder, da nhan lead-time. */
export function nextOccurrences(r: Reminder, opt: RecurrenceOptions): readonly Occurrence[];

/** Gop occurrence cua nhieu Reminder, sort theo fireAtLocal tang dan. FR-LUNAR-005 cat 64 dau. */
export function mergeAndSort(all: readonly Occurrence[]): readonly Occurrence[];
```

```typescript
// packages/amlich-core/src/reminder.ts (OccurrenceCache)
export interface OccurrenceCache {
  reminderId: string;
  gregorianDate: string;
  lunarLabel: string;
  computedAt: string;        // ISO instant
  engineVersion: string;     // DEC-LUNAR-044 - invalidate khi core doi
}
export function isCacheStale(c: OccurrenceCache, engineVersion: string): boolean;
```

```typescript
// packages/amlich-core/src/tz.ts
export const VN_TZ = 7.0;                    // 105E, DEC-LUNAR-043
export const VN_TZ_ID = "Asia/Ho_Chi_Minh";
/** "Hom nay" theo gio Viet Nam, khong phu thuoc TZ thiet bi.
 *  Tra SolarDate TUPLE [day, month, year] - CONTRACT chinh xac.
 *  Tham so la Date tuy chon (khong phai nowUtcMs: number) - CONTRACT chinh xac.
 *  import type { SolarDate } from "./types"; */
export function todayInHCM(now?: Date): SolarDate;   // SolarDate = readonly [day, month, year]
```

---

## §4 - Acceptance criteria

1. **Store lunar, derive solar** - a GIO `Reminder` `{lunarDay:10, lunarMonth:8, lunarYear:null}` contains no solar-date field; `nextOccurrences` returns different solar dates for 2025 and 2026.
2. **ANNUAL repeats yearly** - with `recurrence:"ANNUAL"`, `nextOccurrences(count:3)` returns 3 occurrences in 3 consecutive lunar years, each calling `convertLunar2Solar` with its own `targetLunarYear`.
3. **MONTHLY generates 12-13** - `recurrence:"MONTHLY", lunarDay:15` in a normal lunar year generates 12 occurrences; in a year with a leap month it generates 13 (repeating the leap month too).
4. **ONCE fixes the year** - `recurrence:"ONCE", lunarYear:2025` returns exactly 1 occurrence in lunar year 2025, with no recurrence.
5. **Leap-month fallback REGULAR** - a death anniversary `{lunarDay:16, lunarMonth:2, isLeapMonth:true, leapFallback:"REGULAR"}` in a year without a leap month 2 returns an occurrence in the regular month 2 with `fellBack === true`.
6. **Fallback SKIP** - the same death anniversary with `leapFallback:"SKIP"` skips the year without that leap month (no occurrence that year).
7. **Fallback ASK** - with `leapFallback:"ASK"`, the occurrence in a year missing the leap month has `pendingUserChoice === true` and does not observe it automatically.
8. **Matches leap year 1985** - a death anniversary entered in the leap month 2 of 1985 generates a solar-date occurrence falling in the range 21/03..19/04/1985 (cross-check FR-LUNAR-001 fixture).
9. **Day clamp** - a death anniversary `{lunarDay:30}` in a target lunar month with only 29 days clamps back to day 29 with `dayClamped === true`, not jumping to the next month.
10. **Lead-time fan-out** - `leadTimes:[0,1,7]` on 1 occurrence generates exactly 3 `Occurrence` with `leadDays` 0/1/7 and `fireAtLocal` stepped back exactly 0/1/7 days.
11. **notifyTime applied** - `notifyTime:"06:30"` gives a `fireAtLocal` ending `T06:30:00+07:00`.
12. **Timezone lock** - `todayInHCM(new Date(...))` returns the tuple `[day, month, year]` in Vietnam time; running with `process.env.TZ="America/New_York"` still returns the correct value (not off by 1 day). CONTRACT signature: `todayInHCM(now?: Date): SolarDate`.
13. **Cache stale by engineVersion** - `isCacheStale(cache, "1.1.0")` returns `true` when cache.engineVersion is "1.0.0".
14. **validateReminder catches errors** - `RAM` with `lunarDay:14` returns error `code:"RAM_DAY_MISMATCH"`; `ONCE` missing `lunarYear` returns `code:"ONCE_NEEDS_YEAR"`.
15. **normalizeReminder defaults** - empty input returns `notifyTime:"07:00"`, `leadTimes:[1]`, `channels:["LOCAL"]`, `leapFallback:"REGULAR"`, `enabled:true`.
16. **mergeAndSort ascending** - merging occurrences of 3 Reminders, the result is sorted ascending by `fireAtLocal`, with the nearest occurrence first.
17. **Round-trip consistency** - for each generated occurrence, `convertSolar2Lunar` of `gregorianDate` returns exactly the entered `(lunarDay, lunarMonth)` (except for the `fellBack`/`dayClamped` cases already marked).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/recurrence.test.ts
import { describe, it, expect } from "vitest";
import { normalizeReminder, validateReminder, isCacheStale, type Reminder, type SolarDate } from "../src/reminder";
import { nextOccurrences, mergeAndSort } from "../src/recurrence";
import { todayInHCM } from "../src/tz";
// CONTRACT: todayInHCM(now?: Date): SolarDate (tuple [day, month, year]); import SolarDate de type-check

const ENGINE = "1.0.0";
const gio = (over: Partial<Reminder>): Reminder => normalizeReminder({
  id: "r1", userId: "u1", type: "GIO", title: "Gio ba", lunarDay: 10, lunarMonth: 8,
  recurrence: "ANNUAL", isLeapMonth: false, ...over,
});

describe("recurrence engine", () => {
  it("ANNUAL derives different solar dates per year (DEC-LUNAR-041)", () => {
    const occ = nextOccurrences(gio({ leadTimes: [0] }), { fromYear: 2025, count: 2, engineVersion: ENGINE });
    expect(occ).toHaveLength(2);
    expect(occ[0].gregorianDate).not.toEqual(occ[1].gregorianDate);
  });

  it("MONTHLY produces 13 occurrences in a leap year (AC #3)", () => {
    const r = gio({ recurrence: "MONTHLY", lunarDay: 15, leadTimes: [0] });
    // 2025 am co thang 6 nhuan -> 13 lan Ram
    const occ = nextOccurrences(r, { fromYear: 2025, count: 13, engineVersion: ENGINE });
    expect(occ.filter(o => o.lunarLabel.startsWith("15/")).length).toBe(13);
  });

  it("leap-month giỗ falls back to regular month (DEC-LUNAR-042, AC #5)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, isLeapMonth: true, leapFallback: "REGULAR", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2030, count: 1, engineVersion: ENGINE });
    expect(occ[0].fellBack).toBe(true);
    expect(occ[0].lunarLabel).toContain("16/2");
  });

  it("ASK fallback yields pendingUserChoice, no auto-cung (AC #7)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, isLeapMonth: true, leapFallback: "ASK", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2030, count: 1, engineVersion: ENGINE });
    expect(occ[0].pendingUserChoice).toBe(true);
  });

  it("1985 leap month 2 lands in the Mar-Apr window (AC #8, cross-check FR-001)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, lunarYear: 1985, isLeapMonth: true, recurrence: "ONCE", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 1985, count: 1, engineVersion: ENGINE });
    const d = occ[0].gregorianDate;            // "1985-MM-DD"
    expect(d >= "1985-03-21" && d <= "1985-04-19").toBe(true);
  });

  it("day 30 clamps to last day of a 29-day month (AC #9)", () => {
    const r = gio({ lunarDay: 30, lunarMonth: 9, leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2027, count: 1, engineVersion: ENGINE });
    // chi assert chung: khi clamp xay ra thi co co dayClamped, ngay am <= 30
    if (occ[0].dayClamped) expect(occ[0].lunarLabel).toMatch(/^(29|30)\//);
  });

  it("lead-times fan out to multiple Occurrence (AC #10)", () => {
    const occ = nextOccurrences(gio({ leadTimes: [0, 1, 7] }), { fromYear: 2025, count: 1, engineVersion: ENGINE });
    expect(occ.map(o => o.leadDays).sort((a, b) => a - b)).toEqual([0, 1, 7]);
  });

  it("timezone is locked to HCM regardless of process TZ (DEC-LUNAR-043, AC #12)", () => {
    // todayInHCM(now?: Date): SolarDate - nhan Date, tra TUPLE [day, month, year] (CONTRACT)
    const prev = process.env.TZ; process.env.TZ = "America/New_York";
    const fixedNow = new Date(Date.UTC(2026, 1, 17, 5, 0, 0)); // 17/02/2026 12:00 +07
    const result = todayInHCM(fixedNow);   // SolarDate = readonly [day, month, year]
    expect(result[0]).toBe(17);            // day
    expect(result[1]).toBe(2);             // month
    expect(result[2]).toBe(2026);          // year
    process.env.TZ = prev;
  });

  it("validateReminder catches RAM day mismatch and ONCE without year (AC #14)", () => {
    const e1 = validateReminder(gio({ type: "RAM", lunarDay: 14 }));
    expect(e1.some(e => e.code === "RAM_DAY_MISMATCH")).toBe(true);
    const e2 = validateReminder(gio({ recurrence: "ONCE", lunarYear: undefined }));
    expect(e2.some(e => e.code === "ONCE_NEEDS_YEAR")).toBe(true);
  });

  it("normalizeReminder applies stable defaults (AC #15)", () => {
    const r = normalizeReminder({ id: "x", userId: "u", type: "GIO", title: "t", lunarDay: 1, lunarMonth: 1, recurrence: "ANNUAL" });
    expect(r.notifyTime).toBe("07:00");
    expect(r.leadTimes).toEqual([1]);
    expect(r.channels).toEqual(["LOCAL"]);
    expect(r.leapFallback).toBe("REGULAR");
    expect(r.enabled).toBe(true);
  });

  it("cache invalidates when engineVersion changes (DEC-LUNAR-044, AC #13)", () => {
    expect(isCacheStale({ reminderId: "r", gregorianDate: "2025-01-01", lunarLabel: "1/1", computedAt: "2025-01-01T00:00:00Z", engineVersion: "1.0.0" }, "1.1.0")).toBe(true);
  });

  it("mergeAndSort orders ascending by fireAtLocal (AC #16)", () => {
    const a = nextOccurrences(gio({ id: "a", lunarMonth: 1, leadTimes: [0] }), { fromYear: 2026, count: 1, engineVersion: ENGINE });
    const b = nextOccurrences(gio({ id: "b", lunarMonth: 7, leadTimes: [0] }), { fromYear: 2026, count: 1, engineVersion: ENGINE });
    const merged = mergeAndSort([...b, ...a]);
    for (let i = 1; i < merged.length; i++) expect(merged[i - 1].fireAtLocal <= merged[i].fireAtLocal).toBe(true);
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is the skeleton. The hardest detail being pinned down is the occurrence-generation loop for ANNUAL, because it is where the fallback and clamp rules meet:

```typescript
// packages/amlich-core/src/recurrence.ts (lõi - skeleton noi bo; barrel export tra readonly Occurrence[])
export function nextOccurrences(r: Reminder, opt: RecurrenceOptions): readonly Occurrence[] {
  const out: Occurrence[] = [];   // mutable noi bo, cast khi return
  let lunarYear = solarYearToStartLunarYear(opt.fromYear);   // moc nam am bat dau quet
  let lunarOccCount = 0;                                      // dem occurrence AM (truoc lead-time)
  let scanned = 0;                                            // guard chong vong lap khi SKIP nhieu nam lien tiep
  // out.length = lunarOccCount * leadTimes.length; quet du opt.count occurrence am (§1 #4)
  while (lunarOccCount < opt.count && scanned < opt.count + MAX_SKIP_SCAN) {
    scanned++;
    const targetYear = r.recurrence === "ONCE" ? r.lunarYear! : lunarYear;
    // 1) thang nhuan: nam dich co dung thang nhuan da nhap khong?
    const leapOffset = getLeapMonthOffset(getLunarMonth11(targetYear, VN_TZ), VN_TZ);
    const resolved = resolveLeap(r, targetYear, leapOffset);  // -> {month, isLeap, fellBack, skip, pending}
    if (resolved.skip) {                                       // leapFallback = SKIP - bo nam nay, KHONG sinh occurrence
      if (r.recurrence === "ONCE") break;                     // ONCE + skip: nam co dinh -> dung, tranh vong vo han
      lunarYear++; continue;
    }
    // 2) clamp ngay neu thang am thieu ngay
    const { day, dayClamped } = clampLunarDay(r.lunarDay, targetYear, resolved.month, resolved.isLeap);
    // 3) goi engine FR-LUNAR-001 - tinh moi nam, khong noi suy (DEC-LUNAR-041)
    //    resolved.isLeap CHI = true khi nam dich that su co thang nhuan do (REGULAR fallback -> isLeap=false),
    //    nen convertLunar2Solar khong tra sentinel [0,0,0]; truong hop pending tra occurrence pendingUserChoice.
    const [gd, gm, gy] = convertLunar2Solar(day, resolved.month, targetYear, resolved.isLeap ? 1 : 0, VN_TZ);
    // 4) nhan lead-time + notifyTime -> nhieu Occurrence (count nay la 1 occurrence am)
    for (const lead of r.leadTimes) out.push(makeOccurrence(r, gd, gm, gy, lead, resolved, dayClamped));
    lunarOccCount++;
    if (r.recurrence === "ONCE") break;
    lunarYear++;
  }
  return out;
}
// MAX_SKIP_SCAN bao tran so nam quet them khi SKIP lien tiep (vd giỗ thang nhuan hiem); >= ~30 du an toan.
```

`occurrenceBudget`/`opt.count` counts by LUNAR occurrence; each lunar occurrence generates `leadTimes.length` `Occurrence`. The loop increases `lunarOccCount` only when it actually generates an occurrence (not when it SKIPs), and has a `MAX_SKIP_SCAN` guard so a rare leap-month death anniversary with `leapFallback = SKIP` does not scan forever - the same spirit as the `i < 14` of `getLeapMonthOffset` in FR-LUNAR-001.

`makeOccurrence` steps `gregorianDate` back by `lead` days and attaches `notifyTime` to build `fireAtLocal` with a hard `+07:00` offset. Every date comparison uses the ISO string `YYYY-MM-DD`, so sorting is string comparison, not local `Date`.

---

## §7 - Dependencies

- Upstream: FR-LUNAR-001 (`convertLunar2Solar`, `convertSolar2Lunar`, `getLunarMonth11`, `getLeapMonthOffset`). This module does no astronomy of its own; it only calls the core engine and wraps the results in a data model.
- Downstream: FR-LUNAR-005 (the rolling-64 scheduler reads the `Occurrence[]` after `mergeAndSort` and cuts the nearest 64), FR-LUNAR-006 (reminder management CRUD on the `Reminder` type, showing the upcoming list), FR-LUNAR-016 (Zalo Mini App reuses Reminder + computes dates on the fly), FR-LUNAR-017 (ZNS scans Reminders with the `ZNS` channel), FR-LUNAR-018 (cloud sync syncs Reminder + `sharedWith`).
- Cross-cutting: `engineVersion` relates to FR-LUNAR-001 (the core semver) and FR-LUNAR-018 (invalidate the client cache when the core changes). `linkedContentId` points to FR-LUNAR-008 FestivalContent.

---

## §8 - Example payloads

```json
{
  "reminder": {
    "id": "rem_gio_ba_noi",
    "userId": "u_linh",
    "type": "GIO",
    "title": "Giỗ bà nội",
    "lunarDay": 16,
    "lunarMonth": 2,
    "lunarYear": null,
    "isLeapMonth": false,
    "recurrence": "ANNUAL",
    "leapFallback": "REGULAR",
    "leadTimes": [0, 1],
    "notifyTime": "06:30",
    "channels": ["LOCAL"],
    "linkedContentId": "festival_dam_gio",
    "sharedWith": [],
    "enabled": true
  }
}
```

```json
{
  "occurrences": [
    { "reminderId": "rem_gio_ba_noi", "gregorianDate": "2026-03-25", "lunarLabel": "16/2 Bính Ngọ",
      "leadDays": 1, "fireAtLocal": "2026-03-25T06:30:00+07:00", "fellBack": false, "dayClamped": false, "pendingUserChoice": false },
    { "reminderId": "rem_gio_ba_noi", "gregorianDate": "2026-03-26", "lunarLabel": "16/2 Bính Ngọ",
      "leadDays": 0, "fireAtLocal": "2026-03-26T06:30:00+07:00", "fellBack": false, "dayClamped": false, "pendingUserChoice": false }
  ]
}
```

```json
{ "occurrenceCache": { "reminderId": "rem_gio_ba_noi", "gregorianDate": "2026-03-26",
  "lunarLabel": "16/2 Bính Ngọ", "computedAt": "2026-06-27T01:00:00Z", "engineVersion": "1.0.0" } }
```

---

## §9 - Open questions

Resolved in this version:
- The leap-month fallback default -> `REGULAR` (observe the regular month), with `fellBack` for the UI to confirm (DEC-LUNAR-042).
- Lock every calculation to Asia/Ho_Chi_Minh, not device time (DEC-LUNAR-043).
- A day that does not exist in the lunar month -> clamp to the last day of the month (§1 #7).

Deferred (close to the Caveats / later FRs):
- A dual lunar-solar calendar for one reminder (for example reminding by a fixed solar date and by a lunar date at once) - not needed for the MVP; this version supports only lunar recurrence.
- A region-specific fallback rule (some households observe the leap month rather than the regular month) - left for FR-LUNAR-008 to connect the customs content; this version only offers the 3 policies REGULAR/SKIP/ASK.
- Accuracy in very distant years (Caveats: a Soc point near midnight) - the responsibility of FR-LUNAR-003 (the golden harness); this module only calls the engine and trusts its result.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Storing the solar date as the source by mistake | the Reminder type has no solar field | wrong next year, does not happen | none (by design; AC #1) |
| Interpolating 365 days instead of recomputing | the recurrence engine calls convertLunar2Solar each year | no drift | none (DEC-LUNAR-041; AC #2) |
| Leap-month death anniversary, target year has none | resolveLeap checks leapOffset | fallback REGULAR + fellBack | UI asks the user (DEC-LUNAR-042; AC #5) |
| Leap-month death anniversary, user chose SKIP | leapFallback = SKIP | skips that year | remind next year with a leap month (AC #6) |
| Leap-month death anniversary, user chose ASK | leapFallback = ASK | pendingUserChoice | UI shows the choice (AC #7) |
| Day 30 in a short month | clampLunarDay | clamps back to day 29 + dayClamped | none (AC #9) |
| Deriving by device time abroad | todayInHCM locks tz=7.0 | correct VN date | none (DEC-LUNAR-043; AC #12) |
| Core changes a constant, stale cache is wrong | engineVersion mismatch | isCacheStale = true | recompute (DEC-LUNAR-044; AC #13) |
| RAM entered with lunarDay != 15 by mistake | validateReminder | RAM_DAY_MISMATCH error | UI blocks the save (AC #14) |
| ONCE missing lunarYear | validateReminder | ONCE_NEEDS_YEAR error | UI requires the year (AC #14) |
| leadTimes containing a negative number | validateReminder | LEAD_NEGATIVE error | normalize filters it out |
| Empty channels | validateReminder | NO_CHANNEL error | normalize sets ["LOCAL"] |
| MONTHLY forgets to repeat the leap month | the expander walks the leap month too | 13 times in a leap year | none (AC #3) |
| Module pulled into storage I/O | zero-dep code review | reject the merge | keep it purely computational (§1 #14) |
| Occurrence not sorted | mergeAndSort | sorted ascending by fireAtLocal | none (AC #16) |

---

## §11 - Implementation notes

- The golden rule: for each target year, call `convertLunar2Solar` independently. Never add a fixed number of days from the previous occurrence - that is the difference between matching the calendar and gradually drifting.
- `resolveLeap` is where the fallback policy lives. Before computing the date, ask `getLeapMonthOffset` whether the target year has the entered leap month; if not, branch on `leapFallback` (REGULAR / SKIP / ASK) and mark `fellBack`/`pendingUserChoice`.
- The day clamp must use the true lunar month length (29 or 30 days), not assume 30. Compute the length as the distance between two consecutive Soc points via the core engine.
- `fireAtLocal` always carries a hard `+07:00` offset and every date comparison uses ISO strings. Avoid `new Date(str)` and then reading `getDate()` because it reads by the runtime TZ - exactly the reason FR-B06 requires locking Asia/Ho_Chi_Minh.
- `engineVersion` should come from the amlich-core `package.json` and be passed into `RecurrenceOptions`, so OccurrenceCache (DEC-LUNAR-044) and FR-LUNAR-018 share a single source of truth for the core version.
- MONTHLY can repeat day 30 in a month with only 29 days - reuse the shared clamp; and in a leap year, the expander must generate an occurrence for the leap month too (13 times), matching AC #3.
- Keep `Occurrence` the only structure that FR-LUNAR-005 reads. Do not let the scheduler derive dates itself - all the lunar logic lives here, the scheduler only merges, sorts, and cuts 64.

---

*End of FR-LUNAR-004.*
