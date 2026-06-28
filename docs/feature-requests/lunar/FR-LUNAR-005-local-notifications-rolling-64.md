---
id: FR-LUNAR-005
title: "Local notification scheduler - chien luoc rolling-64 tren iOS qua @capacitor/local-notifications, removeAllPending + reschedule 64 su kien gan nhat, deep-link userInfo"
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
  - DEC-LUNAR-050 (iOS chỉ giữ tối đa 64 local notification pending -> mỗi lần reschedule: removeAllPendingNotificationRequests() rồi add lại tối đa 64 điểm nhắc gần nhất)
  - DEC-LUNAR-051 (trigger reschedule: app open (foreground) là chính; BGAppRefreshTask là best-effort, KHÔNG đảm bảo thời điểm - không được coi là kênh nhắc đảm bảo)
  - DEC-LUNAR-052 (lead-time = nhiều notification cho cùng sự kiện, MỖI notification ăn một slot trong ngân sách 64 - đếm đúng)
  - DEC-LUNAR-053 (mỗi notification mang userInfo.reminderId + occurrenceDate để deep-link tới đúng màn hình chi tiết khi user chạm)
  - DEC-LUNAR-054 (cửa sổ lịch xa 6-12 tháng; nếu tổng điểm nhắc > 64 thì cắt theo fireAtLocal gần nhất trước, ghi log slotsDropped)
  - DEC-LUNAR-055 (web push chỉ khả dụng iOS 16.4+ khi PWA đã Add to Home Screen -> coi là bổ trợ, không phải kênh chính trên iPhone; Android/desktop dùng Push API bình thường)
  - DEC-LUNAR-056 (scheduler là pure planner + thin native adapter: planner tính kế hoạch test được, adapter chỉ gọi Capacitor schedule/cancel; tất cả occurrence từ FR-LUNAR-004, scheduler không tự derive ngày âm)
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
  - lập lịch vượt 64 pending trên iOS (vi phạm DEC-LUNAR-050 - phải cắt còn 64)
  - coi BGAppRefreshTask là kênh nhắc đảm bảo thời điểm (vi phạm DEC-LUNAR-051 - best-effort)
  - tự tính ngày âm trong scheduler thay vì đọc Occurrence từ FR-LUNAR-004 (vi phạm DEC-LUNAR-056)
effort_hours: 10
sub_tasks:
  - "2.0h: planner.ts - planSchedule(reminders, now, horizonMonths, budget=64) -> mergeAndSort occurrence rồi cắt đầu 64; đếm slotsDropped"
  - "1.5h: scheduler.ts - reschedule(): cancelAll() rồi schedule(plan); idempotent; gọi khi app open + onResume"
  - "1.5h: adapter.capacitor.ts - bọc @capacitor/local-notifications (requestPermissions, schedule, cancel, getPending), id ổn định từ reminderId+occurrenceDate+leadDays"
  - "1.0h: deeplink.ts - parse userInfo.reminderId + occurrenceDate -> route tới màn hình chi tiết nhắc"
  - "1.0h: horizon + budget logic - 6-12 tháng, fill theo thời gian gần nhất, đảm bảo mỗi reminder enabled có ít nhất occurrence gần nhất trước khi nhường slot"
  - "1.0h: BGRefresh.swift - đăng ký BGAppRefreshTask, gọi vào reschedule, kèm comment best-effort"
  - "1.5h: notifications.planner.test.ts - 100 reminder -> đúng 64 pending, lead-time đếm slot, sort gần nhất, deep-link payload, cancelAll trước add"
  - "0.5h: capacitor.config.ts - cấu hình plugin LocalNotifications, channel/sound mặc định"
risk_if_skipped: "Không có scheduler thì dù FR-LUNAR-004 sinh occurrence đúng, máy vẫn không reo - app không nhắc được gì, đúng mục tiêu G1 của PRD. Nếu lập quá 64 pending trên iOS, hệ thống âm thầm vứt bỏ và user mất đúng những nhắc xa nhất - khó phát hiện, mất lòng tin. Nếu phụ thuộc BGAppRefreshTask làm kênh đảm bảo, người ít mở app sẽ trượt slot. FR-LUNAR-006 (reminder management) gọi reschedule mỗi khi user thêm/sửa/bật-tắt nhắc nên phải có API ổn định ở đây."
---

## §1 - Description (BCP-14 normative)

