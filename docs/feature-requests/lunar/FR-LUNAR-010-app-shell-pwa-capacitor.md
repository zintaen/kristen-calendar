---
id: FR-LUNAR-010
title: "App shell - Next.js/React PWA + Capacitor iOS wrapper, import amlich-core, on-device storage, routing, glue cho local notifications"
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
related_frs: [FR-LUNAR-005, FR-LUNAR-009]
depends_on: [FR-LUNAR-001, FR-LUNAR-009]
blocks: [FR-LUNAR-005, FR-LUNAR-006, FR-LUNAR-007, FR-LUNAR-012, FR-LUNAR-015]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (System Architecture, stack)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#14 (Phase 1 roadmap)"
source_decisions:
  - DEC-LUNAR-100 (Next.js/React + Tailwind cho web/PWA; Capacitor boc chinh web build do cho iOS native wrapper; toi da code-sharing voi doi web; khong React Native trong Phase 1)
  - DEC-LUNAR-101 (storage on-device dung localStorage hoac IndexedDB tren web, va @capacitor/preferences tren iOS qua Capacitor plugin; khong co backend trong Phase 1; du lieu chi luu tren thiet bi)
  - DEC-LUNAR-102 (routing dung Next.js App Router; cac route chinh: "/" (home/today), "/calendar" (luoi thang), "/reminders" (danh sach nhac), "/settings", "/festival/[id]" (trang chi tiet dip))
  - DEC-LUNAR-103 (Capacitor ket noi glue cho @capacitor/local-notifications; web build la source of truth; Capacitor wrapper la thin shell khong chua business logic)
  - DEC-LUNAR-104 (PWA manifest va service worker bat buoc cho offline va "Add to Home Screen" tren Android; iOS chua ho tro full PWA push nen Capacitor la kenh chinh tren iPhone)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/app/layout.tsx
  - apps/web/app/page.tsx
  - apps/web/app/calendar/page.tsx
  - apps/web/app/reminders/page.tsx
  - apps/web/app/settings/page.tsx
  - apps/web/app/festival/[id]/page.tsx
  - apps/web/lib/storage.ts
  - apps/web/lib/notificationGlue.ts
  - apps/web/capacitor.config.ts
  - apps/web/public/manifest.json
  - apps/web/next.config.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/**
  - bash: cd apps/web && pnpm build && pnpm test
disallowed_tools:
  - "luu du lieu nguoi dung len server hoac cloud khong co consent ro rang trong Phase 1 (vi pham DEC-LUNAR-101 / NFR-Privacy)"
  - "nhung Claude API key vao client code (vi pham NFR-Security)"
  - "su dung backend API trong Phase 1 cho chuc nang loi lich/nhac (Phase 1 la offline-first, DEC-LUNAR-101)"
effort_hours: 10
sub_tasks:
  - "1.5h: Next.js project khoi tao voi App Router, Tailwind, import @cyberskill/amlich-core va @cyberskill/genie-ui"
  - "1.5h: storage.ts - Reminder CRUD voi localStorage/IndexedDB + @capacitor/preferences adapter"
  - "1.0h: app/layout.tsx - global layout voi purple theme, Be Vietnam Pro, bottom nav bar"
  - "1.0h: app/page.tsx - home screen: ngay hom nay (duong + am + can-chi), nhac sap toi"
  - "1.0h: app/calendar/page.tsx - route wrapping CalendarGrid (FR-007)"
  - "1.0h: app/reminders/page.tsx va settings/page.tsx - placeholder routes cho FR-006"
  - "1.0h: notificationGlue.ts - interface wrap @capacitor/local-notifications, stub tren web"
  - "0.5h: capacitor.config.ts - config Capacitor bundle ID, webDir, plugin list"
  - "0.5h: manifest.json, next.config.ts - PWA setup, offline cache strategy (DEC-LUNAR-104)"
  - "1.0h: integration test: build thanh cong, route / render dung, storage CRUD khong crash"
risk_if_skipped: "Khong co app shell thi khong co gi de deploy cho vo dung thu (tieu chi MVP). FR-005 (rolling-64 notifications) va FR-006 (reminder management) deu phu thuoc app shell de co storage layer va Capacitor plugin glue. FR-007 (grid) can routing de mount CalendarGrid vao route /calendar."
---

## §1 - Description (BCP-14 normative)

App shell PHẢI thiết lập nền móng kỹ thuật cho toàn bộ Phase 1 MVP: Next.js/React PWA, Capacitor wrapper cho iOS, on-device storage, routing, và glue layer cho local notifications.

1. PHẢI khởi tạo project Next.js (App Router, TypeScript 5.x) tại `apps/web/` với Tailwind CSS; import `@cyberskill/amlich-core` và `@cyberskill/genie-ui` từ workspace packages (DEC-LUNAR-100).
2. PHẢI cấu hình 5 route chính bằng Next.js App Router: `/` (home - ngày hôm nay), `/calendar` (lưới lịch tháng), `/reminders` (danh sách nhắc), `/settings` (cài đặt), `/festival/[id]` (trang chi tiết dịp) (DEC-LUNAR-102).
3. PHẢI cung cấp `apps/web/lib/storage.ts` xuất các hàm CRUD cho `Reminder[]`: `getReminders()`, `saveReminder(r: Reminder)`, `deleteReminder(id: string)`, `updateReminder(r: Reminder)`, `getSettings()`, `saveSettings(s: UserSettings)` - lưu on-device, không gọi network (DEC-LUNAR-101).
4. PHẢI implement storage adapter: trên web (browser) dùng `localStorage` hoặc `IndexedDB`; trên iOS qua Capacitor dùng `@capacitor/preferences`; interface phải đồng nhất để code không cần biết đang chạy ở đâu (DEC-LUNAR-101).
5. PHẢI cung cấp `apps/web/lib/notificationGlue.ts` xuất interface `NotificationService` với phương thức `scheduleNotification(opts)`, `cancelAllPending()`, `requestPermission()`; trên web (non-Capacitor) implement là no-op stub; trên Capacitor implement gọi `@capacitor/local-notifications` (DEC-LUNAR-103).
6. PHẢI cấu hình `capacitor.config.ts` với `appId: "world.cyberskill.genieamlich"`, `appName: "Genie Am Lich"`, `webDir: "out"` (Next.js static export), và khai báo plugin `LocalNotifications` (DEC-LUNAR-103).
7. PHẢI cấu hình `next.config.ts` bật static export (`output: "export"`) để Capacitor có thể đóng gói web build; KHÔNG dùng Next.js server-side rendering hoặc API routes trong Phase 1 (DEC-LUNAR-100, DEC-LUNAR-101).
8. PHẢI tạo `public/manifest.json` với `name`, `short_name`, `theme_color` (tím từ `PURPLE_TOKENS`), `background_color` (kem từ `PURPLE_TOKENS`), `display: "standalone"`, `icons` cho PWA (DEC-LUNAR-104).
9. PHẢI hiển thị bottom navigation bar với 4 tab: Hôm nay, Lịch, Nhắc, Cài đặt; active tab highlight bằng token tím; navigation PHẢI hoạt động trên cả web và iOS Capacitor.
10. PHẢI tại route `/` (home) hiển thị ngày hôm nay gồm: ngày dương đầy đủ, ngày âm lịch, can-chi ngày/tháng/năm bằng cách gọi `convertSolar2Lunar` từ `amlich-core`; và danh sách nhắc sắp tới (tối đa 3 mục) đọc từ storage.
11. PHẢI import font Be Vietnam Pro từ Google Fonts trong `app/layout.tsx` (hoặc bundle local trong `public/fonts/` cho offline); áp dụng `font-family` cho toàn bộ app qua Tailwind config hoặc global CSS.
12. PHẢI đảm bảo app shell build thành công với `pnpm build` (Next.js static export, không có TypeScript error, không có missing import từ workspace packages).
13. PHẢI đảm bảo home route `/` render đúng ngày âm lịch hôm nay khi chạy `pnpm dev` hoặc sau khi build (integration test).
14. KHÔNG ĐƯỢC lưu bất kỳ dữ liệu người dùng nào lên server trong Phase 1; mọi Reminder và Settings chỉ tồn tại trên thiết bị (DEC-LUNAR-101, NFR-Privacy).
15. NÊN cấu hình service worker (qua `next-pwa` hoặc tương đương) để cache static assets cho offline; ưu tiên cache font Be Vietnam Pro và `amlich-core` bundle (DEC-LUNAR-104).
16. NÊN detect môi trường Capacitor runtime (`Capacitor.isNativePlatform()`) và hiển thị điều chỉnh UI nhỏ (ví dụ ẩn một số hành vi web-only) mà không cần build config riêng biệt.

---

## §2 - Why this design (rationale for humans)

**Tại sao Next.js/React + Capacitor thay vì React Native (DEC-LUNAR-100)?** React Native yêu cầu viết lại UI layer bằng native components, mất lợi thế code-sharing với web. Capacitor bọc chính web build, đội web HCMC quen React không cần học native API; chỉ cần thêm plugin Capacitor cho notification. PRD §9 chỉ định Capacitor và ghi rõ "Nếu sau này cần animation cao cấp, cân nhắc RN" - nhưng cho MVP, Capacitor thắng về tốc độ.

**Tại sao static export (`output: "export"`) thay vì Next.js SSR (DEC-LUNAR-101)?** Phase 1 không có backend. Capacitor yêu cầu file HTML/JS/CSS tĩnh trong thư mục `out/` để đóng gói vào iOS app bundle. SSR yêu cầu Node.js server runtime - không dùng được trong Capacitor. Static export là lựa chọn tự nhiên và đảm bảo toàn bộ app hoạt động offline.

**Tại sao storage adapter pattern (DEC-LUNAR-101)?** `localStorage` hoạt động trên web nhưng Capacitor iOS khuyến cáo dùng `@capacitor/preferences` để đảm bảo dữ liệu không bị xóa bởi iOS khi dung lượng thấp. Wrap hai implementation sau một interface chung giúp unit test storage trên web mà không cần Capacitor runtime.

**Tại sao `notificationGlue.ts` là no-op stub trên web (DEC-LUNAR-103)?** `@capacitor/local-notifications` chỉ hoạt động khi có native runtime. Nếu import trực tiếp vào component, build sẽ lỗi trong môi trường web hoặc test. Stub pattern cho phép FR-005 và FR-006 test logic scheduling mà không cần thiết bị iOS thực.

**Tại sao `appId: "world.cyberskill.genieamlich"` (DEC-LUNAR-103)?** Bundle ID theo convention reverse-domain của CyberSkill (`world.cyberskill.*`). Phải quyết định sớm vì App Store Connect yêu cầu bundle ID khi tạo app record và không thể đổi sau.

**Tại sao PWA manifest bắt buộc (DEC-LUNAR-104)?** Web push notification trên iOS 16.4+ chỉ hoạt động khi PWA đã "Add to Home Screen" - không có manifest thì không có PWA. Với Android và desktop, manifest còn cho phép cài app từ browser. PRD Key Finding #6 chỉ rõ web push là "bổ trợ", không phải kênh chính, nhưng vẫn cần setup đúng.

**Tại sao không có API route trong Phase 1 (DEC-LUNAR-101)?** API route của Next.js yêu cầu server runtime, xung đột với `output: "export"`. Phase 1 không cần backend (không AI, không ZNS). Khi Phase 2 cần Claude proxy (`/api/genie`), sẽ chuyển sang Vercel Functions hoặc separate service, không thay đổi client code.

---

## §3 - API contract

```typescript
// apps/web/lib/storage.ts
// KHONG static-import "@capacitor/preferences" o top level: no la plugin native, keo vao web
// bundle / static-export build va lam JSDOM test phai resolve mot package chi chay tren iOS.
// Adapter duoi day import dong (lazy) chi khi dang chay tren Capacitor - giong ky luat stub cua
// notificationGlue.ts (DEC-LUNAR-103). Tren web/test, nhanh localStorage khong cham Capacitor.

// FR-LUNAR-004 so huu kieu Reminder (bao gom truong optional notificationStyle).
// Shell KHONG DUOC redeclare lai de tranh drift schema giua 004 va 010.
import type { Reminder } from "@cyberskill/amlich-core";
export type { Reminder };

export interface UserSettings {
  locale: "vi-VN";
  timezone: "Asia/Ho_Chi_Minh";
  theme: "purple";
  notifyTime: string;  // e.g. "07:00"
}

// Storage adapter - same interface for web (localStorage) and Capacitor (Preferences)
export async function getReminders(): Promise<Reminder[]>;
export async function saveReminder(r: Reminder): Promise<void>;
export async function updateReminder(r: Reminder): Promise<void>;
export async function deleteReminder(id: string): Promise<void>;
export async function getSettings(): Promise<UserSettings>;
export async function saveSettings(s: UserSettings): Promise<void>;

// Internal: detect Capacitor vs web.
// PHAI guard `typeof window` truoc: optional chaining KHONG cuu mot bien global chua khai bao -
// `window?.x` van nem ReferenceError khi `window` khong ton tai (SSG/static-export prerender).
function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}
```

```typescript
// apps/web/lib/notificationGlue.ts
export interface ScheduleOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra: { reminderId: string };
}

export interface NotificationService {
  requestPermission(): Promise<boolean>;
  scheduleNotification(opts: ScheduleOptions): Promise<void>;
  scheduleMany(opts: ScheduleOptions[]): Promise<void>;
  cancelAllPending(): Promise<void>;
}

// Stub implementation for web (non-Capacitor):
export class WebNotificationStub implements NotificationService {
  async requestPermission() { return false; }
  async scheduleNotification(_: ScheduleOptions) { /* no-op */ }
  async scheduleMany(_: ScheduleOptions[]) { /* no-op */ }
  async cancelAllPending() { /* no-op */ }
}

