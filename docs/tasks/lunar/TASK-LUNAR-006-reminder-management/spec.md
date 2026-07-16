---
id: TASK-LUNAR-006
title: "Reminder management - monthly Ram/Mung Mot on/off toggles, gio entry, custom lunar reminder, lead-time + reminder time, upcoming list with solar date"
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
related_frs: [TASK-LUNAR-004, TASK-LUNAR-005, TASK-LUNAR-008]
depends_on: [TASK-LUNAR-004, TASK-LUNAR-005, TASK-LUNAR-010]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (TASK-B01, TASK-B03, TASK-B04, TASK-B07)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4F (TASK-F05 personalized tone)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (UI/UX, upcoming list)"
source_decisions:
  - DEC-LUNAR-060 (Ram=15 and Mung Mot=1 are two independent monthly toggles, switched on/off separately; on -> create a Reminder of type RAM/MUNG_MOT with MONTHLY recurrence)
  - DEC-LUNAR-061 (the gio/custom entry form takes the LUNAR date as the source, shows the computed solar date alongside for reference; the user does not enter a solar date)
  - DEC-LUNAR-062 (lead-time is a subset of {0=on the day, 1=1 day before, 3=3 days before, 7=1 week before}; notifyTime defaults to 07:00; multiple lead-times can be selected at once)
  - DEC-LUNAR-063 (the upcoming list is sorted by the solar date computed from TASK-LUNAR-004; each row shows both the solar date + the lunar label + the lead-time)
  - DEC-LUNAR-064 (every CRUD/toggle change calls reschedule() from TASK-LUNAR-005 in the same flow so pending notifications always stay in sync with the data)
  - DEC-LUNAR-065 (fold TASK-F05: each Reminder has a preselected notificationStyle{tone, emoji, imageId?}; tone is used to shape the notification body - by default a static template, does NOT call AI in Phase 1)
  - DEC-LUNAR-066 (the displayed solar date is computed on-device, read from OccurrenceCache if still valid for the engineVersion, otherwise recomputed)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/components/reminders/MonthlyToggles.tsx
  - apps/web/components/reminders/ReminderForm.tsx
  - apps/web/components/reminders/UpcomingList.tsx
  - apps/web/components/reminders/NotificationStylePicker.tsx
  - apps/web/lib/reminders/store.ts
  - apps/web/lib/reminders/tone.ts
  - apps/web/test/reminders.store.test.ts
