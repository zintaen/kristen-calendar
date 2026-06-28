---
id: FR-LUNAR-016
title: "Zalo Mini App client - React + zmp-ui + zmp-sdk/apis, import amlich-core, zmp Storage cho settings/nhac, consent getUserInfo/getPhoneNumber"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P3
milestone: P3 · slice 6
slice: 6
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-004, FR-LUNAR-017]
depends_on: [FR-LUNAR-004, FR-LUNAR-008, FR-LUNAR-009]
blocks: [FR-LUNAR-017, FR-LUNAR-019]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (Zalo client, System Architecture)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#14 (Phase 3)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Key Findings 3 (Zalo reach)"
source_decisions:
  - DEC-LUNAR-160 (Mini App chạy trên React + zmp-ui + zmp-sdk, import amlich-core trực tiếp; không duplicate logic âm lịch)
  - DEC-LUNAR-161 (zmp Storage có dung lượng giới hạn -> chỉ lưu settings và danh sách Reminder; tính ngày dương on-the-fly qua amlich-core, không cache đầy đủ)
  - DEC-LUNAR-162 (Mini App không thể tự gửi push notification kiểu native; mọi kênh nhắc qua Zalo phải dùng ZNS trong FR-LUNAR-017)
  - DEC-LUNAR-163 (getUserInfo và getPhoneNumber đòi hỏi consent tường minh của người dùng trước khi gọi; không gọi ngầm; số điện thoại chỉ giữ để chuyển cho ZNS sender, không lưu lâu hơn cần thiết)
  - DEC-LUNAR-164 (zalo/ là package riêng trong monorepo, import @cyberskill/amlich-core và @cyberskill/genie-content từ packages/)
  - DEC-LUNAR-165 (purple theme từ FR-LUNAR-009 áp dụng qua CSS variables; zmp-ui component được wrap hoặc styled để phù hợp sub-brand tím)
language: typescript 5.x (react + zmp-sdk)
service: zalo/
new_files:
  - zalo/src/app.tsx
  - zalo/src/pages/home/index.tsx
  - zalo/src/pages/calendar/index.tsx
  - zalo/src/pages/reminder-list/index.tsx
  - zalo/src/pages/reminder-form/index.tsx
  - zalo/src/pages/festival-detail/index.tsx
  - zalo/src/pages/settings/index.tsx
  - zalo/src/lib/storage.ts
  - zalo/src/lib/reminder-service.ts
  - zalo/src/lib/zalo-auth.ts
  - zalo/src/lib/day-computer.ts
  - zalo/src/components/lunar-day-cell.tsx
  - zalo/src/components/reminder-card.tsx
  - zalo/src/components/consent-sheet.tsx
  - zalo/src/types/index.ts
  - zalo/app-config.json
  - zalo/package.json
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: "zalo/**"
  - file_read: "packages/amlich-core/**"
  - file_read: "packages/content/**"
  - file_write: "zalo/**"
  - bash: "cd zalo && npx zmp build --check"
disallowed_tools:
  - "gọi network để tính ngày âm lịch (vi phạm DEC-LUNAR-160 / NFR-Offline)"
  - "gọi getUserInfo hoặc getPhoneNumber trước khi có consent tường minh (vi phạm DEC-LUNAR-163 / NFR-Privacy)"
  - "lưu toàn bộ OccurrenceCache vào zmp Storage (vi phạm DEC-LUNAR-161 - Storage nhỏ)"
  - "tự gửi push notification trong Mini App (vi phạm DEC-LUNAR-162 - phải dùng ZNS)"
effort_hours: 14
sub_tasks:
  - "1.5h: khởi tạo zalo/ package - app-config.json, package.json, tsconfig; kết nối zmp-ui + zmp-sdk"
  - "1.5h: storage.ts - đọc/ghi Settings và Reminder[] vào zmp Storage; serialize/deserialize an toàn"
  - "1.5h: zalo-auth.ts - flow consent: hiện ConsentSheet, gọi getUserInfo; gọi getPhoneNumber chỉ khi ZNS được bật"
  - "2.0h: day-computer.ts - wrap amlich-core; tính DayInfo cho ngày hiện tại + range; getUpcomingOccurrences"
  - "2.0h: trang Home + CalendarGrid: hiện ngày âm hôm nay, lưới tháng, đánh dấu lễ"
  - "2.0h: trang ReminderList + ReminderForm: CRUD Reminder trong zmp Storage; validate lead-time + notifyTime"
  - "1.5h: trang FestivalDetail: load FestivalContent từ packages/content; hiện ý nghĩa + mâm cúng"
  - "1.0h: Settings: bật/tắt ZNS, hiển thị thông tin tài khoản Zalo, xóa dữ liệu"
  - "1.0h: styling - áp purple theme tokens từ FR-LUNAR-009 lên zmp-ui components"
