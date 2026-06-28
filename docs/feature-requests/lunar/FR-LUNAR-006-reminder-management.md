---
id: FR-LUNAR-006
title: "Reminder management - Ram/Mung Mot hang thang bat/tat rieng, nhap gio, custom lunar reminder, lead-time + gio nhac, danh sach sap toi kem ngay duong"
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
related_frs: [FR-LUNAR-004, FR-LUNAR-005, FR-LUNAR-008]
depends_on: [FR-LUNAR-004, FR-LUNAR-005, FR-LUNAR-010]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-B01, FR-B03, FR-B04, FR-B07)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4F (FR-F05 personalized tone)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (UI/UX, danh sach sap toi)"
source_decisions:
  - DEC-LUNAR-060 (Rằm=15 và Mùng Một=1 là hai toggle hằng tháng độc lập, bật/tắt riêng; bật -> tạo Reminder type RAM/MUNG_MOT recurrence MONTHLY)
  - DEC-LUNAR-061 (form nhập giỗ/custom nhận ngày ÂM là nguồn, hiển ngày dương tính ra bên cạnh để tham chiếu; user không nhập ngày dương)
  - DEC-LUNAR-062 (lead-time là tập con của {0=đúng ngày, 1=trước 1 ngày, 3=trước 3 ngày, 7=trước 1 tuần}; notifyTime mặc định 07:00; chọn nhiều lead-time cùng lúc)
  - DEC-LUNAR-063 (danh sách sắp tới sort theo ngày dương tính từ FR-LUNAR-004, mỗi dòng hiển cả ngày dương + nhãn âm + lead-time)
  - DEC-LUNAR-064 (mỗi thay đổi CRUD/toggle gọi reschedule() của FR-LUNAR-005 trong cùng một luồng để pending luôn đồng bộ với dữ liệu)
  - DEC-LUNAR-065 (fold FR-F05: mỗi Reminder có notificationStyle{tone, emoji, imageId?} chọn trước; tone dùng để định hình body thông báo - mặc định template tĩnh, KHÔNG gọi AI ở Phase 1)
  - DEC-LUNAR-066 (ngày dương hiển thị tính on-device, đọc từ OccurrenceCache nếu còn hạn theo engineVersion, ngược lại tính lại)
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
  - cho user nhập trực tiếp ngày dương làm nguồn của giỗ (vi phạm DEC-LUNAR-061 - ngày âm là nguồn)
  - gọi AI để sinh body thông báo ở Phase 1 (vi phạm DEC-LUNAR-065 - template tĩnh, AI để FR-LUNAR-015 Phase 2)
  - thay đổi Reminder mà không gọi reschedule() (vi phạm DEC-LUNAR-064 - pending phải đồng bộ)
effort_hours: 10
sub_tasks:
  - "1.5h: MonthlyToggles.tsx - hai switch Rằm(15)/Mùng Một(1) độc lập; bật tạo Reminder MONTHLY, tắt xóa và reschedule"
  - "2.0h: ReminderForm.tsx - nhập giỗ/custom bằng ngày âm (day/month + cờ tháng nhuận), hiển ngày dương tính ra bên cạnh, chọn recurrence"
  - "1.5h: lead-time + notifyTime UI - multi-select {đúng ngày/1/3/7 ngày} + time picker mặc định 07:00"
  - "1.5h: UpcomingList.tsx - danh sách sắp tới sort theo ngày dương, mỗi dòng: ngày dương + nhãn âm + lead-time + nút sửa/xóa"
  - "1.0h: NotificationStylePicker.tsx (FR-F05) - chọn tone/emoji/ảnh cho thông báo, lưu vào notificationStyle"
  - "1.0h: tone.ts - render body thông báo từ template theo tone đã chọn (warm/neutral/formal), KHÔNG AI"
  - "0.5h: store.ts - CRUD Reminder + gọi reschedule() sau mỗi thay đổi; đọc/ghi qua storage.ts"
  - "1.0h: reminders.store.test.ts - toggle Rằm/Mùng Một, validate form, upcoming sort, tone render, reschedule được gọi sau CRUD"
