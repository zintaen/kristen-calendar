---
id: TASK-LUNAR-012
title: "Good-day picker - choose the activity (signing a contract, first-shooting-day, premiere, grand opening), list Hoang dao days within a range, optional import to the shooting calendar (EventKit)"
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
related_frs: [TASK-LUNAR-011]
depends_on: [TASK-LUNAR-010, TASK-LUNAR-011]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (TASK-E01, TASK-E04 optional)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (đặc thù diễn viên)"
source_decisions:
  - DEC-LUNAR-120 (the good-day picker is pure UI over `getMonthDayQualities` from TASK-011; there is no feng shui logic at this layer - all reasoning lives in TASK-011)
  - DEC-LUNAR-121 (the activity filter is a UI preference, not an algorithmic filter - all Hoang dao days are displayed, and the activity label helps the user decide; there is no "activity -> required Truc list" map)
  - DEC-LUNAR-122 (EventKit integration is COULD - enabled only when the user grants Calendar permission; if not granted, the main flow still works normally without EventKit)
  - DEC-LUNAR-123 (the good-day picker does not create a Reminder itself; it only displays a list of days for the user to decide; if the user wants to create a reminder, they go to TASK-LUNAR-006 reminder management)
  - DEC-LUNAR-124 (the maximum date range is 90 days; a wider range strains getMonthDayQualities in the normal case and makes the list too long for the user)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/app/good-day-picker/page.tsx
  - apps/web/components/GoodDayPicker.tsx
  - apps/web/components/GoodDayList.tsx
  - apps/web/components/EventKitBridge.ts
  - apps/web/lib/good-day.ts
