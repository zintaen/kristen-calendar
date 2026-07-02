---
id: FR-LUNAR-010
title: "App shell - Next.js/React PWA + Capacitor iOS wrapper, import amlich-core, on-device storage, routing, glue for local notifications"
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
  - DEC-LUNAR-100 (Next.js/React + Tailwind for web/PWA; Capacitor wraps that same web build as the iOS native wrapper; maximize code-sharing with the web team; no React Native in Phase 1)
  - DEC-LUNAR-101 (on-device storage uses localStorage or IndexedDB on the web, and @capacitor/preferences on iOS via a Capacitor plugin; no backend in Phase 1; data is stored only on the device)
  - DEC-LUNAR-102 (routing uses the Next.js App Router; the main routes: "/" (home/today), "/calendar" (month grid), "/reminders" (reminder list), "/settings", "/festival/[id]" (occasion detail page))
  - DEC-LUNAR-103 (Capacitor is the connection glue for @capacitor/local-notifications; the web build is the source of truth; the Capacitor wrapper is a thin shell containing no business logic)
  - DEC-LUNAR-104 (the PWA manifest and service worker are mandatory for offline and "Add to Home Screen" on Android; iOS does not yet support full PWA push, so Capacitor is the main channel on iPhone)
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
  - "storing user data on a server or cloud without explicit consent in Phase 1 (violates DEC-LUNAR-101 / NFR-Privacy)"
  - "embedding a Claude API key in client code (violates NFR-Security)"
  - "using a backend API in Phase 1 for the core calendar/reminder functions (Phase 1 is offline-first, DEC-LUNAR-101)"
effort_hours: 10
sub_tasks:
  - "1.5h: initialize the Next.js project with the App Router, Tailwind, import @cyberskill/amlich-core and @cyberskill/genie-ui"
  - "1.5h: storage.ts - Reminder CRUD with localStorage/IndexedDB + @capacitor/preferences adapter"
  - "1.0h: app/layout.tsx - global layout with the purple theme, Be Vietnam Pro, bottom nav bar"
  - "1.0h: app/page.tsx - home screen: today (solar + lunar + can-chi), upcoming reminders"
  - "1.0h: app/calendar/page.tsx - route wrapping CalendarGrid (FR-007)"
  - "1.0h: app/reminders/page.tsx and settings/page.tsx - placeholder routes for FR-006"
  - "1.0h: notificationGlue.ts - interface wrapping @capacitor/local-notifications, stub on the web"
  - "0.5h: capacitor.config.ts - config Capacitor bundle ID, webDir, plugin list"
  - "0.5h: manifest.json, next.config.ts - PWA setup, offline cache strategy (DEC-LUNAR-104)"
  - "1.0h: integration test: build succeeds, route / renders correctly, storage CRUD does not crash"
risk_if_skipped: "Without the app shell, there is nothing to deploy for the wife to try (an MVP criterion). FR-005 (rolling-64 notifications) and FR-006 (reminder management) both depend on the app shell for the storage layer and the Capacitor plugin glue. FR-007 (grid) needs routing to mount CalendarGrid on the /calendar route."
---

## §1 - Description (BCP-14 normative)

The app shell **MUST** set up the technical foundation for the entire Phase 1 MVP: Next.js/React PWA, a Capacitor wrapper for iOS, on-device storage, routing, and the glue layer for local notifications.