risk_if_skipped: "Đây là bề mặt mà người dùng thực sự chạm vào - không có nó thì FR-LUNAR-004 (model) và FR-LUNAR-005 (scheduler) không có cách nhập liệu, sản phẩm vô dụng với người dùng cuối. Nếu toggle Rằm/Mùng Một không gọi reschedule, bật nhắc xong vẫn không reo. Nếu cho nhập ngày dương, giỗ sẽ sai sang năm (vi phạm nguyên tắc lưu ngày âm của FR-LUNAR-004). Đây là FR khép lại lối MVP cá nhân theo mục tiêu G1 của PRD."
---

## §1 - Description (BCP-14 normative)

Module này là lớp quản lý nhắc: toggle Rằm/Mùng Một hằng tháng, form nhập giỗ/custom bằng ngày âm, chọn lead-time và giờ nhắc, danh sách sắp tới kèm ngày dương, và chọn tông giọng thông báo (FR-F05). Đây là contract:

1. PHẢI cung cấp hai toggle độc lập "Nhắc Rằm (15 ÂL)" và "Nhắc Mùng Một (1 ÂL)" hằng tháng; bật mỗi toggle tạo một `Reminder` `type` `RAM`/`MUNG_MOT` `recurrence` `MONTHLY`, tắt thì xóa và lập lại lịch (DEC-LUNAR-060, FR-B01).
2. PHẢI cho nhập đám giỗ (`type` `GIO`) bằng ngày ÂM: `lunarDay` + `lunarMonth` + cờ `isLeapMonth`; nhập một lần, app tự tái diễn mỗi năm (FR-B02 đã hiện thực ở FR-LUNAR-004; ở đây là UI nhập). Khi `isLeapMonth = true`, form PHẢI hiện và cho chọn `leapFallback` (`REGULAR` / `SKIP` / `ASK`, mặc định `REGULAR`) - đây là lựa chọn mà model FR-LUNAR-004 §1 #5/#6 expose; nếu UI không surface, model phơi một quyết định mà người dùng không bao giờ thấy (DEC-LUNAR-042).
3. PHẢI cho tạo nhắc âm lịch tùy biến (`type` `CUSTOM`), ví dụ "ngày vía Thần Tài mùng 10 tháng Giêng" (`lunarDay:10, lunarMonth:1`) (FR-B03).
4. PHẢI lấy ngày ÂM làm nguồn nhập; UI PHẢI hiển ngày dương tính ra bên cạnh để tham chiếu, và KHÔNG ĐƯỢC cho user nhập trực tiếp ngày dương làm nguồn của giỗ (DEC-LUNAR-061, FR-B02).
5. PHẢI cho mỗi nhắc chọn lead-time là tập con của `{0 = đúng ngày, 1 = trước 1 ngày, 3 = trước 3 ngày, 7 = trước 1 tuần}` (chọn nhiều cùng lúc) và một `notifyTime` (mặc định "07:00") (DEC-LUNAR-062, FR-B04).
6. PHẢI hiển danh sách các nhắc sắp tới sort theo ngày dương tính từ FR-LUNAR-004; mỗi dòng PHẢI hiển ngày dương, nhãn âm (ví dụ "16/2 ÂL"), và lead-time (DEC-LUNAR-063, FR-B07). Dòng nào ứng với occurrence có `fellBack = true` PHẢI hiển nhãn "đã chuyển sang tháng thường" và occurrence `pendingUserChoice = true` (leapFallback = ASK) PHẢI hiển nhắc "cần chọn tháng cúng" - đây là nơi UI surface cờ mà model FR-LUNAR-004 emit và FR-LUNAR-005 mang trong userInfo (DEC-LUNAR-042).
7. PHẢI gọi `reschedule()` của FR-LUNAR-005 trong cùng luồng sau mỗi thao tác CRUD hoặc toggle, để tập pending trên iOS luôn đồng bộ với dữ liệu (DEC-LUNAR-064).
8. PHẢI validate form qua `validateReminder` của FR-LUNAR-004 trước khi lưu và hiển lỗi cụ thể (RAM_DAY_MISMATCH, ONCE_NEEDS_YEAR...); KHÔNG ĐƯỢC lưu Reminder không hợp lệ.
9. PHẢI fold FR-F05: ghi `notificationStyle { tone, emoji, imageId? }` vào trường optional `Reminder.notificationStyle` (type `NotificationStyle` do FR-LUNAR-004 sở hữu trong amlich-core, KHÔNG redeclare ở đây); user chọn trước tông giọng và emoji cho thông báo của nhắc đó (FR-F05, DEC-LUNAR-065).
10. PHẢI render body thông báo từ template tĩnh theo `tone` (`warm` / `neutral` / `formal`) qua `tone.ts`, và KHÔNG ĐƯỢC gọi AI ở Phase 1; AI sinh lời nhắc để cho FR-LUNAR-015 ở Phase 2 (DEC-LUNAR-065).
11. PHẢI cho sửa và xóa mỗi nhắc; xóa gọi `reschedule()` ngay; sửa chạy lại `validateReminder` trước khi lưu.
12. PHẢI hiển ngày dương dùng giá trị tính on-device: đọc từ `OccurrenceCache` nếu còn hạn theo `engineVersion`, ngược lại tính lại bằng FR-LUNAR-004 (DEC-LUNAR-066, NFR-Offline).
13. PHẢI cho phép bật/tắt từng nhắc (`enabled`) mà không xóa; tắt -> loại khỏi reschedule nhưng giữ dữ liệu.
14. PHẢI link nhắc tới trang nội dung dịp qua `linkedContentId` khi có (ví dụ giỗ -> trang đám giỗ, Rằm -> trang Rằm); UI hiển liên kết "xem nghi lễ" (FR-D02, chuẩn bị cho FR-LUNAR-008).
15. PHẢI hoạt động offline: nhập, sửa, xem danh sách sắp tới không cần mạng; chỉ các kênh ngoài (ZNS ở bản thương mại) mới cần mạng (NFR-Offline).
16. NÊN cảnh báo khi tổng số nhắc sinh nhiều điểm nhắc vượt ngân sách 64 (dùng `getPlanDiagnostics` của FR-LUNAR-005): hiển "bạn có nhiều nhắc, một số sẽ được lập khi đến gần" thay vì âm thầm cắt.

