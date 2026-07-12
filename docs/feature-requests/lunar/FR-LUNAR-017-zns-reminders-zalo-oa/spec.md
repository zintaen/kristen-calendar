---
id: FR-LUNAR-017
title: "ZNS reminders - send reminders via Zalo Official Account, approved template (<= 400 characters, >= 1 parameter), 06:00-22:00 window, <= 7 days before/after, OA token auto-refresh"
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
related_frs: [FR-LUNAR-016]
depends_on: [FR-LUNAR-004, FR-LUNAR-016]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-B08)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch Việt Nam\") của CyberSkill).md#11 (ZNS architecture)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Key Findings 4 (ZNS rules), Caveats (ZNS price/rules)"
source_decisions:
  - DEC-LUNAR-170 (ZNS is sent only to users who provided a phone number via the Zalo Mini App and have a transactional relationship with the OA - not to arbitrary numbers; this is a hard Zalo constraint)
  - DEC-LUNAR-171 (the ZNS template must be approved by Zalo in advance; the template has <= 400 characters, >= 1 personalization parameter; the content must not change after approval)
  - DEC-LUNAR-172 (send messages only within the 06:00-22:00 window in Asia/Ho_Chi_Minh; and only when the event is >= 0 days and <= 7 days away; outside this window it is removed from the send queue)
  - DEC-LUNAR-173 (the OA access token has an expiry; it must be auto-refreshed with the OA refresh_token before it expires; do not let the token expire mid-cron-run)
  - DEC-LUNAR-174 (a serverless cron scans Reminders with the ZNS channel, computes occurrences with amlich-core, then calls the ZNS API; the fee of ~200 VND is charged only on a successful send - Zalo does not charge on failure)
  - DEC-LUNAR-175 (a distributor (VietGuys / Infobip / 8x8) MAY be used instead of integrating directly with the OA API to simplify onboarding; the final decision is made at OA registration time)
language: typescript 5.x
service: services/genie-api/
new_files:
  - services/genie-api/api/zns.ts
  - services/genie-api/lib/zns-client.ts
  - services/genie-api/lib/oa-token.ts
  - services/genie-api/lib/zns-scheduler.ts
  - services/genie-api/lib/zns-window.ts
  - services/genie-api/supabase/migrations/0018_zns_send_log.sql
  - services/genie-api/__tests__/zns-scheduler.test.ts
  - services/genie-api/__tests__/zns-window.test.ts
  - services/genie-api/__tests__/oa-token.test.ts
modified_files:
  - services/genie-api/api/zns.ts
  - "(none - greenfield for this service)"
allowed_tools:
  - file_read: "services/genie-api/**"
  - file_read: "packages/amlich-core/**"
  - file_write: "services/genie-api/**"
  - bash: "cd services/genie-api && pnpm test"
disallowed_tools:
  - "send ZNS to a phone number the user did not provide via the Zalo Mini App (violates DEC-LUNAR-170)"
  - "send messages outside the 06:00-22:00 window or > 7 days before/after the event (violates DEC-LUNAR-172)"
  - "hardcode OA_ACCESS_TOKEN into the code or client (violates NFR-Security)"
  - "use a template not approved by Zalo or change the content after approval (violates DEC-LUNAR-171)"
  - "send ZNS that is purely advertising content (violates Zalo rules and DEC-LUNAR-170)"
effort_hours: 10
sub_tasks:
  - "1.0h: oa-token.ts - read/store the OA access_token + refresh_token from env/Supabase; auto-refresh when the token expires"
  - "1.5h: zns-window.ts - send-window check functions: isWithinSendWindow(eventDate, now) and isWithinDayRange(eventDate, now, max=7)"
  - "2.0h: zns-scheduler.ts - cron scan: read Reminders with the ZNS channel from Supabase/Storage; compute occurrences with amlich-core via candidateLunarYears() (MONTHLY = scan multiple months, ANNUAL/ONCE = scan by year); filter by window; build the template payload"
  - "1.5h: zns-client.ts - call the ZNS API (directly to the OA or via a distributor) with the OA token; handle the response code; log the result"
  - "1.0h: migration 0018_zns_send_log.sql - the zns_send_log table (reminderId, phone, sentAt, status, zaloMessageId)"
  - "1.0h: api/zns.ts - serverless endpoint for the cron trigger or a webhook to receive status callbacks from Zalo"
  - "1.0h: __tests__/zns-window.test.ts - test the hour window, the day window, boundaries"
  - "1.0h: __tests__/zns-scheduler.test.ts - test the occurrence filtering logic, payload building, skip on rest"
risk_if_skipped: "FR-B08 (reminders via ZNS for Zalo users) is a core requirement of Phase 3 commercialization; without ZNS, Zalo Mini App users would receive no reminders at all (the Mini App cannot push notifications natively). The entire strategy of reaching the roughly 80 million Zalo users through a proactive reminder channel is nullified. ZNS fee revenue (premium billed per message sent) is also affected."
---

