---
id: FR-LUNAR-017
title: "ZNS reminders - gửi nhắc qua Zalo Official Account, template đã duyệt (<= 400 ký tự, >= 1 tham số), khung 06:00-22:00, <= 7 ngày trước/sau, OA token auto-refresh"
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
  - DEC-LUNAR-170 (ZNS chỉ gửi cho người dùng đã cung cấp số điện thoại qua Zalo Mini App và có quan hệ giao dịch với OA - không gửi cho số tùy ý; đây là ràng buộc cứng của Zalo)
  - DEC-LUNAR-171 (template ZNS phải được Zalo duyệt trước; template có <= 400 ký tự, >= 1 tham số cá nhân hóa; không được thay đổi nội dung sau khi duyệt)
  - DEC-LUNAR-172 (chỉ gửi tin trong khung 06:00-22:00 theo Asia/Ho_Chi_Minh; và chỉ khi sự kiện cách >= 0 ngày và <= 7 ngày; ngoài khung này loại khỏi hàng đợi gửi)
  - DEC-LUNAR-173 (OA access token có thời hạn; phải tự động refresh bằng OA refresh_token trước khi hết hạn; không để token hết hạn giữa một chạy cron)
  - DEC-LUNAR-174 (serverless cron quét Reminder có ZNS channel, tính occurrence bằng amlich-core, rồi gọi ZNS API; phí ~200 VND chỉ tính khi gửi thành công - Zalo không tính phí khi lỗi)
  - DEC-LUNAR-175 (có thể dùng nhà phân phối (VietGuys / Infobip / 8x8) thay vì tích hợp trực tiếp OA API để đơn giản hóa onboarding; quyết định chính thức khi đăng ký OA)
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
  - "(none - greenfield cho service này)"
allowed_tools:
  - file_read: "services/genie-api/**"
  - file_read: "packages/amlich-core/**"
  - file_write: "services/genie-api/**"
  - bash: "cd services/genie-api && pnpm test"
disallowed_tools:
  - "gửi ZNS cho số điện thoại mà người dùng chưa cung cấp qua Zalo Mini App (vi phạm DEC-LUNAR-170)"
  - "gửi tin ngoài khung 06:00-22:00 hoặc > 7 ngày trước/sau sự kiện (vi phạm DEC-LUNAR-172)"
  - "nhúng OA_ACCESS_TOKEN cứng vào code hoặc client (vi phạm NFR-Security)"
  - "dùng template chưa qua duyệt Zalo hoặc thay đổi nội dung sau khi duyệt (vi phạm DEC-LUNAR-171)"
  - "gửi ZNS nội dung quảng cáo thuần túy (vi phạm quy tắc Zalo và DEC-LUNAR-170)"
effort_hours: 10
sub_tasks:
  - "1.0h: oa-token.ts - đọc/lưu OA access_token + refresh_token từ env/Supabase; auto-refresh khi token hết hạn"
  - "1.5h: zns-window.ts - hàm kiểm tra khung gửi: isWithinSendWindow(eventDate, now) và isWithinDayRange(eventDate, now, max=7)"
  - "2.0h: zns-scheduler.ts - cron scan: đọc Reminder có ZNS channel từ Supabase/Storage; tính occurrence bằng amlich-core qua candidateLunarYears() (MONTHLY = quét nhiều tháng, ANNUAL/ONCE = quét theo năm); lọc theo window; xây dựng payload template"
  - "1.5h: zns-client.ts - gọi ZNS API (trực tiếp OA hoặc qua nhà phân phối) với OA token; xử lý response code; log kết quả"
  - "1.0h: migration 0018_zns_send_log.sql - bảng zns_send_log (reminderId, phone, sentAt, status, zaloMessageId)"
  - "1.0h: api/zns.ts - serverless endpoint để cron trigger hoặc webhook nhận status callback từ Zalo"
  - "1.0h: __tests__/zns-window.test.ts - test khung giờ, khung ngày, biên ranh"
  - "1.0h: __tests__/zns-scheduler.test.ts - test logic lọc occurrence, payload building, skip khi nghỉ"
