---
id: TASK-LUNAR-016
title: "Zalo Mini App client - React + zmp-ui + zmp-sdk/apis, import amlich-core, zmp Storage for settings/reminders, consent getUserInfo/getPhoneNumber"
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
related_frs: [TASK-LUNAR-004, TASK-LUNAR-017]
depends_on: [TASK-LUNAR-004, TASK-LUNAR-008, TASK-LUNAR-009]
blocks: [TASK-LUNAR-017, TASK-LUNAR-019]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (Zalo client, System Architecture)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#14 (Phase 3)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Key Findings 3 (Zalo reach)"
source_decisions:
  - DEC-LUNAR-160 (Mini App runs on React + zmp-ui + zmp-sdk, imports amlich-core directly; does not duplicate lunar calendar logic)
  - DEC-LUNAR-161 (zmp Storage has limited capacity -> store only settings and the Reminder list; compute solar dates on-the-fly via amlich-core, do not cache in full)
  - DEC-LUNAR-162 (Mini App cannot send native-style push notifications itself; every Zalo reminder channel MUST use ZNS in TASK-LUNAR-017)
  - DEC-LUNAR-163 (getUserInfo and getPhoneNumber require explicit user consent before being called; no silent calls; the phone number is kept only to pass to the ZNS sender, not stored longer than necessary)
  - DEC-LUNAR-164 (zalo/ is a separate package in the monorepo, imports @cyberskill/amlich-core and @cyberskill/genie-content from packages/)
  - DEC-LUNAR-165 (the purple theme from TASK-LUNAR-009 is applied via CSS variables; zmp-ui components are wrapped or styled to fit the purple sub-brand)
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
  - "make a network call to compute the lunar date (violates DEC-LUNAR-160 / NFR-Offline)"
  - "call getUserInfo or getPhoneNumber before explicit consent (violates DEC-LUNAR-163 / NFR-Privacy)"
  - "store the entire OccurrenceCache in zmp Storage (violates DEC-LUNAR-161 - Storage is small)"
  - "send a push notification from inside the Mini App (violates DEC-LUNAR-162 - MUST use ZNS)"
effort_hours: 14
sub_tasks:
  - "1.5h: initialize the zalo/ package - app-config.json, package.json, tsconfig; wire up zmp-ui + zmp-sdk"
  - "1.5h: storage.ts - read/write Settings and Reminder[] into zmp Storage; safe serialize/deserialize"
  - "1.5h: zalo-auth.ts - consent flow: show ConsentSheet, call getUserInfo; call getPhoneNumber only when ZNS is enabled"
  - "2.0h: day-computer.ts - wrap amlich-core; compute DayInfo for the current day + range; getUpcomingOccurrences"
  - "2.0h: Home page + CalendarGrid: show today's lunar date, month grid, mark festivals"
  - "2.0h: ReminderList + ReminderForm pages: CRUD Reminder in zmp Storage; validate lead-time + notifyTime"
  - "1.5h: FestivalDetail page: load FestivalContent from packages/content; show meaning + offering tray"
  - "1.0h: Settings: toggle ZNS on/off, display Zalo account info, clear data"
  - "1.0h: styling - apply the purple theme tokens from TASK-LUNAR-009 to zmp-ui components"
risk_if_skipped: "Without a Zalo Mini App, we cannot reach the roughly 80 million Zalo users through Vietnam's strongest distribution channel (Key Findings 3). TASK-LUNAR-017 (ZNS) depends directly on this task to obtain phone numbers and the list of Reminders that consented to ZNS; without a Zalo client, the entire Phase 3 commercialization is blocked. TASK-LUNAR-019 (PDPL) also needs the consent screens built here."
---

## §1 - Description (BCP-14 normative)

The Zalo Mini App "Genie Am Lich" MUST run inside Zalo on React + `zmp-ui` + `zmp-sdk/apis`, share calendar computation logic with the other clients by importing `@cyberskill/amlich-core` directly, and store user state in `zmp Storage`. This is the contract:

1. MUST initialize the Mini App with the correct `zmp-sdk` syntax (`zmp.init()` in `app.tsx`), configuring `app-config.json` with `appId`, `permissions` (including `scope.userInfo`, `scope.phone`, `scope.location` declared explicitly), and version (DEC-LUNAR-160).
2. MUST import `convertSolar2Lunar`, `convertLunar2Solar`, `canChi`, and the related functions from `@cyberskill/amlich-core` to compute the calendar on-device; MUST NOT make any network request to compute the lunar date (DEC-LUNAR-160).
3. MUST use `zmp Storage` (the `getStorage`/`setStorage` API from `zmp-sdk`) to store the user's `Settings` and the `Reminder[]` array; because Storage has limited capacity, store only the necessary fields of `Reminder` (see §3) and compute `OccurrenceCache` on-the-fly each time it is displayed, MUST NOT store the full cache (DEC-LUNAR-161).
4. MUST display the Home page with: today's solar date, the corresponding lunar date, the day's can-chi, upcoming reminders in the next 7 days, and a quick-access button to the CalendarGrid.
5. MUST display the CalendarGrid month grid: each cell has a large solar date + a small lunar date in the corner + a colored dot if the day has a Reminder or a lunar festival from `@cyberskill/genie-content`.
6. MUST let the user view, create, edit, and delete a `Reminder` (type: `RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL`) with `lunarDay`, `lunarMonth`, `isLeapMonth`, `leadTimes`, `notifyTime`, `channels` (only `ZNS` is available on the Zalo client), and `linkedContentId`.
7. MUST NOT call `getUserInfo` without explicit user consent; MUST show the `ConsentSheet` (permission-request screen) with a clear explanation before calling `apis.getUserInfo({ avatarSize: 240 })` (DEC-LUNAR-163).
8. MUST call `apis.getPhoneNumber()` only when the user enables the ZNS channel in Settings AND has confirmed ZNS consent; the phone number is stored only in the `User.phone` field to pass to the ZNS sender (TASK-LUNAR-017), MUST NOT be used for any other purpose (DEC-LUNAR-163).
9. MUST handle the case where the user declines `getUserInfo` or `getPhoneNumber` consent gracefully: hide the features that depend on that permission (show an explanatory message) but MUST NOT crash the entire app.
10. MUST display the `FestivalDetail` page for each lunar festival, loading content from `@cyberskill/genie-content` (`FestivalContent`); ensure the link from a Reminder to FestivalDetail through `linkedContentId` (TASK-LUNAR-008).
11. MUST apply the purple theme from `@cyberskill/genie-ui` (tokens from TASK-LUNAR-009) to the `zmp-ui` components; MUST NOT use the default `zmp-ui` colors for the main elements (DEC-LUNAR-165).
12. SHOULD get `getLocation` (location) to suggest the local time zone if the user is abroad; however, all lunar calendar computation MUST be locked to `timezone = "Asia/Ho_Chi_Minh"` (UTC+7, meridian 105E) per DEC-LUNAR-160 and TASK-LUNAR-004.
13. MUST NOT send a push notification to the user from inside the Mini App; every reminder function must go through ZNS (TASK-LUNAR-017) once a valid phone number and consent are available (DEC-LUNAR-162).
14. MUST provide a Settings page that lets the user toggle the ZNS channel on/off, view the Zalo display name, and delete all stored data (clear `zmp Storage`).
15. SHOULD cache the `UpcomingOccurrence` list (the next solar dates for each Reminder in the coming 30 days) in application memory (React state/context) to reduce recomputation on render; reset the cache when a Reminder changes.

---

## §2 - Why this design (rationale for humans)

**Why use zmp-ui + zmp-sdk instead of plain web components?** The Zalo Mini App requires using `zmp-sdk` to initialize the app and access the platform APIs (getUserInfo, getPhoneNumber, Storage). `zmp-ui` is the component set certified by Zalo, ensuring the Mini App conforms to Zalo's review rules and feels native on the platform. Not using other component sets avoids the risk of rejection during review (DEC-LUNAR-160).

**Why import amlich-core directly instead of calling an API?** `@cyberskill/amlich-core` is pure TypeScript, zero-dependency, and runs in any JavaScript environment, including the Zalo Mini App runtime. Importing it directly removes network latency, keeps offline working, and guarantees absolute consistency with the other clients (DEC-LUNAR-160, NFR-Offline).

**Why does zmp Storage only store settings and the Reminder list, not the cache?** `zmp Storage` capacity is limited (per Zalo documentation, the total storage per Mini App is small); storing a full `OccurrenceCache` for many years would quickly exceed the limit. Computing `convertLunar2Solar` for the next 30 days takes only a few ms (NFR-Performance), so recomputing on each display is reasonable and inexpensive (DEC-LUNAR-161).

**Why explicit consent before getUserInfo and getPhoneNumber?** PDPL (effective 01/01/2026) and Zalo policy both require the user to agree before the app collects personal data. A phone number is sensitive data under PDPL; calling `getPhoneNumber` silently is a violation. The ConsentSheet clearly describes the purpose of using the phone number (only to receive ZNS reminders) before the request (DEC-LUNAR-163, NFR-Privacy/PDPL).