1. **MUST** initialize a Next.js project (App Router, TypeScript 5.x) at `apps/web/` with Tailwind CSS; import `@cyberskill/amlich-core` and `@cyberskill/genie-ui` from the workspace packages (DEC-LUNAR-100).
2. **MUST** configure the 5 main routes with the Next.js App Router: `/` (home - today), `/calendar` (month calendar grid), `/reminders` (reminder list), `/settings` (settings), `/festival/[id]` (occasion detail page) (DEC-LUNAR-102).
3. **MUST** provide `apps/web/lib/storage.ts` exporting the CRUD functions for `Reminder[]`: `getReminders()`, `saveReminder(r: Reminder)`, `deleteReminder(id: string)`, `updateReminder(r: Reminder)`, `getSettings()`, `saveSettings(s: UserSettings)` - stored on-device, with no network call (DEC-LUNAR-101).
4. **MUST** implement the storage adapter: on the web (browser) use `localStorage` or `IndexedDB`; on iOS via Capacitor use `@capacitor/preferences`; the interface must be uniform so the code need not know where it is running (DEC-LUNAR-101).
5. **MUST** provide `apps/web/lib/notificationGlue.ts` exporting the `NotificationService` interface with the methods `scheduleNotification(opts)`, `cancelAllPending()`, `requestPermission()`; on the web (non-Capacitor) the implementation is a no-op stub; on Capacitor the implementation calls `@capacitor/local-notifications` (DEC-LUNAR-103).
6. **MUST** configure `capacitor.config.ts` with `appId: "world.cyberskill.genieamlich"`, `appName: "Genie Am Lich"`, `webDir: "out"` (Next.js static export), and declare the `LocalNotifications` plugin (DEC-LUNAR-103).
7. **MUST** configure `next.config.ts` to enable static export (`output: "export"`) so Capacitor can package the web build; do NOT use Next.js server-side rendering or API routes in Phase 1 (DEC-LUNAR-100, DEC-LUNAR-101).
8. **MUST** create `public/manifest.json` with `name`, `short_name`, `theme_color` (purple from `PURPLE_TOKENS`), `background_color` (cream from `PURPLE_TOKENS`), `display: "standalone"`, and `icons` for the PWA (DEC-LUNAR-104).
9. **MUST** display a bottom navigation bar with 4 tabs: Today, Calendar, Reminders, Settings; the active tab is highlighted with a purple token; navigation **MUST** work on both the web and iOS Capacitor.
10. **MUST** on the `/` (home) route display today including: the full solar date, the lunar date, the day/month/year can-chi by calling `convertSolar2Lunar` from `amlich-core`; and the list of upcoming reminders (up to 3 items) read from storage.
11. **MUST** import the Be Vietnam Pro font from Google Fonts in `app/layout.tsx` (or bundle locally in `public/fonts/` for offline); apply `font-family` to the whole app via the Tailwind config or global CSS.
12. **MUST** ensure the app shell builds successfully with `pnpm build` (Next.js static export, no TypeScript error, no missing import from the workspace packages).
13. **MUST** ensure the home route `/` renders today's lunar date correctly when running `pnpm dev` or after a build (integration test).
14. **MUST NOT** store any user data on a server in Phase 1; every Reminder and Settings exists only on the device (DEC-LUNAR-101, NFR-Privacy).
15. **SHOULD** configure a service worker (via `next-pwa` or equivalent) to cache static assets for offline; prioritize caching the Be Vietnam Pro font and the `amlich-core` bundle (DEC-LUNAR-104).
16. **SHOULD** detect the Capacitor runtime (`Capacitor.isNativePlatform()`) and show small UI adjustments (for example hiding some web-only behavior) without a separate build config.

---

## §2 - Why this design (rationale for humans)

**Why Next.js/React + Capacitor instead of React Native (DEC-LUNAR-100)?** React Native requires rewriting the UI layer with native components, losing the advantage of code-sharing with the web. Capacitor wraps that same web build, so the HCMC web team that knows React need not learn native APIs; it only needs to add a Capacitor plugin for notifications. PRD §9 specifies Capacitor and states clearly "If advanced animation is needed later, consider RN" - but for the MVP, Capacitor wins on speed.

**Why static export (`output: "export"`) instead of Next.js SSR (DEC-LUNAR-101)?** Phase 1 has no backend. Capacitor requires static HTML/JS/CSS files in the `out/` directory to package into the iOS app bundle. SSR requires a Node.js server runtime - unusable in Capacitor. Static export is the natural choice and ensures the whole app works offline.

**Why the storage adapter pattern (DEC-LUNAR-101)?** `localStorage` works on the web but Capacitor iOS recommends `@capacitor/preferences` to ensure the data is not cleared by iOS under low storage. Wrapping the two implementations behind a common interface lets us unit test storage on the web without the Capacitor runtime.

**Why is `notificationGlue.ts` a no-op stub on the web (DEC-LUNAR-103)?** `@capacitor/local-notifications` only works with a native runtime. If imported directly into a component, the build would error in the web or test environment. The stub pattern lets FR-005 and FR-006 test the scheduling logic without a real iOS device.

**Why `appId: "world.cyberskill.genieamlich"` (DEC-LUNAR-103)?** The bundle ID follows the CyberSkill reverse-domain convention (`world.cyberskill.*`). It must be decided early because App Store Connect requires the bundle ID when creating the app record and it cannot be changed later.