risk_if_skipped: "Không có Zalo Mini App thì không thể tiếp cận ~80 triệu người dùng Zalo qua kênh phân phối mạnh nhất Việt Nam (Key Findings 3). FR-LUNAR-017 (ZNS) phụ thuộc trực tiếp vào FR này để lấy số điện thoại và danh sách Reminder đã đồng ý ZNS; không có client Zalo thì toàn bộ Phase 3 thương mại hóa bị chặn. FR-LUNAR-019 (PDPL) cũng cần các màn hình consent được xây dựng ở đây."
---

## §1 - Description (BCP-14 normative)

Zalo Mini App "Genie Âm Lịch" PHẢI chạy trong Zalo trên nền React + `zmp-ui` + `zmp-sdk/apis`, chia sẻ logic tính lịch với các client khác bằng cách import trực tiếp `@cyberskill/amlich-core`, và lưu trạng thái người dùng vào `zmp Storage`. Đây là contract:

1. PHẢI khởi tạo Mini App đúng cú pháp `zmp-sdk` (`zmp.init()` trong `app.tsx`), cấu hình `app-config.json` với `appId`, `permissions` (bao gồm `scope.userInfo`, `scope.phone`, `scope.location` khai báo rõ ràng), và version (DEC-LUNAR-160).
2. PHẢI import `convertSolar2Lunar`, `convertLunar2Solar`, `canChi`, và các hàm liên quan từ `@cyberskill/amlich-core` để tính lịch on-device; KHÔNG ĐƯỢC gọi bất kỳ network request nào để tính ngày âm lịch (DEC-LUNAR-160).
3. PHẢI sử dụng `zmp Storage` (API `getStorage`/`setStorage` từ `zmp-sdk`) để lưu `Settings` của người dùng và mảng `Reminder[]`; vì Storage có dung lượng giới hạn, chỉ lưu các trường cần thiết của `Reminder` (xem §3) và tính `OccurrenceCache` on-the-fly mỗi lần hiển thị, KHÔNG lưu đầy đủ cache (DEC-LUNAR-161).
4. PHẢI hiển thị trang chủ (Home) với: ngày dương hôm nay, ngày âm tương ứng, can-chi ngày, các nhắc sắp tới trong 7 ngày, và nút truy cập nhanh vào CalendarGrid.
5. PHẢI hiển thị CalendarGrid lưới tháng: mỗi ô có ngày dương lớn + ngày âm nhỏ góc + điểm màu nếu ngày có Reminder hoặc lễ âm lịch từ `@cyberskill/genie-content`.
6. PHẢI cho phép người dùng xem, tạo, sửa, xóa `Reminder` (type: `RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL`) với `lunarDay`, `lunarMonth`, `isLeapMonth`, `leadTimes`, `notifyTime`, `channels` (chỉ `ZNS` khả dụng trên Zalo client), và `linkedContentId`.
7. KHÔNG ĐƯỢC gọi `getUserInfo` mà không có consent tường minh của người dùng; PHẢI hiển thị `ConsentSheet` (màn hình xin quyền) với giải thích rõ ràng trước khi gọi `apis.getUserInfo({ avatarSize: 240 })` (DEC-LUNAR-163).
8. PHẢI gọi `apis.getPhoneNumber()` chỉ khi người dùng bật kênh ZNS trong Settings VÀ đã xác nhận consent ZNS; số điện thoại chỉ được lưu vào trường `User.phone` để chuyển cho ZNS sender (FR-LUNAR-017), KHÔNG dùng cho mục đích khác (DEC-LUNAR-163).
9. PHẢI xử lý trường hợp người dùng từ chối consent `getUserInfo` hoặc `getPhoneNumber` một cách thanh nhã: ẩn các chức năng phụ thuộc quyền đó (hiển thị thông báo giải thích) nhưng KHÔNG chạy lỗi toàn bộ app.
10. PHẢI hiển thị trang `FestivalDetail` cho mỗi lễ âm lịch, load nội dung từ `@cyberskill/genie-content` (`FestivalContent`); đảm bảo liên kết từ Reminder tới FestivalDetail qua `linkedContentId` (FR-LUNAR-008).
11. PHẢI áp dụng purple theme từ `@cyberskill/genie-ui` (tokens từ FR-LUNAR-009) lên các component `zmp-ui`; KHÔNG ĐƯỢC dùng màu mặc định của `zmp-ui` cho các thành phần chính (DEC-LUNAR-165).
12. NÊN lấy `getLocation` (vị trí) để gợi ý múi giờ local nếu người dùng ở nước ngoài; tuy nhiên mọi tính toán âm lịch PHẢI được khóa về `timezone = "Asia/Ho_Chi_Minh"` (UTC+7, kinh tuyến 105E) theo DEC-LUNAR-160 và FR-LUNAR-004.
13. KHÔNG ĐƯỢC tự gửi push notification cho người dùng từ bên trong Mini App; mọi chức năng nhắc phải thông qua ZNS (FR-LUNAR-017) khi đã có số điện thoại và consent hợp lệ (DEC-LUNAR-162).
14. PHẢI cung cấp trang Settings cho phép người dùng bật/tắt kênh ZNS, xem tên hiển thị Zalo, và xóa toàn bộ dữ liệu đã lưu (xóa `zmp Storage`).
15. NÊN cache danh sách `UpcomingOccurrence` (các ngày dương tiếp theo của mỗi Reminder trong 30 ngày tới) trong bộ nhớ ứng dụng (React state/context) để giảm gọi tính lại khi render; reset cache khi Reminder thay đổi.

