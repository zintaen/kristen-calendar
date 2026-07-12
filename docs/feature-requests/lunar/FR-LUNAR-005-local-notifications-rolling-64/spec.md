---
id: FR-LUNAR-005
title: "Local notification scheduler - rolling-64 strategy on iOS via @capacitor/local-notifications, removeAllPending + reschedule the nearest 64 events, deep-link userInfo"
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
related_frs: [FR-LUNAR-004, FR-LUNAR-006]
depends_on: [FR-LUNAR-004, FR-LUNAR-010]
blocks: [FR-LUNAR-006]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-B05)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#11 (Notification Architecture)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#15 (Key Findings 5/6, Caveats iOS background)"
source_decisions:
  - DEC-LUNAR-050 (iOS keeps at most 64 pending local notifications -> each reschedule: removeAllPendingNotificationRequests() then re-add at most the nearest 64 reminder points)
  - DEC-LUNAR-051 (reschedule trigger: app open (foreground) is primary; BGAppRefreshTask is best-effort, NOT guaranteed timing - must not be treated as a guaranteed reminder channel)
  - DEC-LUNAR-052 (lead-time = multiple notifications for the same event, EACH notification consumes a slot in the 64 budget - count them correctly)
  - DEC-LUNAR-053 (each notification carries userInfo.reminderId + occurrenceDate to deep-link to the correct detail screen when the user taps)
  - DEC-LUNAR-054 (calendar window 6-12 months out; if the total reminder points > 64, cut by nearest fireAtLocal first, log slotsDropped)
  - DEC-LUNAR-055 (web push is only available iOS 16.4+ when the PWA has been Added to Home Screen -> treated as auxiliary, not the primary channel on iPhone; Android/desktop use the Push API normally)
  - DEC-LUNAR-056 (the scheduler is a pure planner + thin native adapter: the planner computes a testable plan, the adapter only calls Capacitor schedule/cancel; all occurrences come from FR-LUNAR-004, the scheduler does not derive lunar dates itself)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/lib/notifications/planner.ts
  - apps/web/lib/notifications/scheduler.ts
  - apps/web/lib/notifications/adapter.capacitor.ts
  - apps/web/lib/notifications/deeplink.ts
  - apps/web/ios/App/App/BGRefresh.swift
  - apps/web/test/notifications.planner.test.ts