// Capacitor implementation (wraps @capacitor/local-notifications):
export class CapacitorNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean>;
  async scheduleNotification(opts: ScheduleOptions): Promise<void>;
  async scheduleMany(opts: ScheduleOptions[]): Promise<void>;
  async cancelAllPending(): Promise<void>;
}

// Factory - returns correct implementation at runtime:
export function createNotificationService(): NotificationService;
```

```typescript
// apps/web/capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "world.cyberskill.genieamlich",
  appName: "Genie Am Lich",
  webDir: "out",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#3D1266",   // purple-800 from tokens
      sound: "default",
    },
  },
};

export default config;
```

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",        // static export for Capacitor (DEC-LUNAR-100)
  trailingSlash: true,     // required for static hosting
  images: { unoptimized: true }, // required for static export
  transpilePackages: ["@cyberskill/amlich-core", "@cyberskill/genie-ui"],
};

export default nextConfig;
```

```tsx
// apps/web/app/layout.tsx (excerpt)
import type { Metadata } from "next";
import { SEMANTIC } from "@cyberskill/genie-ui";

export const metadata: Metadata = {
  title: "Genie Am Lich",
  description: "Tro ly am lich Viet Nam cua CyberSkill",
  manifest: "/manifest.json",
  themeColor: SEMANTIC["bg-primary"],  // purple-800
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ backgroundColor: SEMANTIC["bg-default"], fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
```