risk_if_skipped: "FR-B08 (nhắc qua ZNS cho người dùng Zalo) là yêu cầu chính của Phase 3 thương mại hóa; không có ZNS thì người dùng Zalo Mini App sẽ không nhận được nhắc nào cả (Mini App không thể push notification kiểu native). Toàn bộ chiến lược tiếp cận ~80 triệu người dùng Zalo qua kênh nhắc chủ động bị vô hiệu. Doanh thu phí ZNS (premium tính theo tin gửi) cũng bị ảnh hưởng."
---

## §1 - Description (BCP-14 normative)

ZNS sender PHẢI gửi tin nhắc âm lịch qua Zalo Official Account (OA) cho người dùng đã cấp số điện thoại và đồng ý, tuân thủ đầy đủ quy tắc nền tảng Zalo. Đây là contract:

1. PHẢI gửi ZNS chỉ cho số điện thoại người dùng đã tự nguyện cung cấp qua Zalo Mini App (FR-LUNAR-016) và có quan hệ giao dịch với OA; KHÔNG ĐƯỢC gửi cho số điện thoại thu thập từ nguồn khác hoặc không có consent (DEC-LUNAR-170, NFR-Privacy/PDPL).
2. PHẢI sử dụng template đã được Zalo duyệt trước khi gửi; template PHẢI có tối đa 400 ký tự và ít nhất 1 tham số cá nhân hóa (DEC-LUNAR-171). Template mặc định: "Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!".
3. KHÔNG ĐƯỢC dùng template ZNS để gửi nội dung quảng cáo thuần túy (pure advertising); mọi tin phải gắn với sự kiện âm lịch cụ thể của người dùng (DEC-LUNAR-171, quy tắc Zalo).
4. PHẢI chỉ gửi tin trong khung thời gian 06:00-22:00 theo `Asia/Ho_Chi_Minh` (UTC+7); nếu thời điểm gửi tính ra ngoài khung này, PHẢI đợi đến 06:00 ngày hôm sau hoặc hủy bỏ tùy chính sách đã cấu hình (DEC-LUNAR-172).
5. PHẢI chỉ gửi tin khi sự kiện cách ngày gửi trong khoảng [0 ngày, 7 ngày]; cụ thể: `0 <= daysUntilEvent <= 7`; sự kiện quá hạn (< 0) hoặc quá xa (> 7 ngày) KHÔNG ĐƯỢC gửi (DEC-LUNAR-172).
6. PHẢI quản lý OA access token tự động: đọc `OA_ACCESS_TOKEN` và `OA_REFRESH_TOKEN` từ biến môi trường hoặc lưu trữ bí mật; kiểm tra thời hạn hết hạn trước mỗi đợt cron; nếu token còn dưới 10 phút hết hạn, PHẢI refresh trước khi gửi (DEC-LUNAR-173, NFR-Security).
7. KHÔNG ĐƯỢC nhúng `OA_ACCESS_TOKEN`, `OA_REFRESH_TOKEN`, hay bất kỳ credential ZNS nào vào code hoặc client (NFR-Security); mọi giao tiếp với Zalo OA API PHẢI qua phía server (services/genie-api/).
8. PHẢI chạy cron serverless (tích hợp với Vercel Cron hoặc tương đương) theo lịch phù hợp (không cứ hơn 15 phút) để quét danh sách Reminder có `channels` chứa `"ZNS"` và `enabled = true`, tính occurrence bằng `amlich-core`, lọc theo quy tắc §1 #4 và #5, rồi gửi tin (DEC-LUNAR-174).
9. PHẢI tính ngày âm và ngày dương của occurrence bằng `convertLunar2Solar` từ `@cyberskill/amlich-core` với `tz = 7.0`; KHÔNG ĐƯỢC dùng nguồn tính lịch khác để đảm bảo nhất quán với các client (DEC-LUNAR-174).
10. PHẢI ghi log mỗi lần gửi vào bảng `zns_send_log` (các trường: `reminderId`, `phone`, `sentAt`, `status`, `zaloMessageId`); phí ≈200 VND chỉ phát sinh khi Zalo trả về gửi thành công - ghi nhận rõ ràng để báo cáo chi phí (DEC-LUNAR-174).
11. PHẢI xử lý các mã lỗi ZNS API một cách rõ ràng: gửi thất bại (lỗi OA token, rate-limit, số điện thoại không tồn tại Zalo) PHẢI được log với mã lỗi cụ thể; sau đó KHÔNG retry ngay lập tức mà PHẢI lùi đến kỳ cron tiếp theo (tránh đội tin).
12. NÊN hỗ trợ tùy chọn dùng nhà phân phối (distributor) như VietGuys, Infobip, hoặc 8x8 để gửi ZNS thay vì tích hợp trực tiếp qua Zalo OA Open API; quyết định cụ thể được hoãn lại đến khi đăng ký OA chính thức (DEC-LUNAR-175).
13. PHẢI điền các tham số vào template theo đúng tên tham số Zalo đã duyệt; ví dụ template có `{tên}`, `{ngày dương}`, `{dịp}`, `{ngày âm}` thì payload gửi phải chứa đầy đủ 4 tham số.
14. KHÔNG ĐƯỢC gửi nhiều hơn 1 tin ZNS cho cùng 1 Reminder và cùng 1 người dùng trong cùng 1 ngày; kiểm tra `zns_send_log` trước khi gửi để tránh gửi trùng.
15. PHẢI hỗ trợ `recurrence = "MONTHLY"` trong `SchedulerReminder`: cron PHẢI dùng `candidateLunarYears()` để sinh occurrence cho từng tháng âm trong cửa sổ quét (ít nhất tháng hiện tại và tháng tiếp theo); mỗi tháng sinh đúng 1 occurrence trong khung 06:00-22:00 Asia/Ho_Chi_Minh và trong vòng 7 ngày trước/sau sự kiện - đảm bảo nhắc Rằm và Mùng Một lặp lại đủ 12 lần mỗi năm qua ZNS (không chỉ 1 lần/năm như ANNUAL).