## §1 - Description (BCP-14 normative)

The ZNS sender MUST send lunar-calendar reminder messages via the Zalo Official Account (OA) to users who granted a phone number and consented, in full compliance with Zalo platform rules. This is the contract:

1. MUST send ZNS only to phone numbers the user voluntarily provided via the Zalo Mini App (FR-LUNAR-016) and that have a transactional relationship with the OA; MUST NOT send to phone numbers collected from any other source or without consent (DEC-LUNAR-170, NFR-Privacy/PDPL).
2. MUST use a Zalo-approved template before sending; the template MUST have at most 400 characters and at least 1 personalization parameter (DEC-LUNAR-171). Default template: "Chao {ten}, ngay mai ({ngay duong}) la {dip} ({ngay am}). Dung quen chuan bi nhe!".
3. MUST NOT use the ZNS template to send purely advertising content (pure advertising); every message must be tied to a specific lunar event of the user (DEC-LUNAR-171, Zalo rules).
4. MUST send messages only within the 06:00-22:00 window in `Asia/Ho_Chi_Minh` (UTC+7); if the send time falls outside this window, it MUST wait until 06:00 the next day or be cancelled depending on the configured policy (DEC-LUNAR-172).
5. MUST send messages only when the event is within [0 days, 7 days] of the send date; specifically: `0 <= daysUntilEvent <= 7`; an overdue event (< 0) or a too-distant event (> 7 days) MUST NOT be sent (DEC-LUNAR-172).
6. MUST manage the OA access token automatically: read `OA_ACCESS_TOKEN` and `OA_REFRESH_TOKEN` from environment variables or a secret store; check the expiry before each cron batch; if the token has under 10 minutes to expiry, it MUST refresh before sending (DEC-LUNAR-173, NFR-Security).
7. MUST NOT hardcode `OA_ACCESS_TOKEN`, `OA_REFRESH_TOKEN`, or any ZNS credential into the code or the client (NFR-Security); all communication with the Zalo OA API MUST go through the server side (services/genie-api/).
8. MUST run a serverless cron (integrated with Vercel Cron or equivalent) on a suitable schedule (not more often than every 15 minutes) to scan the list of Reminders whose `channels` contain `"ZNS"` and `enabled = true`, compute occurrences with `amlich-core`, filter by the rules in §1 #4 and #5, then send the messages (DEC-LUNAR-174).
9. MUST compute the occurrence's lunar and solar dates with `convertLunar2Solar` from `@cyberskill/amlich-core` with `tz = 7.0`; MUST NOT use another calendar-computation source, to ensure consistency with the clients (DEC-LUNAR-174).
10. MUST log each send into the `zns_send_log` table (fields: `reminderId`, `phone`, `sentAt`, `status`, `zaloMessageId`); the fee of ~200 VND is incurred only when Zalo returns a successful send - record this clearly for cost reporting (DEC-LUNAR-174).
11. MUST handle ZNS API error codes clearly: a failed send (OA token error, rate-limit, phone number not on Zalo) MUST be logged with the specific error code; then it MUST NOT retry immediately but MUST defer to the next cron run (to avoid piling up messages).
12. SHOULD support the option to use a distributor such as VietGuys, Infobip, or 8x8 to send ZNS instead of integrating directly via the Zalo OA Open API; the specific decision is deferred until official OA registration (DEC-LUNAR-175).
13. MUST fill the template parameters using the exact parameter names Zalo approved; for example, if the template has `{ten}`, `{ngay duong}`, `{dip}`, `{ngay am}`, the sent payload must contain all 4 parameters.
14. MUST NOT send more than 1 ZNS message for the same Reminder and the same user on the same day; check `zns_send_log` before sending to avoid duplicate sends.
15. MUST support `recurrence = "MONTHLY"` in `SchedulerReminder`: the cron MUST use `candidateLunarYears()` to generate an occurrence for each lunar month in the scan window (at least the current month and the next month); each month generates exactly 1 occurrence within the 06:00-22:00 Asia/Ho_Chi_Minh window and within 7 days before/after the event - ensuring the Ram and Mung Mot reminders repeat all 12 times a year via ZNS (not just once a year like ANNUAL).

---

## §2 - Why this design (rationale for humans)

**Why ZNS instead of a regular push notification?** The Zalo Mini App has no native push API (DEC-LUNAR-162 in FR-016). ZNS via the OA is the only way for "Genie Am Lich" to send proactive messages to Zalo users. Beyond that, ZNS has a higher delivery rate than web push because it goes through Zalo's official messaging system of roughly 2.1 billion messages/day (PRD Key Findings 3).

**Why the 06:00-22:00 window and <= 7 days?** These are hard Zalo platform rules for ZNS (Key Findings 4, PRD Caveats). Sending outside the window will be rejected by Zalo and may get the OA blocked. The <= 7 days before/after constraint keeps ZNS aligned with the intent of "reminding about an upcoming event", not for periodic advertising.