**Why not send push notifications directly?** This is a hard technical limitation of the Zalo Mini App platform - a native push API does not exist for Mini Apps. Every Zalo reminder must go through the ZNS of a registered OA. The TASK-016 design recognizes this from the start and shifts reminder responsibility entirely to TASK-LUNAR-017 (DEC-LUNAR-162).

**Why the purple theme from TASK-LUNAR-009 instead of the zmp-ui default?** The purple sub-brand is the product identity and a consistent user experience across every platform (TASK-LUNAR-009, PRD §13). zmp-ui can be styled via CSS variables without breaking Zalo's guidelines. The override applies only to color tokens, keeping the component structure intact so the Mini App still passes review (DEC-LUNAR-165).

**Why is zalo/ a separate package in the monorepo?** The Mini App has its own build toolchain (`zmp build`, `zmp deploy`), entirely different from Next.js or Capacitor. Splitting it out keeps CI/CD from cross-affecting each other and keeps the boundaries between clients clear (DEC-LUNAR-164).

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
  lunarYear?: number;       // null = repeats annually/monthly depending on recurrence
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
  // sai khi người dùng ở nước ngoài - vi phạm §1 #12, AC #14). todayInHCM từ TASK-LUNAR-004.
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

1. The Mini App starts successfully in Zalo DevTools and on a real device; `zmp.init()` does not error; the Home screen displays today's lunar date correctly (cross-checked against the TASK-LUNAR-003 fixture set).
2. CalendarGrid renders the month grid correctly with the lunar date in the corner of each cell, the day's can-chi, and a colored dot on days that have a Reminder or a festival in `@cyberskill/genie-content`; clicking a day cell opens the day detail.
3. The user can create a `GIO` Reminder with `lunarDay=15`, `lunarMonth=7`, `isLeapMonth=false`, `leadTimes=[1]`, `notifyTime="07:00"`, `channels=["ZNS"]`; the Reminder is saved into `zmp Storage` and appears in the ReminderList.
4. `getUpcomingOccurrences` returns the correct solar date for the `GIO` Reminder above, cross-checked by hand with `convertLunar2Solar` from `amlich-core`.
5. On first app open, `getUserInfo` has NOT yet been called; the ConsentSheet appears when the user tries a feature that needs the permission; after declining, the app does not crash and the features that do not need the permission still run normally.
6. When the user enables ZNS in Settings without having granted the phone permission, the ZNS ConsentSheet appears first; after the permission is granted, `getPhoneNumber` is called and the token is stored into `Settings.phone`.
7. `zmp Storage` contains only `StorageData` (settings + reminders); no `OccurrenceCache` is stored into Storage.
8. The purple theme (dark purple, cream background) displays correctly on the main components (header, button, card); no default `zmp-ui` blue appears on the styled elements.
9. The FestivalDetail page displays the correct `FestivalContent` for "Ram thang Bay" (the matching id in `packages/content`), including `meaning`, `offerings`, and `checklist`.
10. Clearing data in Settings wipes `zmp Storage` and resets the app state to the default (no more Reminders, consent = false).
11. A Reminder with `type=RAM` (Ram; the 15th lunar day) displays correctly on Home under "Upcoming" when this month's Ram is less than 7 days away.
12. The Mini App makes no network API calls when displaying the month calendar or computing the lunar date (checked via the DevTools Network tab); logs confirm only amlich-core is used.
13. `app-config.json` fully declares `scope.userInfo` and `scope.phone` under `permissions`; the `zmp build` produces no warning about missing permission declarations.
14. When the user uses the app abroad (a different time zone set on the device), the app still displays the calendar per `Asia/Ho_Chi_Minh` for computing the lunar date (DEC-LUNAR-160).

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
    // todayLunar() trả về LunarDate = [day, month, year, leap] (tuple, TASK-LUNAR-001)
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

The full contract is in §3. Details to keep in mind:

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

The hardest point is that Zalo's `getPhoneNumber` returns a `token`, not the real phone number. The real number is only obtainable when the server calls the OA API with that token. This logic must live on the server side (TASK-LUNAR-017); the client only holds the token and forwards it when initializing the ZNS subscription.

---

## §7 - Dependencies

Upstream: **TASK-LUNAR-004** (the `Reminder` data model and the `recurrence` logic referenced in `ZaloReminder`; amlich-core is a product of TASK-001 that TASK-004 depends on). **TASK-LUNAR-008** (`FestivalContent` from `packages/content` used for FestivalDetail and the colored dots on the CalendarGrid). **TASK-LUNAR-009** (the purple theme tokens imported into the Zalo Mini App styling).

Downstream: **TASK-LUNAR-017** (the ZNS sender needs `User.phone` (token) and the list of `Reminder`s with `channels: ["ZNS"]` built in this task). **TASK-LUNAR-019** (the PDPL consent layer needs the screens and the `consentFlags` built in this task).

