---
id: FR-LUNAR-020
title: "Freemium monetization - nhắc cơ bản free, premium cho AI Genie / good-day nâng cao / family, entitlement gating"
module: LUNAR
priority: SHOULD
status: ready_to_implement
verify: T
phase: P3
milestone: P3 · slice 7
slice: 7
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-015, FR-LUNAR-018]
depends_on: [FR-LUNAR-015, FR-LUNAR-018]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#14 (Phase 3 monetization)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#15 (Success Metrics)"
source_decisions:
  - DEC-LUNAR-200 (ba tier freemium: Free = nhắc cơ bản + lịch tháng + nội dung tĩnh; Premium = AI Genie + good-day nâng cao + ZNS; Family = Premium + sharedWith multi-member; định nghĩa tier là bất biến - thay đổi tier cần DEC mới)
  - DEC-LUNAR-201 (entitlement check PHẢI ở server-side trong mọi serverless handler; client chỉ nhận kết quả từ server, KHÔNG ĐƯỢC tự quyết định tier của mình - tránh client-trusted entitlement)
  - DEC-LUNAR-202 (rate-limit AI Genie và ZNS theo tier: Free = 0 Genie call; Premium = 50 Genie calls/tháng; Family = 100 Genie calls/tháng/user; vượt limit trả về HTTP 429 với Retry-After)
  - DEC-LUNAR-203 (thanh toán qua App Store In-App Purchase trên iOS và Zalo Pay / cổng thanh toán Việt Nam trên Zalo Mini App; FR-020 không xây dựng thanh toán trực tiếp - chỉ webhook xử lý và cập nhật entitlement sau khi thanh toán xác nhận)
  - DEC-LUNAR-204 (entitlement được lưu trong bảng `user_entitlements` ở Supabase với RLS; client cache entitlement local <= 24h với TTL; hết TTL phải re-validate server)
  - DEC-LUNAR-205 (success metric: tỷ lệ chuyển đổi premium >= 3% sau 3 tháng Phase 3; nếu chưa đạt, ưu tiên cải thiện giá trị AI Genie trước khi điều chỉnh giá)
language: typescript 5.x
service: services/genie-api/
new_files:
  - services/genie-api/lib/entitlement.ts
  - services/genie-api/lib/rate-limiter.ts
  - services/genie-api/api/entitlement.ts
  - services/genie-api/api/webhook-payment.ts
  - services/genie-api/supabase/migrations/0020_entitlements.sql
  - apps/web/lib/entitlement-client.ts
  - apps/web/components/UpgradePrompt.tsx
modified_files:
  - services/genie-api/api/genie.ts
  - services/genie-api/api/sync.ts
  - apps/web/lib/sync-client.ts