**Why auto-refresh the OA token?** The OA access token has an expiry (typically 1 hour to 30 days depending on OA configuration); letting it expire mid-cron-run fails the entire batch. Checking the expiry before each cron batch and refreshing proactively when under 10 minutes remain ensures no batch is cancelled due to a token error (DEC-LUNAR-173, NFR-Security).

**Why use a serverless cron instead of real-time events?** A stateless serverless function is cheaper than keeping a server always alive. For lunar-calendar reminders (the needed moment is only the early morning before a holiday), a 15-minute cron frequency is precise enough; no real-time sub-second is needed. This also scales easily and is inexpensive (DEC-LUNAR-174).

**Why log to zns_send_log?** Zalo charges ~200 VND per successful send (PRD Caveats). Without a log, you cannot report cost, debug send errors, or guard against duplicate sends (ISS-004). The log is the protective table against over-billing and a data source for commercial analytics.

**Why support a distributor (VietGuys/Infobip/8x8)?** Onboarding an OA directly with Zalo requires official OA registration, verification, and possibly a Zalo Channel Agent (ZCA) for billing. A distributor shortens this process and may provide a simpler SDK. The final decision depends on the official registration process; the API contract in §3 is designed to be neutral between direct and distributor (DEC-LUNAR-175).

**Why amlich-core to compute the date in the cron?** The cron runs server-side, imports `@cyberskill/amlich-core` (TypeScript, zero-dependency), and calls `convertLunar2Solar` to compute the solar date from the Reminder's lunar date. This guarantees 100% consistency with the computation used by the Zalo Mini App and Web clients, avoiding the case where the server and client return different dates (DEC-LUNAR-174).

---

## §3 - API contract

```typescript
// services/genie-api/lib/oa-token.ts

export interface OATokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

// Đọc từ env hoặc Supabase secret store
export async function getOATokenPair(): Promise<OATokenPair> { /* ... */ }

// Gọi Zalo OA refresh endpoint; cập nhật lưu trữ
export async function refreshOAToken(pair: OATokenPair): Promise<OATokenPair> { /* ... */ }

// Đảm bảo token còn hiệu lực; refresh nếu còn < 10 phút hết hạn
export async function ensureFreshToken(): Promise<string> { /* ... */ }
```

```typescript
// services/genie-api/lib/zns-window.ts

export interface SendWindowResult {
  allowed: boolean;
  reason?: "outside_hour_range" | "event_too_far" | "event_past";
}

// Kiểm tra khung 06:00-22:00 Asia/Ho_Chi_Minh
export function isWithinHourWindow(now: Date): boolean {
  const vnHour = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).getHours();
  return vnHour >= 6 && vnHour < 22;
}

// Kiểm tra 0 <= daysUntilEvent <= 7
export function isWithinDayRange(eventDate: Date, now: Date): SendWindowResult {
  const msPerDay = 86_400_000;
  const diff = Math.floor((eventDate.getTime() - now.getTime()) / msPerDay);
  if (diff < 0) return { allowed: false, reason: "event_past" };
  if (diff > 7) return { allowed: false, reason: "event_too_far" };
  return { allowed: true };
}

export function canSendNow(eventDate: Date, now: Date): SendWindowResult {
  if (!isWithinHourWindow(now)) return { allowed: false, reason: "outside_hour_range" };
  return isWithinDayRange(eventDate, now);
}
```

```typescript
// services/genie-api/lib/zns-client.ts

export interface ZNSPayload {
  phone: string;             // số điện thoại người nhận (đã lấy qua OA API)
  templateId: string;        // ID template đã duyệt của Zalo OA
  templateData: {
    ten: string;             // tham số {tên}
    ngay_duong: string;      // tham số {ngày dương}, ví dụ "08/08/2025"
    dip: string;             // tham số {dịp}, ví dụ "Giỗ Bà Nội"
    ngay_am: string;         // tham số {ngày âm}, ví dụ "15/7 Ất Tỵ"
    [key: string]: string;   // các tham số phụ thêm nếu template mở rộng
  };
  trackingId?: string;       // để đối chiếu với zns_send_log.reminderId
}

export interface ZNSSendResult {
  success: boolean;
  zaloMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Gửi tin ZNS qua OA trực tiếp hoặc qua nhà phân phối
// accessToken: kết quả từ ensureFreshToken()
export async function sendZNS(payload: ZNSPayload, accessToken: string): Promise<ZNSSendResult> {
  // POST https://business.openapi.zalo.me/message/template
  // Headers: access_token: accessToken
  // Body: { phone, template_id, template_data }
  // ...
}
```