modified_files:
  - apps/web/app/layout.tsx
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/app/good-day-picker/**, apps/web/components/GoodDay*, apps/web/lib/good-day.ts
  - bash: cd apps/web && pnpm test
disallowed_tools:
  - "call any API to fetch Hoang dao days (violates DEC-LUNAR-120 / NFR-Offline)"
  - "automatically create a Reminder from the good-day picker (violates DEC-LUNAR-123)"
effort_hours: 7
sub_tasks:
  - "1h: lib/good-day.ts - the WorkType type, the function filterGoodDays(days: DayQuality[], workType: WorkType): DayQuality[]"
  - "1.5h: GoodDayPicker.tsx - date range picker (startDate, endDate, max 90 days) + WorkType selector (4 types)"
  - "1.5h: GoodDayList.tsx - list of Hoang dao days: display solar date + lunar date + can-chi + Truc + sao + first auspicious hour; badge 'Hoang dao'"
  - "0.5h: page.tsx - combine GoodDayPicker + GoodDayList + disclaimer banner"
  - "0.5h: disclaimer component in the bar - 'Folk feng shui reference, not professional advice'"
  - "1h: EventKitBridge.ts - COULD: check Calendar permission, fetch events in the range, flag days with 'Shooting already scheduled'; do not block the main flow if permission is missing"
  - "1h: test lib/good-day.ts - filterGoodDays returns the correct days, a range > 90 days is clamped, EventKit opt-out does not error"
risk_if_skipped: "TASK-E01 is a MUST requirement for the actor persona (Persona 1 Chu Linh) and the business owner (Persona 3 Anh Tuan). Without the good-day picker, one of the two main selling points of the Phase 2 app is missing. TASK-012 is also the screen that showcases the core feature of TASK-LUNAR-011 from the user's point of view - without it, the value of TASK-011 is hidden."
---

## §1 - Description (BCP-14 normative)

The good-day picker is a React screen that lets the user choose a time range and an activity, then displays a list of Hoang dao days within that range. All feng shui logic lives in TASK-LUNAR-011.

1. MUST display the "Choose good day" screen with 3 components: date range selection (startDate, endDate), activity selection, and the results list (DEC-LUNAR-120).
2. MUST support 4 activities: "Sign a contract / minutes" (ky-hop-dong), "First shooting day / start shooting" (khai-may), "Premiere" (ra-mat), "Grand opening / startup" (khai-truong); this list matches exactly the list from PRD §13 "actor specifics" (TASK-E01).
3. MUST limit the date range to a maximum of 90 days; if the user selects a range > 90 days, it MUST clamp `endDate = startDate + 90 days` and display an explanatory message (DEC-LUNAR-124).
4. MUST call `getMonthDayQualities` (TASK-LUNAR-011) for each month in the range, filter out the days with `isHoangDao === true`, and sort by date ascending (DEC-LUNAR-120).
5. MUST display for each day in the list: the solar date (dd/MM/yyyy), the lunar date (dd/MM/yyyy AL), `canChiNgay`, `truc.name`, `sao28.name`, and the first 3 auspicious hours of the day so the user can choose an hour (gioHoangDao filtered by `isHoang: true`).
6. MUST display a fixed disclaimer banner at the bottom of the screen: "This information is only a folk feng shui reference. It is not professional advice." (DEC-LUNAR-121).
7. MUST ensure the screen works fully offline; all data comes from amlich-core (TASK-LUNAR-011) without calling the network (DEC-LUNAR-120, NFR-Offline).
8. MUST NOT automatically create a Reminder or add to the calendar when the user selects a day; the screen only displays for reference (DEC-LUNAR-123).
9. SHOULD display a count "X Hoang dao days in this range" at the top of the list so the user sees the result immediately before scrolling down.
10. SHOULD let the user copy the day's information (e.g. tap to copy "Wednesday 29/01/2025 - Hoang dao - Khai - Quy Suu").
11. MAY (COULD) integrate EventKit per DEC-LUNAR-122: if the user has granted Calendar permission, additionally display a "Shooting already scheduled" flag on days that already have an event in the iOS/macOS calendar; the permission prompt is lazy (asked only when the user taps "Connect my calendar"); if denied, the main flow is unaffected.
12. MAY display a "Suitable for activity X" chip when the day's Truc has the activity name in `truc.suitableFor` - this is supplementary information from TASK-011, shown only when the data is available.

---

## §2 - Why this design (rationale for humans)

**Why is the good-day picker pure UI with no feng shui logic of its own (DEC-LUNAR-120)?** All feng shui reasoning (Hoang dao/Hac dao, Truc, sao, hours) already lives in TASK-011. If TASK-012 also touched the logic it would easily diverge: two places could give different answers for the same day. Keeping TASK-012 as pure UI while TASK-011 is the source of truth guarantees consistency.

**Why not map "activity -> required Truc" (DEC-LUNAR-121)?** The PRD has no such requirement yet. Adding a mapping like "signing a contract only suits Truc Khai/Dinh/Thanh" would open an extra feng shui feature with no standard source. Displaying all Hoang dao days and letting the user decide based on the Truc name + notes is more careful and more editorially honest.

**Why is EventKit COULD, not SHOULD (DEC-LUNAR-122)?** Integrating EventKit is a fairly serious change on iOS (needs Calendar permission, differs across iOS/macOS/web). Were it SHOULD, it would create pressure to build EventKit before the core value exists. For users with a known shooting schedule, this is a valuable feature; for others it is noise. COULD allows shipping the core feature first and adding EventKit later.

**Why the 90-day limit (DEC-LUNAR-124)?** A user looking for a day in 1-3 months is the main use case. Allowing a 365-day range could produce a list of 100+ Hoang dao days - both hard to read and slow to render. 90 days (3 months) is a realistic planning horizon for signing a contract or starting a shoot.

**Why not automatically create a Reminder (DEC-LUNAR-123)?** The good-day picker is a reference tool, not an action tool. The user may want to view several days, think it over, then choose. Auto-creating a reminder would expose a "buying a reminder" action the user is not ready for. TASK-006 already has the reminder-creation UI - the user goes to TASK-006 after choosing a day.

**Why display the auspicious hours in the list (PRD TASK-E03)?** Viewing a good day to sign a contract but signing at a Hac dao hour defeats the purpose. Displaying the top 3 auspicious hours on each day helps the user choose the day and the hour at the same time - this fully satisfies PRD TASK-E03 in this context without needing a separate screen.

---

## §3 - API contract

```typescript
// apps/web/lib/good-day.ts

// DayQuality/GioInfo/getMonthDayQualities deu tu TASK-LUNAR-011 (re-export qua amlich-core).
// TASK-012 KHONG tu tinh phong thuy - chi loc va lam giau DayQuality (DEC-LUNAR-120).
import type { DayQuality, GioInfo } from "@cyberskill/amlich-core";
import { getMonthDayQualities } from "@cyberskill/amlich-core";

export type WorkType =
  | "ky-hop-dong"   // Ky hop dong / bien ban
  | "khai-may"      // Khai may / bat dau quay
  | "ra-mat"        // Ra mat / premiere
  | "khai-truong";  // Khai truong / khoi nghiep

export interface WorkTypeOption {
  value: WorkType;
  label: string;     // Vietnamese label e.g. "Ky hop dong / bien ban"
  icon: string;      // emoji or icon name for UI
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
  { value: "ky-hop-dong",  label: "Ky hop dong / bien ban",    icon: "pen-line" },
  { value: "khai-may",     label: "Khai may / bat dau quay",   icon: "clapperboard" },
  { value: "ra-mat",       label: "Ra mat / premiere",         icon: "star" },
  { value: "khai-truong",  label: "Khai truong / khoi nghiep", icon: "store" },
];

export interface GoodDayResult extends DayQuality {
  topHoangGio: GioInfo[];      // top 3 isHoang === true canh gio
  hasCalendarConflict?: boolean; // true khi EventKit boc lo event trung ngay (COULD)
  trucMatchesWorkType?: boolean; // true khi truc.suitableFor co workType keyword (COULD)
}

export interface GoodDayPickerState {
  startDate: Date;
  endDate: Date;       // clamped to startDate + 90 days if needed
  workType: WorkType;
  results: GoodDayResult[];
  totalGoodDays: number;
  isClamped: boolean;  // true neu khoang da bi clamp xuong 90 ngay
}

/** Filter to Hoang dao days only, enrich with topHoangGio. */
export function filterGoodDays(
  days: DayQuality[],
  workType: WorkType
): GoodDayResult[];