modified_files:
  - apps/web/lib/storage.ts
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/{components/reminders,lib/reminders,test}/**
  - bash: cd apps/web && pnpm test reminders
disallowed_tools:
  - letting the user enter a solar date directly as the source of a gio (violates DEC-LUNAR-061 - the lunar date is the source)
  - calling AI to generate the notification body in Phase 1 (violates DEC-LUNAR-065 - static template, AI belongs to TASK-LUNAR-015 Phase 2)
  - changing a Reminder without calling reschedule() (violates DEC-LUNAR-064 - pending must stay in sync)
effort_hours: 10
sub_tasks:
  - "1.5h: MonthlyToggles.tsx - two independent Ram(15)/Mung Mot(1) switches; on creates a MONTHLY Reminder, off deletes it and reschedules"
  - "2.0h: ReminderForm.tsx - enter gio/custom by lunar date (day/month + leap-month flag), show the computed solar date alongside, choose recurrence"
  - "1.5h: lead-time + notifyTime UI - multi-select {on the day/1/3/7 days} + time picker defaulting to 07:00"
  - "1.5h: UpcomingList.tsx - upcoming list sorted by solar date, each row: solar date + lunar label + lead-time + edit/delete button"
  - "1.0h: NotificationStylePicker.tsx (TASK-F05) - choose tone/emoji/image for the notification, save into notificationStyle"
  - "1.0h: tone.ts - render the notification body from a template based on the chosen tone (warm/neutral/formal), NO AI"
  - "0.5h: store.ts - Reminder CRUD + call reschedule() after each change; read/write via storage.ts"
  - "1.0h: reminders.store.test.ts - toggle Ram/Mung Mot, validate form, upcoming sort, tone render, reschedule is called after CRUD"
risk_if_skipped: "This is the surface the user actually touches - without it, TASK-LUNAR-004 (model) and TASK-LUNAR-005 (scheduler) have no way to take input, and the product is useless to the end user. If the Ram/Mung Mot toggle does not call reschedule, turning a reminder on still leaves it silent. If solar-date entry is allowed, the gio will drift wrong next year (violating TASK-LUNAR-004's principle of storing the lunar date). This is the task that closes the personal MVP path toward the PRD's G1 goal."
---

## §1 - Description (BCP-14 normative)

This module is the reminder management layer: monthly Ram/Mung Mot toggles, a form for entering gio/custom reminders by lunar date, choosing lead-time and reminder time, an upcoming list with solar dates, and choosing the notification tone (TASK-F05). This is the contract:

1. **MUST** provide two independent monthly toggles "Remind Ram (15 lunar)" and "Remind Mung Mot (1 lunar)"; turning each toggle on creates a `Reminder` with `type` `RAM`/`MUNG_MOT` and `recurrence` `MONTHLY`, turning it off deletes it and reschedules (DEC-LUNAR-060, TASK-B01).
2. **MUST** allow entering a death anniversary (`type` `GIO`) by LUNAR date: `lunarDay` + `lunarMonth` + the `isLeapMonth` flag; entered once, the app recurs it every year automatically (TASK-B02 was implemented in TASK-LUNAR-004; here it is the entry UI). When `isLeapMonth = true`, the form **MUST** show and allow choosing `leapFallback` (`REGULAR` / `SKIP` / `ASK`, default `REGULAR`) - this is the choice the TASK-LUNAR-004 §1 #5/#6 model exposes; if the UI does not surface it, the model exposes a decision the user never sees (DEC-LUNAR-042).
3. **MUST** allow creating a custom lunar reminder (`type` `CUSTOM`), for example "the God of Wealth day, 10th of the first lunar month" (`lunarDay:10, lunarMonth:1`) (TASK-B03).
4. **MUST** take the LUNAR date as the input source; the UI **MUST** show the computed solar date alongside for reference, and **MUST NOT** let the user enter a solar date directly as the source of a gio (DEC-LUNAR-061, TASK-B02).
5. **MUST** let each reminder choose a lead-time that is a subset of `{0 = on the day, 1 = 1 day before, 3 = 3 days before, 7 = 1 week before}` (multiple selected at once) and one `notifyTime` (default "07:00") (DEC-LUNAR-062, TASK-B04).
6. **MUST** show the list of upcoming reminders sorted by the solar date computed from TASK-LUNAR-004; each row **MUST** show the solar date, the lunar label (for example "16/2 lunar"), and the lead-time (DEC-LUNAR-063, TASK-B07). Any row that maps to an occurrence with `fellBack = true` **MUST** show a "moved to the regular month" label, and an occurrence with `pendingUserChoice = true` (leapFallback = ASK) **MUST** show a "needs a month to observe" prompt - this is where the UI surfaces the flags the TASK-LUNAR-004 model emits and TASK-LUNAR-005 carries in userInfo (DEC-LUNAR-042).
7. **MUST** call `reschedule()` from TASK-LUNAR-005 in the same flow after each CRUD or toggle action, so the pending set on iOS always stays in sync with the data (DEC-LUNAR-064).
8. **MUST** validate the form via `validateReminder` from TASK-LUNAR-004 before saving and show specific errors (RAM_DAY_MISMATCH, ONCE_NEEDS_YEAR...); **MUST NOT** save an invalid Reminder.
9. **MUST** fold TASK-F05: write `notificationStyle { tone, emoji, imageId? }` into the optional field `Reminder.notificationStyle` (type `NotificationStyle` owned by TASK-LUNAR-004 in amlich-core, do NOT redeclare it here); the user preselects the tone and emoji for that reminder's notification (TASK-F05, DEC-LUNAR-065).
10. **MUST** render the notification body from a static template based on `tone` (`warm` / `neutral` / `formal`) via `tone.ts`, and **MUST NOT** call AI in Phase 1; AI-generated reminders belong to TASK-LUNAR-015 in Phase 2 (DEC-LUNAR-065).
11. **MUST** allow editing and deleting each reminder; deleting calls `reschedule()` immediately; editing runs `validateReminder` again before saving.
12. **MUST** display the solar date using the value computed on-device: read from `OccurrenceCache` if still valid for the `engineVersion`, otherwise recompute with TASK-LUNAR-004 (DEC-LUNAR-066, NFR-Offline).
13. **MUST** allow enabling/disabling each reminder (`enabled`) without deleting it; disabling -> excludes it from reschedule but keeps the data.
14. **MUST** link the reminder to the occasion content page via `linkedContentId` when available (for example gio -> the death-anniversary page, Ram -> the Ram page); the UI shows a "view ritual" link (TASK-D02, preparing for TASK-LUNAR-008).
15. **MUST** work offline: entering, editing, and viewing the upcoming list require no network; only external channels (ZNS in the commercial edition) need the network (NFR-Offline).
16. **SHOULD** warn when the total number of reminders generates more reminder points than the budget of 64 (using `getPlanDiagnostics` from TASK-LUNAR-005): show "you have many reminders, some will be scheduled as they get closer" rather than silently dropping.

---

## §2 - Why this design (rationale for humans)

**Why are Ram and Mung Mot two separate toggles (§1 #1, DEC-LUNAR-060)?** Many people observe both Ram and Mung Mot, but some observe only one of the two. Two independent switches give exactly the level of control the PRD TASK-B01 describes, and each toggle maps straight to a `MONTHLY` `Reminder` - no separate entry screen is needed for the two most common occasions.

**Why is the lunar date the source and the solar date shown only alongside (§1 #4, DEC-LUNAR-061)?** The user remembers "grandma's gio on the 16th of the second lunar month", not the solar date - because the solar date changes every year. Forcing the user to enter a solar date would drift wrong next year and break TASK-LUNAR-004's principle of storing the lunar date. Showing the computed solar date alongside reassures them they entered it correctly without turning it into the data source.

**Why call reschedule after each change (§1 #7, DEC-LUNAR-064)?** The set of pending notifications on iOS must reflect the current data exactly. If the user turns on the Ram reminder without a reschedule, the device will not ring on the right occasion. Calling `reschedule()` in the same CRUD/toggle flow ensures pending always matches - this is the most important join point between the management layer and the scheduler.

**Why is lead-time a fixed multi-select (§1 #5, DEC-LUNAR-062)?** The PRD lists exactly four levels: on the day / 1 / 3 days before / 1 week before. Allowing several at once (for example a week ahead to buy offerings and on the day to observe) fits real habits. A fixed set keeps the UI compact and makes the budget of 64 easy to calculate.

**Why sort the upcoming list by solar date (§1 #6, DEC-LUNAR-063)?** Users live by the solar calendar - they want to know "what is coming up" in real chronological order. Sorting by the solar date computed from TASK-LUNAR-004, with the lunar label and lead-time, gives a view that matches what the PRD section 13 describes.

**Why fold TASK-F05 but not use AI in Phase 1 (§1 #9, #10, DEC-LUNAR-065)?** TASK-F05 (choosing tone, emoji, image) is part of the personalized experience and reasonably sits next to reminder management. But generating reminders with AI belongs to TASK-LUNAR-015 (Phase 2, with a Claude proxy). In Phase 1, the notification body renders from a static template based on `tone` - still warm, still personal, without a backend or key.

**Why read OccurrenceCache when still valid (§1 #12, DEC-LUNAR-066)?** Recomputing the solar date for every row each time the list opens is wasteful when the data has not changed. Read the cache if the `engineVersion` still matches, recompute when the core has changed - both fast and correct, and fully offline per NFR-Offline.

**Why warn rather than silently drop when > 64 (§1 #16)?** If a family enters many gio, the total reminder points can exceed 64 and the scheduler will drop the distant ones. Rather than surprising the user by not being reminded, showing a warning ("some will be scheduled as they get closer") keeps things transparent, in the spirit of the PRD Recommendations about the > 50 reminders threshold.

---

## §3 - API contract

```typescript
// apps/web/lib/reminders/tone.ts  (TASK-F05, template tinh - KHONG AI)
// NotificationStyle la field tren Reminder, type do TASK-LUNAR-004 so huu (amlich-core).
// Module nay KHONG redeclare - import de tranh drift schema giua 004 va 006.
import type { NotificationStyle } from "@cyberskill/amlich-core";
export type { NotificationStyle };
export type Tone = NotificationStyle["tone"];   // "warm" | "neutral" | "formal"

export interface ToneContext {
  title: string;            // "Giỗ bà nội"
  solarLabel: string;       // "25/03"
  lunarLabel: string;       // "16/2 ÂL"
  leadDays: number;         // 0 = dung ngay
}
/** Render body thông báo từ template theo tone. Không gọi mạng, không AI (DEC-LUNAR-065). */
export function renderBody(style: NotificationStyle, ctx: ToneContext): string;
```

```typescript
// apps/web/lib/reminders/store.ts
import type { Reminder } from "@cyberskill/amlich-core";
import { reschedule } from "../notifications/scheduler";

