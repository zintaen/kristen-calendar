---
id: FR-LUNAR-007
title: "Month calendar grid - each cell has a large solar date + small lunar date in the corner + can-chi + tiet khi + ritual/reminder dot, tap to view details"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P1
milestone: P1 · slice 3
slice: 3
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-002, FR-LUNAR-011]
depends_on: [FR-LUNAR-001, FR-LUNAR-002, FR-LUNAR-010]
blocks: [FR-LUNAR-014]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-A05)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Performance)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (month calendar)"
source_decisions:
  - DEC-LUNAR-070 (the grid computes all DayInfo for the 28-31 cells of a month in a single array pass, not by calling convert per cell individually, to ensure render < 100ms)
  - DEC-LUNAR-071 (the DayInfo data is computed on a worker thread / useMemo with deps [year, month], and the result is memoized to avoid recomputation when scrolling through months)
  - DEC-LUNAR-072 (tapping a day cell opens a detail modal/panel showing the full DayInfo from cache; this panel is a placeholder for FR-LUNAR-011 Hoang dao/Truc/28 mansions when available)
  - DEC-LUNAR-073 (the color dot on a day cell uses only 3 levels: none / has reminder-ritual / is a major festival; avoids overcrowding with too many kinds of color dots)
  - DEC-LUNAR-074 (the month header shows both the solar month name and the corresponding lunar month of the first day in the grid, updated on scroll)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/components/CalendarGrid.tsx
  - apps/web/components/DayCell.tsx
  - apps/web/components/DayDetailPanel.tsx
  - apps/web/lib/calendarData.ts
  - apps/web/app/calendar/page.tsx