---

## §2 - Why this design (rationale for humans)

**Tại sao dùng zmp-ui + zmp-sdk thay vì web components thuần?** Zalo Mini App yêu cầu dùng `zmp-sdk` để khởi tạo ứng dụng và truy cập các API của nền tảng (getUserInfo, getPhoneNumber, Storage). `zmp-ui` là bộ component được Zalo chứng nhận, đảm bảo Mini App phù hợp quy để duyệt của Zalo và có cảm giác native trên nền tảng. Không dùng các bộ component khác tránh rủi ro bị từ chối khi xét duyệt (DEC-LUNAR-160).

**Tại sao import amlich-core trực tiếp thay vì gọi API?** `@cyberskill/amlich-core` là TypeScript thuần, zero-dependency, chạy được trong mọi môi trường JavaScript kể cả runtime của Zalo Mini App. Import trực tiếp loại bỏ latency mạng, giữ offline hoạt động, và đảm bảo nhất quán tuyệt đối với các client khác (DEC-LUNAR-160, NFR-Offline).

**Tại sao zmp Storage chỉ lưu settings và danh sách Reminder, không lưu cache?** Dung lượng `zmp Storage` bị giới hạn (theo tài liệu Zalo, tổng storage mỗi Mini App nhỏ); lưu `OccurrenceCache` đầy đủ cho nhiều năm sẽ nhanh vượt giới hạn. Tính `convertLunar2Solar` cho 30 ngày tới chỉ mất vài ms (NFR-Performance), nên tính lại mỗi lần hiển thị là hợp lý và không tốn kém (DEC-LUNAR-161).

**Tại sao consent tường minh trước getUserInfo và getPhoneNumber?** PDPL (hiệu lực 01/01/2026) và chính sách Zalo đều yêu cầu người dùng đồng ý trước khi ứng dụng thu thập dữ liệu cá nhân. Số điện thoại là dữ liệu nhạy cảm theo PDPL; gọi `getPhoneNumber` ngầm là vi phạm. ConsentSheet mô tả rõ ràng mục đích sử dụng số điện thoại (chỉ để nhận nhắc ZNS) trước khi yêu cầu (DEC-LUNAR-163, NFR-Privacy/PDPL).

**Tại sao không tự gửi push notification?** Đây là hạn chế kỹ thuật cứng của nền tảng Zalo Mini App - API push native không tồn tại cho Mini App. Mọi nhắc Zalo bắt buộc phải đi qua ZNS của OA đã đăng ký. Thiết kế FR-016 nhận thức điều này từ đầu và chuyển trách nhiệm nhắc hoàn toàn sang FR-LUNAR-017 (DEC-LUNAR-162).

**Tại sao purple theme từ FR-LUNAR-009 thay vì zmp-ui mặc định?** Sub-brand tím là yếu tố nhận diện sản phẩm và trải nghiệm người dùng nhất quán trên mọi nền tảng (FR-LUNAR-009, mục §13 PRD). zmp-ui có thể được styled qua CSS variables mà không vi phạm hướng dẫn Zalo. Override chỉ áp dụng lên token màu, giữ nguyên cấu trúc component để Mini App vẫn qua duyệt (DEC-LUNAR-165).