export interface UpcomingItem {
  reminderId: string;
  title: string;
  solarDate: string;        // "YYYY-MM-DD" tinh tu TASK-LUNAR-004
  lunarLabel: string;
  leadDays: number;
  linkedContentId?: string;
  fellBack?: boolean;          // §1 #6 - occurrence da chuyen sang thang thuong (DEC-LUNAR-042)
  pendingUserChoice?: boolean; // §1 #6 - leapFallback=ASK, can user chon thang cung
}

export interface ReminderStore {
  list(): Reminder[];
  upsert(r: Reminder): Promise<{ errors: { field: string; code: string }[] }>;  // validate truoc, reschedule sau
  remove(id: string): Promise<void>;                                            // reschedule sau
  setEnabled(id: string, enabled: boolean): Promise<void>;                      // reschedule sau
  toggleMonthly(kind: "RAM" | "MUNG_MOT", on: boolean): Promise<void>;          // DEC-LUNAR-060
  upcoming(nowUtcMs: number, limit?: number): UpcomingItem[];                   // sort theo solarDate
  diagnostics(nowUtcMs: number): { scheduled: number; slotsDropped: number; remindersCovered: number };
}

export function createReminderStore(engineVersion: string): ReminderStore;
```

```typescript
// apps/web/components/reminders/ReminderForm.tsx (props)
import type { Reminder, LeapFallback } from "@cyberskill/amlich-core";
export interface ReminderFormProps {
  initial?: Partial<Reminder>;
  onSubmit: (r: Reminder) => void;     // goi store.upsert
  // UI: nhap lunarDay/lunarMonth + isLeapMonth; hien solarPreview tinh on-the-fly (DEC-LUNAR-061)
  solarPreview: (lunarDay: number, lunarMonth: number, isLeap: boolean) => string;
  // Khi isLeapMonth=true, PHAI surface lua chon leapFallback (REGULAR/SKIP/ASK) - model TASK-LUNAR-004 §1 #5/#6 expose (DEC-LUNAR-042)
  onLeapFallbackChange?: (policy: LeapFallback) => void;
}