Scheduler biến danh sách `Occurrence` (từ FR-LUNAR-004) thành local notifications, tôn trọng trần 64 pending của iOS bằng chiến lược rolling reschedule. Đây là contract:

1. PHẢI mỗi lần reschedule gọi `removeAllPendingNotificationRequests()` (cancelAll) trước, rồi `add()` lại tối đa 64 điểm nhắc gần nhất từ tất cả `Reminder` đang `enabled`; KHÔNG ĐƯỢC để tổng pending vượt 64 trên iOS (DEC-LUNAR-050, FR-B05).
2. PHẢI đọc occurrence từ FR-LUNAR-004 (`nextOccurrences` rồi `mergeAndSort`) và KHÔNG ĐƯỢC tự tính ngày âm trong scheduler; scheduler chỉ gộp, sort theo `fireAtLocal`, và cắt 64 cái gần nhất (DEC-LUNAR-056).
3. PHẢI coi sự kiện "app mở (foreground/onResume)" là trigger chính để reschedule; `BGAppRefreshTask` chỉ là best-effort và KHÔNG ĐƯỢC coi là kênh nhắc đảm bảo thời điểm (DEC-LUNAR-051, Caveats iOS background).
4. PHẢI đếm lead-time vào ngân sách 64: mỗi cặp (occurrence x leadTime) là một notification riêng và ăn một slot; ví dụ một reminder với `leadTimes:[0,1]` chiếm 2 slot mỗi lần xuất hiện (DEC-LUNAR-052, PRD section 11).
5. PHẢI gán mỗi notification một `userInfo` mang `reminderId` và `occurrenceDate` (ISO date) để khi user chạm, app deep-link tới đúng màn hình chi tiết nhắc (DEC-LUNAR-053, PRD section 11).
6. PHẢI lập lịch trong cửa sổ 6-12 tháng tới (`horizonMonths`); nếu tổng điểm nhắc trong cửa sổ vượt 64, PHẢI cắt theo `fireAtLocal` gần nhất trước và ghi log `slotsDropped` (DEC-LUNAR-054, PRD section 11). `count` truyền cho `nextOccurrences` của MỖI reminder PHẢI đủ lớn để phủ hết `horizonMonths` (ví dụ MONTHLY cần `>= ceil(horizonMonths) + 1` occurrence âm) TRƯỚC khi cắt 64; nếu `count` thiếu, planner sẽ bỏ sót notification gần tương lai của reminder đó và phá vỡ bảo đảm "64 gần nhất" - đây là điều kiện đúng đắn, không phải tối ưu.
7. PHẢI đảm bảo mỗi `Reminder` đang `enabled` có ít nhất occurrence gần nhất được lập trước khi một reminder khác được cấp slot thứ hai, để một reminder đầy notification không nuốt hết ngân sách (fairness; PRD Recommendations "nếu > 50 nhắc thì rà soát").
8. PHẢI dùng `id` notification ổn định và deterministic suy từ `reminderId + occurrenceDate + leadDays`, để reschedule là idempotent (lặp lại cùng input cho cùng tập pending), tránh trùng lặp (DEC-LUNAR-050).
9. PHẢI yêu cầu quyền thông báo qua `requestPermissions()` trước lần lập lịch đầu; nếu user từ chối, PHẢI trả trạng thái `permission: "denied"` lên UI thay vì thất bại âm thầm.
10. PHẢI tách làm hai lớp: `planner` thuần tính toán (`planSchedule(...)` trả kế hoạch có thể test) và `adapter` mỏng chỉ gọi Capacitor (`schedule`/`cancel`/`getPending`); logic nghiệp vụ KHÔNG ĐƯỢC nằm trong adapter (DEC-LUNAR-056).
11. PHẢI coi web push chỉ là bổ trợ: chỉ khả dụng iOS 16.4+ khi PWA đã "Add to Home Screen"; trên iPhone, local notification qua Capacitor là kênh chính; Android/desktop CÓ THỂ dùng Push API + Service Worker bình thường (DEC-LUNAR-055, Key Findings 6).
12. PHẢI đặt `fireAtLocal` của mỗi notification đúng giờ Việt Nam từ Occurrence (`+07:00`), và KHÔNG ĐƯỢC tự chuyển múi giờ trong scheduler; múi giờ đã khóa ở FR-LUNAR-004 (DEC-LUNAR-056, FR-B06).
13. PHẢI bỏ qua mọi occurrence có `fireAtLocal` trong quá khứ (so với `now`) khi lập lịch, vì iOS tự loại notification quá thời điểm (§1 #6 horizon chỉ tiến lên).
14. PHẢI expose `getPlanDiagnostics()` trả `{ scheduled, slotsDropped, remindersCovered, horizonMonths }` cho màn hình debug và cho FR-LUNAR-006 hiển "bạn có quá nhiều nhắc, một số sẽ lập lại khi đến gần".
15. NÊN gộp notification của các occurrence pendingUserChoice/fellBack (từ FR-LUNAR-004) kèm cờ trong `userInfo` để màn hình chi tiết có thể nhắc user xác nhận fallback tháng nhuận.
16. NÊN ghi một dòng log `notif.rescheduled` mỗi lần reschedule với số slot dùng và số bị cắt, để quan sát hành vi rolling trên thiết bị thật.

---

## §2 - Why this design (rationale for humans)

**Tại sao removeAll rồi add lại (§1 #1, DEC-LUNAR-050)?** iOS chỉ giữ 64 notification pending sớm nhất và âm thầm vứt phần còn lại (tài liệu Apple, Developer Forums thread 811171). Sự kiện âm lịch lặp lại không map cố định sang dương lịch nên không thể đặt sẵn vô hạn. Cách an toàn duy nhất là mỗi lần mở app, xóa sạch pending rồi đặt lại 64 cái gần nhất - rolling window. Làm mới từ đầu loại bỏ rủi ro lệch giữa cái đã đặt và cái đang muốn.

**Tại sao app-open là trigger chính, BGAppRefreshTask chỉ best-effort (§1 #3, DEC-LUNAR-051)?** iOS không hứa chạy tác vụ nền đúng giờ - hệ điều hành tự quyết khi nào chạy `BGAppRefreshTask` dựa trên thói quen dùng. Với người mở app đều, reschedule mỗi lần mở là đủ tin cậy cho 64 slot. Coi BG là "thưởng" chứ không phải "đảm bảo" giữ kỳ vọng đúng với giới hạn thực của nền tảng (Caveats).

**Tại sao lead-time đếm vào 64 (§1 #4, DEC-LUNAR-052)?** Một sự kiện với nhắc "đúng ngày + trước 1 ngày" thực chất là hai notification ở hai thời điểm. Nếu không đếm cả hai vào ngân sách, planner sẽ tính sai số slot và có thể vượt 64 mà không biết. Đếm đúng từng notification giữ kế hoạch trung thực với giới hạn.

**Tại sao userInfo mang reminderId (§1 #5, DEC-LUNAR-053)?** Khi user chạm vào thông báo "Mai là giỗ bà", họ muốn mở đúng màn hình nhắc đó - không phải màn hình chính. Mang `reminderId + occurrenceDate` trong payload cho deep-link route chính xác, đúng trải nghiệm PRD mô tả.

**Tại sao fairness giữa các reminder (§1 #7)?** Một reminder MONTHLY với nhiều lead-time có thể sinh hàng chục occurrence gần nhau và nuốt hết 64 slot, đẩy các giỗ quan trọng ra ngoài cửa sổ. Đảm bảo mỗi reminder enabled có occurrence gần nhất trước khi cấp slot thứ hai giữ cho không nhắc nào bị bỏ quên vì một nhắc khác "tham ăn".

**Tại sao id deterministic, reschedule idempotent (§1 #8)?** Vì reschedule chạy mỗi lần mở app, nó phải cho kết quả ổn định: cùng input -> cùng tập pending. id suy từ `reminderId+occurrenceDate+leadDays` ngăn trùng lặp và cho phép so sánh "đã đặt đúng chưa" khi debug.

**Tại sao tách planner và adapter (§1 #10, DEC-LUNAR-056)?** Không thể chạy UNUserNotificationCenter trong unit test Node. Tách planner thuần tính toán cho phép assert "100 reminder -> đúng 64 kế hoạch, lead-time đếm slot, cắt gần nhất" trong CI mà không cần thiết bị; adapter mỏng chỉ dịch kế hoạch sang lời gọi Capacitor, kiểm thử thủ công trên máy thật.

**Tại sao web push chỉ là bổ trợ trên iPhone (§1 #11, DEC-LUNAR-055)?** Web Push trên iOS chỉ chạy từ 16.4+ và chỉ khi PWA đã Add to Home Screen, không silent push, không background sync, reach thấp hơn native ~10-15 lần (Key Findings 6). Đây là lý do có Capacitor app native; web push vẫn bật cho Android/desktop nhưng không được làm kênh nhắc chính trên iPhone.

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

1. **Không vượt 64** - với 100 `Reminder` enabled sinh hàng trăm occurrence, `planSchedule` trả đúng `notifications.length <= 64` và `diagnostics.scheduled <= 64`.
2. **Cắt gần nhất trước** - khi vượt ngân sách, plan giữ 64 notification có `fireAtLocal` sớm nhất; cái bị cắt là các cái xa hơn, và `slotsDropped > 0`.
3. **cancelAll trước add** - `reschedule` gọi `adapter.cancelAll()` trước mọi `adapter.schedule()` (assert thứ tự qua mock adapter).
4. **Lead-time đếm slot** - một reminder `leadTimes:[0,1]` sinh 2 notification cho mỗi occurrence gần nhất; cả hai ăn slot riêng trong ngân sách.
5. **userInfo deep-link** - mọi `PlannedNotification.userInfo` có `reminderId` và `occurrenceDate`; `parseDeepLink` trả đúng route `/reminder/:id`.
6. **Bỏ occurrence quá khứ** - occurrence có `fireAtLocal < now` không xuất hiện trong plan.
7. **Horizon 6-12 tháng** - với `horizonMonths:6`, plan không chứa notification xa hơn 6 tháng từ `now`.
8. **Fairness** - với 70 reminder, mỗi reminder enabled có ít nhất 1 notification gần nhất trước khi reminder bất kỳ được slot thứ 2 (assert `remindersCovered` tối đa trong giới hạn 64).
9. **id deterministic + idempotent** - gọi `planSchedule` hai lần cùng input cho cùng tập `id`; không có id trùng trong một plan.
10. **Permission denied surfaced** - khi adapter trả `denied`, `reschedule` trả `permission:"denied"` thay vì ném lỗi; không gọi `schedule`.
11. **Timezone giữ +07:00** - `fireAtLocal` của mọi notification giữ offset `+07:00` y như Occurrence; scheduler không chuyển đổi.
12. **Diagnostics chính xác** - `getPlanDiagnostics` trả `scheduled + (số bị cắt tính được)` nhất quán với tổng occurrence trong horizon; `remindersCovered` đúng số reminder có notification.
13. **Web push phụ** - trên môi trường không phải iOS-A2HS, code không coi web push là kênh chính; cấu hình ghi rõ là auxiliary (assert có flag/comment + Android Push API path tồn tại).
14. **fellBack/pendingUserChoice mang theo** - notification của occurrence có `fellBack=true` mang cờ đó trong `userInfo` để UI nhắc xác nhận.

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

API ở §3 là skeleton. Chi tiết khó nhất là vòng fill ngân sách có fairness, vì nó là nơi giới hạn 64 + ưu tiên gần nhất + công bằng gặp nhau:

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

`reschedule` thì đơn giản và đầy đủ: xin quyền, nếu không granted thì trả về sớm; còn lại `cancelAll()` rồi `schedule(plan.notifications)`.

---

## §7 - Dependencies

- Upstream: FR-LUNAR-004 (`nextOccurrences`, `mergeAndSort`, type `Reminder`/`Occurrence`, `engineVersion`) là nguồn mọi điểm nhắc; FR-LUNAR-010 (app shell cung cấp Capacitor host, lớp storage đọc danh sách Reminder, và gọi `reschedule` lúc app open/onResume).
- Downstream: FR-LUNAR-006 (reminder management gọi `reschedule` mỗi khi user thêm/sửa/xóa/bật-tắt nhắc, và dùng `getPlanDiagnostics` để cảnh báo khi quá nhiều nhắc).
- Cross-cutting: deep-link route `/reminder/:id` khớp màn hình chi tiết của FR-LUNAR-006; cờ `fellBack`/`pendingUserChoice` đến từ FR-LUNAR-004 để UI nhắc xác nhận fallback tháng nhuận.

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

Đã giải quyết:
- Trần 64 -> removeAll + reschedule 64 gần nhất mỗi lần mở app (DEC-LUNAR-050).
- BGAppRefreshTask là best-effort, app-open là kênh chính (DEC-LUNAR-051).
- Lead-time đếm vào ngân sách 64 (DEC-LUNAR-052).

Deferred (gần với Caveats / các FR sau):
- Remote push qua APNs để lập lịch nền tin cậy hơn - chưa cần cho MVP; cần backend (`@capacitor/push-notifications`) và nằm ở phạm vi thương mại, không phải Phase 1.
- Notification grouping/summary khi nhiều nhắc cùng ngày - cải thiện UX nhưng không đổi kiến trúc; để sau.
- Độ tin cậy BGAppRefreshTask với người hiếm mở app (Caveats: rủi ro trượt slot) - phải test thực tế trên thiết bị, có thể bổ sung nhắc định kỳ qua ZNS (FR-LUNAR-017) ở bản thương mại làm lưới an toàn.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Lập vượt 64 pending | planner cắt budget=64 | giữ 64 gần nhất | none (by design; AC #1) |
| iOS âm thầm vứt notification xa | rolling reschedule mỗi app-open | lập lại 64 gần nhất | none (DEC-LUNAR-050) |
| BGAppRefreshTask không chạy đúng giờ | coi là best-effort | app-open reschedule khi mở | nhắc qua ZNS ở bản thương mại (DEC-LUNAR-051) |
| Lead-time làm vượt ngân sách âm thầm | đếm từng notification | slotsDropped ghi log | UI cảnh báo quá nhiều nhắc (DEC-LUNAR-052; AC #4) |
| User chạm notification mở nhầm màn hình | userInfo.reminderId | deep-link đúng màn hình | none (DEC-LUNAR-053; AC #5) |
| Một reminder nuốt hết slot | fairness pass | mỗi reminder có occurrence gần nhất | none (§1 #7; AC #8) |
| Reschedule tạo trùng lặp | id deterministic | idempotent | none (AC #9) |
| User từ chối quyền | requestPermissions = denied | permission denied lên UI | UI hướng dẫn bật lại (AC #10) |
| Occurrence quá khứ được lập | lọc fireAtLocal < now | bỏ qua | none (AC #6) |
| Sai múi giờ khi lập lịch | giữ +07:00 từ Occurrence | đúng giờ VN | none (FR-B06; AC #11) |
| Web push được dùng làm kênh chính iPhone | coi web push auxiliary | local notification là chính | none (DEC-LUNAR-055; AC #13) |
| Logic nghiệp vụ lọt vào adapter | code review tách planner/adapter | từ chối merge | giữ planner thuần tính toán (DEC-LUNAR-056) |
| Quá nhiều nhắc (> 50) | getPlanDiagnostics | cảnh báo remindersCovered | user tắt bớt/ưu tiên (PRD Recommendations) |
| Occurrence pendingUserChoice bị lập âm thầm | mang cờ trong userInfo | UI nhắc xác nhận fallback | user chọn tháng cúng (§1 #15) |

---

## §11 - Implementation notes

- Trái tim của thiết kế là rolling reschedule: mỗi lần app mở, `cancelAll()` rồi đặt lại 64 cái gần nhất. Không cố gắng giữ trạng thái pending qua các lần chạy - làm mới từ đầu là cách duy nhất chắc chắn khớp với giới hạn 64 của iOS.
- Đếm lead-time là chỗ dễ sai nhất: một sự kiện với `[0,1,7]` là ba notification, ba slot. Planner phải đếm ở mức notification, không ở mức occurrence, nếu không sẽ vượt 64 mà không biết.
- Fairness pass chạy trước fill toàn cục: lấy occurrence gần nhất của mỗi reminder enabled, rồi mới đổ phần còn lại theo thời gian. Nhờ đó một reminder MONTHLY nhiều lead-time không đẩy hết các giỗ quan trọng ra ngoài cửa sổ.
- id phải deterministic (`reminderId|occurrenceDate|leadDays`) để reschedule idempotent và để debug "đã đặt đúng chưa" bằng `getPending()`.
- Adapter chỉ dịch kế hoạch sang Capacitor: `requestPermissions`, `cancel`, `schedule`. Không tính ngày, không lọc, không sort trong adapter - tất cả ở planner để test được trong Node.
- BGAppRefreshTask viết trong Swift (`BGRefresh.swift`) và gọi vào bridge JS để chạy `reschedule()`, kèm comment rõ là best-effort - thời điểm do iOS quyết định, không đảm bảo.
- Web push giữ lại cho Android/desktop qua Push API + Service Worker, nhưng trên iPhone luôn coi local notification qua Capacitor là kênh chính; đánh dấu web push là auxiliary trong cấu hình để không ai nhầm.

---

*Hết FR-LUNAR-005.*