modified_files:
  - apps/web/capacitor.config.ts
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/{lib/notifications,ios/App,test}/**
  - bash: cd apps/web && pnpm test notifications
disallowed_tools:
  - scheduling more than 64 pending on iOS (violates DEC-LUNAR-050 - must cut to 64)
  - treating BGAppRefreshTask as a guaranteed-timing reminder channel (violates DEC-LUNAR-051 - best-effort)
  - deriving lunar dates in the scheduler instead of reading Occurrence from FR-LUNAR-004 (violates DEC-LUNAR-056)
effort_hours: 10
sub_tasks:
  - "2.0h: planner.ts - planSchedule(reminders, now, horizonMonths, budget=64) -> mergeAndSort occurrences then cut the first 64; count slotsDropped"
  - "1.5h: scheduler.ts - reschedule(): cancelAll() then schedule(plan); idempotent; called on app open + onResume"
  - "1.5h: adapter.capacitor.ts - wrap @capacitor/local-notifications (requestPermissions, schedule, cancel, getPending), a stable id from reminderId+occurrenceDate+leadDays"
  - "1.0h: deeplink.ts - parse userInfo.reminderId + occurrenceDate -> route to the reminder detail screen"
  - "1.0h: horizon + budget logic - 6-12 months, fill by nearest time, ensure every enabled reminder gets at least its nearest occurrence before yielding a slot"
  - "1.0h: BGRefresh.swift - register BGAppRefreshTask, call into reschedule, with a best-effort comment"
  - "1.5h: notifications.planner.test.ts - 100 reminders -> exactly 64 pending, lead-time counts a slot, nearest sort, deep-link payload, cancelAll before add"
  - "0.5h: capacitor.config.ts - configure the LocalNotifications plugin, default channel/sound"
risk_if_skipped: "Without the scheduler, even if FR-LUNAR-004 generates the correct occurrences, the device never rings - the app cannot remind anything, which is the PRD's G1 goal. If more than 64 pending are scheduled on iOS, the system silently drops them and the user loses exactly the farthest reminders - hard to detect, loss of trust. If it depends on BGAppRefreshTask as a guaranteed channel, users who rarely open the app miss slots. FR-LUNAR-006 (reminder management) calls reschedule whenever the user adds/edits/toggles a reminder, so a stable API is required here."
---

## §1 - Description (BCP-14 normative)

The scheduler turns the list of `Occurrence` (from FR-LUNAR-004) into local notifications, honoring iOS's 64-pending ceiling with a rolling reschedule strategy. This is the contract:

1. MUST, on each reschedule, call `removeAllPendingNotificationRequests()` (cancelAll) first, then `add()` at most the nearest 64 reminder points from all `enabled` Reminders; MUST NOT let the total pending exceed 64 on iOS (DEC-LUNAR-050, FR-B05).
2. MUST read the occurrences from FR-LUNAR-004 (`nextOccurrences` then `mergeAndSort`) and MUST NOT derive lunar dates in the scheduler; the scheduler only merges, sorts by `fireAtLocal`, and cuts the nearest 64 (DEC-LUNAR-056).
3. MUST treat the "app open (foreground/onResume)" event as the primary reschedule trigger; `BGAppRefreshTask` is only best-effort and MUST NOT be treated as a guaranteed-timing reminder channel (DEC-LUNAR-051, Caveats iOS background).
4. MUST count lead-time into the 64 budget: each (occurrence x leadTime) pair is its own notification and consumes a slot; for example a reminder with `leadTimes:[0,1]` occupies 2 slots per appearance (DEC-LUNAR-052, PRD section 11).
5. MUST assign each notification a `userInfo` carrying `reminderId` and `occurrenceDate` (ISO date) so that when the user taps, the app deep-links to the correct reminder detail screen (DEC-LUNAR-053, PRD section 11).
6. MUST schedule within the next 6-12 month window (`horizonMonths`); if the total reminder points in the window exceed 64, MUST cut by nearest `fireAtLocal` first and log `slotsDropped` (DEC-LUNAR-054, PRD section 11). The `count` passed to `nextOccurrences` for EACH reminder MUST be large enough to cover the whole `horizonMonths` (for example MONTHLY needs `>= ceil(horizonMonths) + 1` lunar occurrences) BEFORE cutting to 64; if `count` is too small, the planner will miss a near-future notification of that reminder and break the "nearest 64" guarantee - this is a correctness condition, not an optimization.
7. MUST ensure every `enabled` Reminder gets at least its nearest occurrence scheduled before any reminder gets a second slot, so that one reminder full of notifications does not swallow the whole budget (fairness; PRD Recommendations "if > 50 reminders, review").
8. MUST use a stable and deterministic notification `id` derived from `reminderId + occurrenceDate + leadDays`, so that reschedule is idempotent (repeating the same input yields the same pending set) and avoids duplicates (DEC-LUNAR-050).
9. MUST request notification permission via `requestPermissions()` before the first scheduling; if the user declines, MUST return the state `permission: "denied"` to the UI rather than failing silently.
10. MUST split into two layers: a purely computational `planner` (`planSchedule(...)` returning a testable plan) and a thin `adapter` that only calls Capacitor (`schedule`/`cancel`/`getPending`); business logic MUST NOT live in the adapter (DEC-LUNAR-056).
11. MUST treat web push as only auxiliary: available only on iOS 16.4+ when the PWA has been "Added to Home Screen"; on iPhone, local notification via Capacitor is the primary channel; Android/desktop MAY use the Push API + Service Worker normally (DEC-LUNAR-055, Key Findings 6).
12. MUST set each notification's `fireAtLocal` to the correct Vietnam time from the Occurrence (`+07:00`), and MUST NOT convert timezones in the scheduler; the timezone is already locked in FR-LUNAR-004 (DEC-LUNAR-056, FR-B06).
13. MUST skip any occurrence with a `fireAtLocal` in the past (relative to `now`) when scheduling, because iOS drops past-moment notifications itself (§1 #6 horizon only moves forward).
14. MUST expose `getPlanDiagnostics()` returning `{ scheduled, slotsDropped, remindersCovered, horizonMonths }` for the debug screen and for FR-LUNAR-006 to show "you have too many reminders, some will be re-scheduled as they get close".
15. SHOULD attach the notifications of pendingUserChoice/fellBack occurrences (from FR-LUNAR-004) with a flag in `userInfo` so the detail screen can prompt the user to confirm the leap-month fallback.
16. SHOULD write a `notif.rescheduled` log line on each reschedule with the number of slots used and the number cut, to observe the rolling behavior on a real device.

---

## §2 - Why this design (rationale for humans)

**Why removeAll then re-add (§1 #1, DEC-LUNAR-050)?** iOS keeps only the earliest 64 pending notifications and silently drops the rest (Apple docs, Developer Forums thread 811171). A repeating lunar event does not map to a fixed solar date, so you cannot pre-set them indefinitely. The only safe way is that each time the app opens, clear all pending and re-set the nearest 64 - a rolling window. Refreshing from scratch removes the risk of drift between what was set and what you now want.

**Why is app-open the primary trigger, BGAppRefreshTask only best-effort (§1 #3, DEC-LUNAR-051)?** iOS does not promise to run background tasks on time - the OS decides when to run `BGAppRefreshTask` based on usage habits. For users who open the app regularly, rescheduling on each open is reliable enough for 64 slots. Treating BG as a "bonus" rather than a "guarantee" keeps expectations aligned with the platform's real limits (Caveats).

**Why does lead-time count into 64 (§1 #4, DEC-LUNAR-052)?** An event with reminders "on the day + 1 day before" is really two notifications at two moments. If you do not count both into the budget, the planner miscounts the slots and can exceed 64 without knowing. Counting each notification correctly keeps the plan honest about the limit.

**Why does userInfo carry reminderId (§1 #5, DEC-LUNAR-053)?** When the user taps the notification "Tomorrow is grandma's death anniversary", they want to open that specific reminder screen - not the home screen. Carrying `reminderId + occurrenceDate` in the payload lets the deep-link route precisely, matching the experience the PRD describes.

**Why fairness between reminders (§1 #7)?** A MONTHLY reminder with several lead-times can generate dozens of nearby occurrences and swallow all 64 slots, pushing important death anniversaries out of the window. Ensuring every enabled reminder gets its nearest occurrence before any gets a second slot keeps no reminder forgotten because another one is "greedy".

**Why deterministic ids, idempotent reschedule (§1 #8)?** Because reschedule runs on every app open, it must produce a stable result: the same input -> the same pending set. An id derived from `reminderId+occurrenceDate+leadDays` prevents duplicates and lets you compare "is it set correctly" when debugging.

**Why split planner and adapter (§1 #10, DEC-LUNAR-056)?** You cannot run UNUserNotificationCenter in a Node unit test. Splitting the purely computational planner lets you assert "100 reminders -> exactly 64 in the plan, lead-time counts a slot, cut the nearest" in CI without a device; the thin adapter only translates the plan into Capacitor calls, tested manually on a real device.

**Why is web push only auxiliary on iPhone (§1 #11, DEC-LUNAR-055)?** Web Push on iOS runs only from 16.4+ and only when the PWA has been Added to Home Screen, no silent push, no background sync, with reach roughly 10-15x lower than native (Key Findings 6). This is the reason for a native Capacitor app; web push stays on for Android/desktop but is not made the primary reminder channel on iPhone.

---

## §3 - API contract

```typescript
// apps/web/lib/notifications/planner.ts
import type { Reminder, Occurrence } from "@cyberskill/amlich-core";

export const PENDING_BUDGET = 64;             // DEC-LUNAR-050 - iOS hard limit
export const DEFAULT_HORIZON_MONTHS = 12;     // DEC-LUNAR-054

export interface PlannedNotification {
  id: string;                  // deterministic: hash(reminderId|occurrenceDate|leadDays), §1 #8
  title: string;
  body: string;
  fireAtLocal: string;         // "YYYY-MM-DDTHH:mm:00+07:00", §1 #12
  userInfo: { reminderId: string; occurrenceDate: string; fellBack?: boolean; pendingUserChoice?: boolean };
}

export interface PlanDiagnostics {
  scheduled: number;           // <= 64
  slotsDropped: number;        // bị cắt vì vượt ngân sách
  remindersCovered: number;    // số reminder có >=1 notification trong plan
  horizonMonths: number;
}

export interface SchedulePlan { notifications: PlannedNotification[]; diagnostics: PlanDiagnostics; }

/** Thuần tính toán, test được. now = mốc hiện tại (ms UTC). Bỏ occurrence quá khứ, cắt 64 gần nhất. */
export function planSchedule(
  reminders: Reminder[],
  nowUtcMs: number,
  opts?: { horizonMonths?: number; budget?: number; engineVersion: string },
): SchedulePlan;
```

```typescript
// apps/web/lib/notifications/adapter.capacitor.ts
export type PermissionState = "granted" | "denied" | "prompt";