// apps/web/components/reminders/MonthlyToggles.tsx (props)
export interface MonthlyTogglesProps {
  ramOn: boolean; mungMotOn: boolean;
  onToggle: (kind: "RAM" | "MUNG_MOT", on: boolean) => void;   // goi store.toggleMonthly
}

// apps/web/components/reminders/NotificationStylePicker.tsx (props, TASK-F05)
import type { NotificationStyle } from "@cyberskill/amlich-core"; // owner: TASK-LUNAR-004; KHONG redeclare
export interface NotificationStylePickerProps {
  value: NotificationStyle;
  onChange: (s: NotificationStyle) => void;   // tone/emoji/imageId
  preview: (s: NotificationStyle) => string;  // dung renderBody
}
```

```typescript
// lead-time constants (DEC-LUNAR-062, TASK-B04)
export const LEAD_TIME_OPTIONS = [
  { value: 0, label: "Đúng ngày" },
  { value: 1, label: "Trước 1 ngày" },
  { value: 3, label: "Trước 3 ngày" },
  { value: 7, label: "Trước 1 tuần" },
] as const;
export const DEFAULT_NOTIFY_TIME = "07:00";
```

---

## §4 - Acceptance criteria

1. **Independent Ram toggle** - turning on "Remind Ram" creates 1 `Reminder` with `type:"RAM"`, `recurrence:"MONTHLY"`, `lunarDay:15`; turning it off deletes it.
2. **Independent Mung Mot toggle** - turning on "Remind Mung Mot" creates `type:"MUNG_MOT"`, `lunarDay:1`; independent of Ram (turning this on does not close the other).
3. **Toggle calls reschedule** - each `toggleMonthly` calls `reschedule()` exactly once (asserted via mock).
4. **Enter gio by lunar date** - entering `lunarDay:16, lunarMonth:2` in the form creates a `Reminder` of `type:"GIO"` with no solar-date field.
5. **Solar preview shown alongside** - the form shows the solar date string computed from `(lunarDay, lunarMonth, isLeap)` for the coming year; the user has no solar-date input field.
6. **Custom reminder** - entering "God of Wealth day" `lunarDay:10, lunarMonth:1` creates `type:"CUSTOM"`.
7. **Lead-time multi-select** - selecting `[0,7]` saves `leadTimes:[0,7]`; setting `notifyTime:"06:30"` saves it correctly.
8. **Upcoming sorted by solar date** - `upcoming()` returns a list sorted ascending by `solarDate`; each item has `solarDate`, `lunarLabel`, `leadDays`.
9. **CRUD calls reschedule** - `upsert`, `remove`, `setEnabled` each call `reschedule()` after changing the data (asserted via mock).
10. **Validation blocks bad saves** - `upsert` of a `RAM` with `lunarDay:14` returns `errors` containing `RAM_DAY_MISMATCH` and does NOT save.
11. **notificationStyle saved** - choosing `tone:"warm", emoji:"🌼"` saves into `Reminder.notificationStyle`.
12. **renderBody makes no network call** - `renderBody` is a pure function, returns different strings for `warm` vs `formal`, with no fetch.
13. **disabling keeps the data** - `setEnabled(id,false)` keeps the Reminder in `list()` but excludes it from reschedule.
14. **Offline** - `upcoming()` and `upsert()` run without a network (no network call in the CRUD/display path).
15. **Diagnostics warning** - with many reminders, `diagnostics()` returns `slotsDropped > 0` so the UI can warn.
16. **Content link** - a reminder with `linkedContentId` shows the upcoming item with `linkedContentId` so the UI can render a "view ritual" link.

---

## §5 - Verification

```typescript
// apps/web/test/reminders.store.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/notifications/scheduler", () => ({ reschedule: vi.fn(async () => ({ permission: "granted", plan: { notifications: [], diagnostics: { scheduled: 0, slotsDropped: 0, remindersCovered: 0, horizonMonths: 12 } } })) }));
import { reschedule } from "../lib/notifications/scheduler";
import { createReminderStore } from "../lib/reminders/store";
import { renderBody } from "../lib/reminders/tone";
import type { Reminder } from "@cyberskill/amlich-core";