```json
// apps/web/public/manifest.json
{
  "name": "Genie Am Lich",
  "short_name": "Genie AL",
  "description": "Tro ly am lich Viet Nam cua CyberSkill",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3D1266",
  "background_color": "#FDF6EC",
  "lang": "vi",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## §4 - Acceptance criteria

1. `pnpm build` trong `apps/web/` hoàn thành không có error; thư mục `out/` được tạo với `index.html`, `calendar/index.html`, `reminders/index.html`, `settings/index.html`.
2. Route `/festival/[id]` với `id = "vu-lan"` render trang chi tiết Vu Lan lấy từ `getFestivalById("vu-lan")` của FR-LUNAR-008 mà không cần server-side data fetching.
3. `getReminders()` gọi ngay sau khi app khởi động (empty state) trả mảng rỗng, không throw error.
4. `saveReminder(r)` rồi `getReminders()` trả mảng có 1 phần tử đúng với `r` đã lưu (round-trip test trên localStorage mock).
5. `deleteReminder(id)` xóa đúng nhắc theo id; `getReminders()` sau đó không còn nhắc đó.
6. `createNotificationService()` trên môi trường web (không có Capacitor) trả `WebNotificationStub`; trên môi trường Capacitor trả `CapacitorNotificationService`.
7. `capacitor.config.ts` export object có `appId === "world.cyberskill.genieamlich"` và `webDir === "out"`.
8. `public/manifest.json` hợp lệ JSON, có đủ 4 trường `name`, `display: "standalone"`, `theme_color`, `background_color`; `background_color` là giá trị kem ấm từ FR-LUNAR-009.
9. Route `/` (home) hiển thị ngày hôm nay (ngày dương, ngày âm, can-chi) gọi `convertSolar2Lunar` không cần network (integration test với mock date "2025-01-29" trả Mùng 1 Tết Ất Tỵ).
10. Bottom navigation có 4 tab; click "Lịch" navigate tới `/calendar`; active tab được highlight bằng màu tím đậm từ token.
11. Font Be Vietnam Pro được khai báo trong `layout.tsx`; build output không chứa tham chiếu font nào khác làm primary.
12. `next.config.ts` có `output: "export"` và `transpilePackages: ["@cyberskill/amlich-core", "@cyberskill/genie-ui"]`.
13. Không có bất kỳ `fetch`, `axios`, hoặc HTTP call nào trong `storage.ts` (kiểm bằng grep trong file).
14. `pnpm test` trong `apps/web/` chạy không crash với ít nhất 5 test storage CRUD pass.
15. Build output tại `out/` không chứa file `.env` hoặc bất kỳ API key nào (grep `ANTHROPIC_API_KEY` và `ZNS_TOKEN` ra rỗng).

---

## §5 - Verification

```typescript
// apps/web/__tests__/storage.test.ts
import { getReminders, saveReminder, deleteReminder, updateReminder, getSettings, saveSettings } from "../lib/storage";