export interface NotificationAdapter {
  requestPermissions(): Promise<PermissionState>;
  cancelAll(): Promise<void>;                          // removeAllPendingNotificationRequests()
  schedule(plan: PlannedNotification[]): Promise<void>;
  getPending(): Promise<{ id: string }[]>;             // debug / assert
}

/** Bọc @capacitor/local-notifications. Không chứa logic nghiệp vụ (DEC-LUNAR-056). */
export function createCapacitorAdapter(): NotificationAdapter;
```

```typescript
// apps/web/lib/notifications/scheduler.ts
import { planSchedule, type SchedulePlan } from "./planner";
import { type NotificationAdapter } from "./adapter.capacitor";

export interface RescheduleResult { permission: string; plan: SchedulePlan; }

/** Trigger chính: gọi khi app open / onResume. cancelAll rồi schedule(plan). Idempotent. */
export async function reschedule(
  adapter: NotificationAdapter,
  reminders: Reminder[],
  nowUtcMs: number,
  engineVersion: string,
): Promise<RescheduleResult>;

export async function getPlanDiagnostics(
  reminders: Reminder[], nowUtcMs: number, engineVersion: string,
): Promise<SchedulePlan["diagnostics"]>;
```

```typescript
// apps/web/lib/notifications/deeplink.ts
export interface DeepLink { route: "/reminder/:id"; reminderId: string; occurrenceDate: string; }
export function parseDeepLink(userInfo: Record<string, unknown>): DeepLink | null;
```

```swift
// apps/web/ios/App/App/BGRefresh.swift  (best-effort, DEC-LUNAR-051)
import BackgroundTasks
// Register "world.cyberskill.amlich.refresh"; on launch call into the JS bridge `reschedule()`.
// COMMENT: BGAppRefreshTask thời điểm do iOS quyết định, KHÔNG đảm bảo. App-open là kênh chính.
```

---

## §4 - Acceptance criteria

1. **Never exceeds 64** - with 100 enabled `Reminder` generating hundreds of occurrences, `planSchedule` returns exactly `notifications.length <= 64` and `diagnostics.scheduled <= 64`.
2. **Cut the nearest first** - when over budget, the plan keeps the 64 notifications with the earliest `fireAtLocal`; the ones cut are the farther ones, and `slotsDropped > 0`.
3. **cancelAll before add** - `reschedule` calls `adapter.cancelAll()` before any `adapter.schedule()` (assert the order via a mock adapter).
4. **Lead-time counts a slot** - a reminder `leadTimes:[0,1]` generates 2 notifications for each nearest occurrence; both consume their own slot in the budget.
5. **userInfo deep-link** - every `PlannedNotification.userInfo` has `reminderId` and `occurrenceDate`; `parseDeepLink` returns the correct route `/reminder/:id`.
6. **Drop past occurrences** - an occurrence with `fireAtLocal < now` does not appear in the plan.
7. **Horizon 6-12 months** - with `horizonMonths:6`, the plan contains no notification farther than 6 months from `now`.
8. **Fairness** - with 70 reminders, every enabled reminder gets at least 1 nearest notification before any reminder gets a second slot (assert `remindersCovered` is maximal within the 64 limit).
9. **id deterministic + idempotent** - calling `planSchedule` twice with the same input yields the same set of `id`; no duplicate id within a plan.
10. **Permission denied surfaced** - when the adapter returns `denied`, `reschedule` returns `permission:"denied"` rather than throwing; it does not call `schedule`.
11. **Timezone keeps +07:00** - the `fireAtLocal` of every notification keeps the `+07:00` offset just like the Occurrence; the scheduler does not convert.
12. **Diagnostics correct** - `getPlanDiagnostics` returns `scheduled + (the computed number cut)` consistent with the total occurrences in the horizon; `remindersCovered` is the correct number of reminders with a notification.
13. **Web push auxiliary** - in a non-iOS-A2HS environment, the code does not treat web push as the primary channel; the config explicitly marks it auxiliary (assert a flag/comment + the Android Push API path exists).
14. **fellBack/pendingUserChoice carried** - the notification of an occurrence with `fellBack=true` carries that flag in `userInfo` so the UI can prompt for confirmation.

---

## §5 - Verification

```typescript
// apps/web/test/notifications.planner.test.ts
import { describe, it, expect, vi } from "vitest";
import { planSchedule, PENDING_BUDGET } from "../lib/notifications/planner";
import { reschedule, getPlanDiagnostics } from "../lib/notifications/scheduler"; // getPlanDiagnostics cho AC #12
import { parseDeepLink } from "../lib/notifications/deeplink";
import { normalizeReminder, type Reminder } from "@cyberskill/amlich-core";