**Tại sao zalo/ là package riêng trong monorepo?** Mini App có build toolchain riêng (`zmp build`, `zmp deploy`) khác hoàn toàn với Next.js hay Capacitor. Tách ra giúp CI/CD không bị ảnh hưởng chéo nhau và giữ rõ ràng ranh giới giữa các client (DEC-LUNAR-164).

---

## §3 - API contract

```typescript
// zalo/src/types/index.ts

export type ReminderType = "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
export type ReminderChannel = "ZNS";

export interface ZaloReminder {
  id: string;
  type: ReminderType;
  title: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear?: number;       // null = lặp lại hàng năm/hàng tháng tùy recurrence
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE"; // PHẢI có để phân biệt MONTHLY (Rằm/Mùng Một) và ANNUAL (đám giỗ)
  leadTimes: number[];      // số ngày trước: [0] = đúng ngày, [1] = trước 1 ngày, v.v.
  notifyTime: string;       // "HH:MM" theo Asia/Ho_Chi_Minh
  channels: ReminderChannel[];
  linkedContentId?: string;
  enabled: boolean;
}

export interface ZaloSettings {
  znsEnabled: boolean;
  displayName?: string;     // lấy từ getUserInfo, lưu local
  phone?: string;           // lấy từ getPhoneNumber, lưu local để gửi ZNS
  consentFlags: {
    userInfoGranted: boolean;
    phoneGranted: boolean;
  };
}

export interface StorageData {
  settings: ZaloSettings;
  reminders: ZaloReminder[];
}

export interface UpcomingOccurrence {
  reminderId: string;
  reminderTitle: string;
  solarDate: string;        // "YYYY-MM-DD"
  lunarLabel: string;       // ví dụ "15/7 Ất Tỵ (nhuận)"
  daysUntil: number;
}
```

```typescript
// zalo/src/lib/storage.ts
import { getStorage, setStorage } from "zmp-sdk/apis";
import type { StorageData, ZaloReminder, ZaloSettings } from "../types";

const STORAGE_KEY = "genie_amlich_v1";

export async function loadStorageData(): Promise<StorageData> { /* ... */ }
export async function saveReminders(reminders: ZaloReminder[]): Promise<void> { /* ... */ }
export async function saveSettings(settings: ZaloSettings): Promise<void> { /* ... */ }
export async function clearAll(): Promise<void> {
  await setStorage({ key: STORAGE_KEY, data: null });
}
```

```typescript
// zalo/src/lib/zalo-auth.ts
import { getUserInfo, getPhoneNumber } from "zmp-sdk/apis";

export interface ZaloUserInfo {
  id: string;
  name: string;
  avatar: string;
}

// Gọi sau khi người dùng đã bấm đồng ý trên ConsentSheet
export async function fetchUserInfo(): Promise<ZaloUserInfo> {
  const result = await getUserInfo({ avatarSize: 240 });
  return {
    id: result.userInfo.id,
    name: result.userInfo.name,
    avatar: result.userInfo.avatar,
  };
}

// Chỉ gọi khi znsEnabled = true và phoneGranted = false
export async function fetchPhoneNumber(): Promise<string> {
  const result = await getPhoneNumber({});
  // result.token -> chuyển lên server để đổi lấy số điện thoại thực qua OA API
  return result.token;
}
```

```typescript
// zalo/src/lib/day-computer.ts
import {
  convertSolar2Lunar,
  convertLunar2Solar,
  canChiDay,
  todayInHCM,
  type LunarDate,
  type SolarDate,
} from "@cyberskill/amlich-core";

const TZ = 7.0; // UTC+7, kinh tuyến 105E, DEC-LUNAR-160

export function todayLunar(): LunarDate {
  // KHÓA về Asia/Ho_Chi_Minh, KHÔNG dùng now.getDate()/getMonth() (đọc theo TZ thiết bị,
  // sai khi người dùng ở nước ngoài - vi phạm §1 #12, AC #14). todayInHCM từ FR-LUNAR-004.
  // todayInHCM() trả TUPLE SolarDate = [dd, mm, yy] - KHÔNG đọc .dd/.mm/.yy (không tồn tại).
  const [dd, mm, yy] = todayInHCM();
  return convertSolar2Lunar(dd, mm, yy, TZ);
}

export function getUpcomingOccurrences(
  reminders: import("../types").ZaloReminder[],
  daysAhead: number = 30
): import("../types").UpcomingOccurrence[] {
  // Với mỗi reminder, gọi convertLunar2Solar cho năm hiện tại và năm tới,
  // lọc trong khoảng [hôm nay, hôm nay + daysAhead], trả về mảng sắp xếp tăng dần.
  // ...
}
```