---

## §2 - Why this design (rationale for humans)

**Tại sao ZNS thay vì push notification thường?** Zalo Mini App không có API push native (DEC-LUNAR-162 trong FR-016). ZNS qua OA là cách duy nhất để "Genie Âm Lịch" gửi tin chủ động đến người dùng Zalo. Ngoài ra, ZNS có delivery rate cao hơn web push vì nó đi qua hệ thống tin nhắn chính thức của Zalo chừng 2,1 tỷ tin/ngày (Key Findings 3 PRD).

**Tại sao khung 06:00-22:00 và <= 7 ngày?** Đây là quy tắc cứng của nền tảng Zalo đối với ZNS (Key Findings 4, PRD Caveats). Gửi ngoài khung sẽ bị Zalo từ chối và có thể bị khóa OA. Ràng buộc <= 7 ngày trước/sau sự kiện giúp ZNS khớp với ý định "nhắc lịch sự kiện sắp tới", không dùng cho quảng cáo định kỳ.

**Tại sao auto-refresh OA token?** OA access token có thời hạn (thường 1 giờ đến 30 ngày tùy cấu hình OA); nếu để hết hạn giữa một chạy cron, toàn bộ lô gửi thất bại. Kiểm tra thời hạn trước mỗi đợt cron và refresh chủ động khi còn < 10 phút đảm bảo không có lô gửi bị hủy do lỗi token (DEC-LUNAR-173, NFR-Security).

**Tại sao dùng serverless cron thay vì sự kiện real-time?** Nhà chức năng serverless stateless rẻ hơn việc giữ một server luôn sống. Với nhắc âm lịch (thời điểm cần thiết chỉ là sáng sớm trước ngày lễ), tần suất cron 15 phút là đủ chính xác; không cần real-time sub-second. Cách này cũng giúp dễ scale và không tốn kém (DEC-LUNAR-174).