modified_files:
  - apps/web/lib/storage.ts
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/components/** apps/web/lib/calendarData.ts apps/web/app/calendar/**
  - bash: cd apps/web && pnpm test
disallowed_tools:
  - "calling convertSolar2Lunar per cell individually inside the render loop (violates DEC-LUNAR-070 / NFR-Performance render < 100ms)"
  - "fetching over the network to get calendar data (violates NFR-Offline)"
effort_hours: 9
sub_tasks:
  - "1.5h: calendarData.ts - the buildMonthGrid(year, month) function calls amlich-core once, returns a DayCell[] array"
  - "1.0h: CalendarGrid.tsx - 7-column layout, weekday header, previous/next month navigation"
  - "1.5h: DayCell.tsx - show the large solar date, small lunar date in the corner, can-chi, tiet khi, ritual/reminder dot"
  - "1.0h: DayDetailPanel.tsx - modal/slide-up showing the full DayInfo when a day cell is tapped"
  - "1.0h: app/calendar/page.tsx - route, current-month state, wiring with storage (reminders)"
  - "1.5h: useMemo / worker thread for buildMonthGrid, measure render time < 100ms"
  - "1.5h: unit tests for calendarData.ts (fixtures for Jan/2025 Tet, a month with a tiet khi, a month with a reminder day)"
risk_if_skipped: "Without the calendar view, the user cannot see an overview of the lunar dates in the month - the main screen of the MVP app. FR-LUNAR-014 (shareable cards) depends directly on this FR's DayCell component to render the card design."
---

## §1 - Description (BCP-14 normative)

This component **MUST** display the dual-system month calendar grid (solar + lunar) on the main screen, meeting the render performance standard of under 100ms per NFR-Performance.

1. **MUST** display a 7-column grid (Sunday to Saturday), each row a solar week, each cell corresponding to one solar day of the month (FR-A05).
2. **MUST** display in each cell: the solar date (large, prominent number), the corresponding lunar date (small number, bottom-left corner), and the day's can-chi (small text below the solar date) (FR-A05, DEC-LUNAR-070).
3. **MUST** mark the day's tiet khi with a small label or icon on the cell when that day is the start day of one of the 24 tiet khi (FR-A05, FR-A04 from FR-LUNAR-002).
4. **MUST** show a small color dot on the day cell when that day has at least one active reminder or is a festival/occasion day in the festival content list (DEC-LUNAR-073).
5. **MUST** distinguish 3 dot levels: none (blank cell), an ordinary reminder/ritual (primary color dot), a major festival in the main occasions list (accent color dot) - do not use more than 3 levels (DEC-LUNAR-073).
6. **MUST** compute the entire `DayInfo[]` for the month in a single call to `buildMonthGrid(year, month)` before rendering, and must not call `convertSolar2Lunar` per cell individually inside the render loop (DEC-LUNAR-070, NFR-Performance).
7. **MUST** memoize the `buildMonthGrid` result by `[year, month]` using `useMemo` or an equivalent mechanism, avoiding recomputation when the component re-renders without changing the month (DEC-LUNAR-071).
8. **MUST** display a month header containing the solar month name (for example "January 2025") and the corresponding lunar month of the grid's first day (DEC-LUNAR-074).
9. **MUST** have buttons to navigate to the previous and next month; changing the month **MUST** update the header and grid without reloading the page.
10. **MUST** correctly handle months that do not start on Sunday by leaving the first cells of the row empty, and months with 28/29/30/31 days.
11. **MUST** highlight today (the current solar date) with a distinct style (for example a deep purple ring).
12. **MUST** meet NFR-Performance: the time from when the user taps "next month" to when the new grid is fully displayed **MUST** be under 100ms measured on a mid-range device (DEC-LUNAR-071).
13. **MUST** handle tap/click events on a day cell by opening the `DayDetailPanel` showing that day's full information from the precomputed `DayInfo` (DEC-LUNAR-072).
14. The `DayDetailPanel` **MUST** display at least: the full solar date, the full lunar date (leap month if any), the day/month/year can-chi, the tiet khi if any, and the list of reminders on that day; the Hoang dao/Truc/28 mansions fields **SHOULD** be placeholders for FR-LUNAR-011 when ready (DEC-LUNAR-072).
15. **MUST NOT** call the network to get calendar data; all computation must be offline from `amlich-core` (NFR-Offline).
16. **SHOULD** support horizontal swipe (swipe left/right) to change months on touch devices.

---

## §2 - Why this design (rationale for humans)

**Why compute the whole month in a single pass (DEC-LUNAR-070)?** Calling `convertSolar2Lunar` for each cell inside the render loop means React has to wait for the computation to finish per cell before it can render - with 31 days and each conversion under 5ms, the total synchronous time can reach 150ms, violating NFR-Performance. The `buildMonthGrid` function computes a flat array first, and the render only reads from that array.

**Why use `useMemo` instead of computing in `useEffect` (DEC-LUNAR-071)?** `useEffect` runs after render, meaning the user sees a blank grid and then it fills in - creating a "flicker" effect. `useMemo` runs synchronously during render, and the value is ready when the DOM is painted. With 31 days and an algorithm under 5ms/day, a total under 155ms is an acceptable threshold; if more speed is needed, move to a Web Worker in the optimization step.

**Why limit to 3 dot levels (DEC-LUNAR-073)?** A calendar UI gets cluttered easily if every kind of reminder has a different color. Three levels (blank / ordinary reminder / major festival) are enough for the user to scan quickly without reading each cell. The purple design of the FR-LUNAR-009 sub-brand supplies the primary and accent colors.

**Why is `DayDetailPanel` a placeholder for FR-LUNAR-011 (DEC-LUNAR-072)?** FR-LUNAR-011 (Hoang dao/Truc/28 mansions) depends on FR-LUNAR-002 and belongs to Phase 2. If FR-007 hard-wired its layout to FR-011, the absence of FR-011 would block FR-007. A placeholder design lets FR-007 ship in Phase 1 slice 3, and FR-011 only needs to fill the reserved slot when ready.

**Why does the header show the lunar month of the grid's first day (DEC-LUNAR-074)?** A solar month usually spans 2 lunar months. Showing the lunar month of the solar month's first day is the most intuitive convention, matching how Vietnamese people say "the first lunar month of the At Ty year" - the user immediately understands which lunar month they are in.

**Why not use an existing calendar library?** Every popular React calendar library computes by the solar calendar. Integrating the lunar date + can-chi + tiet khi + reminder dots into a third-party library's cell slot requires deep overrides that easily conflict with updates. Writing a simple 7-column `CalendarGrid` ourselves is easier and gives full control.

**Why test fixtures for Jan/2025?** 29/01/2025 is the first day of Tet At Ty - if the grid shows the wrong lunar date 1/1 for this day, the whole month is wrong. The fixture already exists in FR-LUNAR-003 (golden validation), reused for the component test.

---

## §3 - API contract

```typescript
// apps/web/lib/calendarData.ts
// FR-LUNAR-001 exports `convertSolar2Lunar` (returns a TUPLE [day, month, year, leap])
// and `jdFromDate`. FR-LUNAR-002 exports `canChiDay(jdn)`, `canChiMonth(lunarMonth, lunarYear)`,
// `canChiYear(lunarYear)`, `zodiacOf(chiIndex)` (CONTRACT: zodiacOf nhan chiIndex, khong phai lunarYear;
// dung zodiacOf(canChiYear(lYear).chiIndex)), and `tietKhiAt(jdn, tz)`. There is NO
// `getTietKhi` and NO can-chi/zodiac returned from convert; this module ASSEMBLES the DTO below.
import {
  convertSolar2Lunar, jdFromDate, canChiDay, canChiMonth, canChiYear, zodiacOf, tietKhiAt,
  VN_TZ,
} from "@cyberskill/amlich-core";
// Luu y: CONTRACT.md export VN_TZ = 7.0 (khong phai VN_TZ). Dung VN_TZ khi truyen tz.

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;     // mapped from tuple leap (0|1) -> boolean at assembly time
  canChiDay: string;   // e.g. "Canh Ngo" - from canChiDay(jdn).label
  canChiMonth: string; // from canChiMonth(lunarMonth, lunarYear).label
  canChiYear: string;  // from canChiYear(lunarYear).label
  zodiac: string;      // e.g. "Ran" - from zodiacOf(canChiYear(lYear).chiIndex) - CONTRACT: zodiacOf(chiIndex: number)
}

export interface DayCellData {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunarDate: LunarDate;
  tietKhi: string | null;   // e.g. "Lap Xuan" or null
  hasReminder: boolean;
  isFestival: boolean;
  isToday: boolean;
  // Placeholder fields for FR-LUNAR-011:
  hoangDao: boolean | null;       // null = not yet computed (Phase 2)
  truc: string | null;
  sao28: string | null;
}

export interface MonthGridData {
  year: number;
  month: number;
  cells: (DayCellData | null)[];  // length 35 or 42; null = padding cell
  lunarMonthLabel: string;         // e.g. "Thang Mot Am Lich"
}

/**
 * Build all DayCell data for the given Gregorian year/month in one pass.
 * Calls amlich-core once per day, not per render.
 * reminderDates: Set of "YYYY-MM-DD" strings for days with active reminders.
 * festivalDates: Set of "YYYY-MM-DD" strings for major festival days.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  reminderDates: Set<string>,
  festivalDates: Set<string>,
  today: Date
): MonthGridData;

/**
 * Derive the sorted list of "YYYY-MM-DD" strings for all active reminder
 * occurrences in the given month, calling convertLunar2Solar from amlich-core.
 */
