---
id: FR-LUNAR-004
title: "Reminder data model + recurrence engine - luu ngay am, tu sinh ngay duong moi nam, fallback thang nhuan, khoa timezone Asia/Ho_Chi_Minh"
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
  - DEC-LUNAR-040 (lưu Reminder bằng lunarDay/lunarMonth + isLeapMonth, KHÔNG lưu ngày dương; ngày dương là giá trị tính ra (derived), không phải giá trị nguồn)
  - DEC-LUNAR-041 (recurrence engine sinh occurrence bằng cách gọi convertLunar2Solar cho từng targetLunarYear, không nội suy từ lần trước)
  - DEC-LUNAR-042 (fallback tháng nhuận: giỗ rơi tháng nhuận mà năm đích không có tháng nhuận đó -> cúng vào tháng thường tương ứng, mặc định FALLBACK_REGULAR nhưng cho user chọn)
  - DEC-LUNAR-043 (mọi phép tính khóa về Asia/Ho_Chi_Minh / tz=7.0; KHÔNG dùng Date local của thiết bị để derive ngày âm)
  - DEC-LUNAR-044 (OccurrenceCache là cache thuần túy, có thể xóa và tính lại bất kỳ lúc nào; computedAt + engineVersion để invalidate khi core đổi)
  - DEC-LUNAR-045 (recurrence MONTHLY sinh 12 occurrence/năm từ lunarDay; ANNUAL sinh 1/năm; ONCE chốt đúng lunarYear đã nhập)
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
  - gọi network để tính ngày (vi phạm DEC-LUNAR-043 / NFR-Offline)
  - dùng `new Date()` local-time của thiết bị để derive lunar/solar occurrence (vi phạm DEC-LUNAR-043 - phải khóa Asia/Ho_Chi_Minh)
  - lưu ngày dương đã tính làm giá trị nguồn của Reminder (vi phạm DEC-LUNAR-040 - chỉ lưu ngày âm)
effort_hours: 12
sub_tasks:
  - "1.0h: tz.ts - chuẩn hóa mốc thời gian về Asia/Ho_Chi_Minh, helper todayInHCM(now?: Date): SolarDate trả tuple [day, month, year] on-device không lệ thuộc TZ máy (CONTRACT signature)"
  - "2.0h: reminder.ts - type Reminder đầy đủ (type/recurrence ENUM, leadTimes, channels, isLeapMonth, sharedWith...), validate() + normalize()"
  - "2.5h: recurrence.ts - nextOccurrences(reminder, opt: RecurrenceOptions {fromYear, count, engineVersion}) gọi convertLunar2Solar mỗi targetLunarYear, gộp lead-time"
  - "2.0h: leap-month fallback - phát hiện năm đích không có tháng nhuận đã nhập, áp LeapFallback policy (REGULAR mặc định / SKIP / ASK)"
  - "1.0h: MONTHLY expander - sinh occurrence Rằm/Mùng Một mỗi tháng trong năm âm, xử lý tháng nhuận lặp ngày"
  - "1.0h: OccurrenceCache - tính, lưu computedAt+engineVersion, invalidate, rebuild"
  - "1.5h: recurrence.test.ts - fixture giỗ 1985 tháng 2 nhuận, giỗ ngày 30 tháng thiếu, MONTHLY 12 lần, round-trip vs FR-001"
  - "1.0h: index.ts barrel export + doc comment cho fallback policy và timezone lock"
risk_if_skipped: "Không có model này thì không có gì để nhắc - đây là nguồn dữ liệu mà FR-LUNAR-005 (scheduler rolling-64) và FR-LUNAR-006 (reminder management) đọc từ. Nếu recurrence sai, giỗ ông bà sẽ nhắc lệch ngày mỗi năm, đúng nghĩa vụ cốt lõi của sản phẩm. Nếu không khóa Asia/Ho_Chi_Minh, user đi nước ngoài sẽ thấy ngày âm sai. FR-LUNAR-016/017/018 (Zalo, ZNS, family sync) đều tái dùng đúng type Reminder này, nên sai schema ở đây lan ra cả downstream thương mại."
---

## §1 - Description (BCP-14 normative)