// Mock localStorage for JSDOM environment
const mockStorage: Record<string, string> = {};
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    },
  });
});

// testReminder phai co day du truong bat buoc cua Reminder (CONTRACT.md / FR-LUNAR-004):
// leapFallback la required field (khong optional).
const testReminder: import("../lib/storage").Reminder = {
  id: "test-001",
  userId: "local",
  type: "RAM",
  title: "Ram hang thang",
  lunarDay: 15,
  lunarMonth: 1,
  lunarYear: null,
  isLeapMonth: false,
  leapFallback: "REGULAR",  // required by Reminder interface (CONTRACT.md)
  recurrence: "MONTHLY",
  leadTimes: [0, 1],
  notifyTime: "07:00",
  channels: ["LOCAL"],
  linkedContentId: "ram",
  sharedWith: [],
  enabled: true,
};

describe("Storage CRUD", () => {
  test("getReminders() trang thai rong tra mang rong", async () => {
    const result = await getReminders();
    expect(result).toEqual([]);
  });

  test("saveReminder + getReminders: round-trip", async () => {
    await saveReminder(testReminder);
    const result = await getReminders();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-001");
    expect(result[0].lunarDay).toBe(15);
  });

  test("updateReminder thay doi title", async () => {
    await updateReminder({ ...testReminder, title: "Ram da cap nhat" });
    const result = await getReminders();
    expect(result[0].title).toBe("Ram da cap nhat");
  });

  test("deleteReminder xoa dung theo id", async () => {
    await deleteReminder("test-001");
    const result = await getReminders();
    expect(result).toHaveLength(0);
  });

  test("saveSettings + getSettings round-trip", async () => {
    const s = { locale: "vi-VN" as const, timezone: "Asia/Ho_Chi_Minh" as const, theme: "purple" as const, notifyTime: "07:30" };
    await saveSettings(s);
    const loaded = await getSettings();
    expect(loaded.notifyTime).toBe("07:30");
  });
});
```

```typescript
// apps/web/__tests__/notificationGlue.test.ts
import { createNotificationService, WebNotificationStub } from "../lib/notificationGlue";