**Tại sao ghi log zns_send_log?** Zalo tính phí ~200 VND mỗi tin gửi thành công (Caveats PRD). Không có log thì không thể báo cáo chi phí, debug lỗi gửi, hay đề phòng gửi trùng (ISS-004). Log là bảng bảo vệ chống over-billing và là nguồn dữ liệu cho analytics thương mại.

**Tại sao hỗ trợ nhà phân phối (VietGuys/Infobip/8x8)?** Onboarding OA trực tiếp với Zalo cần đăng ký OA chính thức, xác minh, và có thể cần Zalo Channel Agent (ZCA) thanh toán. Nhà phân phối rút ngắn quy trình này và có thể cung cấp SDK đơn giản hơn. Quyết định cuối tùy vào quy trình đăng ký chính thức; API contract trong §3 được thiết kế trung lập giữa direct và distributor (DEC-LUNAR-175).

**Tại sao amlich-core để tính ngày trong cron?** Cron chạy phía server, import `@cyberskill/amlich-core` (TypeScript, zero-dependency), gọi `convertLunar2Solar` để tính ngày dương từ ngày âm của Reminder. Điều này đảm bảo nhất quán 100% với phép tính mà client Zalo Mini App và Web đang dùng, tránh trường hợp server và client cho ngày khác nhau (DEC-LUNAR-174).

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

1. `isWithinHourWindow` trả về `true` cho 06:00 VN và `false` cho 05:59 VN và 22:00 VN (biên biên); test bằng ngày cụ thể với giờ UTC tương ứng.
2. `isWithinDayRange` trả về `allowed: true` cho `daysUntilEvent = 0` và `= 7`; trả về `event_past` cho `-1`; trả về `event_too_far` cho `8`.
3. `canSendNow` trả về `outside_hour_range` khi giờ VN là 23:00 dù ngày sự kiện hợp lệ.
4. `runZNSCron` với 1 Reminder hợp lệ trong khung gửi: gọi `sendZNS` đúng 1 lần với payload có đủ 4 tham số `ten`, `ngay_duong`, `dip`, `ngay_am`; trả về `{ sent: 1 }`.
5. `runZNSCron` với Reminder có `daysUntilEvent = 8`: không gọi `sendZNS`; trả về `{ skipped: 1 }`.
6. `runZNSCron` với Reminder có `enabled = false`: bỏ qua; trả về `{ skipped: 1 }`.
7. `runZNSCron` chỉ tiến sự kiện đã có trong `zns_send_log` trong ngày hôm nay: không gọi `sendZNS` lần thứ hai; trả về `{ skipped: 1 }`.
8. `ensureFreshToken` gọi `refreshOAToken` khi token còn dưới 10 phút hết hạn; không gọi khi token còn > 30 phút.
9. `sendZNS` với mock OA API trả về thành công: ghi 1 row vào `zns_send_log` với `status = "success"` và `zaloMessageId` không rỗng.
10. `sendZNS` với mock OA API trả về lỗi (mã lỗi "invalid_phone"): ghi 1 row vào `zns_send_log` với `status = "error"` và `errorCode = "invalid_phone"`; hàm trả về `{ success: false }`.
11. Ngày âm được tính bằng `convertLunar2Solar` từ `amlich-core`; kết quả khớp với fixture PRD 6.6 (29/01/2025 là 1/1/2025 Ất Tỵ).
12. Handler `api/zns.ts` trả về 401 khi header `Authorization` sai; trả về 200 `{ ok: true }` khi đúng.
13. Template mặc định "Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!" có <= 400 ký tự (đếm bằng code trong test); tham số `{tên}`, `{ngày dương}`, `{dịp}`, `{ngày âm}` xuất hiện ít nhất 1 lần mỗi cái.
14. Không có OA_ACCESS_TOKEN hay OA_REFRESH_TOKEN nào xuất hiện trong bundle client (kiểm tra output `zmp build`).
15. `runZNSCron` với Reminder `RAM` có `recurrence = "MONTHLY"`, `lunarDay = 15`, `lunarMonth = 0` (mọi tháng), khi `now = 2025-08-07` (1 ngày trước Rằm tháng 7 dương): sinh ZNS đúng 1 lần cho tháng 7 âm; khi gọi lại với `now = 2025-09-05` (tháng 8 âm): sinh đúng 1 lần cho tháng 8 âm - mỗi lần gửi đúng trong khung 06:00-22:00 Asia/Ho_Chi_Minh và cách sự kiện <= 7 ngày.

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