```typescript
// zalo/src/lib/reminder-service.ts
import type { ZaloReminder } from "../types";
import { loadStorageData, saveReminders } from "./storage";

export async function getReminders(): Promise<ZaloReminder[]> { /* ... */ }
export async function upsertReminder(r: ZaloReminder): Promise<void> { /* ... */ }
export async function deleteReminder(id: string): Promise<void> { /* ... */ }
```

```typescript
// zalo/app-config.json (phần trích)
{
  "app": {
    "title": "Genie Âm Lịch",
    "icon": "assets/icon.png",
    "permissions": [
      { "type": "scope.userInfo", "description": "Hiện thi tên bạn trên ứng dụng" },
      { "type": "scope.phone",    "description": "Gửi nhắc qua Zalo (ZNS) theo số điện thoại bạn" }
    ]
  }
}
```

---

## §4 - Acceptance criteria

1. Mini App khởi động thành công trên Zalo DevTools và thiết bị thật; `zmp.init()` không lỗi; màn hình Home hiển thị ngày âm hôm nay chính xác (đối chiếu với bộ fixtures FR-LUNAR-003).
2. CalendarGrid render đúng lưới tháng với ngày âm góc mỗi ô, can-chi ngày, và điểm màu trên các ngày có Reminder hoặc lễ trong `@cyberskill/genie-content`; click vào ô ngày mở chi tiết ngày.
3. Người dùng tạo được Reminder type `GIO` với `lunarDay=15`, `lunarMonth=7`, `isLeapMonth=false`, `leadTimes=[1]`, `notifyTime="07:00"`, `channels=["ZNS"]`; Reminder được lưu vào `zmp Storage` và xuất hiện trên ReminderList.
4. `getUpcomingOccurrences` trả về ngày dương đúng cho Reminder `GIO` trên, đối chiếu bằng tay với `convertLunar2Solar` từ `amlich-core`.
5. Khi lần đầu mở app, `getUserInfo` CHƯA được gọi; ConsentSheet hiển thị khi người dùng thử chức năng cần quyền; sau khi từ chối, app không crash và các chức năng không cần quyền vẫn chạy bình thường.
6. Khi người dùng bật ZNS trong Settings mà chưa cấp quyền số điện thoại, ConsentSheet ZNS hiển thị trước; sau khi cấp quyền, `getPhoneNumber` được gọi và token được lưu vào `Settings.phone`.
7. `zmp Storage` chỉ chứa dữ liệu `StorageData` (settings + reminders); không có `OccurrenceCache` nào được lưu vào Storage.
8. Purple theme (màu tím tối, nền kem) hiển thị đúng trên các component chính (header, nút, card); không có màu mặc định xanh của `zmp-ui` xuất hiện trên các thành phần đã được styled.
9. Trang FestivalDetail hiển thị đúng nội dung `FestivalContent` cho "Rằm tháng Bảy" (id tương ứng trong `packages/content`), bao gồm `meaning`, `offerings`, và `checklist`.
10. Xóa dữ liệu trong Settings xóa sạch `zmp Storage` và reset state của app về trạng thái mặc định (không còn Reminder, consent = false).
11. Reminder với `type=RAM` (Rằm; ngày 15 âm) hiển thị đúng trên Home trong mục "Sắp tới" khi Rằm tháng này còn cách dưới 7 ngày.
12. Mini App không gọi bất kỳ API mạng nào khi hiển thị lịch tháng hoặc tính ngày âm (kiểm tra bằng DevTools Network tab); log xác nhận chỉ dùng amlich-core.
13. `app-config.json` khai báo đầy đủ `scope.userInfo` và `scope.phone` trong mục `permissions`; build `zmp build` không có warning về quyền khai thiếu.
14. Khi người dùng dùng ứng dụng ở nước ngoài (thiết lập timezone khác trên thiết bị), app vẫn hiển thị lịch theo `Asia/Ho_Chi_Minh` cho phép tính ngày âm (DEC-LUNAR-160).

---

## §5 - Verification