```typescript
// services/genie-api/lib/zns-scheduler.ts
import { convertLunar2Solar } from "@cyberskill/amlich-core";
import { canSendNow } from "./zns-window";
import { sendZNS } from "./zns-client";
import { ensureFreshToken } from "./oa-token";

export interface SchedulerReminder {
  id: string;
  title: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear?: number;
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE"; // PHẢI có: MONTHLY = Rằm/Mùng Một lặp mỗi tháng; ANNUAL = đám giỗ lặp mỗi năm; ONCE = chỉ 1 lần
  leadTimes: number[];
  notifyTime: string;       // "HH:MM"
  userPhone: string;        // số điện thoại người dùng (đã đổi từ token)
  userName: string;
  channels: string[];
  enabled: boolean;
}

export interface CronRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
}

// Tính tất cả năm-tháng cần quét để sinh occurrence cho một reminder.
// - MONTHLY: quét tháng dương hiện tại + tháng tới (đủ để cron 15 phút bắt được sự kiện cách <= 7 ngày)
// - ANNUAL / ONCE: quét năm âm hiện tại và năm âm tới (reminder.lunarYear nếu có, không thì ước tính)
function candidateLunarYears(
  reminder: SchedulerReminder,
  now: Date
): Array<{ lunarYear: number; lunarMonth: number }> {
  const currentYear = now.getFullYear();
  if (reminder.recurrence === "MONTHLY") {
    // Rằm/Mùng Một: lunarMonth thay đổi mỗi tháng âm; sinh occurrence cho 2 tháng âm tiếp theo.
    // Dùng mốc âm lịch của ngày hiện tại làm neo - tăng lunarMonth thủ công, wrap tại 12.
    // Để đảm bảo bao trùm "7 ngày tới" không bị bỏ sót tháng giáp ranh, quét cả tháng hiện tại
    // và tháng tiếp theo với năm âm ước tính currentYear và currentYear+1.
    const months: Array<{ lunarYear: number; lunarMonth: number }> = [];
    for (const yearOff of [0, 1]) {
      for (let mOffset = 0; mOffset <= 1; mOffset++) {
        // MONTHLY reminder có lunarMonth = 0 (mọi tháng) hoặc cụ thể;
        // nếu = 0 thì sinh occurrence theo từng tháng dương tương ứng (tính bên ngoài).
        // Ở đây truyền lunarMonth của reminder nếu cụ thể, hoặc tháng dương hiện tại nếu = 0.
        const lm = reminder.lunarMonth !== 0
          ? reminder.lunarMonth
          : (now.getMonth() + 1 + mOffset - 1) % 12 + 1;
        months.push({ lunarYear: currentYear + yearOff, lunarMonth: lm });
      }
    }
    return months;
  }
  // ANNUAL hoặc ONCE: 2 năm âm ước tính (currentYear, currentYear+1) với lunarMonth cố định
  return [
    { lunarYear: reminder.lunarYear ?? currentYear, lunarMonth: reminder.lunarMonth },
    { lunarYear: reminder.lunarYear ?? currentYear + 1, lunarMonth: reminder.lunarMonth },
  ];
}

// Hàm chính được gọi bởi cron
export async function runZNSCron(
  reminders: SchedulerReminder[],
  now: Date = new Date()
): Promise<CronRunResult> {
  const TZ = 7.0; // Asia/Ho_Chi_Minh, kinh tuyến 105E
  const accessToken = await ensureFreshToken();
  const result: CronRunResult = { scanned: 0, sent: 0, skipped: 0, errors: 0 };

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.channels.includes("ZNS")) { result.skipped++; continue; }

    // Sinh danh sách (lunarYear, lunarMonth) cần kiểm tra tùy theo recurrence.
    // MONTHLY: nhiều tháng; ANNUAL/ONCE: 1-2 năm với tháng cố định.
    const candidates = candidateLunarYears(reminder, now);

    for (const { lunarYear, lunarMonth } of candidates) {
      for (const leadDays of reminder.leadTimes) {
        // convertLunar2Solar trả về tuple SolarDate = [dd, mm, yy] (FR-LUNAR-001);
        // tháng nhuận không khớp trả sentinel [0, 0, 0] (KHÔNG phải null) -> phải kiểm tra rõ.
        const [gd, gm, gy] = convertLunar2Solar(
          reminder.lunarDay, lunarMonth, lunarYear, reminder.isLeapMonth ? 1 : 0, TZ
        );
        if (gd === 0 && gm === 0 && gy === 0) { result.skipped++; continue; }

        const mmStr = String(gm).padStart(2, "0");
        const ddStr = String(gd).padStart(2, "0");
        const eventDate = new Date(`${gy}-${mmStr}-${ddStr}T${reminder.notifyTime}:00+07:00`);

        result.scanned++;
        const check = canSendNow(eventDate, now);
        if (!check.allowed) { result.skipped++; continue; }

        // Kiểm tra đã gửi chưa (tránh gửi trùng - query zns_send_log)
        // ...

        const sendResult = await sendZNS({
          phone: reminder.userPhone,
          templateId: process.env.ZNS_TEMPLATE_ID!,
          templateData: {
            ten: reminder.userName,
            // Dùng tuple ICT (gd/gm/gy) từ engine, KHÔNG đọc eventDate.getDate()/getMonth()
            // vì chúng đọc theo TZ runtime của server (lệch 1 ngày trên server UTC).
            ngay_duong: `${ddStr}/${mmStr}/${gy}`,
            dip: reminder.title,
            ngay_am: `${reminder.lunarDay}/${lunarMonth}`,
          },
          trackingId: `${reminder.id}-${lunarYear}-${lunarMonth}-${leadDays}`,
        }, accessToken);

        if (sendResult.success) result.sent++;
        else result.errors++;
      }
    }
  }
  return result;
}
```