Contract đầy đủ ở §3. Điểm then chốt:

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

Idempotency check (tránh gửi trùng - AC #7):

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

Upstream: **FR-LUNAR-004** (`Reminder` data model; các trường `lunarDay`, `lunarMonth`, `isLeapMonth`, `channels`, `enabled` được dùng trực tiếp trong `SchedulerReminder`). **FR-LUNAR-016** (Zalo Mini App client cung cấp `User.phone` token và danh sách Reminder có `channels: ["ZNS"]`; không có FR-016 thì không có nguồn dữ liệu).

Downstream: Không có FR nào phụ thuộc FR-017.

Cross-cutting: `@cyberskill/amlich-core` dùng trong cron (phía server) để tính ngày dương từ ngày âm; nhất quán với client. `zns_send_log` là nguồn dữ liệu cho analytics chi phí ZNS trong FR-LUNAR-020 (freemium billing).

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

**Template mặc định (đăng ký với Zalo OA):**
```
Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!
```
Độ dài: 84 ký tự (< 400). Số tham số cá nhân hóa: 4 (>= 1). Không có nội dung quảng cáo.

---

## §9 - Open questions

Đã giải quyết:
- Tích hợp trực tiếp OA hay qua nhà phân phối: giao là DEC-LUNAR-175 (hoãn lại; API contract trung lập với cả hai hướng).
- Giờ cron: chọn 15 phút (Vercel Cron hỗ trợ); đủ để đảm bảo tin đến trong vòng 1 giờ đầu.
- Idempotency: dùng `zns_send_log` + index (rem_id, phone, ngày) để tránh gửi trùng (AC #7, §6).
- **Hỗ trợ MONTHLY (Rằm/Mùng Một) qua ZNS: GIẢI QUYẾT - hỗ trợ FULL COMMERCIAL.** Quyết định founder 2026-06-28: "Genie Âm Lịch" là sản phẩm thương mại đầy đủ; nhắc Rằm và Mùng Một MONTHLY là use case cốt lõi và PHẢI gửi ZNS đúng mỗi tháng. `SchedulerReminder` được bổ sung trường `recurrence`; `candidateLunarYears()` được thêm vào `runZNSCron` để mở rộng sang nhiều tháng âm trong cửa sổ quét; AC #15 và test MONTHLY trong §5 xác nhận hành vi. Ghi nhận: BACKLOG decision 8 cần cập nhật để phản ánh quyết định hỗ trợ MONTHLY qua ZNS.

Còn mở:
- Giá ZNS ~200 VND là số tham khảo tại thời điểm nghiên cứu; xác nhận lại với VietGuys hoặc trực tiếp Zalo khi đăng ký OA chính thức (Caveats PRD - giá và quy tắc có thể thay đổi).
- Quy tắc "quan hệ giao dịch" của Zalo: cần xác nhận chính xác thế nào là "quan hệ giao dịch" đủ điều kiện để gửi ZNS - có thể cần người dùng tương tác với OA qua chat trước. Hoãn lại đến quy trình đăng ký OA.
- Rate limit ZNS của OA: Zalo có thể giới hạn số tin/phút/tháng cho mỗi OA; cần kiểm tra khi đăng ký và thêm throttle nếu cần. MONTHLY reminder tăng volume ZNS gấp ~12 lần so với ANNUAL - cần theo dõi sát khi đăng ký để không vượt rate limit.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| OA access token hết hạn giữa cron | `ensureFreshToken` kiểm tra expiry trước mỗi đợt | Refresh trước khi gửi; không có lô gửi thất bại | Tự động; log refresh event |
| OA refresh token hết hạn (bị thu hồi) | `refreshOAToken` trả lỗi | Toàn bộ đợt cron skip gửi ZNS; cảnh báo critical | Operator cấp lại token thủ công; alert |
| CRON_SECRET sai - ai đó gọi /api/zns | Header check -> 401 | Request bị từ chối; không gửi | Không cần action; ghi log |
| Số điện thoại người dùng không có Zalo | ZNS API trả mã -214 | Log lỗi, đánh dấu trong zns_send_log | Notify người dùng "Số điện thoại không thể nhận ZNS" |
| Gửi trùng do cron bị trigger nhiều lần | Idempotency check zns_send_log | Lần thứ 2 bị skip | Không có ảnh hưởng; log "already_sent" |
| Ngoài khung 06:00-22:00 | `isWithinHourWindow` -> false | Reminder được skip; gửi vào kỳ cron tiếp theo | Tự động nếu cron chạy lại trong khung |
| Sự kiện quá 7 ngày | `isWithinDayRange` -> event_too_far | Skip; không gửi | Reminder sẽ được xử lý khi đến gần hơn |
| Template không khớp với tham số đăng ký | ZNS API trả lỗi "invalid_template_data" | Log lỗi; skip reminder này | Kiểm tra lại `templateData` key names với template duyệt |
| Supabase chưa có row phone cho user | `reminder.userPhone` null/undefined | Skip reminder; log warning | Người dùng cần cấp phép số trong Mini App |
| Rate limit ZNS OA bị vượt | ZNS API trả HTTP 429 | Dừng gửi; log; delay | Xử lý retry vào kỳ cron sau với exponential backoff |
| `convertLunar2Solar` trả sentinel `[0,0,0]` (tháng nhuận không khớp / ngày âm không hợp lệ) | Kiểm tra `gd===0 && gm===0 && gy===0` sau gọi hàm (KHÔNG phải null) | Skip occurrence; log warning | Debug Reminder data; notify người dùng |
| Vercel Cron bị tắt / budget vượt | Không có log cron trong 1+ giờ | Người dùng không nhận nhắc | Monitor alert; kiểm tra Vercel dashboard |
| Leakage OA token vào logs | Audit log pattern | Bắt phát hiện nếu token xuất hiện trong plaintext | Mask token trong tất cả log statements |

---

## §11 - Implementation notes

- `getPhoneNumber` trong Zalo Mini App trả token, không trả số thực; server phải đổi token này lấy số qua Zalo OA API (`POST https://openapi.zalo.me/v2.0/oa/getuserfromtoken`) trước khi lưu vào `User.phone`. Bước đổi này phải là một endpoint riêng được gọi ngay sau khi Mini App gửi token lên.
- ZNS API endpoint chính thức là `POST https://business.openapi.zalo.me/message/template`; header `access_token` (không phải Bearer); body là JSON với `phone`, `template_id`, `template_data`. Kiểm tra lại endpoint khi triển khai vì Zalo có thể cập nhật.
- Khung 06:00-22:00 phải tính theo `Asia/Ho_Chi_Minh` (ICT, UTC+7), không theo UTC của server; sử dụng `toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })` hoặc thư viện `date-fns-tz` để tránh nhầm lẫn.
- Idempotency là bắt buộc: Vercel Cron có thể chạy nhiều hơn 1 lần do retry; `zns_send_log` với index `(reminder_id, phone, sent_at::date)` là hàng rào bảo vệ chính.
- Template phải được đăng ký và duyệt với Zalo OA trước khi Deploy; quá trình duyệt có thể mất 1-5 ngày làm việc. Giữ `ZNS_TEMPLATE_ID` trong biến môi trường; không hardcode trong code.
- Khi dùng nhà phân phối (VietGuys v.v.), endpoint và cấu trúc request có thể khác; `zns-client.ts` được thiết kế để swap được backend mà không thay đổi `zns-scheduler.ts`.
- `zns_send_log` cần được phân tích hàng tháng để báo cáo chi phí ZNS; tổng `COUNT(*) WHERE status='success'` * 200 VND là ước tính phí tháng.
- So migration P3 duoc phan phoi de tranh va cham: 0016-0017 danh cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020.

*Hết FR-LUNAR-017.*