test("createNotificationService tren web tra WebNotificationStub", () => {
  // JSDOM khong co Capacitor
  const service = createNotificationService();
  expect(service).toBeInstanceOf(WebNotificationStub);
});

test("WebNotificationStub.scheduleNotification la no-op, khong throw", async () => {
  const stub = new WebNotificationStub();
  await expect(stub.scheduleNotification({
    id: 1, title: "Test", body: "Body",
    scheduleAt: new Date(), extra: { reminderId: "r1" }
  })).resolves.toBeUndefined();
});

test("WebNotificationStub.cancelAllPending la no-op", async () => {
  const stub = new WebNotificationStub();
  await expect(stub.cancelAllPending()).resolves.toBeUndefined();
});
```

```typescript
// apps/web/__tests__/homeRoute.test.tsx
import { render, screen } from "@testing-library/react";
import HomePage from "../app/page";

// Mock amlich-core - PHAI khop hop dong THUC: convertSolar2Lunar tra TUPLE [day,month,year,leap],
// KHONG phai object; can-chi/zodiac den tu cac ham FR-LUNAR-002 (canChiDay/canChiYear nhan JDN,
// zodiacOf nhan lunarYear). Mock object-shape se la false-green: test pass nhung home route doc
// `.canChiDay`/`.zodiac` tren tuple se ra `undefined` o production.
jest.mock("@cyberskill/amlich-core", () => ({
  convertSolar2Lunar: jest.fn().mockReturnValue([1, 1, 2025, 0]),   // tuple [d,m,y,leap]
  jdFromDate: jest.fn().mockReturnValue(2460704),                   // JDN 29/01/2025
  canChiDay: jest.fn().mockReturnValue({ label: "Giap Ty" }),
  canChiMonth: jest.fn().mockReturnValue({ label: "Binh Dan" }),
  canChiYear: jest.fn().mockReturnValue({ label: "At Ty" }),
  zodiacOf: jest.fn().mockReturnValue("Ran"),
  VN_TIMEZONE: 7.0,
}));