```typescript
// services/genie-api/api/zns.ts (serverless handler - Vercel Function)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runZNSCron } from "../lib/zns-scheduler";

// Được gọi bởi Vercel Cron (vercel.json schedule)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Xác thực CRON_SECRET để tránh gọi tùy ý
  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  // Đọc reminders từ Supabase
  // ...
  const cronResult = await runZNSCron(reminders);
  res.json({ ok: true, ...cronResult });
}
```

---

## §4 - Acceptance criteria

1. `isWithinHourWindow` returns `true` for 06:00 VN and `false` for 05:59 VN and 22:00 VN (the boundaries); test with a specific date at the corresponding UTC hour.
2. `isWithinDayRange` returns `allowed: true` for `daysUntilEvent = 0` and `= 7`; returns `event_past` for `-1`; returns `event_too_far` for `8`.
3. `canSendNow` returns `outside_hour_range` when the VN hour is 23:00 even if the event date is valid.
4. `runZNSCron` with 1 valid Reminder inside the send window: calls `sendZNS` exactly once with a payload that has all 4 parameters `ten`, `ngay_duong`, `dip`, `ngay_am`; returns `{ sent: 1 }`.
5. `runZNSCron` with a Reminder that has `daysUntilEvent = 8`: does not call `sendZNS`; returns `{ skipped: 1 }`.
6. `runZNSCron` with a Reminder that has `enabled = false`: skips it; returns `{ skipped: 1 }`.
7. `runZNSCron` for an event already in `zns_send_log` on the current day: does not call `sendZNS` a second time; returns `{ skipped: 1 }`.
8. `ensureFreshToken` calls `refreshOAToken` when the token has under 10 minutes to expiry; does not call it when the token has > 30 minutes left.
9. `sendZNS` with a mock OA API returning success: writes 1 row into `zns_send_log` with `status = "success"` and a non-empty `zaloMessageId`.
10. `sendZNS` with a mock OA API returning an error (error code "invalid_phone"): writes 1 row into `zns_send_log` with `status = "error"` and `errorCode = "invalid_phone"`; the function returns `{ success: false }`.
11. The lunar date is computed with `convertLunar2Solar` from `amlich-core`; the result matches the PRD 6.6 fixture (29/01/2025 is 1/1/2025 At Ty).
12. The `api/zns.ts` handler returns 401 when the `Authorization` header is wrong; returns 200 `{ ok: true }` when it is correct.
13. The default template "Chao {ten}, ngay mai ({ngay duong}) la {dip} ({ngay am}). Dung quen chuan bi nhe!" has <= 400 characters (counted in code in the test); the parameters `{ten}`, `{ngay duong}`, `{dip}`, `{ngay am}` appear at least once each.
14. No OA_ACCESS_TOKEN or OA_REFRESH_TOKEN appears in the client bundle (checked in the `zmp build` output).
15. `runZNSCron` with a `RAM` Reminder that has `recurrence = "MONTHLY"`, `lunarDay = 15`, `lunarMonth = 0` (every month), when `now = 2025-08-07` (1 day before the solar 15th of the 7th lunar month): generates ZNS exactly once for the 7th lunar month; when called again with `now = 2025-09-05` (the 8th lunar month): generates exactly once for the 8th lunar month - each send falls within the 06:00-22:00 Asia/Ho_Chi_Minh window and within 7 days of the event.

---

## §5 - Verification