export function computeReminderDatesForMonth(
  year: number,
  month: number,
  reminders: import("../lib/storage").Reminder[]
): Set<string>;
```

```typescript
// apps/web/components/DayCell.tsx
interface DayCellProps {
  data: DayCellData | null;   // null renders an empty padding cell
  onTap: (data: DayCellData) => void;
}
export function DayCell({ data, onTap }: DayCellProps): JSX.Element;
```

```typescript
// apps/web/components/DayDetailPanel.tsx
interface DayDetailPanelProps {
  data: DayCellData | null;   // null = closed
  onClose: () => void;
}
export function DayDetailPanel({ data, onClose }: DayDetailPanelProps): JSX.Element;
```

```typescript
// apps/web/components/CalendarGrid.tsx
interface CalendarGridProps {
  year: number;
  month: number;
  reminders: import("../lib/storage").Reminder[];
  onMonthChange: (year: number, month: number) => void;
}
export function CalendarGrid({ year, month, reminders, onMonthChange }: CalendarGridProps): JSX.Element;
```

---

## §4 - Acceptance criteria

1. The Jan/2025 month grid shows 29/01/2025 with the lunar date label "1/1" (first day of Tet At Ty), and the can-chi correct per the FR-LUNAR-003 fixtures.
2. The Mar/1985 grid shows the correct leap month 2 label in the header and on the day cells belonging to leap month 2 of 1985 (leap-month edge case).
3. The render time from calling `buildMonthGrid` to the DOM finishing paint is under 100ms measured with `performance.now()` in a unit test in the jsdom environment.
4. Moving to the next month by button or swipe, the new grid appears within 100ms (measured manually on an iPhone SE gen 3).
5. A day cell with an active reminder shows a primary color dot; a major festival cell (Ram of the first lunar month, Tet, Vu Lan, Trung Thu, etc.) shows an accent color dot; a cell with nothing shows blank - no more than 3 dot kinds total.
6. Today's cell (solarDay == today) has a distinct highlight style (a deep purple ring or equivalent from the FR-LUNAR-009 design token).
7. Tapping any day cell opens the `DayDetailPanel` showing the correct lunar date, the day/month/year can-chi, the tiet khi (if any), and the list of reminders on that day.
8. The `DayDetailPanel` has a close button; after closing the panel, the grid is not re-rendered (does not recompute `buildMonthGrid`).
9. A month starting on Wednesday (for example 01/01/2025 is a Wednesday) shows 3 empty padding cells at the start of the row; a 28-day month has no extra row.
10. No network request is sent during the calendar render (checked with mock fetch in the test).
11. The header shows the correct lunar month name of the first day in the grid (not the solar 1st if that cell is padding).
12. When no reminders have been created, the grid still shows all 28-31 day cells with the correct lunar date and can-chi.
13. `buildMonthGrid` is called only once when `[year, month]` does not change, even if the component re-renders many times (checked with a mock counting the number of calls).
14. The tiet khi "Lap Xuan" shows correctly on the cell for 3/2/2025 (or the exact day from FR-LUNAR-002).
15. The grid works correctly in both modes: light (default) and dark if the FR-LUNAR-009 design system supports it.

---

## §5 - Verification

```typescript
// apps/web/__tests__/calendarData.test.ts
import { buildMonthGrid, computeReminderDatesForMonth } from "../lib/calendarData";