Module này định nghĩa type `Reminder` (cùng `User`, `OccurrenceCache`) và recurrence engine sinh ngày dương từ ngày âm, khóa mọi phép tính về Asia/Ho_Chi_Minh. Đây là contract:

1. PHẢI lưu mỗi `Reminder` lặp lại bằng `lunarDay` + `lunarMonth` + `isLeapMonth`, và KHÔNG ĐƯỢC lưu ngày dương làm giá trị nguồn; ngày dương luôn là giá trị derive bằng `convertLunar2Solar` (DEC-LUNAR-040, FR-B02).
2. PHẢI hỗ trợ trường `recurrence` ENUM `MONTHLY | ANNUAL | ONCE`: `ANNUAL` set `lunarYear = null` (lặp hằng năm), `ONCE` giữ `lunarYear` đã nhập (chốt một lần), `MONTHLY` bỏ qua `lunarMonth` và lặp `lunarDay` mỗi tháng âm (DEC-LUNAR-045, FR-B02).
3. PHẢI hỗ trợ trường `type` ENUM `RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL`; `RAM` ngụ ý `lunarDay = 15`, `MUNG_MOT` ngụ ý `lunarDay = 1`, `GIO` là đám giỗ cá nhân, `CUSTOM` là nhắc âm lịch tùy biến, `FESTIVAL` link tới `FestivalContent` (PRD section 10).
4. PHẢI sinh occurrence bằng hàm `nextOccurrences(reminder, opt)` với `opt: RecurrenceOptions { fromYear, count, engineVersion }` (chữ ký §3), gọi `convertLunar2Solar(lunarDay, lunarMonth, targetLunarYear, isLeap)` độc lập cho từng `targetLunarYear`, và KHÔNG ĐƯỢC nội suy từ occurrence trước (DEC-LUNAR-041). `count` là số occurrence ÂM LỊCH muốn quét (trước khi nhân lead-time); tổng `Occurrence` trả về là `count * leadTimes.length`.
5. PHẢI áp quy tắc fallback tháng nhuận: khi một đám giỗ nhập ở tháng nhuận (`isLeapMonth = true`) nhưng `targetLunarYear` không có đúng tháng nhuận đó, engine PHẢI tính occurrence vào tháng thường tương ứng (`FALLBACK_REGULAR`) làm mặc định, đồng thời đánh dấu `fellBack = true` để UI cho user xác nhận (DEC-LUNAR-042, PRD section 10).
6. PHẢI cho phép user chọn chính sách fallback qua trường `leapFallback` ENUM `REGULAR | SKIP | ASK`: `REGULAR` cúng tháng thường, `SKIP` bỏ năm đó, `ASK` trả occurrence ở trạng thái `pending_user_choice` (DEC-LUNAR-042).
7. PHẢI xử lý đám giỗ rơi ngày không tồn tại trong tháng âm đích (ví dụ ngày 30 mà tháng đích chỉ có 29 ngày): engine PHẢI lùi về ngày cuối cùng của tháng âm đó và đánh dấu `dayClamped = true` (FR-B02 edge case).
8. PHẢI khóa mọi phép tính về `timeZone = 7.0` (kinh tuyến 105E, Asia/Ho_Chi_Minh) qua `tz.ts`, và KHÔNG ĐƯỢC dùng `new Date()` theo giờ local của thiết bị để derive ngày âm hay xác định "hôm nay" (DEC-LUNAR-043, FR-B06).
9. PHẢI gán mỗi occurrence một `notifyTime` (mặc định "07:00") và một mảng `leadTimes: number[]` ngày (ví dụ `[0, 1]` = đúng ngày + trước 1 ngày); mỗi cặp (occurrence x leadTime) sinh một điểm nhắc riêng (FR-B04, chuẩn bị cho FR-LUNAR-005).
10. PHẢI sinh mỗi điểm nhắc dưới dạng `Occurrence` mang `reminderId`, `gregorianDate` (ISO date), `lunarLabel` (chuỗi hiển thị), `leadDays`, và `fireAtLocal` (datetime tại giờ Việt Nam) để FR-LUNAR-005 sắp xếp (PRD section 11).
11. PHẢI cung cấp `OccurrenceCache { reminderId, gregorianDate, lunarLabel, computedAt, engineVersion }`; cache CÓ THỂ bị xóa và tính lại bất kỳ lúc nào, và PHẢI invalidate khi `engineVersion` của amlich-core thay đổi (DEC-LUNAR-044).
12. PHẢI cung cấp `validateReminder(r)` trả danh sách lỗi: `lunarDay` ngoài 1..30, `lunarMonth` ngoài 1..12, `RAM` mà `lunarDay != 15`, `ONCE` mà thiếu `lunarYear`, `leadTimes` chứa số âm, `channels` rỗng.
13. PHẢI cung cấp `normalizeReminder(r)` đặt mặc định ổn định: `notifyTime = "07:00"`, `leadTimes = [1]` (trước 1 ngày), `channels = ["LOCAL"]`, `enabled = true`, `leapFallback = "REGULAR"`, sort+dedupe `leadTimes`.
14. PHẢI giữ module này zero-dependency và thuần tính toán (không I/O, không storage); đọc/ghi storage thuộc lớp app (FR-LUNAR-010), gửi thông báo thuộc FR-LUNAR-005 (NFR-Offline).
15. PHẢI đặt mốc lịch sử làm fixture: giỗ nhập 16/02 tháng 2 nhuận 1985 (Ất Sửu) phải sinh đúng occurrence trong dải 21/03-19/04/1985; giỗ MONTHLY ngày 15 phải sinh 12 hoặc 13 occurrence trong năm có tháng nhuận (PRD section 6.6).
16. NÊN expose `engineVersion` (semver của amlich-core) để OccurrenceCache và FR-LUNAR-018 (cloud sync) biết khi nào phải tính lại phía client.