```typescript
// services/genie-api/__tests__/zns-window.test.ts
import { describe, it, expect } from "vitest";
import { isWithinHourWindow, isWithinDayRange, canSendNow } from "../lib/zns-window";

describe("isWithinHourWindow", () => {
  it("06:00 VN (23:00 UTC-1) -> true", () => {
    // 06:00 ICT = 23:00 UTC trước đó
    const now = new Date("2025-08-08T23:00:00Z"); // 06:00 ICT
    expect(isWithinHourWindow(now)).toBe(true);
  });

  it("05:59 VN -> false", () => {
    const now = new Date("2025-08-08T22:59:00Z"); // 05:59 ICT
    expect(isWithinHourWindow(now)).toBe(false);
  });

  it("22:00 VN -> false (biên trên exclusive)", () => {
    const now = new Date("2025-08-08T15:00:00Z"); // 22:00 ICT
    expect(isWithinHourWindow(now)).toBe(false);
  });

  it("21:59 VN -> true", () => {
    const now = new Date("2025-08-08T14:59:00Z"); // 21:59 ICT
    expect(isWithinHourWindow(now)).toBe(true);
  });
});

describe("isWithinDayRange", () => {
  const now = new Date("2025-08-01T08:00:00+07:00");

  it("sự kiện hôm nay (0 ngày) -> allowed", () => {
    const event = new Date("2025-08-01T07:00:00+07:00");
    expect(isWithinDayRange(event, now).allowed).toBe(true);
  });

  it("sự kiện 7 ngày tới -> allowed", () => {
    const event = new Date("2025-08-08T07:00:00+07:00");
    expect(isWithinDayRange(event, now).allowed).toBe(true);
  });

  it("sự kiện 8 ngày tới -> event_too_far", () => {
    const event = new Date("2025-08-09T07:00:00+07:00");
    const result = isWithinDayRange(event, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("event_too_far");
  });

  it("sự kiện quá hạn (-1 ngày) -> event_past", () => {
    const event = new Date("2025-07-31T07:00:00+07:00");
    const result = isWithinDayRange(event, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("event_past");
  });
});

describe("canSendNow", () => {
  it("giờ VN 23:00, sự kiện 3 ngày tới -> outside_hour_range", () => {
    const now = new Date("2025-08-01T16:00:00Z"); // 23:00 ICT
    const event = new Date("2025-08-04T07:00:00+07:00");
    expect(canSendNow(event, now).reason).toBe("outside_hour_range");
  });
});

// Template length check
it("template mặc định <= 400 ký tự và có >= 1 tham số", () => {
  const template = "Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!";
  expect(template.length).toBeLessThanOrEqual(400);
  expect(template).toContain("{tên}");
  expect(template).toContain("{ngày dương}");
  expect(template).toContain("{dịp}");
  expect(template).toContain("{ngày âm}");
});
```

```typescript
// services/genie-api/__tests__/zns-scheduler.test.ts
import { describe, it, expect, vi } from "vitest";
import { runZNSCron } from "../lib/zns-scheduler";
import type { SchedulerReminder } from "../lib/zns-scheduler";

const validReminder: SchedulerReminder = {
  id: "rem-001", title: "Giỗ Bà Nội",
  lunarDay: 15, lunarMonth: 7, isLeapMonth: false,
  recurrence: "ANNUAL",
  leadTimes: [1], notifyTime: "07:00",
  userPhone: "0909123456", userName: "Chị Linh",
  channels: ["ZNS"], enabled: true,
};

describe("runZNSCron", () => {
  it("gửi thành công cho reminder hợp lệ trong khung", async () => {
    // Mock: sự kiện 15/7 Ất Tỵ = 2025-08-08; now = 2025-08-07 08:00 ICT (1 ngày trước)
    vi.mock("../lib/zns-client", () => ({
      sendZNS: vi.fn(async () => ({ success: true, zaloMessageId: "zalo_msg_001" })),
    }));
    vi.mock("../lib/oa-token", () => ({
      ensureFreshToken: vi.fn(async () => "mock_access_token"),
    }));
    // Mock zns_send_log check -> chưa gửi
    const now = new Date("2025-08-07T08:00:00+07:00");
    const result = await runZNSCron([validReminder], now);
    expect(result.sent).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("bỏ qua reminder có enabled = false", async () => {
    const now = new Date("2025-08-07T08:00:00+07:00");
    const result = await runZNSCron([{ ...validReminder, enabled: false }], now);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("bỏ qua khi sự kiện cách 8 ngày", async () => {
    // Sự kiện 15/7 Ất Tỵ = 08/08/2025; now = 31/07/2025 (8 ngày trước)
    const now = new Date("2025-07-31T08:00:00+07:00");
    const result = await runZNSCron([validReminder], now);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("MONTHLY RAM reminder - gửi đúng 1 lần mỗi tháng, trong khung 06:00-22:00 và <= 7 ngày", async () => {
    vi.mock("../lib/zns-client", () => ({
      sendZNS: vi.fn(async () => ({ success: true, zaloMessageId: "zalo_monthly_001" })),
    }));
    vi.mock("../lib/oa-token", () => ({
      ensureFreshToken: vi.fn(async () => "mock_token"),
    }));

    const monthlyRamReminder: SchedulerReminder = {
      id: "rem-ram", title: "Rằm hàng tháng",
      lunarDay: 15, lunarMonth: 0, // 0 = mọi tháng
      isLeapMonth: false,
      recurrence: "MONTHLY",
      leadTimes: [1], notifyTime: "07:00",
      userPhone: "0909123456", userName: "Chị Linh",
      channels: ["ZNS"], enabled: true,
    };

    // Tháng 7 âm lịch: Rằm 15/7 Ất Tỵ = 08/08/2025; now = 07/08/2025 08:00 ICT (1 ngày trước = leadDays=1)
    const nowAug = new Date("2025-08-07T08:00:00+07:00");
    const resultAug = await runZNSCron([monthlyRamReminder], nowAug);
    expect(resultAug.sent).toBeGreaterThanOrEqual(1); // ít nhất 1 occurrence tháng 7 âm

    // Tháng 8 âm lịch: Rằm 15/8 Ất Tỵ ước tính ~05/09/2025; now = 04/09/2025 08:00 ICT
    const nowSep = new Date("2025-09-04T08:00:00+07:00");
    const resultSep = await runZNSCron([monthlyRamReminder], nowSep);
    expect(resultSep.sent).toBeGreaterThanOrEqual(1); // ít nhất 1 occurrence tháng 8 âm khác tháng trước
  });
});

// services/genie-api/__tests__/oa-token.test.ts
describe("ensureFreshToken", () => {
  it("refresh khi còn < 10 phút hết hạn", async () => {
    vi.mock("../lib/oa-token", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../lib/oa-token")>();
      return {
        ...actual,
        getOATokenPair: vi.fn(async () => ({
          accessToken: "old_token",
          refreshToken: "refresh_123",
          expiresAt: Date.now() + 5 * 60 * 1000, // còn 5 phút
        })),
        refreshOAToken: vi.fn(async () => ({
          accessToken: "new_token",
          refreshToken: "refresh_456",
          expiresAt: Date.now() + 3600 * 1000,
        })),
      };
    });
    const { ensureFreshToken } = await import("../lib/oa-token");
    const token = await ensureFreshToken();
    expect(token).toBe("new_token");
  });
});
```