describe("buildMonthGrid", () => {
  test("Thang 1/2025: ngay 29 co ngay am 1/1/2025 Tet At Ty", () => {
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    const cell = grid.cells.find(c => c?.solarDay === 29 && c.solarMonth === 1);
    expect(cell).toBeTruthy();
    expect(cell!.lunarDate.day).toBe(1);
    expect(cell!.lunarDate.month).toBe(1);
    expect(cell!.lunarDate.year).toBe(2025);
    expect(cell!.lunarDate.isLeap).toBe(false);
  });

  test("Thang 1/2025: Mung 1 duong 29/01 la Mung 1 am, co chot le lon", () => {
    const festivalDates = new Set(["2025-01-29"]);
    const grid = buildMonthGrid(2025, 1, new Set(), festivalDates, new Date("2025-01-15"));
    const cell = grid.cells.find(c => c?.solarDay === 29);
    expect(cell!.isFestival).toBe(true);
  });

  test("Thang 3/1985: co thang nhuan 2 trong nhan cua o ngay thuoc thang nhuan", () => {
    const grid = buildMonthGrid(1985, 3, new Set(), new Set(), new Date("1985-03-01"));
    const leapCell = grid.cells.find(c => c?.lunarDate.isLeap === true);
    expect(leapCell).toBeTruthy();
    expect(leapCell!.lunarDate.month).toBe(2);
  });

  test("Padding: thang 1/2025 bat dau vao Thu Tu (index 3), co 3 o null dau", () => {
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    expect(grid.cells[0]).toBeNull();
    expect(grid.cells[1]).toBeNull();
    expect(grid.cells[2]).toBeNull();
    expect(grid.cells[3]?.solarDay).toBe(1);
  });

  test("Hom nay duoc danh dau isToday = true", () => {
    const today = new Date("2025-01-15");
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), today);
    const todayCell = grid.cells.find(c => c?.solarDay === 15 && c.solarMonth === 1);
    expect(todayCell!.isToday).toBe(true);
  });

  test("buildMonthGrid chi goi convertSolar2Lunar mot lan cho 31 ngay, khong goi tung o rieng le", () => {
    const convertSpy = jest.spyOn(require("@cyberskill/amlich-core"), "convertSolar2Lunar");
    buildMonthGrid(2025, 1, new Set(), new Set(), new Date());
    // Nen goi dung 31 lan (1 lan/ngay), khong hon
    expect(convertSpy.mock.calls.length).toBeLessThanOrEqual(31);
    convertSpy.mockRestore();
  });

  test("NFR-Performance: buildMonthGrid hoan thanh trong 150ms (generous margin)", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      buildMonthGrid(2025, 1, new Set(), new Set(), new Date());
    }
    const avg = (performance.now() - t0) / 10;
    expect(avg).toBeLessThan(150);
  });

  test("Khong co network request trong buildMonthGrid", () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    buildMonthGrid(2025, 6, new Set(), new Set(), new Date());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("computeReminderDatesForMonth", () => {
  test("Reminder Ram 15 AL xuat hien dung ngay duong trong thang 1/2025", () => {
    const reminders = [{ type: "RAM", lunarDay: 15, lunarMonth: 1, enabled: true } as any];
    const dates = computeReminderDatesForMonth(2025, 1, reminders);
    // Ram thang Gieng 2025 = 12/02/2025
    expect(dates.has("2025-02-12")).toBe(false); // outside Jan
    // Kiem lai voi thang 2
    const datesF = computeReminderDatesForMonth(2025, 2, reminders);
    expect(datesF.has("2025-02-12")).toBe(true);
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is a full skeleton. The trickiest point to pin down:

```typescript
// apps/web/lib/calendarData.ts
//
// Two correctness anchors ghim o day:
// (1) convertSolar2Lunar tra TUPLE [day, month, year, leap] - phai destructure, KHONG spread
//     thanh object (spread mang vao object cho ra {0:..,1:..}). can-chi/zodiac/tiet khi KHONG
//     co trong tuple; phai goi rieng cac ham FR-LUNAR-002 voi JDN (canChiDay/tietKhiAt nhan JDN).
// (2) startPadding tinh tu thu trong tuan cua ngay 1 duong PHAI on dinh theo Asia/Ho_Chi_Minh,
//     khong dung Date#getDay() (lay theo timezone cua runtime; SSR/static-export chay UTC -> lech).
const VI_DOW = new Intl.DateTimeFormat("en-US", {
  weekday: "short", timeZone: "Asia/Ho_Chi_Minh",
});
const DOW_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function startPaddingFor(year: number, month: number): number {
  // month la 1-based; dung UTC noon de tranh DST/edge, doc weekday theo gio VN (offset co dinh +7).
  const firstUtcNoon = new Date(Date.UTC(year, month - 1, 1, 12));
  return DOW_INDEX[VI_DOW.format(firstUtcNoon)];
}

export function buildMonthGrid(
  year: number,
  month: number,
  reminderDates: Set<string>,
  festivalDates: Set<string>,
  today: Date
): MonthGridData {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startPadding = startPaddingFor(year, month);
  const cells: (DayCellData | null)[] = Array(startPadding).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = jdFromDate(d, month, year);                    // JDN cho can-chi va tiet khi
    const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(d, month, year, VN_TZ); // TUPLE
    const tk = tietKhiAt(jdn, VN_TZ);                    // tra { index, name, isTrungKhi }
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      solarDay: d, solarMonth: month, solarYear: year,
      lunarDate: {
        day: lDay, month: lMonth, year: lYear, isLeap: lLeap === 1,
        canChiDay: canChiDay(jdn).label,
        canChiMonth: canChiMonth(lMonth, lYear).label,
        canChiYear: canChiYear(lYear).label,
        zodiac: zodiacOf(canChiYear(lYear).chiIndex),  // CONTRACT: zodiacOf(chiIndex: number), khong phai lunarYear
      },
      // tietKhiAt tra tiet khi cua MOI ngay; chi hien nhan khi ngay do la ngay BAT DAU tiet
      // (xem §11). Neu chi muon danh dau ngay bat dau, so sanh voi ngay truoc (d-1).
      tietKhi: isTietKhiStart(jdn) ? tk.name : null,
      hasReminder: reminderDates.has(key),
      isFestival: festivalDates.has(key),
      isToday: d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear(),
      hoangDao: null, truc: null, sao28: null  // Phase 2 placeholders
    });
  }
  // pad to complete grid rows
  while (cells.length % 7 !== 0) cells.push(null);
  // lunarMonthLabel from first non-null cell
  const firstCell = cells.find((c): c is DayCellData => c !== null)!;
  return { year, month, cells, lunarMonthLabel: formatLunarMonth(firstCell.lunarDate) };
}

/** Ngay la diem bat dau mot tiet khi neu index tiet khi cua no khac index cua ngay truoc. */
function isTietKhiStart(jdn: number): boolean {
  return tietKhiAt(jdn, VN_TZ).index !== tietKhiAt(jdn - 1, VN_TZ).index;
}
```

---

## §7 - Dependencies

Upstream: `FR-LUNAR-001` provides `convertSolar2Lunar` (the core engine, returns a tuple) and `jdFromDate`; `FR-LUNAR-002` provides `canChiDay/canChiMonth/canChiYear`, `zodiacOf`, and `tietKhiAt` (24 tiet khi - NOT `getTietKhi`); `FR-LUNAR-010` provides the app shell, routing, and the storage layer that `CalendarGrid` uses to read the list of active `Reminder`s.

Downstream: `FR-LUNAR-014` (shareable cards) depends on the `DayCell` component and the `DayCellData` type from this FR to render the card design.

Cross-cutting: `FR-LUNAR-009` (purple design system) provides the color tokens and typography for `DayCell` and `DayDetailPanel`; `FR-LUNAR-011` (Hoang dao/Truc/28 mansions) will fill the placeholder fields `hoangDao`, `truc`, `sao28` in `DayCellData` in Phase 2 when ready.

---

## §8 - Example payloads

```json
{
  "year": 2025,
  "month": 1,
  "lunarMonthLabel": "Thang Chap (12) - Giap Thin",
  "cells": [
    null, null, null,
    {
      "solarDay": 1, "solarMonth": 1, "solarYear": 2025,
      "lunarDate": { "day": 2, "month": 12, "year": 2024, "isLeap": false,
                     "canChiDay": "Binh Dan", "canChiMonth": "Binh Ti", "canChiYear": "Giap Thin",
                     "zodiac": "Rong" },
      "tietKhi": null,
      "hasReminder": false,
      "isFestival": false,
      "isToday": false,
      "hoangDao": null, "truc": null, "sao28": null
    },
    {
      "solarDay": 29, "solarMonth": 1, "solarYear": 2025,
      "lunarDate": { "day": 1, "month": 1, "year": 2025, "isLeap": false,
                     "canChiDay": "Giap Ty", "canChiMonth": "Binh Dan", "canChiYear": "At Ty",
                     "zodiac": "Ran" },
      "tietKhi": null,
      "hasReminder": true,
      "isFestival": true,
      "isToday": false,
      "hoangDao": null, "truc": null, "sao28": null
    }
  ]
}
```

```json
{
  "comment": "DayDetailPanel hien thi khi cham vao ngay 29/01/2025",
  "solarFull": "Thu Tu, 29 thang 1 nam 2025",
  "lunarFull": "Mung 1 thang Gieng nam At Ty",
  "canChiDay": "Giap Ty",
  "canChiMonth": "Binh Dan",
  "canChiYear": "At Ty",
  "zodiac": "Ran (Ty)",
  "tietKhi": null,
  "reminders": [
    { "title": "Mung Mot hang thang", "notifyTime": "07:00", "leadTimes": [0, 1] }
  ],
  "hoangDao": "(Phase 2 - chua co)",
  "truc": "(Phase 2 - chua co)"
}
```

---

## §9 - Open questions

Resolved:
- How to compute the whole month in one pass: `buildMonthGrid` calls `convertSolar2Lunar` for each day.
- Placeholder for FR-LUNAR-011: the `hoangDao`, `truc`, `sao28` fields in `DayCellData` stay `null` until Phase 2.

Still deferred:
- Web Worker optimization: if the real benchmark shows that `useMemo` still blocks the main thread on old devices, move `buildMonthGrid` to a `Web Worker` and use `useTransition` - deferred per Caveats (PRD §14 Phase 2 performance tuning).
- Optimal row count: some months need 6 rows (42 cells). A scrolling layout could be used if 6 rows are too cramped on a small screen - deferred, decided at the real UI review.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `convertSolar2Lunar` returns the wrong leap month | Unit test fixtures for Mar/1985 | Grid shows the wrong lunar date | Fix the bug in FR-LUNAR-001 before deploy |
| `buildMonthGrid` calls the network | Jest mock fetch spy | Test fails | Remove any fetch call in calendarData.ts |
| Render > 100ms on a mid-range device | `performance.now()` in the test | NFR-Performance violated | Move to a Web Worker or optimize the loop |
| Wrong padding cells (wrong start-of-week day) | Test for Jan/2025 starting on Wednesday | Grid rows misaligned | Use `startPaddingFor()` (Intl + timeZone Asia/Ho_Chi_Minh on UTC noon), NOT `Date#getDay()` |
| `useMemo` not working, recomputing every render | Mock counting the number of calls | Poor performance | Add key stability, check deps |
| Leap February in a leap solar year (29 days) | Test for Feb/2024 | Grid missing the 29th | Use `new Date(year, month, 0).getDate()` instead of hardcoding 28/30/31 |
| Wrong dot level (festival vs reminder confused) | Test fixture with festivalDates + reminderDates | UI causes confusion | Separate the two Sets clearly, prioritize `isFestival` when both are true |
| DayDetailPanel re-renders the grid | React Profiler | Poor performance | Separate the panel state from the grid component |
| Swipe conflicts with vertical scroll | Manual device test | Hard-to-use UX | Use a swipe-angle threshold (angle > 45 deg = scroll) |
| FR-LUNAR-009 color tokens not ready | Import build error | Grid has no purple style | Use a fallback CSS variable default in DayCell |
| Day 1/1/1900 or 31/12/2199 (edge year) | Unit test boundary | Crash or wrong result | Clamp year to [1900, 2199] and show a warning |
| Month with 0 reminders, festivalDates empty | Test for a month with no occasion | Grid shows correctly but empty | Always pass an empty Set instead of undefined |

---

## §11 - Implementation notes

- `buildMonthGrid` must use `tz = 7.0` (not `0` or the browser timezone) when calling `convertSolar2Lunar`, because the core engine computes by the 105 degrees E meridian - this is the most common source of error when porting.
- The start-padding must NOT use `new Date(year, month - 1, 1).getDay()`: it reads the weekday by the runtime timezone, so SSR/static-export (running UTC) gives a result off from Asia/Ho_Chi_Minh. §6 already ships `startPaddingFor()` using `Intl.DateTimeFormat({ timeZone: "Asia/Ho_Chi_Minh" })` read on `Date.UTC(year, month-1, 1, 12)` (UTC noon to avoid the DST edge) - this is standard code, not just a note. Similarly, `daysInMonth` uses `Date.UTC(...).getUTCDate()` instead of the local variant.
- The placeholder fields `hoangDao`, `truc`, `sao28` in `DayCellData` are of type `null` instead of `undefined` so that JSON serialization does not drop them - important if the grid data is passed via postMessage to a Worker.
- The `DayDetailPanel` must be a portal (React `createPortal`) attached to `document.body` to avoid being clipped by the grid container's `overflow: hidden`.
- The tiet khi from FR-LUNAR-002 is `tietKhiAt(jdn, tz)` (there is NO `getTietKhi`), and it returns the tiet khi for EVERY day (always has a `name`), not just the start day. The grid should show the tiet label only on the START DAY of the tiet; §6 uses `isTietKhiStart(jdn)` comparing `tietKhiAt(jdn).index` with `tietKhiAt(jdn-1).index` (different = start day) before assigning `tietKhi`, leaving the rest `null`. AC #14 (Lap Xuan on 3/2/2025) tests exactly this behavior.
- When changing months by swipe, debounce is needed to avoid changing 2 months at once if the user swipes quickly.
- The `computeReminderDatesForMonth` test must cover the case of a RAM reminder (Ram 15 lunar) with a solar month that does not fully match the lunar month - part of a solar month 1 reminder can fall into lunar month 12 of the previous year.

*End of FR-LUNAR-007.*