**Why is the PWA manifest mandatory (DEC-LUNAR-104)?** Web push notification on iOS 16.4+ only works when the PWA has been "Add to Home Screen" - without a manifest there is no PWA. For Android and desktop, the manifest also allows installing the app from the browser. PRD Key Finding #6 states clearly that web push is "supplementary", not the main channel, but it still needs to be set up correctly.

**Why no API route in Phase 1 (DEC-LUNAR-101)?** Next.js API routes require a server runtime, conflicting with `output: "export"`. Phase 1 needs no backend (no AI, no ZNS). When Phase 2 needs a Claude proxy (`/api/genie`), it will move to Vercel Functions or a separate service without changing the client code.

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

1. `pnpm build` in `apps/web/` completes with no error; the `out/` directory is created with `index.html`, `calendar/index.html`, `reminders/index.html`, `settings/index.html`.
2. The `/festival/[id]` route with `id = "vu-lan"` renders the Vu Lan detail page taken from `getFestivalById("vu-lan")` of FR-LUNAR-008 without server-side data fetching.
3. `getReminders()` called right after app startup (empty state) returns an empty array without throwing an error.
4. `saveReminder(r)` then `getReminders()` returns an array with 1 element matching the saved `r` (round-trip test on a localStorage mock).
5. `deleteReminder(id)` deletes the correct reminder by id; `getReminders()` afterward no longer contains that reminder.
6. `createNotificationService()` on the web environment (no Capacitor) returns `WebNotificationStub`; on the Capacitor environment returns `CapacitorNotificationService`.
7. `capacitor.config.ts` exports an object with `appId === "world.cyberskill.genieamlich"` and `webDir === "out"`.
8. `public/manifest.json` is valid JSON, with all 4 fields `name`, `display: "standalone"`, `theme_color`, `background_color`; `background_color` is the warm cream value from FR-LUNAR-009.
9. The `/` (home) route displays today (solar date, lunar date, can-chi) calling `convertSolar2Lunar` with no network (integration test with mock date "2025-01-29" returns the first day of Tet At Ty).
10. The bottom navigation has 4 tabs; clicking "Calendar" navigates to `/calendar`; the active tab is highlighted with the deep purple color from the token.
11. The Be Vietnam Pro font is declared in `layout.tsx`; the build output contains no other font reference as primary.
12. `next.config.ts` has `output: "export"` and `transpilePackages: ["@cyberskill/amlich-core", "@cyberskill/genie-ui"]`.
13. There is no `fetch`, `axios`, or HTTP call in `storage.ts` (checked by grep in the file).
14. `pnpm test` in `apps/web/` runs without crashing with at least 5 storage CRUD tests passing.
15. The build output at `out/` contains no `.env` file or any API key (grep for `ANTHROPIC_API_KEY` and `ZNS_TOKEN` returns empty).

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

The API contract in §3 is a full skeleton. The trickiest point is that the storage adapter must work in both JSDOM (test) and the real Capacitor environment:

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

Upstream: `FR-LUNAR-001` provides `convertSolar2Lunar` used on the home route `/` to compute today's lunar date; `FR-LUNAR-009` provides `PURPLE_TOKENS`, `SEMANTIC`, and components to apply the theme globally in `layout.tsx`.

Downstream: `FR-LUNAR-005` (rolling-64 notifications) uses the `NotificationService` interface from `notificationGlue.ts` and `Reminder[]` from `storage.ts`; `FR-LUNAR-006` (reminder management) uses the storage CRUD and the `/reminders` route; `FR-LUNAR-007` (calendar grid) mounts on the `/calendar` route; `FR-LUNAR-012` (good-day picker) mounts on a new route in Phase 2; `FR-LUNAR-015` (AI Genie) needs a Next.js API route - it will change `output: "export"` to hybrid mode or split out to Vercel Functions when Phase 2 begins.

Cross-cutting: All Phase 1 FRs depend on `storage.ts` to read/write Reminders. `notificationGlue.ts` is the contract that FR-LUNAR-005 implements concretely on Capacitor.

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

Resolved:
- Static export vs SSR: `output: "export"` for Phase 1 (DEC-LUNAR-100).
- Storage adapter: localStorage/IndexedDB + `@capacitor/preferences` behind a common interface (DEC-LUNAR-101).
- Bundle ID: `world.cyberskill.genieamlich` (DEC-LUNAR-103).