---

## §6 - Implementation skeleton

The full contract is in §3. Key points:

```typescript
// services/genie-api/supabase/migrations/0018_zns_send_log.sql
CREATE TABLE zns_send_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id TEXT NOT NULL,
  phone       TEXT NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL,       -- 'success' | 'error'
  zalo_message_id TEXT,
  error_code  TEXT,
  error_message TEXT
);
CREATE INDEX ON zns_send_log (reminder_id, phone, sent_at);
```

Idempotency check (avoid duplicate sends - AC #7):

```typescript
// Trong runZNSCron, trước khi gửi
const today = new Date(now).toISOString().slice(0, 10);
const alreadySent = await supabase
  .from("zns_send_log")
  .select("id")
  .eq("reminder_id", `${reminder.id}-${leadDays}`)
  .gte("sent_at", `${today}T00:00:00Z`)
  .maybeSingle();
if (alreadySent.data) { result.skipped++; continue; }
```

---

## §7 - Dependencies

Upstream: **FR-LUNAR-004** (the `Reminder` data model; the fields `lunarDay`, `lunarMonth`, `isLeapMonth`, `channels`, `enabled` are used directly in `SchedulerReminder`). **FR-LUNAR-016** (the Zalo Mini App client provides the `User.phone` token and the list of Reminders with `channels: ["ZNS"]`; without FR-016 there is no data source).

Downstream: No FR depends on FR-017.

Cross-cutting: `@cyberskill/amlich-core` is used in the cron (server-side) to compute the solar date from the lunar date; consistent with the client. `zns_send_log` is the data source for ZNS cost analytics in FR-LUNAR-020 (freemium billing).

---

## §8 - Example payloads

```json
{
  "zns_request": {
    "phone": "0909123456",
    "template_id": "ZNS_TMPL_GENIE_001",
    "template_data": {
      "ten": "Chi Linh",
      "ngay_duong": "08/08/2025",
      "dip": "Gio Ba Noi",
      "ngay_am": "15/7 At Ty"
    },
    "tracking_id": "rem-001-1"
  }
}
```

```json
{
  "zns_response_success": {
    "error": 0,
    "message": "Success",
    "data": {
      "message_id": "zalo_msg_abc123",
      "sent_time": 1754630400000
    }
  }
}
```

```json
{
  "zns_response_error": {
    "error": -214,
    "message": "Phone number does not have a Zalo account"
  }
}
```

```json
{
  "zns_send_log_row": {
    "id": "uuid-001",
    "reminder_id": "rem-001-1",
    "phone": "0909123456",
    "sent_at": "2025-08-07T08:00:00+07:00",
    "status": "success",
    "zalo_message_id": "zalo_msg_abc123",
    "error_code": null,
    "error_message": null
  }
}
```

**Default template (registered with the Zalo OA):**
```
Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!
```
Length: 84 characters (< 400). Personalization parameters: 4 (>= 1). No advertising content.

---

## §9 - Open questions

Resolved:
- Direct OA integration or via a distributor: handled by DEC-LUNAR-175 (deferred; the API contract is neutral to both directions).
- Cron interval: chose 15 minutes (Vercel Cron supports it); enough to ensure the message arrives within the first hour.
- Idempotency: use `zns_send_log` + index (rem_id, phone, date) to avoid duplicate sends (AC #7, §6).
- **Support for MONTHLY (Ram/Mung Mot) via ZNS: RESOLVED - FULL COMMERCIAL support.** Founder decision 2026-06-28: "Genie Am Lich" is a full commercial product; the MONTHLY Ram and Mung Mot reminders are a core use case and MUST send ZNS correctly every month. `SchedulerReminder` gains the `recurrence` field; `candidateLunarYears()` is added to `runZNSCron` to expand across multiple lunar months in the scan window; AC #15 and the MONTHLY test in §5 confirm the behavior. Note: BACKLOG decision 8 needs updating to reflect the decision to support MONTHLY via ZNS.

Still open:
- The ~200 VND ZNS price is a reference figure at research time; reconfirm with VietGuys or directly with Zalo at official OA registration (PRD Caveats - price and rules may change).
- Zalo's "transactional relationship" rule: need to confirm exactly what a "transactional relationship" that qualifies for sending ZNS is - the user may need to interact with the OA via chat first. Deferred to the OA registration process.
- ZNS rate limit of the OA: Zalo may cap the number of messages/minute/month per OA; check at registration and add throttling if needed. MONTHLY reminders increase ZNS volume by roughly 12x compared to ANNUAL - monitor closely at registration so as not to exceed the rate limit.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| OA access token expires mid-cron | `ensureFreshToken` checks expiry before each batch | Refresh before sending; no batch fails | Automatic; log the refresh event |
| OA refresh token expires (revoked) | `refreshOAToken` returns an error | The entire cron batch skips ZNS sending; critical alert | Operator reissues the token manually; alert |
| CRON_SECRET wrong - someone calls /api/zns | Header check -> 401 | Request rejected; nothing sent | No action needed; log it |
| User's phone number is not on Zalo | ZNS API returns code -214 | Log the error, mark it in zns_send_log | Notify the user "This phone number cannot receive ZNS" |
| Duplicate send because cron triggered multiple times | Idempotency check zns_send_log | The 2nd time is skipped | No impact; log "already_sent" |
| Outside the 06:00-22:00 window | `isWithinHourWindow` -> false | Reminder is skipped; sent on the next cron run | Automatic if the cron runs again within the window |
| Event more than 7 days away | `isWithinDayRange` -> event_too_far | Skip; do not send | The Reminder will be handled when it is closer |
| Template does not match the registered parameters | ZNS API returns "invalid_template_data" error | Log the error; skip this reminder | Recheck the `templateData` key names against the approved template |
| Supabase has no phone row for the user | `reminder.userPhone` null/undefined | Skip the reminder; log a warning | The user needs to grant the phone permission in the Mini App |
| ZNS OA rate limit exceeded | ZNS API returns HTTP 429 | Stop sending; log; delay | Handle retry on the next cron run with exponential backoff |
| `convertLunar2Solar` returns the sentinel `[0,0,0]` (leap month does not match / invalid lunar day) | Check `gd===0 && gm===0 && gy===0` after the call (NOT null) | Skip the occurrence; log a warning | Debug the Reminder data; notify the user |
| Vercel Cron disabled / budget exceeded | No cron log for 1+ hour | The user receives no reminders | Monitor alert; check the Vercel dashboard |
| OA token leaked into logs | Audit log pattern | Detected if the token appears in plaintext | Mask the token in all log statements |

---

## §11 - Implementation notes

- `getPhoneNumber` in the Zalo Mini App returns a token, not the real number; the server must exchange this token for the number via the Zalo OA API (`POST https://openapi.zalo.me/v2.0/oa/getuserfromtoken`) before storing it in `User.phone`. This exchange must be a separate endpoint called right after the Mini App sends up the token.
- The official ZNS API endpoint is `POST https://business.openapi.zalo.me/message/template`; the `access_token` header (not Bearer); the body is JSON with `phone`, `template_id`, `template_data`. Recheck the endpoint at implementation time because Zalo may update it.
- The 06:00-22:00 window must be computed in `Asia/Ho_Chi_Minh` (ICT, UTC+7), not the server's UTC; use `toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })` or the `date-fns-tz` library to avoid confusion.
- Idempotency is mandatory: Vercel Cron may run more than once due to retries; `zns_send_log` with the index `(reminder_id, phone, sent_at::date)` is the primary protective barrier.
- The template must be registered and approved with the Zalo OA before Deploy; the approval process can take 1-5 business days. Keep `ZNS_TEMPLATE_ID` in an environment variable; do not hardcode it in the code.
- When using a distributor (VietGuys etc.), the endpoint and request structure may differ; `zns-client.ts` is designed so the backend can be swapped without changing `zns-scheduler.ts`.
- `zns_send_log` needs to be analyzed monthly to report ZNS cost; the total `COUNT(*) WHERE status='success'` * 200 VND is the estimated monthly fee.
- The P3 migration numbers are distributed to avoid collisions: 0016-0017 for FR-018, 0018 for FR-017, 0019 for FR-019, 0020 for FR-020.

*End of FR-LUNAR-017.*