```typescript
// zalo/src/lib/__tests__/day-computer.test.ts
import { describe, it, expect } from "vitest";
import { todayLunar, getUpcomingOccurrences } from "../day-computer";
import type { ZaloReminder } from "../../types";

describe("day-computer", () => {
  it("tính đúng ngày âm 29/01/2025 = 1/1/2025 Ất Tỵ", () => {
    // fixture từ PRD 6.6
    // Mock Date.now() -> 29/01/2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-29T10:00:00+07:00"));
    // todayLunar() trả về LunarDate = [day, month, year, leap] (tuple, FR-LUNAR-001)
    const [lunarDay, lunarMonth, lunarYear] = todayLunar();
    expect(lunarDay).toBe(1);
    expect(lunarMonth).toBe(1);
    expect(lunarYear).toBe(2025);
    vi.useRealTimers();
  });

  it("getUpcomingOccurrences trả về ngày dương đúng cho GIO 15/7", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T08:00:00+07:00"));
    const reminder: ZaloReminder = {
      id: "r1", type: "GIO", title: "Giỗ bà",
      lunarDay: 15, lunarMonth: 7, isLeapMonth: false,
      recurrence: "ANNUAL",
      leadTimes: [0, 1], notifyTime: "07:00",
      channels: ["ZNS"], enabled: true,
    };
    const occurrences = getUpcomingOccurrences([reminder], 60);
    // 15/7 Ất Tỵ 2025 = 08/08/2025 dương lịch (đối chiếu thủ công)
    const main = occurrences.find(o => o.daysUntil >= 0 && !o.lunarLabel.includes("truoc"));
    expect(main?.solarDate).toBe("2025-08-08");
    vi.useRealTimers();
  });

  it("Reminder GIO tháng nhuận - năm không có tháng nhuận fallback về tháng thường", () => {
    const reminder: ZaloReminder = {
      id: "r2", type: "GIO", title: "Giỗ ông",
      lunarDay: 10, lunarMonth: 2, isLeapMonth: true,
      recurrence: "ANNUAL",
      leadTimes: [0], notifyTime: "07:00",
      channels: ["ZNS"], enabled: true,
    };
    // Năm không có tháng 2 nhuận -> nên fallback về tháng 2 thường (không crash)
    const occurrences = getUpcomingOccurrences([reminder], 400);
    expect(occurrences.length).toBeGreaterThan(0);
  });
});

describe("storage", () => {
  it("saveReminders và loadStorageData round-trip", async () => {
    // Mock zmp-sdk getStorage/setStorage
    const mockStorage: Record<string, unknown> = {};
    vi.mock("zmp-sdk/apis", () => ({
      getStorage: vi.fn(async ({ key }: { key: string }) => ({ data: mockStorage[key] ?? null })),
      setStorage: vi.fn(async ({ key, data }: { key: string; data: unknown }) => { mockStorage[key] = data; }),
      getUserInfo: vi.fn(),
      getPhoneNumber: vi.fn(),
    }));

    const { saveReminders, loadStorageData } = await import("../storage");
    const reminders: ZaloReminder[] = [
      { id: "r1", type: "RAM", title: "Rằm", lunarDay: 15, lunarMonth: 1,
        isLeapMonth: false, recurrence: "MONTHLY", leadTimes: [1], notifyTime: "07:00",
        channels: ["ZNS"], enabled: true },
    ];
    await saveReminders(reminders);
    const loaded = await loadStorageData();
    expect(loaded.reminders).toHaveLength(1);
    expect(loaded.reminders[0].id).toBe("r1");
  });
});

describe("zalo-auth consent guard", () => {
  it("fetchUserInfo được gọi -> trả về name và avatar", async () => {
    vi.mock("zmp-sdk/apis", () => ({
      getUserInfo: vi.fn(async () => ({
        userInfo: { id: "uid1", name: "Chị Linh", avatar: "https://example.com/a.jpg" },
      })),
      getPhoneNumber: vi.fn(),
    }));
    const { fetchUserInfo } = await import("../zalo-auth");
    const info = await fetchUserInfo();
    expect(info.name).toBe("Chị Linh");
  });

  it("fetchPhoneNumber trả về token (không số thực - cần đổi qua OA API)", async () => {
    vi.mock("zmp-sdk/apis", () => ({
      getPhoneNumber: vi.fn(async () => ({ token: "zalo_phone_token_abc" })),
      getUserInfo: vi.fn(),
    }));
    const { fetchPhoneNumber } = await import("../zalo-auth");
    const token = await fetchPhoneNumber();
    expect(token).toBe("zalo_phone_token_abc");
  });
});
```

---

## §6 - Implementation skeleton

Contract đầy đủ ở §3. Chi tiết cần ghi nhớ:

```typescript
// zalo/src/app.tsx
import { App } from "zmp-ui";
import zmp from "zmp-sdk";

// zmp.init() PHẢI được gọi trước bất kỳ API zmp-sdk nào
zmp.init();

export default function GenieMiniApp() {
  return <App /* routing config */ />;
}
```