Still deferred:
- Phase 2 Next.js API routes (`/api/genie`): `output: "export"` is not compatible with API routes. When Phase 2 begins, we need to switch to `output: "standalone"` or use separate Vercel Functions - deferred, does not affect Phase 1.
- IndexedDB vs localStorage: `localStorage` is enough for Phase 1 with a small number of reminders (< 100 records). If the user has > 100 death anniversaries, switch to IndexedDB - deferred.
- Service worker: `next-pwa` or `@ducanh2912/next-pwa` needs a compatibility review with Next.js 15 App Router before use - deferred after pinning the Next.js version.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `output: export` conflicts with a Phase 2 API route | Build error when adding /api/genie | Phase 2 blocked | Switch to hybrid mode or split out Vercel Functions |
| localStorage cleared when iOS is low on storage | App loses all data | User loses reminders | Migrate to @capacitor/preferences in the storage adapter |
| Capacitor does not recognize webDir "out" after Next.js renames it | npx cap sync error | iOS build fails | Ensure webDir in capacitor.config matches the output folder |
| Be Vietnam Pro not cached offline | Service worker miss | Font falls back to system-ui | Bundle the font locally in public/fonts/ and cache it in the SW |
| transpilePackages missing amlich-core or ui | Build error "can not find module" | App cannot build | Add it to transpilePackages in next.config.ts |
| Storage CRUD race condition (save/get concurrently) | Flaky test | Data loss | Use an async queue or sequential await |
| createNotificationService() returns the wrong type | Unit test | FR-005 calls a Capacitor API on the web, crash | Fix the isCapacitor() check |
| manifest.json missing the icons field | Lighthouse PWA audit fail | Cannot Add to Home Screen | Add icon 192 and 512 to public/icons/ |
| API key leaked in the build output | grep ANTHROPIC_API_KEY in out/ | Dangerous security exposure | Ensure no .env.local is committed; use .gitignore |
| TypeScript error in a workspace package import | pnpm build fail | Deploy blocked | Fix types in amlich-core and ui before building |
| Capacitor sync fails (ios/ not initialized yet) | npx cap add ios error | The iOS target does not exist | Run `npx cap add ios` before `npx cap sync` |
| Bottom nav active tab wrong (highlights the wrong route) | Integration test clicking nav | Confusing UX | Use usePathname() from Next.js, compare with the current pathname |

---

## §11 - Implementation notes

- `isCapacitor()` should check `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform()` - two checks are needed: one for SSG/SSR safety, one for runtime detection. (§3 already ships this exact form; optional chaining alone does NOT rescue an undeclared `window`.)
- The home route `/` assembles the lunar date like FR-LUNAR-007: `convertSolar2Lunar` returns a TUPLE `[d,m,y,leap]` (no can-chi/zodiac). Can-chi/zodiac MUST be called separately from FR-LUNAR-002 with a JDN: `const jdn = jdFromDate(d,m,y); canChiDay(jdn).label; canChiYear(lYear).label; zodiacOf(lYear)`. The §5 mock test has been fixed to match this form - avoiding a false-green when the mock object-shape differs from the real contract.
- `output: "export"` in `next.config.ts` means `useSearchParams()`, `useRouter().push()` with complex query params, and dynamic routes such as `/festival/[id]` all have to use `generateStaticParams()` to pre-render. Forgetting this step causes a build error or a 404 page on deploy.
- Capacitor `@capacitor/local-notifications` needs `requestPermissions()` before `schedule()`; a common mistake is calling `schedule()` without checking permission, causing a silent fail on iOS. The `notificationGlue.ts` CapacitorNotificationService MUST call `requestPermission()` first.
- The storage keys `genie_reminders` and `genie_settings` must be exported as constants (not hardcoded strings in many places) so they are easy to change when the schema needs migrating.
- `transpilePackages` in `next.config.ts` is needed because `@cyberskill/amlich-core` is an ESM-only package in the workspace; Next.js needs to transpile it to CommonJS or ESM appropriate to the bundler mode.
- The Be Vietnam Pro font on the Google Fonts CDN needs `<link rel="preconnect">` to reduce latency; but for a fully offline PWA, bundle it into `public/fonts/` and reference it with `@font-face` in global CSS - this decision affects the service worker strategy.
- JSDOM in the test does not support the `Capacitor` runtime; every test importing `storage.ts` runs the fast localStorage path. Ensure the `localStorage` mock uses `Object.defineProperty` (not `jest.spyOn`) because JSDOM having localStorage may make this setup differ.

*End of FR-LUNAR-010.*