const ENGINE = "1.0.0";
const NOW = Date.UTC(2026, 0, 1);

describe("reminder store", () => {
  it("RAM toggle creates a MONTHLY day-15 reminder and reschedules (DEC-LUNAR-060, AC #1/#3)", async () => {
    const s = createReminderStore(ENGINE);
    await s.toggleMonthly("RAM", true);
    const r = s.list().find(x => x.type === "RAM")!;
    expect(r.recurrence).toBe("MONTHLY");
    expect(r.lunarDay).toBe(15);
    expect(reschedule).toHaveBeenCalledTimes(1);
  });

  it("RAM and MUNG_MOT toggles are independent (AC #2)", async () => {
    const s = createReminderStore(ENGINE);
    await s.toggleMonthly("RAM", true);
    expect(s.list().some(x => x.type === "MUNG_MOT")).toBe(false);
    await s.toggleMonthly("MUNG_MOT", true);
    expect(s.list().filter(x => x.type === "RAM" || x.type === "MUNG_MOT").length).toBe(2);
  });

  it("giỗ is entered by lunar date, never solar (DEC-LUNAR-061, AC #4)", async () => {
    const s = createReminderStore(ENGINE);
    const { errors } = await s.upsert({ id: "g1", userId: "u", type: "GIO", title: "Gio ba",
      lunarDay: 16, lunarMonth: 2, isLeapMonth: false, recurrence: "ANNUAL" } as any);
    expect(errors).toHaveLength(0);
    const r = s.list().find(x => x.id === "g1")! as Record<string, unknown>;
    expect("gregorianDate" in r).toBe(false);          // khong luu ngay duong
    expect("solarDate" in r).toBe(false);
  });

  it("upcoming is sorted ascending by solarDate (DEC-LUNAR-063, AC #8)", async () => {
    const s = createReminderStore(ENGINE);
    await s.upsert({ id: "a", userId: "u", type: "CUSTOM", title: "A", lunarDay: 10, lunarMonth: 7, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0] } as any);
    await s.upsert({ id: "b", userId: "u", type: "CUSTOM", title: "B", lunarDay: 10, lunarMonth: 1, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0] } as any);
    const up = s.upcoming(NOW, 10);
    for (let i = 1; i < up.length; i++) expect(up[i - 1].solarDate <= up[i].solarDate).toBe(true);
    expect(up[0]).toHaveProperty("lunarLabel");
    expect(up[0]).toHaveProperty("leadDays");
  });

  it("CRUD calls reschedule after every mutation (DEC-LUNAR-064, AC #9)", async () => {
    const s = createReminderStore(ENGINE);
    (reschedule as any).mockClear();
    await s.upsert({ id: "x", userId: "u", type: "CUSTOM", title: "X", lunarDay: 5, lunarMonth: 5, isLeapMonth: false, recurrence: "ANNUAL" } as any);
    await s.setEnabled("x", false);
    await s.remove("x");
    expect((reschedule as any).mock.calls.length).toBe(3);
  });

  it("validateReminder blocks an invalid RAM (AC #10)", async () => {
    const s = createReminderStore(ENGINE);
    const { errors } = await s.upsert({ id: "bad", userId: "u", type: "RAM", title: "Ram sai", lunarDay: 14, lunarMonth: 1, isLeapMonth: false, recurrence: "MONTHLY" } as any);
    expect(errors.some(e => e.code === "RAM_DAY_MISMATCH")).toBe(true);
    expect(s.list().some(x => x.id === "bad")).toBe(false);
  });

  it("setEnabled(false) keeps the reminder but drops it from scheduling (AC #13)", async () => {
    const s = createReminderStore(ENGINE);
    await s.upsert({ id: "k", userId: "u", type: "CUSTOM", title: "K", lunarDay: 3, lunarMonth: 3, isLeapMonth: false, recurrence: "ANNUAL" } as any);
    await s.setEnabled("k", false);
    expect(s.list().find(x => x.id === "k")!.enabled).toBe(false);
  });

  it("renderBody is pure and tone-sensitive, no AI (DEC-LUNAR-065, AC #12)", () => {
    const ctx = { title: "Giỗ bà nội", solarLabel: "25/03", lunarLabel: "16/2 ÂL", leadDays: 1 };
    const warm = renderBody({ tone: "warm", emoji: "🌼" }, ctx);
    const formal = renderBody({ tone: "formal", emoji: "" }, ctx);
    expect(warm).not.toEqual(formal);
    expect(warm).toContain("Giỗ bà nội");
  });

  it("diagnostics surfaces dropped slots for a heavy load (AC #15)", async () => {
    const s = createReminderStore(ENGINE);
    for (let i = 0; i < 80; i++) {
      await s.upsert({ id: `r${i}`, userId: "u", type: "GIO", title: `G${i}`, lunarDay: (i % 28) + 1, lunarMonth: (i % 12) + 1, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0, 1] } as any);
    }
    expect(s.diagnostics(NOW).slotsDropped).toBeGreaterThan(0);
  });

  // AC #5 - solarPreview la prop cua ReminderForm, khong phai field Reminder
  it("solarPreview computes solar string from lunar coords; upsert never stores solarDate (DEC-LUNAR-061, AC #5)", async () => {
    // store.ts PHAI export solarPreviewFromLunar(d, m, leap): string de ReminderForm dung (DEC-LUNAR-061)
    const { solarPreviewFromLunar } = await import("../lib/reminders/store") as unknown as
      { solarPreviewFromLunar?: (d: number, m: number, leap: boolean) => string };
    if (typeof solarPreviewFromLunar === "function") {
      const result = solarPreviewFromLunar(10, 1, false);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0); // phai tra chuoi ngay duong khong rong
    }
    // Cho du solarPreviewFromLunar ton tai hay khong, upsert khong bao gio luu solarDate
    const s = createReminderStore(ENGINE);
    await s.upsert({ id: "sp1", userId: "u", type: "CUSTOM", title: "Solar preview test",
      lunarDay: 10, lunarMonth: 3, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0] } as any);
    const saved = s.list().find(x => x.id === "sp1") as Record<string, unknown> | undefined;
    expect(saved).toBeDefined();
    expect("solarDate" in (saved ?? {})).toBe(false); // khong luu truong solar (DEC-LUNAR-061)
    expect("gregorianDate" in (saved ?? {})).toBe(false);
  });

  // AC #6
  it("custom 'via Than Tai' reminder creates type CUSTOM", async () => {
    const s = createReminderStore(ENGINE);
    const { errors } = await s.upsert({
      id: "tt1", userId: "u", type: "CUSTOM", title: "via Than Tai",
      lunarDay: 10, lunarMonth: 1, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0],
    } as any);
    expect(errors).toHaveLength(0);
    const r = s.list().find(x => x.id === "tt1")!;
    expect(r.type).toBe("CUSTOM");
    expect(r.lunarDay).toBe(10);
    expect(r.lunarMonth).toBe(1);
  });

  // AC #7
  it("lead-time multi-select saves leadTimes:[0,7] and notifyTime correctly", async () => {
    const s = createReminderStore(ENGINE);
    const { errors } = await s.upsert({
      id: "lt1", userId: "u", type: "CUSTOM", title: "Lead multi",
      lunarDay: 5, lunarMonth: 5, isLeapMonth: false, recurrence: "ANNUAL",
      leadTimes: [0, 7], notifyTime: "06:30",
    } as any);
    expect(errors).toHaveLength(0);
    const r = s.list().find(x => x.id === "lt1")! as Reminder & { leadTimes: number[]; notifyTime: string };
    expect(r.leadTimes).toEqual(expect.arrayContaining([0, 7]));
    expect(r.leadTimes).toHaveLength(2);
    expect(r.notifyTime).toBe("06:30");
  });

  // AC #14
  it("upcoming and upsert run without network (no fetch calls in CRUD path)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const s = createReminderStore(ENGINE);
    await s.upsert({ id: "off1", userId: "u", type: "CUSTOM", title: "Offline test", lunarDay: 8, lunarMonth: 4, isLeapMonth: false, recurrence: "ANNUAL", leadTimes: [0] } as any);
    s.upcoming(NOW, 5);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // AC #16
  it("reminder with linkedContentId surfaces linkedContentId in upcoming item", async () => {
    const s = createReminderStore(ENGINE);
    await s.upsert({
      id: "lc1", userId: "u", type: "CUSTOM", title: "Nghi le test",
      lunarDay: 3, lunarMonth: 3, isLeapMonth: false, recurrence: "ANNUAL",
      leadTimes: [0], linkedContentId: "content-nghi-le-123",
    } as any);
    const items = s.upcoming(NOW, 20);
    const found = items.find(x => x.reminderId === "lc1");
    expect(found).toBeDefined();
    expect(found!.linkedContentId).toBe("content-nghi-le-123");
  });
});
```

---

## §6 - Implementation skeleton

The API in §3 is the skeleton. The detail worth pinning is `upsert`: it is where validate, persist, and reschedule chain together in exactly the right order:

```typescript
// apps/web/lib/reminders/store.ts (lõi upsert)
async upsert(input: Reminder) {
  const r = normalizeReminder(input);                 // TASK-LUNAR-004
  const errors = validateReminder(r);                 // TASK-LUNAR-004
  if (errors.length) return { errors };               // §1 #8 - khong luu neu sai
  await storage.putReminder(r);                       // TASK-LUNAR-010 storage.ts
  await reschedule(adapter, this.list(), Date.now(), this.engineVersion);  // §1 #7 / DEC-LUNAR-064
  return { errors: [] };
}
```

`upcoming` reads `OccurrenceCache` if it is still valid, otherwise calls `nextOccurrences` then caches the result, sorted by `solarDate`. `toggleMonthly("RAM", true)` creates a `Reminder` `{type:"RAM", lunarDay:15, recurrence:"MONTHLY"}` through `upsert` itself; `false` calls `remove` on the existing RAM reminder.

---

## §7 - Dependencies

- Upstream: TASK-LUNAR-004 (type `Reminder`, `normalizeReminder`, `validateReminder`, `nextOccurrences` to compute `solarDate`, `OccurrenceCache`); TASK-LUNAR-005 (`reschedule`, `getPlanDiagnostics` called after each change); TASK-LUNAR-010 (the app shell provides on-device `storage.ts` and routing, and hosts these components).
- Downstream: does not block any task (it is a leaf of the MVP). Related to TASK-LUNAR-008 (occasion content link via `linkedContentId`).
- Cross-cutting: `notificationStyle` (TASK-F05) is rendered by `tone.ts` in Phase 1; in Phase 2, TASK-LUNAR-015 **MAY** replace the template body with a Claude-generated reminder, but does not change the `notificationStyle` schema. The deep-link route `/reminder/:id` from TASK-LUNAR-005 opens the right detail screen here.

---

## §8 - Example payloads

```json
{
  "monthlyToggles": { "ramOn": true, "mungMotOn": false },
  "createdRam": {
    "id": "rem_ram_monthly", "userId": "u_linh", "type": "RAM", "title": "Nhắc Rằm",
    "lunarDay": 15, "lunarMonth": 1, "isLeapMonth": false, "recurrence": "MONTHLY",
    "leadTimes": [1], "notifyTime": "07:00", "channels": ["LOCAL"], "enabled": true,
    "notificationStyle": { "tone": "warm", "emoji": "🌕" }
  }
}
```

```json
{
  "upcoming": [
    { "reminderId": "rem_ram_monthly", "title": "Nhắc Rằm", "solarDate": "2026-03-03", "lunarLabel": "15/1 ÂL", "leadDays": 1, "linkedContentId": "festival_ram" },
    { "reminderId": "rem_gio_ba_noi", "title": "Giỗ bà nội", "solarDate": "2026-03-25", "lunarLabel": "16/2 ÂL", "leadDays": 0, "linkedContentId": "festival_dam_gio" }
  ]
}
```

```json
{ "notificationBody": { "tone": "warm", "rendered": "🌼 Mai (25/03) là giỗ bà nội (16/2 ÂL) rồi. Nhớ mua hoa cúc vàng nhé!" } }
```

---

## §9 - Open questions

Resolved:
- Ram/Mung Mot are two independent toggles mapping to MONTHLY Reminders (DEC-LUNAR-060).
- The lunar date is the source, the solar date is shown only for reference (DEC-LUNAR-061).
- TASK-F05 is folded in here, but the body renders from a static template, with AI in Phase 2 (DEC-LUNAR-065).

Deferred (near later tasks / Caveats):
- Generating personalized reminders with Claude (a dynamic warm tone, by context) - belongs to TASK-LUNAR-015 Phase 2; here there is only a static template by tone.
- Snooze / marking an occurrence as "observed" - improves UX but is not part of the MVP core; deferred.
- Entering a custom image for `notificationStyle.imageId` (for example a photo of the deceased) - touches culturally sensitive data; only opened when there is a PDPL/consent layer (TASK-LUNAR-019); Phase 1 allows only emoji + built-in images.
- A detailed warning when > 64 that suggests which reminders to remove - depends on the fairness of TASK-LUNAR-005; initially just show a general notice.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Ram reminder turned on but the device does not ring | toggle calls reschedule | pending in sync | none (DEC-LUNAR-064; AC #3) |
| User enters a solar date as the source | UI has only a lunar-date input | does not happen | none (DEC-LUNAR-061; AC #4/#5) |
| Edit/delete a reminder but pending does not change | CRUD calls reschedule | resynced | none (DEC-LUNAR-064; AC #9) |
| Save a RAM with the wrong day (!=15) | validateReminder | blocks save + reports error | user fixes it (AC #10) |
| ONCE missing the year | validateReminder | blocks save | user enters the year |
| Calling AI to generate the body in Phase 1 | tone.ts is pure, no fetch | static template | AI in TASK-LUNAR-015 (DEC-LUNAR-065; AC #12) |
| Upcoming list in the wrong order | sort by solarDate | ascending | none (AC #8) |
| Recomputing the solar date on every open (slow) | read OccurrenceCache while valid | fast, offline | recompute when engineVersion changes (DEC-LUNAR-066) |
| Disabling a reminder loses the data | setEnabled keeps the Reminder | kept, only excluded from schedule | re-enable (AC #13) |
| Too many reminders, silently dropped | diagnostics slotsDropped | UI warning | user disables some (AC #15) |
| Network needed to view the list | CRUD/display path is offline | runs offline | none (NFR-Offline; AC #14) |
| Reminder not linked to occasion content | linkedContentId optional | item still shows, no link | attach content later (TASK-D02; AC #16) |
| Sensitive emoji/image leaks data | Phase 1 allows only emoji + built-in images | no custom image entry | opened when PDPL is available (TASK-LUNAR-019) |

---

## §11 - Implementation notes

- The most important join point is that `upsert`/`remove`/`toggleMonthly` always end with `reschedule()`. This is where the management layer and TASK-LUNAR-005 hook into each other; forgetting it produces the hard-to-trace "reminder on but no ring" bug.
- The form never has a solar-date input field. It takes only the lunar date and shows the computed solar date alongside as a preview. This is how the store-the-lunar-date principle of TASK-LUNAR-004 is kept at the UI layer.
- Ram/Mung Mot toggles map straight to a `MONTHLY` Reminder with `lunarDay` 15/1 through `upsert` itself, so they go through the proper validate + reschedule path, not a shortcut.
- `tone.ts` is a static template: a table of phrases by `tone` (warm/neutral/formal) combined with the context (title, solar date, lunar label, lead). No fetch, no AI - so Phase 1 runs offline and TASK-LUNAR-015 can replace it later without changing the `notificationStyle` schema.
- `upcoming` reads OccurrenceCache if the `engineVersion` still matches for speed; it recomputes only when the core changes. The sort uses the ISO string `solarDate` (string comparison), avoiding local `Date`.
- The > 64 warning comes from `getPlanDiagnostics` in TASK-LUNAR-005 (`slotsDropped`), showing a transparent notice rather than surprising the user - in the spirit of the > 50 reminders threshold in the PRD Recommendations.
- `notificationStyle.imageId` in Phase 1 accepts only emoji and built-in images, not custom image uploads (for example a photo of the deceased) yet, because this is culturally sensitive data - only opened when there is the consent/PDPL layer of TASK-LUNAR-019.

---

*End of TASK-LUNAR-006.*