Điểm khó nhất là `getPhoneNumber` của Zalo trả về `token`, không phải số điện thoại thực. Số điện thoại thực chỉ lấy được khi server gọi OA API với token đó. Logic này phải nằm ở phía server (FR-LUNAR-017); client chỉ giữ token và chuyển lên khi khởi tạo ZNS subscription.

---

## §7 - Dependencies

Upstream: **FR-LUNAR-004** (`Reminder` data model và `recurrence` logic được tham chiếu trong `ZaloReminder`; amlich-core là sản phẩm của FR-001 mà FR-004 phụ thuộc). **FR-LUNAR-008** (`FestivalContent` từ `packages/content` dùng cho FestivalDetail và điểm màu trên CalendarGrid). **FR-LUNAR-009** (purple theme tokens được import vào styling của Zalo Mini App).

Downstream: **FR-LUNAR-017** (ZNS sender cần `User.phone` (token) và danh sách `Reminder` có `channels: ["ZNS"]` được xây dựng ở FR này). **FR-LUNAR-019** (PDPL consent layer cần các màn hình và cờ `consentFlags` được xây dựng ở FR này).

Cross-cutting: `@cyberskill/amlich-core` được chia sẻ với `apps/web/` và `ios/App/`; mọi thay đổi breaking change ở amlich-core cần cập nhật cả ba client.

---

## §8 - Example payloads

```json
{
  "key": "genie_amlich_v1",
  "data": {
    "settings": {
      "znsEnabled": true,
      "displayName": "Chị Linh",
      "phone": "zalo_phone_token_xyz",
      "consentFlags": {
        "userInfoGranted": true,
        "phoneGranted": true
      }
    },
    "reminders": [
      {
        "id": "rem-001",
        "type": "GIO",
        "title": "Giỗ Bà Nội",
        "lunarDay": 15,
        "lunarMonth": 7,
        "lunarYear": null,
        "isLeapMonth": false,
        "recurrence": "ANNUAL",
        "leadTimes": [0, 1],
        "notifyTime": "07:00",
        "channels": ["ZNS"],
        "linkedContentId": "festival-vu-lan",
        "enabled": true
      },
      {
        "id": "rem-002",
        "type": "RAM",
        "title": "Rằm hàng tháng",
        "lunarDay": 15,
        "lunarMonth": 0,
        "isLeapMonth": false,
        "recurrence": "MONTHLY",
        "leadTimes": [1],
        "notifyTime": "06:30",
        "channels": ["ZNS"],
        "enabled": true
      }
    ]
  }
}
```

```json
{
  "upcomingOccurrences": [
    {
      "reminderId": "rem-001",
      "reminderTitle": "Giỗ Bà Nội (trước 1 ngày)",
      "solarDate": "2025-08-07",
      "lunarLabel": "14/7 Ất Tỵ",
      "daysUntil": 1
    },
    {
      "reminderId": "rem-001",
      "reminderTitle": "Giỗ Bà Nội",
      "solarDate": "2025-08-08",
      "lunarLabel": "15/7 Ất Tỵ",
      "daysUntil": 2
    }
  ]
}
```

---

## §9 - Open questions

Đã giải quyết:
- Cấu trúc `zmp Storage` (key duy nhất vs. nhiều key): chọn 1 key duy nhất `genie_amlich_v1` để giảm số lần gọi API Storage.
- `getPhoneNumber` trả về token hay số thực: trả về token, số thực lấy ở server - đã mô tả trong DEC-LUNAR-163 và §6.