allowed_tools:
  - file_read: services/genie-api/** apps/web/lib/entitlement* apps/web/components/Upgrade*
  - file_write: services/genie-api/lib/entitlement.ts services/genie-api/lib/rate-limiter.ts services/genie-api/api/entitlement.ts services/genie-api/api/webhook-payment.ts services/genie-api/supabase/migrations/0020_entitlements.sql apps/web/lib/entitlement-client.ts apps/web/components/UpgradePrompt.tsx
  - bash: cd services/genie-api && pnpm test
disallowed_tools:
  - "đọc quyết định tier từ client-side storage hoặc localStorage mà không re-validate server (vi phạm DEC-LUNAR-201 - client-trusted entitlement)"
  - "gọi Claude API từ Free tier mà không có server-side gate (vi phạm DEC-LUNAR-201 / DEC-LUNAR-202)"
  - "cấp entitlement Premium ngay khi nhận webhook thanh toán mà không xác minh chữ ký HMAC của provider (security vulnerability)"
effort_hours: 7
sub_tasks:
  - "1h: migration 0020_entitlements.sql - bảng user_entitlements (userId, tier, validUntil, source, updatedAt) và genie_usage_monthly; RLS; index"
  - "1.5h: lib/entitlement.ts - Tier enum, EntitlementRecord, getEntitlement(), isFeatureAllowed(), getUsageQuota()"
  - "1h: lib/rate-limiter.ts - checkRateLimit() dùng Supabase hoặc Upstash Redis; ghi usage_count theo tháng"
  - "1h: api/entitlement.ts - GET /api/entitlement (lấy tier hiện tại và quota), đã bao gồm cache TTL 24h"
  - "1h: api/webhook-payment.ts - POST /api/webhook/payment (xử lý App Store / Zalo Pay webhook, xác minh HMAC, cập nhật entitlement)"
  - "0.5h: apps/web/lib/entitlement-client.ts - EntitlementClient, cache local TTL 24h, re-validate"
  - "1h: sửa api/genie.ts + api/sync.ts thêm server-side entitlement gate; apps/web UpgradePrompt.tsx"
risk_if_skipped: "Không có entitlement gating thì tất cả tính năng premium (AI Genie, family sharing) là free để dùng - mất doanh thu và mất khả năng scale (chi phí Claude API tăng vô giới hạn). Không có server-side gate thì client-trusted entitlement là lỗ hổng bảo mật: bất kỳ ai sửa localStorage có thể tự cấp Premium. FR-020 là nền tảng kinh doanh để CyberSkill có doanh thu từ sản phẩm này."
---

## §1 - Description (BCP-14 normative)

FR-020 xây dựng cơ chế phân chia tier freemium và ép gate entitlement server-side cho "Genie Âm Lịch". Mô hình ba tier được thiết kế để tối đa hóa giá trị người dùng Free (khuyến khích giữ lại) trong khi tạo rõ giá trị tăng thêm cho Premium và Family.

1. PHẢI định nghĩa ba tier rõ ràng (DEC-LUNAR-200):
   - **Free**: nhắc Ram/Mừng Một/đám giỗ/custom, lịch tháng âm-dương, nội dung tĩnh (festival content), local notifications, xem ngày cơ bản can-chi; KHÔNG có AI Genie, KHÔNG có good-day picker nâng cao, KHÔNG có family sharing (sharedWith = []).
   - **Premium**: mọi thứ của Free cộng thêm AI Genie (50 calls/tháng), good-day picker đầy đủ (FR-012), ZNS reminder (FR-017), shareable cards (FR-014).
   - **Family**: mọi thứ của Premium cộng thêm family sharing/cloud sync (FR-018), 100 Genie calls/tháng/user, chia sẻ tối đa 10 thành viên.
2. PHẢI ép gate entitlement **server-side** trong mọi serverless handler; client KHÔNG ĐƯỢC tự quyết định tier - mọi quyết định dựa vào kết quả từ server (DEC-LUNAR-201).
3. PHẢI lưu entitlement trong bảng `user_entitlements` trên Supabase với RLS; client cache local TTL 24h; hết TTL PHẢI re-validate server (DEC-LUNAR-204).
4. PHẢI ép rate-limit theo tier trên server cho AI Genie: Free = 0 call; Premium = 50 calls/tháng; Family = 100 calls/tháng/user; vượt giới hạn trả HTTP 429 với header `Retry-After` và `X-RateLimit-Remaining` (DEC-LUNAR-202).
5. PHẢI ép gate family sharing trong `api/sync.ts`: Free và Premium user không được thêm thành viên vào `sharedWith`; chỉ Family tier mới được (DEC-LUNAR-200).
6. PHẢI xử lý webhook thanh toán từ App Store và Zalo Pay trong `api/webhook-payment.ts`; PHẢI xác minh chữ ký HMAC/JWT của provider trước khi cập nhật entitlement; cập nhật sai khi chưa xác minh là lỗ hổng bảo mật.
7. KHÔNG ĐƯỢC xử lý thanh toán trực tiếp trong FR-020; chức năng này chỉ ép webhook từ App Store IAP (iOS) và Zalo Pay (Zalo Mini App) - FR-020 không xây dựng payment UI (DEC-LUNAR-203).
8. PHẢI có `GET /api/entitlement` trả về `{ tier, features, quota, validUntil }` cho client; phản hồi này PHẢI bao gồm thông tin đủ để hiển thị `UpgradePrompt` đúng cho.
9. PHẢI hiển thị `UpgradePrompt` khi Free user chạm vào tính năng Premium; prompt PHẢI nêu rõ lợi ích cụ thể ("Mở khóa AI Genie - hỏi bài về mâm cúng, ý nghĩa ngày lễ") không chỉ "Nâng cấp Premium".
10. KHÔNG ĐƯỢC ẩn hoặc disable tính năng Premium trong client theo cách người dùng không nhìn thấy - nên hiện tính năng với lock icon và `UpgradePrompt`, không xóa UI hoạt động (SHOULD encourage discovery).
11. NÊN theo dõi tỷ lệ chuyển đổi (Free -> Premium, Premium -> Family) qua analytics (với `consentFlags.analyticsUsage = true` theo FR-019) để phục vụ success metric DEC-LUNAR-205.
12. PHẢI có cơ chế "graceful downgrade": nếu entitlement hết hạn (validUntil < now()), ngay hóa xe xếp lại về Free tier; dữ liệu Premium (lịch sử Genie, sharedWith) ĐƯỢC GIỮ nguyên trong 30 ngày cho phép tái tục; sau 30 ngày mới xóa.
13. NÊN cung cấp một trial mode: 7 ngày dùng thử Premium miễn phí cho người dùng mới; trial track bằng trường `trial_used: boolean` trong `user_entitlements`; mỗi user chỉ được 1 trial.

---

## §2 - Why this design (rationale for humans)

**Tại sao ba tier (Free/Premium/Family) thay vì hai (Free/Premium) (DEC-LUNAR-200)?** Persona "Cô Hoa" (nội trợ giữ hương khói) là segment riêng với nhu cầu "chia sẻ nhắc giỗ cho cả gia đình" - đây là giá trị khác biệt so với "dùng AI Genie". Một tier Family riêng cho phép định giá cao hơn cho use case gia đình mà không ép người dùng đơn lẻ phải trả thêm. Phân chia tier cũng rõ ràng hơn về mặt kỹ thuật: có thể gate FR-018 chỉ cho Family tier.

**Tại sao entitlement PHẢI ở server-side (DEC-LUNAR-201)?** Client-trusted entitlement là lỗ hổng bảo mật cơ bản: bất kỳ ai vào DevTools sửa `localStorage.tier = "premium"` là có Premium miễn phí. Đối với AI Genie, mỗi call là chi phí thật ($1/$5 per 1M tokens) - lỗ hổng này ảnh hưởng trực tiếp đến chi phí vận hành. Server-side gate đảm bảo mọi request được kiểm tra dữ liệu thật trong database.

**Tại sao cache entitlement local 24h TTL (DEC-LUNAR-204)?** Gọi API kiểm tra entitlement trước mọi action của người dùng là quá châu - tăng độ trễ và giảm UX. 24h TTL là cân bằng: nếu người dùng hết tier, hệ thống biết trong 24h (chấp nhận được cho ứng dụng như thế này). Tính năng quan trọng như AI Genie vẫn gọi server - cache chỉ cho việc hiển thị UI (lock icon, UpgradePrompt).

**Tại sao không xây dựng payment UI trong FR-020 (DEC-LUNAR-203)?** Thanh toán iOS qua App Store IAP yêu cầu native Swift/StoreKit; Zalo Mini App yêu cầu Zalo Pay SDK riêng. Việc tích hợp hai hệ thống thanh toán này là một phạm vi lớn riêng biệt. FR-020 chỉ xử lý phần "sau khi thanh toán xác nhận" qua webhook - việc này đơn giản hơn nhiều và không chặn việc triển khai entitlement logic.

**Tại sao xác minh HMAC/JWT webhook là bắt buộc?** Nếu không xác minh, bất kỳ ai có thể POST đến `/api/webhook/payment` và cập nhật entitlement của họ. Đây là tấn công đơn giản nhất có thể. HMAC (App Store dùng JWS, Zalo Pay dùng HMAC-SHA256) là cơ chế chuẩn của cả hai provider - đọc tài liệu chính thức trước khi implement.

**Tại sao hiện tính năng Premium với lock icon thay vì ẩn đi (§1 #10)?** Hiển thị tính năng với lock icon tạo "aspirational pull" - người dùng nhìn thấy "AI Genie" và muốn dùng nó. Ẩn đi thì người dùng không biết nó tồn tại và không bao giờ chuyển đổi. Mẫu này được dùng thành công bởi Duolingo, Spotify, và nhiều sản phẩm freemium khác.

---

## §3 - API contract

```typescript
// services/genie-api/lib/entitlement.ts

export type Tier = "free" | "premium" | "family";

export interface EntitlementRecord {
  userId: string;
  tier: Tier;
  validUntil: string | null;    // null = vinh vien (khong su dung cho trial)
  source: "app_store" | "zalo_pay" | "manual" | "trial";
  trialUsed: boolean;
  updatedAt: string;
}

export interface FeatureGate {
  genieAI: boolean;
  genieMonthlyQuota: number;    // 0 = Free, 50 = Premium, 100 = Family
  goodDayPicker: boolean;
  familySharing: boolean;
  maxFamilyMembers: number;     // 0 = Free/Premium, 10 = Family
  znsReminder: boolean;
  shareableCards: boolean;
}

export const TIER_FEATURES: Record<Tier, FeatureGate> = {
  free: {
    genieAI: false, genieMonthlyQuota: 0,
    goodDayPicker: false, familySharing: false, maxFamilyMembers: 0,
    znsReminder: false, shareableCards: false,
  },
  premium: {
    genieAI: true, genieMonthlyQuota: 50,
    goodDayPicker: true, familySharing: false, maxFamilyMembers: 0,
    znsReminder: true, shareableCards: true,
  },
  family: {
    genieAI: true, genieMonthlyQuota: 100,
    goodDayPicker: true, familySharing: true, maxFamilyMembers: 10,
    znsReminder: true, shareableCards: true,
  },
};

// Lay tier hien tai cua user (SERVER-SIDE ONLY)
export async function getEntitlement(userId: string): Promise<EntitlementRecord>;

// Kiem tra mot tinh nang co duoc phep voi tier nay khong
export function isFeatureAllowed(tier: Tier, feature: keyof FeatureGate): boolean;

// Lay quota con lai cua thang nay
export async function getRemainingQuota(
  userId: string,
  feature: "genieAI"
): Promise<number>;
```

```typescript
// services/genie-api/lib/rate-limiter.ts

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;   // ISO 8601 dau thang sau
}

// Kiem tra va tang dem su dung AI Genie
// Dung Supabase (hoac Upstash Redis neu can toc do cao hon)
export async function checkAndIncrementGenieUsage(
  userId: string,
  quota: number
): Promise<RateLimitResult>;
```

```typescript
// services/genie-api/api/entitlement.ts

// GET /api/entitlement
// Response: { tier, features, quota, validUntil, trialAvailable }
export interface EntitlementResponse {
  tier: Tier;
  features: FeatureGate;
  genieUsedThisMonth: number;
  validUntil: string | null;
  trialAvailable: boolean;    // true neu chua dung trial
  gracePeriodEndsAt: string | null; // 30 ngay sau khi het han (downgrade)
}

export async function handleGetEntitlement(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// POST /api/entitlement/trial
// Kich hoat trial 7 ngay; tra ve HTTP 409 neu trialUsed = true
export async function handleStartTrial(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;
```

```typescript
// services/genie-api/api/webhook-payment.ts

export interface AppStoreWebhookPayload {
  signedTransactionInfo: string;  // JWS, xac minh voi Apple public key
  signedRenewalInfo: string;
}

export interface ZaloPayWebhookPayload {
  data: string;      // JSON string
  mac: string;       // HMAC-SHA256(data, ZALO_PAY_KEY2)
}

// POST /api/webhook/payment/appstore
export async function handleAppStoreWebhook(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// POST /api/webhook/payment/zalopay
export async function handleZaloPayWebhook(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// Ham chung: xac minh webhook va cap nhat tier
export async function processPaymentConfirmation(
  userId: string,
  tier: Tier,
  validUntil: string,
  source: EntitlementRecord["source"]
): Promise<void>;
```

```typescript
// apps/web/lib/entitlement-client.ts

export class EntitlementClient {
  private cache: { data: EntitlementResponse; fetchedAt: number } | null = null;
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24h

  // Doc entitlement: dung cache neu con han, goi API neu het TTL
  async get(): Promise<EntitlementResponse>;

  // Buoc invalidate cache (vi du sau khi thanh toan)
  invalidateCache(): void;

  // Tat ca quyet dinh UI dung ham nay - KHONG dung localStorage.tier truc tiep
  async canUseFeature(feature: keyof FeatureGate): Promise<boolean>;
}
```

---

## §4 - Acceptance criteria

1. Free user gọi `api/genie.ts` trực tiếp (bypass UI) nhận HTTP 403 với body `{ error: "feature_not_allowed", feature: "genieAI", tier: "free" }`.
2. Premium user gọi Genie 50 lần trong một tháng: lần thứ 51 nhận HTTP 429 với header `X-RateLimit-Remaining: 0` và `Retry-After` bằng số giây đến đầu tháng sau.
3. Family user gọi Genie 100 lần trong một tháng: lần thứ 101 nhận HTTP 429.
4. Free user thử thêm thành viên vào `sharedWith` trên endpoint `/api/sync/share` nhận HTTP 403.
5. Premium user thử thêm thành viên vào `sharedWith` nhận HTTP 403 (chỉ Family được phép).
6. Family user thêm tối đa 10 thành viên: thêm thành viên thứ 11 nhận HTTP 422 với thông báo rõ ràng.
7. Sửa `localStorage.tier = "premium"` trên client và gọi `/api/genie`: server trả về HTTP 403 nếu entitlement thật sự là Free (client-trusted entitlement bị chống lại).
8. Webhook AppStore POST với JWS hợp lệ -> entitlement cập nhật sang Premium trong `user_entitlements`; `GET /api/entitlement` ngay sau đó trả về `tier: "premium"`.
9. Webhook AppStore POST với JWS giả mạo (chữ ký sai) -> HTTP 401, entitlement KHÔNG thay đổi.
10. Webhook ZaloPayPay POST với MAC hợp lệ -> cập nhật entitlement; MAC sai -> HTTP 401.
11. `EntitlementClient.get()` gọi API lần đầu, cache; gọi lần hai trong 24h sử dụng cache (0 request API thêm).
12. `EntitlementClient.get()` sau 24h hết TTL gọi API mới.
13. Trial 7 ngày: gọi `POST /api/entitlement/trial` lần đầu -> tier chuyển sang premium, `trialUsed = true`, `validUntil = now() + 7 ngày`. Gọi lần hai -> HTTP 409.
14. Hết hạn trial: `validUntil < now()` -> tier tự động về Free; dữ liệu Premium giữ nguyên trong 30 ngày (`gracePeriodEndsAt = validUntil + 30 ngày`).
15. `UpgradePrompt` hiển thị khi Free user chạm AI Genie; prompt có text mô tả lợi ích cụ thể ("Hỏi bài về mâm cúng, ý nghĩa ngày lễ") và nút "Dùng thử 7 ngày miễn phí" nếu `trialAvailable = true`.

---

## §5 - Verification

```typescript
// services/genie-api/test/entitlement.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TIER_FEATURES, isFeatureAllowed, getEntitlement
} from "../lib/entitlement";
import { checkAndIncrementGenieUsage } from "../lib/rate-limiter";

describe("TIER_FEATURES - dinh nghia tier bat bien", () => {
  it("Free tier khong co genieAI", () => {
    expect(TIER_FEATURES.free.genieAI).toBe(false);
    expect(TIER_FEATURES.free.genieMonthlyQuota).toBe(0);
    expect(TIER_FEATURES.free.familySharing).toBe(false);
  });

  it("Premium co genieAI nhung khong co familySharing", () => {
    expect(TIER_FEATURES.premium.genieAI).toBe(true);
    expect(TIER_FEATURES.premium.genieMonthlyQuota).toBe(50);
    expect(TIER_FEATURES.premium.familySharing).toBe(false);
  });

  it("Family co tat ca tinh nang Premium cong familySharing", () => {
    expect(TIER_FEATURES.family.familySharing).toBe(true);
    expect(TIER_FEATURES.family.maxFamilyMembers).toBe(10);
    expect(TIER_FEATURES.family.genieMonthlyQuota).toBe(100);
  });
});

describe("isFeatureAllowed", () => {
  it("Free khong duoc phep genieAI", () => {
    expect(isFeatureAllowed("free", "genieAI")).toBe(false);
  });
  it("Premium duoc phep genieAI", () => {
    expect(isFeatureAllowed("premium", "genieAI")).toBe(true);
  });
  it("Premium khong duoc phep familySharing", () => {
    expect(isFeatureAllowed("premium", "familySharing")).toBe(false);
  });
  it("Family duoc phep familySharing", () => {
    expect(isFeatureAllowed("family", "familySharing")).toBe(true);
  });
});

describe("rate-limiter", () => {
  it("cho phep trong gioi han quota", async () => {
    const mockDb = { getCount: vi.fn().mockResolvedValue(49), increment: vi.fn() };
    const result = await checkAndIncrementGenieUsage("user1", 50, mockDb as any);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // lan cuoi
  });

  it("chan khi vuot quota", async () => {
    const mockDb = { getCount: vi.fn().mockResolvedValue(50), increment: vi.fn() };
    const result = await checkAndIncrementGenieUsage("user1", 50, mockDb as any);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("webhook - xac minh HMAC", () => {
  it("MAC sai bi tu choi", async () => {
    const fakePayload = {
      data: JSON.stringify({ orderId: "123", amount: 50000 }),
      mac: "invalid_mac"
    };
    const response = await simulateWebhookPost("/api/webhook/payment/zalopay", fakePayload);
    expect(response.status).toBe(401);
  });
});

describe("EntitlementClient - cache TTL", () => {
  it("goi API chi mot lan trong 24h", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      makeFakeEntitlementResponse("free")
    );
    const client = new EntitlementClient();
    await client.get();
    await client.get(); // lan 2: dung cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("goi API moi sau khi invalidate", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      makeFakeEntitlementResponse("free")
    );
    const client = new EntitlementClient();
    await client.get();
    client.invalidateCache();
    await client.get(); // phai goi lai
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
```

---

## §6 - Implementation skeleton

`TIER_FEATURES` trong §3 là nguồn sự thật duy nhất cho mọi quyết định gate. Hai điểm then chốt:

```typescript
// Mau gate trong api/genie.ts (ap dung tuong tu cho moi tinh nang Premium)
export async function handleGenie(req, res) {
  const userId = authenticate(req);                    // throw 401 neu khong co
  const entitlement = await getEntitlement(userId);    // server DB lookup
  const tier = entitlement.tier;

  if (!isFeatureAllowed(tier, "genieAI")) {
    return res.status(403).json({
      error: "feature_not_allowed",
      feature: "genieAI",
      tier,
    });
  }

  const rateCheck = await checkAndIncrementGenieUsage(
    userId,
    TIER_FEATURES[tier].genieMonthlyQuota
  );
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: "quota_exceeded" })
      .setHeader("X-RateLimit-Remaining", "0")
      .setHeader("Retry-After", String(secondsUntilMonthEnd()));
  }

  // Tiep tuc goi Claude...
}
```

```typescript
// Mau graceful downgrade trong getEntitlement()
export async function getEntitlement(userId: string): Promise<EntitlementRecord> {
  const row = await db.from("user_entitlements").select("*").eq("user_id", userId);
  if (row && row.valid_until && new Date(row.valid_until) < new Date()) {
    // Het han -> ha ve Free
    return { ...row, tier: "free" };
  }
  return row ?? { userId, tier: "free", trialUsed: false, ... };
}
```

---

## §7 - Dependencies

Upstream: FR-LUNAR-015 (AI Genie Claude proxy) - FR-020 thêm server-side gate vào `api/genie.ts` của FR-015; FR-015 phải đã tồn tại trước khi gate có thể được thêm. FR-LUNAR-018 (family sharing cloud sync) - FR-020 thêm gate `familySharing` vào `api/sync.ts` của FR-018.

Downstream: FR-020 không blocks FR nào. Nhưng toàn bộ Phase 3 phụ thuộc vào FR-020 hoạt động để có doanh thu: không có entitlement gate thì không có sự phân biệt tier, không có khuyến khích chuyển đổi, và chi phí vận hành AI Genie và ZNS tăng vô kiểm soát.

Cross-cutting: FR-LUNAR-019 (PDPL consent) - nếu `analyticsUsage = true`, FR-020 có thể theo dõi tỷ lệ chuyển đổi. FR-LUNAR-016 (Zalo Mini App) - entitlement check phải hoạt động tương tự trên Zalo Mini App client (gọi cùng API `/api/entitlement`).

---

## §8 - Example payloads

```sql
-- services/genie-api/supabase/migrations/0020_entitlements.sql

CREATE TABLE IF NOT EXISTS user_entitlements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free','premium','family')),
  valid_until   TIMESTAMPTZ,       -- null = vinh vien; dung cho subscription
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('app_store','zalo_pay','manual','trial')),
  trial_used    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genie_usage_monthly (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,         -- "2026-06" (YYYY-MM)
  call_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, year_month)
);

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE genie_usage_monthly ENABLE ROW LEVEL SECURITY;

-- User chi doc entitlement cua chinh ho
CREATE POLICY "user_own_entitlement_select" ON user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Chi server (service role) cap nhat entitlement
CREATE POLICY "server_update_entitlement" ON user_entitlements
  FOR ALL WITH CHECK (FALSE);

CREATE TRIGGER trg_entitlements_updated_at
  BEFORE UPDATE ON user_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

```json
// GET /api/entitlement response mau - Free user co trial kha dung
{
  "tier": "free",
  "features": {
    "genieAI": false,
    "genieMonthlyQuota": 0,
    "goodDayPicker": false,
    "familySharing": false,
    "maxFamilyMembers": 0,
    "znsReminder": false,
    "shareableCards": false
  },
  "genieUsedThisMonth": 0,
  "validUntil": null,
  "trialAvailable": true,
  "gracePeriodEndsAt": null
}
```

```json
// GET /api/entitlement response mau - Family tier dang hoat dong
{
  "tier": "family",
  "features": {
    "genieAI": true,
    "genieMonthlyQuota": 100,
    "goodDayPicker": true,
    "familySharing": true,
    "maxFamilyMembers": 10,
    "znsReminder": true,
    "shareableCards": true
  },
  "genieUsedThisMonth": 23,
  "validUntil": "2027-06-27T00:00:00.000Z",
  "trialAvailable": false,
  "gracePeriodEndsAt": null
}
```

```json
// HTTP 403 khi Free user truy cap genieAI
{
  "error": "feature_not_allowed",
  "feature": "genieAI",
  "tier": "free",
  "upgradeUrl": "/upgrade"
}
```

```json
// HTTP 429 khi vuot quota
{
  "error": "quota_exceeded",
  "feature": "genieAI",
  "quota": 50,
  "used": 50,
  "resetAt": "2026-07-01T00:00:00.000Z"
}
```

---

## §9 - Open questions

Đã giải quyết:
- Ba tier (Free/Premium/Family): định nghĩa bất biến trong `TIER_FEATURES` (DEC-LUNAR-200); thay đổi tier cần DEC mới.
- Server-side gate: mẫu trong §6 áp dụng cho tất cả tính năng Premium (DEC-LUNAR-201).
- Rate-limit storage: Supabase `genie_usage_monthly` là đủ cho phase đầu; có thể chuyển sang Upstash Redis nếu cần tốc độ cao hơn ở Phase 4.
- Cache TTL 24h: cân bằng giữa UX và freshness (DEC-LUNAR-204); dùng cho Phase 3.

Còn hoãn (defer):
- Payment UI (StoreKit cho iOS, Zalo Pay SDK cho Mini App): ngoài phạm vi FR-020 (DEC-LUNAR-203). Sẽ tách thành FR riêng khi có quyết định chọn nhà cung cấp thanh toán.
- Giá cụ thể (VND/tháng cho Premium và Family): chưa định. Success metric (>= 3% chuyển đổi - DEC-LUNAR-205) là ngưỡng để điều chỉnh giá về sau.
- Subscription management (hủy, pau, resume qua App Store): phụ thuộc App Store subscription management; defer sang sau khi có tích hợp payment.
- Promo code / referral: có thể thêm sau khi có conversion data thực; không phù hợp Phase 3 ban đầu.
- Analytics chi tiết trên tỷ lệ chuyển đổi: phụ thuộc `consentFlags.analyticsUsage = true` của FR-019; defer sang khi có đủ dữ liệu.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Client-trusted entitlement (sửa localStorage) | Server-side gate không đọc client data | HTTP 403 đúng mức | Không cần - gate ở server hoạt động |
| Webhook giả mạo (HMAC sai) | Xác minh HMAC trước xử lý | HTTP 401, entitlement không đổi | Log IP của request; không cấp tier |
| Entitlement hết hạn nhưng chưa check | `getEntitlement()` so sánh `valid_until` với `now()` | Auto-downgrade về Free | Graceful; dữ liệu giữ 30 ngày |
| Vượt Genie quota | `checkAndIncrementGenieUsage()` bản chỉ số | HTTP 429 với `Retry-After` | User đợi đầu tháng hoặc nâng cấp |
| Supabase down khi check entitlement | HTTP 5xx từ DB | Fallback về Free (toàn tuyến an toàn) | Log lỗi; user nhìn thấy "dịch vụ tạm thời gián đoạn" |
| Race condition: 2 Genie call đồng thời ở ngưỡng quota | Upsert atomic trong `genie_usage_monthly` | Một call được, một chặn | Dùng `ON CONFLICT DO UPDATE` với atomic increment |
| Premium user gặp Family gate (sharedWith) | `isFeatureAllowed(tier, "familySharing")` | HTTP 403 rõ ràng | `UpgradePrompt` hiện Family tier với lợi ích |
| Trial được kích hoạt 2 lần | `trial_used = true` check trước khi cấp | HTTP 409 | Thông báo "Bạn đã dùng thử rồi" |
| Cache TTL hết nhưng server down | `EntitlementClient.get()` fallback về cache cũ | Dùng cache cũ thêm 1h (fallback window) | Log warning; không block UX |
| Family member thứ 11 | Gate `maxFamilyMembers = 10` | HTTP 422 với thông báo rõ ràng | Chủ gia đình cần nâng cấp hoặc xóa thành viên |

---

## §11 - Implementation notes

- `TIER_FEATURES` là nguồn sự thật duy nhất: mọi quyết định "tính năng X có được phép không" đi qua `isFeatureAllowed(tier, feature)` đọc từ bảng này. KHÔNG ĐƯỢC hard-code tier check ở các chỗ khác nhau trong code - tránh drift.
- `genie_usage_monthly` dùng `year_month = "YYYY-MM"` (text) thay vì TIMESTAMPTZ để đơn giản hóa việc reset đầu tháng: `WHERE year_month = to_char(NOW(), 'YYYY-MM')`. Atomic increment dùng `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1`.
- Webhook security: AppStore dùng JWS (JWT với RS256 + Apple root certificate); Zalo Pay dùng HMAC-SHA256 với `ZALO_PAY_KEY2` (environment variable). Cả hai phải được xác minh trước khi xử lý. Đọc tài liệu chính thức từng provider - dùng đúng tên biến và thủ tục.
- `EntitlementClient` trên client: cache trong memory (không phải localStorage) để tránh người dùng đọc/sửa cache; TTL 24h reset khi app reload. `invalidateCache()` gọi sau khi người dùng thanh toán xong.
- Graceful downgrade 30 ngày: cần một cron job (hoặc kiểm tra ở thời điểm access) để đánh dấu `grace_period_ends_at` và gửi thông báo "tài khoản Premium sẽ hết hạn trong X ngày". Cron này là phần của FR-017 infrastructure (ZNS), không xây dựng trong FR-020.
- `UpgradePrompt` nên có A/B testing sau khi có đủ dữ liệu: thử nghiệm "Dùng thử 7 ngày" vs "Nâng cấp ngay - giảm 30% tháng đầu". Phụ thuộc vào analytics consent (FR-019) và có đủ người dùng.
- Success metric DEC-LUNAR-205 (>= 3% chuyển đổi): theo dõi bằng cách đếm `user_entitlements` có `tier != 'free'` chia cho tổng user; đặt alert khi chưa đạt sau 90 ngày Phase 3.
- So migration P3 duoc phan phoi de tranh va cham: 0016-0017 danh cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020.

*Hết FR-LUNAR-020.*