// Mock date to 2025-01-29 (Mung 1 Tet At Ty)
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date("2025-01-29"));
});

test("Home page hien thi ngay am va can-chi dung", () => {
  render(<HomePage />);
  expect(screen.getByText(/Mùng 1/)).toBeInTheDocument();
  expect(screen.getByText(/Ất Tỵ/)).toBeInTheDocument();
});
```

---

## §6 - Implementation skeleton

API contract ở §3 là skeleton đầy đủ. Điểm tricky nhất là storage adapter phải hoạt động trong cả JSDOM (test) và môi trường Capacitor thực tế:

```typescript
// apps/web/lib/storage.ts (storage adapter logic)
const REMINDERS_KEY = "genie_reminders";
const SETTINGS_KEY  = "genie_settings";

// Lazy: chi import plugin native khi thuc su chay tren Capacitor. Tren web/JSDOM nhanh nay khong
// bao gio chay nen "@capacitor/preferences" khong can resolve duoc trong test/web build.
async function getPreferences() {
  const mod = await import("@capacitor/preferences");
  return mod.Preferences;
}

async function storageGet(key: string): Promise<string | null> {
  if (isCapacitor()) {
    const Preferences = await getPreferences();
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isCapacitor()) {
    const Preferences = await getPreferences();
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getReminders(): Promise<Reminder[]> {
  const raw = await storageGet(REMINDERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Reminder[];
}

export async function saveReminder(r: Reminder): Promise<void> {
  const existing = await getReminders();
  const updated = [...existing.filter(e => e.id !== r.id), r];
  await storageSet(REMINDERS_KEY, JSON.stringify(updated));
}
```

---

## §7 - Dependencies

Upstream: `FR-LUNAR-001` cung cấp `convertSolar2Lunar` dùng trên home route `/` để tính ngày âm hôm nay; `FR-LUNAR-009` cung cấp `PURPLE_TOKENS`, `SEMANTIC`, và components để áp dụng theme toàn cục trong `layout.tsx`.

Downstream: `FR-LUNAR-005` (rolling-64 notifications) dùng `NotificationService` interface từ `notificationGlue.ts` và `Reminder[]` từ `storage.ts`; `FR-LUNAR-006` (reminder management) dùng storage CRUD và route `/reminders`; `FR-LUNAR-007` (calendar grid) mount tại route `/calendar`; `FR-LUNAR-012` (good-day picker) mount tại route mới trong Phase 2; `FR-LUNAR-015` (AI Genie) cần Next.js API route - sẽ thay đổi `output: "export"` thành hybrid mode hoặc tách ra Vercel Functions khi Phase 2 bắt đầu.

Cross-cutting: Tất cả FR Phase 1 phụ thuộc `storage.ts` để đọc/ghi Reminder. `notificationGlue.ts` là contract mà FR-LUNAR-005 implement cụ thể trên Capacitor.

---

## §8 - Example payloads

```json
{
  "comment": "localStorage key 'genie_reminders' sau khi user tao 2 nhac",
  "value": "[{\"id\":\"ram-default\",\"type\":\"RAM\",\"title\":\"Rằm hàng tháng\",\"lunarDay\":15,\"lunarMonth\":1,\"lunarYear\":null,\"isLeapMonth\":false,\"recurrence\":\"MONTHLY\",\"leadTimes\":[0,1],\"notifyTime\":\"07:00\",\"channels\":[\"LOCAL\"],\"linkedContentId\":\"ram\",\"sharedWith\":[],\"enabled\":true},{\"id\":\"gio-ba-noi\",\"type\":\"GIO\",\"title\":\"Giỗ bà nội\",\"lunarDay\":12,\"lunarMonth\":3,\"lunarYear\":null,\"isLeapMonth\":false,\"recurrence\":\"ANNUAL\",\"leadTimes\":[0,1,3],\"notifyTime\":\"07:00\",\"channels\":[\"LOCAL\"],\"linkedContentId\":\"dam-gio-ca-nhan\",\"sharedWith\":[],\"enabled\":true}]"
}
```

```typescript
// Home route / hien thi du lieu nay
const today = {
  solarDate: "Thu Tu, 29 thang 1 nam 2025",
  lunarDate: "Mung 1 thang Gieng nam At Ty",
  canChiDay: "Giap Ty",
  upcomingReminders: [
    { title: "Ram thang Gieng", solarDate: "Thu Ba, 12 thang 2 nam 2025", daysUntil: 14 },
    { title: "Gio ba noi", solarDate: "Chu Nhat, 30 thang 3 nam 2025", daysUntil: 60 }
  ]
};
```

```json
{
  "comment": "capacitor.config.ts export (compiled)",
  "appId": "world.cyberskill.genieamlich",
  "appName": "Genie Am Lich",
  "webDir": "out",
  "plugins": {
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#3D1266"
    }
  }
}
```

---

## §9 - Open questions

Đã giải quyết:
- Static export vs SSR: `output: "export"` cho Phase 1 (DEC-LUNAR-100).
- Storage adapter: localStorage/IndexedDB + `@capacitor/preferences` sau một interface chung (DEC-LUNAR-101).
- Bundle ID: `world.cyberskill.genieamlich` (DEC-LUNAR-103).

Còn deferred:
- Phase 2 Next.js API routes (`/api/genie`): `output: "export"` không tương thích với API routes. Khi Phase 2 bắt đầu, cần chuyển sang `output: "standalone"` hoặc dùng Vercel Functions tách biệt - deferred, không ảnh hưởng Phase 1.
- IndexedDB vs localStorage: `localStorage` đủ cho Phase 1 với lượng nhắc nhỏ (< 100 records). Nếu user có > 100 đám giỗ, chuyển sang IndexedDB - deferred.
- Service worker: `next-pwa` hoặc `@ducanh2912/next-pwa` cần review tương thích với Next.js 15 App Router trước khi dùng - deferred sau khi pin Next.js version.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `output: export` xung dot voi API route Phase 2 | Build error khi them /api/genie | Phase 2 bi block | Chuyen sang hybrid mode hoac tach Vercel Functions |
| localStorage bi xoa khi iOS thieu dung luong | App mat het du lieu | Nguoi dung mat nhac | Migrate sang @capacitor/preferences trong storage adapter |
| Capacitor khong nhan dien webDir "out" sau khi Next.js doi ten | npx cap sync loi | iOS build that bai | Dam bao webDir trong capacitor.config khop voi output folder |
| Be Vietnam Pro khong cache offline | Service worker miss | Font fallback system-ui | Bundle font local vao public/fonts/ va cache trong SW |
| transpilePackages thieu amlich-core hoac ui | Build error "can not find module" | App khong build duoc | Them vao transpilePackages trong next.config.ts |
| Storage CRUD race condition (save/get dong thoi) | Flaky test | Du lieu mat | Dung async queue hoac sequential await |
| createNotificationService() tra sai loai | Unit test | FR-005 goi Capacitor API tren web, crash | Fix isCapacitor() check |
| manifest.json thieu truong icons | Lighthouse PWA audit fail | Khong Add to Home Screen duoc | Them icon 192 va 512 vao public/icons/ |
| API key lo trong build output | grep ANTHROPIC_API_KEY trong out/ | Bao mat nguy hiem | Dam bao khong co .env.local bi commit; dung .gitignore |
| TypeScript error trong workspace package import | pnpm build fail | Deploy bi block | Fix types trong amlich-core va ui truoc khi build |
| Capacitor sync that bai (ios/ chua duoc init) | npx cap add ios error | iOS target khong ton tai | Chay `npx cap add ios` truoc `npx cap sync` |
| bottom nav active tab sai (highlight sai route) | Integration test click nav | UX nham lan | Dung usePathname() tu Next.js, so sanh voi pathname hien tai |

---

## §11 - Implementation notes

- `isCapacitor()` nen check `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform()` - hai check can thiet: mot cho SSG/SSR safety, mot cho runtime detection. (§3 da ship dung dang nay; optional chaining mot minh KHONG cuu `window` chua khai bao.)
- Home route `/` lap rap ngay am giong FR-LUNAR-007: `convertSolar2Lunar` tra TUPLE `[d,m,y,leap]` (khong co can-chi/zodiac). Can-chi/zodiac PHAI goi rieng tu FR-LUNAR-002 voi JDN: `const jdn = jdFromDate(d,m,y); canChiDay(jdn).label; canChiYear(lYear).label; zodiacOf(lYear)`. Mock test §5 da sua khop dang nay - tranh false-green khi mock object-shape khac hop dong that.
- `output: "export"` trong `next.config.ts` co nghia la `useSearchParams()`, `useRouter().push()` voi query params phuc tap, va dynamic routes nhu `/festival/[id]` deu phai dung `generateStaticParams()` de pre-render. Quen buoc nay lam build loi hoac trang 404 khi deploy.
- Capacitor `@capacitor/local-notifications` can `requestPermissions()` truoc khi `schedule()`; loi thuong gap la goi `schedule()` ma khong check permission, gay silent fail tren iOS. `notificationGlue.ts` CapacitorNotificationService PHAI goi `requestPermission()` truoc.
- Storage key `genie_reminders` va `genie_settings` phai duoc export thanh constants (khong hardcode string o nhieu noi) de de doi khi can migrate schema.
- `transpilePackages` trong `next.config.ts` can thiet vi `@cyberskill/amlich-core` la ESM-only package trong workspace; Next.js can transpile no sang CommonJS hoac ESM phu hop voi bundler mode.
- Font Be Vietnam Pro tren CDN Google Fonts can `<link rel="preconnect">` de giam latency; nhung cho PWA offline day du, nen bundle vao `public/fonts/` va reference bang `@font-face` trong global CSS - quyet dinh nay anh huong service worker strategy.
- JSDOM trong test khong ho tro `Capacitor` runtime; moi test import `storage.ts` se thuc hien nhanh localStorage path. Dam bao mock `localStorage` dung cach `Object.defineProperty` (khong phai `jest.spyOn`) vi JSDOM co localStorage thi cai dat nay co the khac.

*Hết FR-LUNAR-010.*