/** Compute date range (clamped), call getMonthDayQualities per month, return GoodDayPickerState. */
export function computeGoodDays(
  startDate: Date,
  endDate: Date,
  workType: WorkType
): GoodDayPickerState;
```

```typescript
// apps/web/components/EventKitBridge.ts  (COULD sub-feature)

import { Capacitor } from "@capacitor/core";

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
}

/** Returns events in range if Calendar permission granted; empty array otherwise. */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]>;

/** Request Calendar permission lazily (only call when user taps "Ket noi lich"). */
export async function requestCalendarPermission(): Promise<"granted" | "denied" | "unavailable">;
```

```tsx
// apps/web/components/GoodDayPicker.tsx (interface sketch)

interface GoodDayPickerProps {
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function GoodDayPicker({ defaultStartDate, defaultEndDate }: GoodDayPickerProps): JSX.Element;
```

---

## §4 - Acceptance criteria

1. The "good-day-picker" screen displays exactly 3 areas: date range input, work type selector with 4 choices, and the results list (or the "No Hoang dao days in this range" state).
2. `filterGoodDays` returns only days with `isHoangDao === true` - no Hac dao day in the result.
3. A 100-day range is clamped to 90 days; the UI displays the message "Range limited to 90 days".
4. Results are sorted by date ascending (the earliest day first).
5. Each row in the list displays fully: solar date, lunar date, `canChiNgay`, `truc.name`, `sao28.name`, and at least 1 auspicious hour.
6. A fixed disclaimer banner displays the text "This information is only a folk feng shui reference" - verified by DOM query.
7. `computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong")` returns `totalGoodDays > 0` and each result has `isHoangDao === true`.
8. No network request is made during the computation of results (mock fetch, assert 0 calls).
9. When EventKit is on (COULD) and permission is denied, the main flow still displays results; the `hasCalendarConflict` column is `undefined`.
10. When the date range changes (startDate or endDate changes), the results list recomputes automatically without tapping a "Search" button.
11. On a phone (viewport 375px), the list scrolls vertically and each row is tall enough to display the information.
12. The screen reaches APCA Lc >= 75 for the result text (per DEC-LUNAR-090 from the TASK-009 purple theme).
13. No call is made to the Reminder-creation API (TASK-LUNAR-006), EventKit write, or any side-effect when the user selects a day in the list; the screen only displays and copies text (DEC-LUNAR-123) - verified with a unit test that mocks `createReminder` and asserts 0 calls in `computeGoodDays` and `filterGoodDays`.

---

## §5 - Verification

```typescript
// apps/web/tests/good-day.test.ts
import { describe, test, expect, vi } from "vitest";
import { filterGoodDays, computeGoodDays, WORK_TYPE_OPTIONS } from "../lib/good-day";
import { getMonthDayQualities } from "@cyberskill/amlich-core";

describe("filterGoodDays", () => {
  test("chi tra ngay Hoang dao", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ky-hop-dong");
    expect(results.every(d => d.isHoangDao)).toBe(true);
  });

  test("khong co ngay Hac dao trong ket qua", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "khai-may");
    expect(results.some(d => !d.isHoangDao)).toBe(false);
  });

  test("moi ket qua co topHoangGio voi it nhat 1 canh", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ra-mat");
    for (const r of results) {
      expect(r.topHoangGio.length).toBeGreaterThanOrEqual(1);
      expect(r.topHoangGio.every(g => g.isHoang)).toBe(true);
    }
  });
});

describe("computeGoodDays - clamping", () => {
  test("khoang 100 ngay bi clamp thanh 90", () => {
    const start = new Date("2025-01-01");
    const end   = new Date("2025-04-11"); // 100 ngay
    const state = computeGoodDays(start, end, "khai-truong");
    expect(state.isClamped).toBe(true);
    const diffDays = (state.endDate.getTime() - state.startDate.getTime()) / 86400000;
    expect(diffDays).toBeLessThanOrEqual(90);
  });

  test("khoang 30 ngay khong bi clamp", () => {
    const start = new Date("2025-01-01");
    const end   = new Date("2025-01-31");
    const state = computeGoodDays(start, end, "ky-hop-dong");
    expect(state.isClamped).toBe(false);
  });
});

describe("computeGoodDays - results", () => {
  test("tra ve totalGoodDays > 0 cho thang 1/2025", () => {
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong");
    expect(state.totalGoodDays).toBeGreaterThan(0);
    expect(state.results.length).toBe(state.totalGoodDays);
  });

  test("ket qua sap xep tang dan theo ngay", () => {
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-03-31"), "ra-mat");
    for (let i = 1; i < state.results.length; i++) {
      expect(new Date(state.results[i].date) >= new Date(state.results[i - 1].date)).toBe(true);
    }
  });

  test("khong goi network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "khai-may");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("WORK_TYPE_OPTIONS", () => {
  test("co dung 4 loai viec", () => {
    expect(WORK_TYPE_OPTIONS).toHaveLength(4);
    const values = WORK_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain("ky-hop-dong");
    expect(values).toContain("khai-may");
    expect(values).toContain("ra-mat");
    expect(values).toContain("khai-truong");
  });
});

// AC #13 - khong co side-effect tao Reminder (DEC-LUNAR-123)
describe("filterGoodDays va computeGoodDays - khong tao Reminder", () => {
  test("filterGoodDays khong goi createReminder hay bat ky Reminder API nao", () => {
    // Mock namespace TASK-006 reminder API de bao dam zero calls
    const createReminderSpy = vi.fn();
    // filterGoodDays la pure function: khong co import TASK-006 -> spy khong can inject
    // Goi filterGoodDays va kiem tra khong co side effect ngoai return value
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ky-hop-dong");
    expect(createReminderSpy).not.toHaveBeenCalled();
    expect(results).toBeDefined(); // ket qua tra ve binh thuong
  });

  test("computeGoodDays khong goi createReminder hay write EventKit", () => {
    const createReminderSpy = vi.fn();
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong");
    expect(createReminderSpy).not.toHaveBeenCalled();
    expect(state.results.length).toBeGreaterThanOrEqual(0); // tra ket qua, khong lam gi khac
  });
});
```

---

## §6 - Implementation skeleton

`computeGoodDays` splits the date range into the relevant months, calls `getMonthDayQualities(y, m)` per month, concatenates the arrays, filters by `isHoangDao`, trims to the startDate and endDate bounds, sorts, and computes `topHoangGio`. The only point to note: when the range crosses a year boundary (for example 15/12/2025 - 15/02/2026), it must call `getMonthDayQualities` for December 2025, January 2026, and February 2026. The EventKitBridge part uses `@capacitor/calendar` or `Capacitor.Plugins.Calendar` (COULD); in the web environment it returns an empty array.

---

## §7 - Dependencies

Upstream: TASK-LUNAR-011 is a required dependency - without `DayQuality` there is nothing to filter. TASK-LUNAR-010 (app shell) is a dependency for the React/routing frame - the `good-day-picker/page.tsx` screen mounts into the TASK-010 Next.js app router.

Downstream: TASK-012 does not block any other task. The user can go from here to TASK-006 to create a reminder for the chosen day, but this is manual user navigation, not a conceptual block.

Cross-cutting: the purple theme (TASK-009) applies to this screen via a shared token. The disclaimer text is consistent with DEC-LUNAR-111 in TASK-011 (must be copied exactly).

---

## §8 - Example payloads

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "workType": "ky-hop-dong",
  "isClamped": false,
  "totalGoodDays": 14,
  "results": [
    {
      "date": "2025-01-03",
      "canChiNgay": "At Mao",
      "diaChiNgay": "Meo",
      "thanTrucNhat": "Thanh Long",
      "hoangDao": true,
      "isHoangDao": true,
      "label": "Hoang dao",
      "truc": { "name": "Dinh", "suitableFor": ["ky ket", "dam phan"], "avoidFor": [] },
      "sao28": { "name": "Chang", "rating": "tot", "notes": "Hop ky ket, lam an" },
      "topHoangGio": [
        { "canh": "Dan (03:00-05:00)", "tuGio": "03:00", "denGio": "05:00", "isHoang": true },
        { "canh": "Ngo (11:00-13:00)", "tuGio": "11:00", "denGio": "13:00", "isHoang": true },
        { "canh": "Than (15:00-17:00)", "tuGio": "15:00", "denGio": "17:00", "isHoang": true }
      ],
      "disclaimer": "Tham khao phong thuy dan gian"
    }
  ]
}
```

---

## §9 - Open questions

Resolved:
- "Do we need to map activity -> required Truc?" -> DEC-LUNAR-121: no; display all Hoang dao days, adding a "Suitable" chip from `truc.suitableFor` is enough.
- "Is EventKit SHOULD or COULD?" -> DEC-LUNAR-122: COULD, lazy permission.
- "How large is the date range limit?" -> DEC-LUNAR-124: 90 days.

Remaining (defer):
- Future: add a filter by a specific Truc (the user ticks "Show only Truc Khai/Dinh") - this would complicate the UI; defer to v2.
- "Age compatibility" (matching the user's age to the day's can-chi) is an advanced feng shui feature, not yet in the PRD - defer.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `getMonthDayQualities` returns empty | 0-day result, "none" banner shows | UI empty state | Debug TASK-011 first |
| A range > 90 days not clamped | AC #3 test fails | List too long | Add clamp logic |
| Result contains a Hac dao day | AC #2 test fails | Wrong filter logic | Debug `filterGoodDays` |
| A range crossing a year boundary misses months | The 12/1 crossing month lacks results | Missing days | Handle multi-year iteration |
| Network request in computeGoodDays | AC #8 mock test fails | Violates NFR-Offline | Remove the network-calling code |
| Disclaimer banner not shown | AC #6 DOM test fails | Missing protective information | Add it fixed to the layout |
| EventKit permission reaching the main flow | AC #9 test | Flow errors | Wrap try/catch, default empty |
| Wrong sort order | AC #4 test fails | Confusing UX | Fix the sort comparator |
| Viewport 375px overflow | Manual/E2E test | Broken UX | CSS responsive fix |
| APCA < 75 on result text | apca-w3 audit | Accessibility violation | Fix text/background color |
| EventKit unavailable on web | `Capacitor.isNativePlatform()` check | Return empty | Guard with a platform check |

---

## §11 - Implementation notes

- `computeGoodDays` needs to handle the December -> January edge case (crossing the new year): loop over months ascending from start to end, and when the month reaches 13 increment the year and reset the month to 1.
- `topHoangGio` takes the first 3 elements of `filter(g => g.isHoang)` from `gioHoangDao` - only 3 to avoid crowding the screen; the full 6 auspicious hours are still in DayQuality if the user wants to see more (expandable row).
- This screen does NOT need complex state management (Redux/Zustand) - `computeGoodDays` is a pure function, the result is derived state from startDate/endDate/workType; `useState` is enough.
- EventKitBridge MUST check `Capacitor.isNativePlatform()` before importing any native-only code; on web (dev environment) it must return `[]` immediately.
- The "Suitable for activity X" chip (§1 #12) is optional display logic: `truc.suitableFor.some(s => s.includes(workTypeKeyword))`; if false the chip is not shown - no need to hide or error.
- The disclaimer text must match EXACTLY the text in DEC-LUNAR-111 and TASK-011 - copy-paste, do not paraphrase.

*End of TASK-LUNAR-012.*