Cross-cutting: `@cyberskill/amlich-core` is shared with `apps/web/` and `ios/App/`; any breaking change to amlich-core requires updating all three clients.

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

Resolved:
- `zmp Storage` structure (single key vs. multiple keys): chose a single key `genie_amlich_v1` to reduce the number of Storage API calls.
- Whether `getPhoneNumber` returns a token or the real number: returns a token, the real number is obtained on the server - described in DEC-LUNAR-163 and §6.

Still open:
- Zalo has a hard capacity limit on `zmp Storage` (unofficial external docs recommend < 1 MB); if a user has > 50 Reminders, this needs further assessment. Deferred to real Phase 3 testing.
- `getLocation` could be used to detect when the user is abroad and warn "the calendar is displayed in VN time"; the result depends on the location permission - deferred until after UX testing.
- The zmp-ui routing structure (PageStack vs. Tab): to be chosen at the start of the build based on the official Zalo guidance at implementation time (may change with the zmp-sdk version).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `zmp.init()` fails (running outside Zalo) | try/catch in app.tsx | Show a "Please open in Zalo" screen | Redirect to Zalo or close the app |
| `getStorage` returns null (first install) | Null check in `loadStorageData` | Initialize the default `StorageData` with empty arrays | Automatic, no user action needed |
| `setStorage` fails (out of memory) | Rejected promise from `setStorage` | Error toast "Could not save, please delete some data" | User deletes old Reminders; log the incident |
| `getUserInfo` declined by the user | Catch error / check result | Hide the feature that needs the name; show explanation "Permission needed to show your name" | User can grant permission later in Settings |
| `getPhoneNumber` declined | Catch error | Disable the ZNS channel in Settings; show a warning | User grants permission again or does not use ZNS |
| `convertLunar2Solar` returns the sentinel `[0,0,0]` (leap month does not match / invalid day) | Check `gd===0 && gm===0 && gy===0` (NOT null) | Skip that occurrence; do not display | Log a warning; display "(unknown)" |
| Leap month in a Reminder but this year has none | Fallback logic in `getUpcomingOccurrences` | Use the corresponding regular month; note "(regular-month gio)" | Notify the user in the Reminder detail |
| `packages/content` has no matching `linkedContentId` | Null check when loading FestivalDetail | Show the FestivalDetail page with "No information yet" content | User can proceed without a crash |
| Importing `@cyberskill/amlich-core` fails at build | zmp build error | Build stops; CI reports the error | Check the version and peer deps in package.json |
| Purple CSS variables are not applied | Visual regression test | Component shows the default zmp-ui blue | Check the CSS variable import; fix specificity |
| zmp-sdk API changes between versions | Type error at build or runtime | The feature fails in a hard-to-predict way | Pin the `zmp-sdk` version in package.json; test before upgrading |
| User has > 50 Reminders - Storage full | `setStorage` capacity error | User cannot save a new Reminder | Show a warning; suggest deleting old Reminders; log |
| Computing the lunar date while the device is fully offline | No network call -> no error | The calendar displays normally (NFR-Offline) | Not needed, this is correct by design |
| `notifyTime` has the wrong format when read from Storage | Validate the "HH:MM" regex on load | Reset to the default value "07:00" | Log a warning; the Reminder remains usable |

---

## §11 - Implementation notes

- `zmp.init()` must be the first line to run before rendering any component; putting it inside a `useEffect` will error because the APIs would be called before the sdk is ready.
- Zalo's `getPhoneNumber` returns an opaque token, not the real phone number; the server must exchange this token for the real number via the Zalo OA API before storing it. State this clearly in a code comment to avoid confusion.
- The zmp webpack build may conflict with the ESM exports of `@cyberskill/amlich-core`; you need to configure `resolve.alias` or check the `exports` field in the core's `package.json` to be sure the CJS bundle is exported.
- The CSS Variables from `packages/ui/src/theme/tokens.ts` need to be embedded into `zalo/src/styles/theme.css` to override `zmp-ui`; do not import `packages/ui` components directly because they may conflict with the Zalo runtime.
- `getUpcomingOccurrences` needs to handle `leadTimes` as well (for example `leadTimes=[1]` produces one extra "1 day before" occurrence for each main occurrence); ensure both are returned and sorted correctly.
- Do not use `localStorage` or `sessionStorage` in the Mini App because they are not guaranteed to persist between opens; always use the `zmp Storage` API.
- Test with Zalo DevTools before deploying to a real device; some permission errors only appear on a real device and never appear in DevTools.

*End of TASK-LUNAR-016.*