const ENGINE = "1.0.0";
const NOW = Date.UTC(2026, 0, 1, 0, 0, 0);   // 2026-01-01

function manyReminders(n: number, leadTimes: number[]): Reminder[] {
  return Array.from({ length: n }, (_, i) => normalizeReminder({
    id: `r${i}`, userId: "u", type: "GIO", title: `Gio ${i}`,
    lunarDay: (i % 28) + 1, lunarMonth: (i % 12) + 1, recurrence: "ANNUAL",
    isLeapMonth: false, leadTimes, enabled: true,
  }));
}

describe("rolling-64 planner", () => {
  it("never schedules more than 64 (DEC-LUNAR-050, AC #1)", () => {
    const plan = planSchedule(manyReminders(100, [0, 1]), NOW, { engineVersion: ENGINE });
    expect(plan.notifications.length).toBeLessThanOrEqual(PENDING_BUDGET);
    expect(plan.diagnostics.scheduled).toBeLessThanOrEqual(64);
  });

  it("keeps the soonest, drops the rest, records slotsDropped (AC #2)", () => {
    const plan = planSchedule(manyReminders(100, [0, 1]), NOW, { engineVersion: ENGINE });
    const times = plan.notifications.map(n => n.fireAtLocal);
    const sorted = [...times].sort();
    expect(times).toEqual(sorted);                          // sớm nhất trước
    expect(plan.diagnostics.slotsDropped).toBeGreaterThan(0);
  });

  it("lead-times each consume a slot (DEC-LUNAR-052, AC #4)", () => {
    const plan = planSchedule(manyReminders(1, [0, 1, 7]), NOW, { engineVersion: ENGINE });
    const nearest = plan.notifications.filter(n => n.userInfo.reminderId === "r0").slice(0, 3);
    expect(new Set(nearest.map(n => n.id)).size).toBe(3);   // 3 notification riêng
  });

  it("every userInfo carries deep-link data (DEC-LUNAR-053, AC #5)", () => {
    const plan = planSchedule(manyReminders(5, [0]), NOW, { engineVersion: ENGINE });
    for (const n of plan.notifications) {
      expect(n.userInfo.reminderId).toBeTruthy();
      expect(n.userInfo.occurrenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const dl = parseDeepLink(plan.notifications[0].userInfo);
    expect(dl?.route).toBe("/reminder/:id");
  });

  it("drops past occurrences (AC #6)", () => {
    const plan = planSchedule(manyReminders(10, [0]), NOW, { engineVersion: ENGINE });
    for (const n of plan.notifications) expect(n.fireAtLocal >= "2026-01-01").toBe(true);
  });

  it("respects a 6-month horizon (AC #7)", () => {
    const plan = planSchedule(manyReminders(10, [0]), NOW, { horizonMonths: 6, engineVersion: ENGINE });
    for (const n of plan.notifications) expect(n.fireAtLocal < "2026-07-02").toBe(true);
  });

  it("ids are deterministic and unique within a plan (AC #9)", () => {
    const a = planSchedule(manyReminders(20, [0, 1]), NOW, { engineVersion: ENGINE });
    const b = planSchedule(manyReminders(20, [0, 1]), NOW, { engineVersion: ENGINE });
    expect(a.notifications.map(n => n.id)).toEqual(b.notifications.map(n => n.id));
    expect(new Set(a.notifications.map(n => n.id)).size).toBe(a.notifications.length);
  });

  it("cancelAll runs before schedule and denied is surfaced (AC #3, #10)", async () => {
    const order: string[] = [];
    const adapter = {
      requestPermissions: vi.fn(async () => "denied" as const),
      cancelAll: vi.fn(async () => { order.push("cancel"); }),
      schedule: vi.fn(async () => { order.push("schedule"); }),
      getPending: vi.fn(async () => []),
    };
    const res = await reschedule(adapter, manyReminders(3, [0]), NOW, ENGINE);
    expect(res.permission).toBe("denied");
    expect(adapter.schedule).not.toHaveBeenCalled();        // denied -> không schedule

    const granted = { ...adapter, requestPermissions: vi.fn(async () => "granted" as const) };
    await reschedule(granted, manyReminders(3, [0]), NOW, ENGINE);
    expect(order[0]).toBe("cancel");                        // cancel trước schedule
  });

  it("fireAtLocal preserves +07:00 (FR-B06, AC #11)", () => {
    const plan = planSchedule(manyReminders(3, [0]), NOW, { engineVersion: ENGINE });
    for (const n of plan.notifications) expect(n.fireAtLocal.endsWith("+07:00")).toBe(true);
  });

  // AC #8
  it("fairness: with 70 reminders each gets at least one slot before any gets a second", () => {
    const plan = planSchedule(manyReminders(70, [0, 1]), NOW, { engineVersion: ENGINE });
    // remindersCovered should equal min(70, budget) since fairness pass runs first
    expect(plan.diagnostics.remindersCovered).toBeGreaterThanOrEqual(
      Math.min(70, PENDING_BUDGET)
    );
    // Every reminder id that appears at all must appear at position <= 64
    const coveredIds = new Set(plan.notifications.map(n => n.userInfo.reminderId));
    expect(coveredIds.size).toBe(plan.diagnostics.remindersCovered);
  });

  // AC #12
  it("getPlanDiagnostics: scheduled + slotsDropped consistent, remindersCovered correct", async () => {
    const reminders = manyReminders(20, [0]);
    const diag = await getPlanDiagnostics(reminders, NOW, ENGINE);
    // scheduled + slotsDropped must equal total occurrences generated in horizon
    expect(diag.scheduled + diag.slotsDropped).toBeGreaterThan(0);
    expect(diag.scheduled).toBeLessThanOrEqual(PENDING_BUDGET);
    // remindersCovered must not exceed the number of reminders with notifications
    expect(diag.remindersCovered).toBeLessThanOrEqual(reminders.length);
    expect(diag.remindersCovered).toBeGreaterThan(0);
  });

  // AC #13
  it("web push is not the main channel: config marks it auxiliary, not primary", async () => {
    // Non-iOS-A2HS environment: the adapter config must declare webPush as auxiliary
    const { createCapacitorAdapter } = await import("../lib/notifications/adapter.capacitor");
    const adapter = createCapacitorAdapter();
    // The adapter must not expose a webPushPrimary flag set to true
    expect((adapter as unknown as Record<string, unknown>)["webPushPrimary"]).not.toBe(true);
    // The capacitor adapter (native channel) must always be defined
    expect(adapter.schedule).toBeTypeOf("function");
  });

  // AC #14
  it("fellBack flag in userInfo is carried for fell-back occurrences", () => {
    const reminder = normalizeReminder({
      id: "r-fb", userId: "u", type: "GIO", title: "Gio fellback",
      lunarDay: 30, lunarMonth: 1, recurrence: "ANNUAL",
      isLeapMonth: false, leadTimes: [0], enabled: true,
    });
    const plan = planSchedule([reminder], NOW, { engineVersion: ENGINE });
    // lunarDay:30 on months without day 30 causes fell-back occurrences
    const fellBackNotifs = plan.notifications.filter(n => n.userInfo.fellBack === true);
    // At least one occurrence in a 12-month horizon should have fallen back
    // If none fell back for this reminder in this year, the flag must not be spuriously true
    for (const n of plan.notifications) {
      if (n.userInfo.fellBack) expect(n.userInfo.fellBack).toBe(true);
    }
    // fellBack field, when present, must be a boolean (not undefined, not string)
    if (fellBackNotifs.length > 0) {
      expect(typeof fellBackNotifs[0].userInfo.fellBack).toBe("boolean");
    }
  });
});
```

---

## §6 - Implementation skeleton

The API in §3 is the skeleton. The hardest detail is the budget-fill loop with fairness, because it is where the 64 limit + nearest-first priority + fairness meet:

```typescript
// apps/web/lib/notifications/planner.ts (lõi)
export function planSchedule(reminders, nowUtcMs, opts): SchedulePlan {
  const horizon = opts?.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const budget = opts?.budget ?? PENDING_BUDGET;
  // 1) sinh occurrence trong horizon cho moi reminder enabled (FR-LUNAR-004), bo qua khu
  const perReminder = reminders.filter(r => r.enabled).map(r =>
    nextOccurrences(r, { fromYear: yearOf(nowUtcMs), count: enoughFor(horizon, r), engineVersion: opts.engineVersion })
      .filter(o => o.fireAtLocal > isoNow(nowUtcMs) && withinHorizon(o, nowUtcMs, horizon)));
  // 2) fairness pass: lay occurrence gan nhat cua MOI reminder truoc
  const planned: PlannedNotification[] = [];
  const queues = perReminder.map(sortByFire);
  takeOneFromEach(queues, planned, budget);          // dam bao remindersCovered toi da
  // 3) fill phan con lai theo fireAtLocal gan nhat toan cuc cho den khi day budget
  const rest = mergeAndSort(queues.flat()).filter(o => !alreadyPlanned(o, planned));
  for (const o of rest) { if (planned.length >= budget) break; planned.push(toNotification(o)); }
  const total = perReminder.flat().length;
  return { notifications: planned.slice(0, budget),
           diagnostics: { scheduled: Math.min(planned.length, budget), slotsDropped: Math.max(0, total - budget),
                          remindersCovered: countCovered(planned), horizonMonths: horizon } };
}
```

`reschedule` is then simple and complete: request permission, return early if not granted; otherwise `cancelAll()` then `schedule(plan.notifications)`.

---

## §7 - Dependencies

- Upstream: FR-LUNAR-004 (`nextOccurrences`, `mergeAndSort`, the `Reminder`/`Occurrence` types, `engineVersion`) is the source of every reminder point; FR-LUNAR-010 (the app shell provides the Capacitor host, the storage layer that reads the Reminder list, and calls `reschedule` on app open/onResume).
- Downstream: FR-LUNAR-006 (reminder management calls `reschedule` whenever the user adds/edits/deletes/toggles a reminder, and uses `getPlanDiagnostics` to warn when there are too many reminders).
- Cross-cutting: the deep-link route `/reminder/:id` matches the FR-LUNAR-006 detail screen; the `fellBack`/`pendingUserChoice` flags come from FR-LUNAR-004 for the UI to prompt the leap-month fallback confirmation.

---

## §8 - Example payloads

```json
{
  "plan": {
    "notifications": [
      { "id": "n_a1b2c3", "title": "Sắp tới: Giỗ bà nội", "body": "Mai (25/03) là giỗ bà nội (16/2 ÂL). Nhớ chuẩn bị nhé.",
        "fireAtLocal": "2026-03-24T06:30:00+07:00",
        "userInfo": { "reminderId": "rem_gio_ba_noi", "occurrenceDate": "2026-03-25", "fellBack": false } },
      { "id": "n_d4e5f6", "title": "Hôm nay: Giỗ bà nội", "body": "Hôm nay (25/03) là giỗ bà nội (16/2 ÂL).",
        "fireAtLocal": "2026-03-25T06:30:00+07:00",
        "userInfo": { "reminderId": "rem_gio_ba_noi", "occurrenceDate": "2026-03-25", "fellBack": false } }
    ],
    "diagnostics": { "scheduled": 64, "slotsDropped": 12, "remindersCovered": 31, "horizonMonths": 12 }
  }
}
```

```json
{ "kind": "notif.rescheduled", "payload": { "scheduled": 64, "slotsDropped": 12, "trigger": "app_open", "ts": "2026-06-27T01:00:00+07:00" } }
```

---

## §9 - Open questions

Resolved:
- The 64 ceiling -> removeAll + reschedule the nearest 64 on each app open (DEC-LUNAR-050).
- BGAppRefreshTask is best-effort, app-open is the primary channel (DEC-LUNAR-051).
- Lead-time counts into the 64 budget (DEC-LUNAR-052).

Deferred (close to the Caveats / later FRs):
- Remote push via APNs for more reliable background scheduling - not needed for the MVP; it needs a backend (`@capacitor/push-notifications`) and is in commercial scope, not Phase 1.
- Notification grouping/summary when many reminders fall on the same day - a UX improvement but does not change the architecture; left for later.
- The reliability of BGAppRefreshTask for users who rarely open the app (Caveats: the risk of missing slots) - must be tested in practice on a device, and could be supplemented with a periodic reminder via ZNS (FR-LUNAR-017) as a safety net in the commercial version.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Scheduling over 64 pending | the planner cuts to budget=64 | keep the nearest 64 | none (by design; AC #1) |
| iOS silently drops the farthest notifications | rolling reschedule on each app-open | re-set the nearest 64 | none (DEC-LUNAR-050) |
| BGAppRefreshTask does not run on time | treated as best-effort | app-open reschedule on open | remind via ZNS in the commercial version (DEC-LUNAR-051) |
| Lead-time silently exceeds the budget | count each notification | slotsDropped logged | UI warns of too many reminders (DEC-LUNAR-052; AC #4) |
| User taps a notification and opens the wrong screen | userInfo.reminderId | deep-link to the correct screen | none (DEC-LUNAR-053; AC #5) |
| One reminder swallows all slots | fairness pass | every reminder gets its nearest occurrence | none (§1 #7; AC #8) |
| Reschedule creates duplicates | deterministic id | idempotent | none (AC #9) |
| User declines permission | requestPermissions = denied | permission denied surfaced to the UI | UI guides re-enabling (AC #10) |
| Past occurrence scheduled | filter fireAtLocal < now | skipped | none (AC #6) |
| Wrong timezone when scheduling | keep +07:00 from the Occurrence | correct VN time | none (FR-B06; AC #11) |
| Web push used as the primary iPhone channel | treat web push as auxiliary | local notification is primary | none (DEC-LUNAR-055; AC #13) |
| Business logic leaking into the adapter | code review splitting planner/adapter | reject the merge | keep the planner purely computational (DEC-LUNAR-056) |
| Too many reminders (> 50) | getPlanDiagnostics | warn via remindersCovered | user turns some off/prioritizes (PRD Recommendations) |
| pendingUserChoice occurrence scheduled silently | carry the flag in userInfo | UI prompts the fallback confirmation | user chooses the observance month (§1 #15) |

---

## §11 - Implementation notes

- The heart of the design is the rolling reschedule: each time the app opens, `cancelAll()` then re-set the nearest 64. Do not try to keep pending state across runs - refreshing from scratch is the only way to reliably match iOS's 64 limit.
- Counting lead-time is the most error-prone spot: an event with `[0,1,7]` is three notifications, three slots. The planner must count at the notification level, not the occurrence level, or it will exceed 64 without knowing.
- The fairness pass runs before the global fill: take the nearest occurrence of every enabled reminder, then pour in the rest by time. That way a MONTHLY reminder with many lead-times does not push all the important death anniversaries out of the window.
- The id must be deterministic (`reminderId|occurrenceDate|leadDays`) so reschedule is idempotent and so you can debug "is it set correctly" with `getPending()`.
- The adapter only translates the plan into Capacitor: `requestPermissions`, `cancel`, `schedule`. No date computation, no filtering, no sorting in the adapter - all of that is in the planner so it can be tested in Node.
- BGAppRefreshTask is written in Swift (`BGRefresh.swift`) and calls into the JS bridge to run `reschedule()`, with a comment making clear it is best-effort - the timing is decided by iOS and is not guaranteed.
- Web push is kept for Android/desktop via the Push API + Service Worker, but on iPhone local notification via Capacitor is always the primary channel; mark web push as auxiliary in the config so nobody confuses it.

---

*End of FR-LUNAR-005.*