Còn mở:
- Zalo có giới hạn cứng dung lượng `zmp Storage` (khuyến cáo < 1 MB theo tài liệu ngoài chính thức); nếu người dùng có >50 Reminder thì cần đánh giá thêm. Hoãn lại đến Phase 3 testing thực tế.
- `getLocation` có thể dùng để detect khi người dùng ở nước ngoài và cảnh báo "lịch hiển thị theo giờ VN"; kết quả phụ thuộc quyền vị trí - hoãn lại đến sau khi thử nghiệm UX.
- Cấu trúc routing của zmp-ui (PageStack vs. Tab): chọn khi bắt đầu build dựa vào hướng dẫn Zalo chính thức tại thời điểm triển khai (có thể thay đổi theo version zmp-sdk).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `zmp.init()` bị lỗi (chạy ngoài Zalo) | try/catch trong app.tsx | Hiển thị màn hình "Vui lòng mở trong Zalo" | Redirect đến Zalo hoặc đóng app |
| `getStorage` trả về null (lần đầu cài) | Kiểm tra null trong `loadStorageData` | Khởi tạo `StorageData` mặc định với mảng rỗng | Tự động, không cần action của người dùng |
| `setStorage` thất bại (đầy bộ nhớ) | Reject promise từ `setStorage` | Toast lỗi "Không lưu được, vui lòng xóa bớt dữ liệu" | Người dùng xóa Reminder cũ; log sự cố |
| `getUserInfo` bị từ chối bởi người dùng | Catch error / check result | Ẩn chức năng cần tên; hiện giải thích "Cần cấp quyền để hiện tên" | Người dùng có thể cấp quyền sau trong Settings |
| `getPhoneNumber` bị từ chối | Catch error | Tắt kênh ZNS trong Settings; hiện cảnh báo | Người dùng cấp quyền lại hoặc không dùng ZNS |
| `convertLunar2Solar` trả về sentinel `[0,0,0]` (tháng nhuận không khớp / ngày không hợp lệ) | Kiểm tra `gd===0 && gm===0 && gy===0` (KHÔNG phải null) | Bỏ qua occurrence đó; không hiển thị | Log warning; hiển thị "(không xác định)" |
| Tháng nhuận trong Reminder nhưng năm này không có | Logic fallback trong `getUpcomingOccurrences` | Dùng tháng thường tương ứng; note "(giỗ tháng thường)" | Thông báo người dùng khi hiện chi tiết Reminder |
| `packages/content` không có `linkedContentId` tương ứng | Kiểm tra null khi load FestivalDetail | Hiện trang FestivalDetail với nội dung "Chưa có thông tin" | Người dùng có thể dùng mà không crash |
| import `@cyberskill/amlich-core` thất bại lúc build | Build error zmp build | Build bị dừng; CI báo lỗi | Kiểm tra version và peer deps trong package.json |
| Purple CSS variables không được apply | Visual regression test | Component hiện màu mặc định xanh zmp-ui | Kiểm tra import CSS variables; sửa specificity |
| zmp-sdk API thay đổi giữa các version | Type error lúc build hoặc runtime | Chức năng bị lỗi theo cách khó đoán | Ghim version `zmp-sdk` trong package.json; test trước khi nâng cấp |
| Người dùng có > 50 Reminder - Storage đầy | `setStorage` lỗi dung lượng | Người dùng không lưu được Reminder mới | Hiện cảnh báo; gợi ý xóa Reminder cũ; log |
| Tính ngày âm on khi device offline hoàn toàn | Không có network call -> không có lỗi | Lịch hiển thị bình thường (NFR-Offline) | Không cần, đây là đúng by design |
| `notifyTime` sai định dạng khi đọc từ Storage | Validate regex "HH:MM" khi load | Đặt lại giá trị mặc định "07:00" | Log warning; Reminder vẫn khả dụng |

---

## §11 - Implementation notes

- `zmp.init()` phải là dòng đầu tiên chạy trước khi render bất kỳ component nào; nếu đặt trong `useEffect` sẽ lỗi vì APIs sẽ bị gọi trước khi sdk sẵn sàng.
- `getPhoneNumber` của Zalo trả về một opaque token không phải số điện thoại thực; server phải đổi token này lấy số thực qua Zalo OA API trước khi lưu. Ghi rõ điều này trong code comment để tránh nhầm lẫn.
- Build zmp dùng webpack có thể xung đột với ESM exports của `@cyberskill/amlich-core`; cần cấu hình `resolve.alias` hoặc kiểm tra `exports` field trong `package.json` của core để chắc là CJS bundle được export.
- CSS Variables từ `packages/ui/src/theme/tokens.ts` cần được nhúng vào `zalo/src/styles/theme.css` để override `zmp-ui`; không import `packages/ui` component trực tiếp vì có thể xung đột với runtime Zalo.
- `getUpcomingOccurrences` cần xử lý cả `leadTimes` (ví dụ `leadTimes=[1]` sinh 1 occurrence phụ "trước 1 ngày" cho mỗi lần xuất hiện chính); đảm bảo cả hai được trả về và sắp xếp đúng.
- Không sử dụng `localStorage` hay `sessionStorage` trong Mini App vì chúng không được đảm bảo tồn tại giữa các lần mở; luôn dùng `zmp Storage` API.
- Test với Zalo DevTools trước khi deploy lên thiết bị thật; một số lỗi quyền (permission) chỉ xuất hiện trên thiết bị thật chứ không bao giờ xuất hiện trong DevTools.

*Hết FR-LUNAR-016.*