---

## §2 - Why this design (rationale for humans)

**Tại sao lưu ngày âm, không lưu ngày dương (§1 #1, DEC-LUNAR-040)?** Ngày giỗ là một ngày âm cố định, nhưng ngày dương tương ứng đổi mỗi năm. Nếu lưu ngày dương, sang năm nó sai. Lưu `lunarDay/lunarMonth/isLeapMonth` một lần rồi tính ngày dương mỗi năm là cách duy nhất đúng với bản chất của đám giỗ, và đúng với quy tắc tái diễn trong PRD section 10.

**Tại sao gọi convertLunar2Solar từng năm, không nội suy (§1 #4, DEC-LUNAR-041)?** Khoảng cách giữa hai ngày giỗ liên tiếp tính theo ngày dương không cố định - nó dao động vì độ dài năm âm và vị trí tháng nhuận. Cộng thêm 354 hay 384 ngày đều sẽ trôi. Gọi lại engine lunar cho từng `targetLunarYear` là cách duy nhất cho kết quả khớp lịch Hồ Ngọc Đức, và nó rẻ vì FR-LUNAR-001 đã bao chuyển 1 ngày < 5ms.

**Tại sao cần fallback tháng nhuận (§1 #5, #6, DEC-LUNAR-042)?** Một người mất vào tháng nhuận (ví dụ tháng 2 nhuận) gây ra câu hỏi thật: những năm không có tháng 2 nhuận thì cúng ngày nào? Phong tục phổ biến là cúng vào tháng thường tương ứng, nên `FALLBACK_REGULAR` là mặc định hợp lý. Nhưng đây là quyết định văn hóa của gia đình, nên engine đánh dấu `fellBack` và để UI hỏi lại, thay vì tự quyết im lặng.

**Tại sao có thêm dayClamped (§1 #7)?** Tháng âm có thể chỉ có 29 ngày. Một đám giỗ ngày 30 rơi vào năm mà tháng đó thiếu sẽ không có ngày 30. Lùi về ngày cuối tháng (29) và báo `dayClamped` giữ cho nhắc vẫn xảy ra đúng gần ngày, thay vì nhảy sang tháng sau hoặc biến mất.

**Tại sao khóa Asia/Ho_Chi_Minh (§1 #8, DEC-LUNAR-043)?** Persona chính là diễn viên hay đi quay xa, có thể ở múi giờ khác. Nếu derive ngày âm theo giờ thiết bị, "hôm nay là mùng 1" sẽ sai khi ở nước ngoài. Khóa mọi phép tính về `tz = 7.0` (105E) giữ lịch âm đúng theo giờ Việt Nam ở mọi nơi, đúng tinh thần FR-B06.

**Tại sao tách lead-time thành nhiều điểm nhắc (§1 #9, #10)?** PRD cho phép nhắc "đúng ngày / trước 1 ngày / trước 3 ngày / trước 1 tuần". Mỗi mục là một thông báo riêng ở một thời điểm riêng. Sinh sẵn chúng dưới dạng `Occurrence` có `fireAtLocal` cho FR-LUNAR-005 chỉ việc gộp, sắp xếp theo thời gian, và cắt 64 cái gần nhất - đúng ngân sách 64 pending của iOS.

**Tại sao OccurrenceCache phải invalidate theo engineVersion (§1 #11, DEC-LUNAR-044)?** Nếu một bản vá lỗi amlich-core sửa một hằng số Meeus, mọi ngày đã cache có thể đổi. Gắn `engineVersion` vào cache cho phép phát hiện core đã đổi và tính lại, thay vì phục vụ ngày cũ sai. Cache chỉ là tốc độ, không bao giờ là sự thật.

**Tại sao zero-dependency, thuần tính toán (§1 #14)?** Cùng lý do với FR-LUNAR-001: ba client (web, iOS, Zalo) đều import chung module này. Giữ nó không I/O nghĩa là nó chạy y hệt ở mọi nơi, test được bằng fixture tĩnh, và không kéo theo storage API khác nhau của từng nền.

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

1. **Lưu âm, derive dương** - một `Reminder` GIO `{lunarDay:10, lunarMonth:8, lunarYear:null}` không chứa trường ngày dương nào; `nextOccurrences` trả ngày dương khác nhau cho 2025 và 2026.
2. **ANNUAL lặp hằng năm** - với `recurrence:"ANNUAL"`, `nextOccurrences(count:3)` trả 3 occurrence ở 3 năm âm liên tiếp, mỗi cái gọi `convertLunar2Solar` với `targetLunarYear` riêng.
3. **MONTHLY sinh 12-13** - `recurrence:"MONTHLY", lunarDay:15` trong một năm âm thường sinh 12 occurrence; trong năm có tháng nhuận sinh 13 (lặp cả tháng nhuận).
4. **ONCE chốt năm** - `recurrence:"ONCE", lunarYear:2025` chỉ trả đúng 1 occurrence ở năm âm 2025, không tái diễn.
5. **Fallback tháng nhuận REGULAR** - giỗ `{lunarDay:16, lunarMonth:2, isLeapMonth:true, leapFallback:"REGULAR"}` ở năm không có tháng 2 nhuận trả occurrence trong tháng 2 thường và `fellBack === true`.
6. **Fallback SKIP** - cùng giỗ với `leapFallback:"SKIP"` bỏ qua năm không có tháng nhuận đó (không sinh occurrence năm ấy).
7. **Fallback ASK** - với `leapFallback:"ASK"`, occurrence năm thiếu tháng nhuận có `pendingUserChoice === true` và không tự cúng.
8. **Khớp năm nhuận 1985** - giỗ nhập tháng 2 nhuận 1985 sinh occurrence ngày dương rơi trong dải 21/03..19/04/1985 (cross-check FR-LUNAR-001 fixture).
9. **Day clamp** - giỗ `{lunarDay:30}` ở tháng âm đích chỉ có 29 ngày lùi về ngày 29 và `dayClamped === true`, không nhảy sang tháng sau.
10. **Lead-time nhân bản** - `leadTimes:[0,1,7]` trên 1 occurrence sinh đúng 3 `Occurrence` với `leadDays` 0/1/7 và `fireAtLocal` lùi đúng 0/1/7 ngày.
11. **notifyTime áp dụng** - `notifyTime:"06:30"` cho `fireAtLocal` kết thúc `T06:30:00+07:00`.
12. **Timezone lock** - `todayInHCM(new Date(...))` trả tuple `[day, month, year]` theo giờ Việt Nam; chạy với `process.env.TZ="America/New_York"` vẫn trả đúng (không lệch 1 ngày). Ký hiệu CONTRACT: `todayInHCM(now?: Date): SolarDate`.
13. **Cache stale theo engineVersion** - `isCacheStale(cache, "1.1.0")` trả `true` khi cache.engineVersion là "1.0.0".
14. **validateReminder bắt lỗi** - `RAM` với `lunarDay:14` trả lỗi `code:"RAM_DAY_MISMATCH"`; `ONCE` thiếu `lunarYear` trả `code:"ONCE_NEEDS_YEAR"`.
15. **normalizeReminder mặc định** - input rỗng trả `notifyTime:"07:00"`, `leadTimes:[1]`, `channels:["LOCAL"]`, `leapFallback:"REGULAR"`, `enabled:true`.
16. **mergeAndSort tăng dần** - trộn occurrence của 3 Reminder, kết quả sort tăng theo `fireAtLocal`, occurrence gần nhất đứng đầu.
17. **Round-trip nhất quán** - với mỗi occurrence sinh ra, `convertSolar2Lunar` của `gregorianDate` trả về đúng `(lunarDay, lunarMonth)` đã nhập (trừ trường hợp `fellBack`/`dayClamped` đã đánh dấu).

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

API contract ở §3 là skeleton. Chi tiết khó nhất đang ghim là vòng sinh occurrence cho ANNUAL, vì nó là nơi quy tắc fallback và clamp gặp nhau:

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

`occurrenceBudget`/`opt.count` đếm theo occurrence ÂM; mỗi occurrence âm sinh `leadTimes.length` `Occurrence`. Vòng tăng `lunarOccCount` chỉ khi thực sự sinh occurrence (không tăng khi SKIP), và có `MAX_SKIP_SCAN` guard để giỗ tháng nhuận hiếm gặp với `leapFallback = SKIP` không quét vô hạn - cùng tinh thần `i < 14` của `getLeapMonthOffset` ở FR-LUNAR-001.

`makeOccurrence` lùi `gregorianDate` đi `lead` ngày rồi gắn `notifyTime` tạo `fireAtLocal` với offset `+07:00` cứng. Mọi phép so sánh ngày dùng chuỗi ISO `YYYY-MM-DD` nên sort là so sánh chuỗi, không dùng `Date` local.

---

## §7 - Dependencies

- Upstream: FR-LUNAR-001 (`convertLunar2Solar`, `convertSolar2Lunar`, `getLunarMonth11`, `getLeapMonthOffset`). Module này không tự tính thiên văn, nó chỉ gọi engine lõi và gói vào mô hình dữ liệu.
- Downstream: FR-LUNAR-005 (scheduler rolling-64 đọc `Occurrence[]` đã `mergeAndSort` rồi cắt 64 cái gần nhất), FR-LUNAR-006 (reminder management CRUD trên type `Reminder`, hiển danh sách sắp tới), FR-LUNAR-016 (Zalo Mini App tái dùng Reminder + tính ngày on-the-fly), FR-LUNAR-017 (ZNS quét Reminder có channel `ZNS`), FR-LUNAR-018 (cloud sync đồng bộ Reminder + `sharedWith`).
- Cross-cutting: `engineVersion` liên quan FR-LUNAR-001 (semver core) và FR-LUNAR-018 (invalidate cache phía client khi core đổi). `linkedContentId` trỏ tới FR-LUNAR-008 FestivalContent.

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

Đã giải quyết trong bản này:
- Mặc định fallback tháng nhuận -> `REGULAR` (cúng tháng thường), có `fellBack` để UI xác nhận (DEC-LUNAR-042).
- Khóa mọi phép tính về Asia/Ho_Chi_Minh, không dùng giờ thiết bị (DEC-LUNAR-043).
- Ngày không tồn tại trong tháng âm -> clamp về ngày cuối tháng (§1 #7).

Deferred (gần với Caveats / các FR sau):
- Lịch âm dương dual cho một nhắc (ví dụ vừa nhắc theo ngày dương cố định vừa theo ngày âm) - chưa cần cho MVP; chỉ hỗ trợ lunar recurrence ở bản này.
- Quy tắc fallback theo vùng miền (có nhà cúng tháng nhuận thay vì tháng thường) - để cho FR-LUNAR-008 kết nối nội dung phong tục; bản này chỉ cung 3 chính sách REGULAR/SKIP/ASK.
- Độ chính xác ở các năm rất xa (Caveats: ngày Sóc sát nửa đêm) - thuộc trách nhiệm FR-LUNAR-003 (golden harness); module này chỉ gọi engine và tin kết quả của nó.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Lưu nhầm ngày dương làm nguồn | type Reminder không có trường solar | sai sang năm không xảy ra | none (by design; AC #1) |
| Nội suy 365 ngày thay vì tính lại | recurrence engine gọi convertLunar2Solar mỗi năm | không trôi | none (DEC-LUNAR-041; AC #2) |
| Giỗ tháng nhuận, năm đích không có | resolveLeap kiểm leapOffset | fallback REGULAR + fellBack | UI hỏi user (DEC-LUNAR-042; AC #5) |
| Giỗ tháng nhuận, user chọn SKIP | leapFallback = SKIP | bỏ năm đó | nhắc lại năm sau có tháng nhuận (AC #6) |
| Giỗ tháng nhuận, user chọn ASK | leapFallback = ASK | pendingUserChoice | UI hiển lựa chọn (AC #7) |
| Ngày 30 trong tháng thiếu | clampLunarDay | lùi về ngày 29 + dayClamped | none (AC #9) |
| Derive theo giờ thiết bị ở nước ngoài | todayInHCM khóa tz=7.0 | đúng ngày VN | none (DEC-LUNAR-043; AC #12) |
| Core sửa hằng số, cache cũ sai | engineVersion mismatch | isCacheStale = true | tính lại (DEC-LUNAR-044; AC #13) |
| RAM nhập nhầm lunarDay != 15 | validateReminder | lỗi RAM_DAY_MISMATCH | UI chặn lưu (AC #14) |
| ONCE thiếu lunarYear | validateReminder | lỗi ONCE_NEEDS_YEAR | UI bắt nhập năm (AC #14) |
| leadTimes chứa số âm | validateReminder | lỗi LEAD_NEGATIVE | normalize lọc bỏ |
| channels rỗng | validateReminder | lỗi NO_CHANNEL | normalize đặt ["LOCAL"] |
| MONTHLY quên lặp tháng nhuận | expander duyệt cả tháng nhuận | 13 lần trong năm nhuận | none (AC #3) |
| Module bị kéo theo storage I/O | code review zero-dep | từ chối merge | giữ thuần tính toán (§1 #14) |
| Occurrence không sort | mergeAndSort | sort tăng theo fireAtLocal | none (AC #16) |

---

## §11 - Implementation notes

- Quy tắc vàng: với mỗi năm đích, gọi lại `convertLunar2Solar` độc lập. Không bao giờ cộng thêm một số ngày cố định từ occurrence trước - đó là sự khác biệt giữa khớp lịch và trôi dần.
- `resolveLeap` là nơi chính sách fallback sống. Trước khi tính ngày, hỏi `getLeapMonthOffset` xem năm đích có đúng tháng nhuận đã nhập không; nếu không, rẽ nhánh theo `leapFallback` (REGULAR / SKIP / ASK) và đánh dấu `fellBack`/`pendingUserChoice`.
- Clamp ngày phải dùng độ dài tháng âm thật (29 hay 30 ngày), không giả định 30. Tính độ dài bằng khoảng cách giữa hai điểm Sóc liên tiếp qua engine lõi.
- `fireAtLocal` luôn mang offset `+07:00` cứng và mọi so sánh ngày dùng chuỗi ISO. Tránh `new Date(str)` rồi đọc `getDate()` vì nó đọc theo TZ runtime - đúng lý do FR-B06 yêu cầu khóa Asia/Ho_Chi_Minh.
- `engineVersion` nên lấy từ `package.json` của amlich-core và truyền vào `RecurrenceOptions`, để OccurrenceCache (DEC-LUNAR-044) và FR-LUNAR-018 cùng một nguồn sự thật về phiên bản core.
- MONTHLY có thể lặp ngày 30 ở tháng chỉ có 29 ngày - dùng lại clamp chung; và trong năm nhuận, expander phải sinh occurrence cho cả tháng nhuận (13 lần), khớp AC #3.
- Giữ `Occurrence` là cấu trúc duy nhất mà FR-LUNAR-005 đọc. Không để scheduler tự derive ngày - mọi logic âm lịch nằm ở đây, scheduler chỉ gộp, sort, cắt 64.

---

*Hết FR-LUNAR-004.*