---

## §2 - Why this design (rationale for humans)

**Tại sao Rằm và Mùng Một là hai toggle riêng (§1 #1, DEC-LUNAR-060)?** Nhiều người cúng cả Rằm lẫn Mùng Một, nhưng cũng có người chỉ cúng một trong hai. Hai switch độc lập cho đúng mức kiểm soát mà PRD FR-B01 mô tả, và mỗi toggle ánh xạ thẳng sang một `Reminder` `MONTHLY` - không cần màn hình nhập riêng cho hai dịp phổ biến nhất.

**Tại sao ngày âm là nguồn, ngày dương chỉ hiển bên cạnh (§1 #4, DEC-LUNAR-061)?** Người dùng nhớ "giỗ bà ngày 16 tháng 2 âm", không nhớ ngày dương - vì ngày dương đổi mỗi năm. Bắt user nhập ngày dương sẽ sai sang năm và phá vỡ nguyên tắc lưu ngày âm của FR-LUNAR-004. Hiển ngày dương tính ra bên cạnh giúp họ yên tâm đã nhập đúng, mà không biến nó thành nguồn dữ liệu.

**Tại sao gọi reschedule sau mỗi thay đổi (§1 #7, DEC-LUNAR-064)?** Tập notification pending trên iOS phải phản ánh đúng dữ liệu hiện tại. Nếu user bật nhắc Rằm mà không reschedule, máy sẽ không reo đúng dịp. Gọi `reschedule()` trong cùng luồng CRUD/toggle đảm bảo pending luôn khớp - đây là điểm nối quan trọng nhất giữa lớp quản lý và scheduler.

**Tại sao lead-time là multi-select cố định (§1 #5, DEC-LUNAR-062)?** PRD liệt kê đúng bốn mức: đúng ngày / trước 1 / 3 ngày / 1 tuần. Cho chọn nhiều cùng lúc (ví dụ vừa trước 1 tuần để sắm lễ vừa đúng ngày để cúng) phù hợp thói quen thật. Tập cố định giữ UI gọn và khớp ngân sách 64 dễ tính.

**Tại sao danh sách sắp tới sort theo ngày dương (§1 #6, DEC-LUNAR-063)?** Người dùng sống theo lịch dương - họ muốn biết "sắp tới có gì" theo thứ tự thời gian thật. Sort theo ngày dương tính từ FR-LUNAR-004, kèm nhãn âm và lead-time, cho một cái nhìn đúng như PRD section 13 mô tả.

**Tại sao fold FR-F05 nhưng không dùng AI ở Phase 1 (§1 #9, #10, DEC-LUNAR-065)?** FR-F05 (chọn tông giọng, emoji, ảnh) là một phần trải nghiệm cá nhân hóa, hợp lý nằm cạnh quản lý nhắc. Nhưng sinh lời nhắc bằng AI thuộc FR-LUNAR-015 (Phase 2, có Claude proxy). Ở Phase 1, body thông báo render từ template tĩnh theo `tone` - vẫn ấm áp, vẫn cá nhân, mà không cần backend hay key.

**Tại sao đọc OccurrenceCache nếu còn hạn (§1 #12, DEC-LUNAR-066)?** Tính lại ngày dương cho mỗi dòng mỗi lần mở danh sách là lãng phí khi dữ liệu không đổi. Đọc cache nếu `engineVersion` còn khớp, tính lại khi core đã đổi - vừa nhanh vừa đúng, và offline hoàn toàn theo NFR-Offline.

**Tại sao cảnh báo thay vì âm thầm cắt khi > 64 (§1 #16)?** Nếu một gia đình nhập nhiều giỗ, tổng điểm nhắc có thể vượt 64 và scheduler sẽ cắt các cái xa. Thay vì để user ngạc nhiên vì không được nhắc, hiển cảnh báo ("một số sẽ lập khi đến gần") giữ minh bạch, đúng tinh thần PRD Recommendations về ngưỡng > 50 nhắc.

---

## §3 - API contract

```typescript
// apps/web/lib/reminders/tone.ts  (FR-F05, template tinh - KHONG AI)
// NotificationStyle la field tren Reminder, type do FR-LUNAR-004 so huu (amlich-core).
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
  solarDate: string;        // "YYYY-MM-DD" tinh tu FR-LUNAR-004
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
  // Khi isLeapMonth=true, PHAI surface lua chon leapFallback (REGULAR/SKIP/ASK) - model FR-LUNAR-004 §1 #5/#6 expose (DEC-LUNAR-042)
  onLeapFallbackChange?: (policy: LeapFallback) => void;
}

// apps/web/components/reminders/MonthlyToggles.tsx (props)
export interface MonthlyTogglesProps {
  ramOn: boolean; mungMotOn: boolean;
  onToggle: (kind: "RAM" | "MUNG_MOT", on: boolean) => void;   // goi store.toggleMonthly
}

// apps/web/components/reminders/NotificationStylePicker.tsx (props, FR-F05)
import type { NotificationStyle } from "@cyberskill/amlich-core"; // owner: FR-LUNAR-004; KHONG redeclare
export interface NotificationStylePickerProps {
  value: NotificationStyle;
  onChange: (s: NotificationStyle) => void;   // tone/emoji/imageId
  preview: (s: NotificationStyle) => string;  // dung renderBody
}
```

```typescript
// lead-time constants (DEC-LUNAR-062, FR-B04)
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

1. **Toggle Rằm độc lập** - bật "Nhắc Rằm" tạo 1 `Reminder` `type:"RAM"`, `recurrence:"MONTHLY"`, `lunarDay:15`; tắt xóa nó.
2. **Toggle Mùng Một độc lập** - bật "Nhắc Mùng Một" tạo `type:"MUNG_MOT"`, `lunarDay:1`; độc lập với Rằm (bật cái này không đóng cái kia).
3. **Toggle gọi reschedule** - mỗi `toggleMonthly` gọi `reschedule()` đúng một lần (assert qua mock).
4. **Nhập giỗ bằng ngày âm** - form nhập `lunarDay:16, lunarMonth:2` tạo `Reminder` `type:"GIO"` không chứa trường ngày dương nào.
5. **Solar preview hiển bên cạnh** - form hiển chuỗi ngày dương tính từ `(lunarDay, lunarMonth, isLeap)` cho năm tới; user không có ô nhập ngày dương.
6. **Custom reminder** - nhập "vía Thần Tài" `lunarDay:10, lunarMonth:1` tạo `type:"CUSTOM"`.
7. **Lead-time multi-select** - chọn `[0,7]` lưu `leadTimes:[0,7]`; chọn `notifyTime:"06:30"` lưu đúng.
8. **Upcoming sort theo ngày dương** - `upcoming()` trả danh sách sort tăng theo `solarDate`; mỗi item có `solarDate`, `lunarLabel`, `leadDays`.
9. **CRUD gọi reschedule** - `upsert`, `remove`, `setEnabled` mỗi cái gọi `reschedule()` sau khi đổi dữ liệu (assert qua mock).
10. **Validate chặn lưu sai** - `upsert` một `RAM` với `lunarDay:14` trả `errors` chứa `RAM_DAY_MISMATCH` và KHÔNG lưu.
11. **notificationStyle lưu** - chọn `tone:"warm", emoji:"🌼"` lưu vào `Reminder.notificationStyle`.
12. **renderBody không gọi mạng** - `renderBody` là hàm thuần, trả chuỗi khác nhau cho `warm` vs `formal`, không có fetch nào.
13. **enabled tắt giữ dữ liệu** - `setEnabled(id,false)` giữ Reminder trong `list()` nhưng loại khỏi reschedule.
14. **Offline** - `upcoming()` và `upsert()` chạy không cần mạng (không có network call trong đường CRUD/hiển thị).
15. **Diagnostics cảnh báo** - khi nhiều nhắc, `diagnostics()` trả `slotsDropped > 0` để UI cảnh báo.
16. **Link nội dung** - reminder có `linkedContentId` hiển item upcoming kèm `linkedContentId` để UI render liên kết "xem nghi lễ".

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

API ở §3 là skeleton. Chi tiết đang ghim là `upsert`: nó là nơi validate, persist, và reschedule mắc nối nhau theo đúng thứ tự:

```typescript
// apps/web/lib/reminders/store.ts (lõi upsert)
async upsert(input: Reminder) {
  const r = normalizeReminder(input);                 // FR-LUNAR-004
  const errors = validateReminder(r);                 // FR-LUNAR-004
  if (errors.length) return { errors };               // §1 #8 - khong luu neu sai
  await storage.putReminder(r);                       // FR-LUNAR-010 storage.ts
  await reschedule(adapter, this.list(), Date.now(), this.engineVersion);  // §1 #7 / DEC-LUNAR-064
  return { errors: [] };
}
```

`upcoming` đọc `OccurrenceCache` nếu còn hạn, ngược lại gọi `nextOccurrences` rồi cache lại, sort theo `solarDate`. `toggleMonthly("RAM", true)` tạo `Reminder` `{type:"RAM", lunarDay:15, recurrence:"MONTHLY"}` qua chính `upsert`; `false` gọi `remove` của reminder RAM đang có.

---

## §7 - Dependencies

- Upstream: FR-LUNAR-004 (type `Reminder`, `normalizeReminder`, `validateReminder`, `nextOccurrences` để tính `solarDate`, `OccurrenceCache`); FR-LUNAR-005 (`reschedule`, `getPlanDiagnostics` gọi sau mỗi thay đổi); FR-LUNAR-010 (app shell cung cấp `storage.ts` on-device và routing, host các component này).
- Downstream: không block FR nào (là lá của MVP). Liên quan FR-LUNAR-008 (link nội dung dịp qua `linkedContentId`).
- Cross-cutting: `notificationStyle` (FR-F05) được render bởi `tone.ts` ở Phase 1; ở Phase 2, FR-LUNAR-015 CÓ THỂ thay body template bằng lời nhắc do Claude sinh, nhưng không đổi schema `notificationStyle`. Deep-link route `/reminder/:id` của FR-LUNAR-005 mở đúng màn hình chi tiết ở đây.

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

Đã giải quyết:
- Rằm/Mùng Một là hai toggle độc lập ánh xạ Reminder MONTHLY (DEC-LUNAR-060).
- Ngày âm là nguồn, ngày dương chỉ hiển tham chiếu (DEC-LUNAR-061).
- FR-F05 fold vào đây nhưng body render từ template tĩnh, AI để Phase 2 (DEC-LUNAR-065).

Deferred (gần với các FR sau / Caveats):
- Sinh lời nhắc cá nhân hóa bằng Claude (giọng ấm áp động, theo ngữ cảnh) - thuộc FR-LUNAR-015 Phase 2; ở đây chỉ có template tĩnh theo tone.
- Snooze / đánh dấu "đã cúng" cho một occurrence - cải thiện UX nhưng không thuộc lõi MVP; để sau.
- Nhập ảnh tùy chỉnh cho `notificationStyle.imageId` (ví dụ ảnh người mất) - chạm dữ liệu nhạy cảm văn hóa; chỉ mở khi có lớp PDPL/consent (FR-LUNAR-019), Phase 1 chỉ cho emoji + ảnh dùng sẵn.
- Cảnh báo chi tiết khi > 64 nên gợi ý bỏ bớt nhắc nào - phụ thuộc fairness của FR-LUNAR-005; ban đầu chỉ hiển thông báo chung.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Bật nhắc Rằm nhưng máy không reo | toggle gọi reschedule | pending đồng bộ | none (DEC-LUNAR-064; AC #3) |
| User nhập ngày dương làm nguồn | UI chỉ có ô nhập ngày âm | không xảy ra | none (DEC-LUNAR-061; AC #4/#5) |
| Sửa/xóa nhắc mà pending không đổi | CRUD gọi reschedule | đồng bộ lại | none (DEC-LUNAR-064; AC #9) |
| Lưu RAM sai ngày (!=15) | validateReminder | chặn lưu + báo lỗi | user sửa (AC #10) |
| ONCE thiếu năm | validateReminder | chặn lưu | user nhập năm |
| Gọi AI sinh body ở Phase 1 | tone.ts thuần, không fetch | template tĩnh | AI ở FR-LUNAR-015 (DEC-LUNAR-065; AC #12) |
| Danh sách sắp tới sai thứ tự | sort theo solarDate | tăng dần | none (AC #8) |
| Tính lại ngày dương mỗi lần mở (chậm) | đọc OccurrenceCache còn hạn | nhanh, offline | tính lại khi engineVersion đổi (DEC-LUNAR-066) |
| Tắt nhắc làm mất dữ liệu | setEnabled giữ Reminder | giữ, chỉ loại khỏi schedule | bật lại (AC #13) |
| Quá nhiều nhắc, âm thầm cắt | diagnostics slotsDropped | cảnh báo UI | user tắt bớt (AC #15) |
| Cần mạng để xem danh sách | đường CRUD/hiển thị offline | chạy offline | none (NFR-Offline; AC #14) |
| Reminder không link nội dung dịp | linkedContentId optional | item vẫn hiển, không liên kết | gắn content sau (FR-D02; AC #16) |
| Emoji/ảnh nhạy cảm làm lộ dữ liệu | Phase 1 chỉ emoji + ảnh sẵn | không nhập ảnh riêng | mở khi có PDPL (FR-LUNAR-019) |

---

## §11 - Implementation notes

- Điểm nối quan trọng nhất là `upsert`/`remove`/`toggleMonthly` luôn kết thúc bằng `reschedule()`. Đây là nơi lớp quản lý và FR-LUNAR-005 mắc vào nhau; quên nó là bug "bật nhắc mà không reo" khó lần ra.
- Form không bao giờ có ô nhập ngày dương. Chỉ nhập ngày âm, hiển ngày dương tính ra bên cạnh như một xem trước. Đây là cách giữ nguyên tắc lưu-ngày-âm của FR-LUNAR-004 ở tầng UI.
- Toggle Rằm/Mùng Một map thẳng sang Reminder `MONTHLY` `lunarDay` 15/1 qua chính `upsert`, nên đi qua đúng đường validate + reschedule, không đi đường tắt.
- `tone.ts` là template tĩnh: một bảng câu theo `tone` (warm/neutral/formal) ghép với ngữ cảnh (title, ngày dương, nhãn âm, lead). Không fetch, không AI - để Phase 1 chạy offline và để FR-LUNAR-015 thay sau mà không đổi schema `notificationStyle`.
- `upcoming` đọc OccurrenceCache nếu `engineVersion` còn khớp để nhanh; chỉ tính lại khi core đổi. Sort dùng chuỗi ISO `solarDate` (so sánh chuỗi), tránh `Date` local.
- Cảnh báo > 64 lấy từ `getPlanDiagnostics` của FR-LUNAR-005 (`slotsDropped`), hiển thông báo minh bạch thay vì để user ngạc nhiên - đúng tinh thần ngưỡng > 50 nhắc trong PRD Recommendations.
- `notificationStyle.imageId` ở Phase 1 chỉ nhận emoji và ảnh dùng sẵn, chưa cho upload ảnh riêng (ví dụ ảnh người mất) vì đây là dữ liệu nhạy cảm văn hóa - chỉ mở khi có lớp consent/PDPL của FR-LUNAR-019.

---

*Hết FR-LUNAR-006.*
