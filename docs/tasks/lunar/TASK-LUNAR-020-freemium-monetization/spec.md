---
id: TASK-LUNAR-020
title: "Freemium monetization - basic reminders free, premium for AI Genie / advanced good-day / family, entitlement gating"
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
related_frs: [TASK-LUNAR-015, TASK-LUNAR-018]
depends_on: [TASK-LUNAR-015, TASK-LUNAR-018]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#14 (Phase 3 monetization)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#15 (Success Metrics)"
source_decisions:
  - DEC-LUNAR-200 (three freemium tiers: Free = basic reminders + month calendar + static content; Premium = AI Genie + advanced good-day + ZNS; Family = Premium + sharedWith multi-member; the tier definitions are immutable - changing a tier needs a new DEC)
  - DEC-LUNAR-201 (the entitlement check MUST be server-side in every serverless handler; the client only receives the result from the server, MUST NOT decide its own tier - to avoid client-trusted entitlement)
  - DEC-LUNAR-202 (rate-limit AI Genie and ZNS by tier: Free = 0 Genie calls; Premium = 50 Genie calls/month; Family = 100 Genie calls/month/user; over the limit returns HTTP 429 with Retry-After)
  - DEC-LUNAR-203 (payment via App Store In-App Purchase on iOS and Zalo Pay / a Vietnamese payment gateway on the Zalo Mini App; TASK-020 does not build payment directly - only the webhook handling and entitlement update after payment confirmation)
  - DEC-LUNAR-204 (entitlement is stored in the `user_entitlements` table in Supabase with RLS; the client caches entitlement locally for <= 24h with a TTL; on TTL expiry it must re-validate with the server)
  - DEC-LUNAR-205 (success metric: premium conversion rate >= 3% after 3 months of Phase 3; if not met, prioritize improving the AI Genie value before adjusting price)
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
  - "read the tier decision from client-side storage or localStorage without re-validating with the server (violates DEC-LUNAR-201 - client-trusted entitlement)"
  - "call the Claude API from the Free tier without a server-side gate (violates DEC-LUNAR-201 / DEC-LUNAR-202)"
  - "grant Premium entitlement immediately on receiving a payment webhook without verifying the provider's HMAC signature (security vulnerability)"
effort_hours: 7
sub_tasks:
  - "1h: migration 0020_entitlements.sql - the user_entitlements table (userId, tier, validUntil, source, updatedAt) and genie_usage_monthly; RLS; index"
  - "1.5h: lib/entitlement.ts - Tier enum, EntitlementRecord, getEntitlement(), isFeatureAllowed(), getUsageQuota()"
  - "1h: lib/rate-limiter.ts - checkRateLimit() using Supabase or Upstash Redis; write usage_count by month"
  - "1h: api/entitlement.ts - GET /api/entitlement (get the current tier and quota), including a 24h cache TTL"
  - "1h: api/webhook-payment.ts - POST /api/webhook/payment (handle the App Store / Zalo Pay webhook, verify HMAC, update entitlement)"
  - "0.5h: apps/web/lib/entitlement-client.ts - EntitlementClient, local cache TTL 24h, re-validate"
  - "1h: modify api/genie.ts + api/sync.ts to add the server-side entitlement gate; apps/web UpgradePrompt.tsx"
risk_if_skipped: "Without entitlement gating, all premium features (AI Genie, family sharing) are free to use - lost revenue and lost ability to scale (Claude API cost rises without limit). Without a server-side gate, client-trusted entitlement is a security hole: anyone editing localStorage can grant themselves Premium. TASK-020 is the business foundation for CyberSkill to earn revenue from this product."
---

## §1 - Description (BCP-14 normative)

TASK-020 builds the freemium tier split and the server-side entitlement gate for "Genie Am Lich". The three-tier model is designed to maximize the value for Free users (encouraging retention) while clearly creating additional value for Premium and Family.

1. MUST define three clear tiers (DEC-LUNAR-200):
   - **Free**: Ram/Mung Mot/gio/custom reminders, the lunar-solar month calendar, static content (festival content), local notifications, basic can-chi day view; NO AI Genie, NO advanced good-day picker, NO family sharing (sharedWith = []).
   - **Premium**: everything in Free plus AI Genie (50 calls/month), the full good-day picker (TASK-012), ZNS reminders (TASK-017), shareable cards (TASK-014).
   - **Family**: everything in Premium plus family sharing/cloud sync (TASK-018), 100 Genie calls/month/user, sharing up to 10 members.
2. MUST enforce the entitlement gate **server-side** in every serverless handler; the client MUST NOT decide its own tier - every decision is based on the result from the server (DEC-LUNAR-201).
3. MUST store entitlement in the `user_entitlements` table in Supabase with RLS; the client caches locally with a 24h TTL; on TTL expiry it MUST re-validate with the server (DEC-LUNAR-204).
4. MUST enforce the tier rate-limit on the server for AI Genie: Free = 0 calls; Premium = 50 calls/month; Family = 100 calls/month/user; over the limit returns HTTP 429 with the `Retry-After` and `X-RateLimit-Remaining` headers (DEC-LUNAR-202).
5. MUST enforce the family-sharing gate in `api/sync.ts`: Free and Premium users cannot add members to `sharedWith`; only the Family tier can (DEC-LUNAR-200).
6. MUST handle the payment webhook from the App Store and Zalo Pay in `api/webhook-payment.ts`; it MUST verify the provider's HMAC/JWT signature before updating entitlement; updating incorrectly without verifying is a security hole.
7. MUST NOT handle payment directly in TASK-020; this function only enforces the webhook from App Store IAP (iOS) and Zalo Pay (Zalo Mini App) - TASK-020 does not build the payment UI (DEC-LUNAR-203).
8. MUST have `GET /api/entitlement` returning `{ tier, features, quota, validUntil }` to the client; this response MUST include enough information to display the correct `UpgradePrompt`.
9. MUST display an `UpgradePrompt` when a Free user taps a Premium feature; the prompt MUST state the specific benefit ("Unlock AI Genie - ask about offering trays, holiday meanings") not just "Upgrade to Premium".
10. MUST NOT hide or disable a Premium feature in the client in a way the user cannot see - it should show the feature with a lock icon and an `UpgradePrompt`, not remove the working UI (SHOULD encourage discovery).
11. SHOULD track the conversion rate (Free -> Premium, Premium -> Family) via analytics (with `consentFlags.analyticsUsage = true` per TASK-019) to serve the DEC-LUNAR-205 success metric.
12. MUST have a "graceful downgrade" mechanism: if entitlement expires (validUntil < now()), immediately move back to the Free tier; the Premium data (Genie history, sharedWith) IS KEPT for 30 days to allow renewal; only after 30 days is it deleted.
13. SHOULD provide a trial mode: a 7-day free Premium trial for new users; the trial is tracked by a `trial_used: boolean` field in `user_entitlements`; each user gets only 1 trial.

---

## §2 - Why this design (rationale for humans)

**Why three tiers (Free/Premium/Family) instead of two (Free/Premium) (DEC-LUNAR-200)?** The persona "Co Hoa" (the homemaker keeping the ancestral incense) is a distinct segment with the need to "share gio reminders with the whole family" - this is a different value from "using AI Genie". A separate Family tier allows higher pricing for the family use case without forcing a single user to pay more. The tier split is also cleaner technically: TASK-018 can be gated for the Family tier only.

**Why MUST entitlement be server-side (DEC-LUNAR-201)?** Client-trusted entitlement is a fundamental security hole: anyone who opens DevTools and edits `localStorage.tier = "premium"` gets Premium for free. For AI Genie, each call is a real cost ($1/$5 per 1M tokens) - this hole directly affects operating cost. A server-side gate ensures every request is checked against the real data in the database.

**Why cache entitlement locally with a 24h TTL (DEC-LUNAR-204)?** Calling the entitlement-check API before every user action is too slow - it increases latency and hurts UX. A 24h TTL is a balance: if the user's tier expires, the system knows within 24h (acceptable for an app like this). Important features like AI Genie still call the server - the cache is only for displaying the UI (lock icon, UpgradePrompt).

**Why not build a payment UI in TASK-020 (DEC-LUNAR-203)?** iOS payment via App Store IAP requires native Swift/StoreKit; the Zalo Mini App requires the separate Zalo Pay SDK. Integrating these two payment systems is a large, separate scope. TASK-020 only handles the "after payment confirmation" part via a webhook - this is much simpler and does not block the rollout of the entitlement logic.

**Why is verifying the webhook HMAC/JWT mandatory?** Without verification, anyone can POST to `/api/webhook/payment` and update their entitlement. This is the simplest possible attack. HMAC (App Store uses JWS, Zalo Pay uses HMAC-SHA256) is the standard mechanism of both providers - read the official documentation before implementing.

**Why show Premium features with a lock icon instead of hiding them (§1 #10)?** Showing a feature with a lock icon creates "aspirational pull" - the user sees "AI Genie" and wants to use it. Hiding it means the user does not know it exists and never converts. This pattern is used successfully by Duolingo, Spotify, and many other freemium products.

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

1. A Free user calling `api/genie.ts` directly (bypassing the UI) receives HTTP 403 with body `{ error: "feature_not_allowed", feature: "genieAI", tier: "free" }`.
2. A Premium user calling Genie 50 times in a month: the 51st call receives HTTP 429 with the header `X-RateLimit-Remaining: 0` and `Retry-After` equal to the number of seconds until the start of next month.
3. A Family user calling Genie 100 times in a month: the 101st call receives HTTP 429.
4. A Free user trying to add a member to `sharedWith` on the `/api/sync/share` endpoint receives HTTP 403.
5. A Premium user trying to add a member to `sharedWith` receives HTTP 403 (only Family is allowed).
6. A Family user adding up to 10 members: adding the 11th member receives HTTP 422 with a clear message.
7. Editing `localStorage.tier = "premium"` on the client and calling `/api/genie`: the server returns HTTP 403 if the real entitlement is Free (client-trusted entitlement is defeated).
8. An App Store webhook POST with a valid JWS -> entitlement is updated to Premium in `user_entitlements`; `GET /api/entitlement` right after returns `tier: "premium"`.
9. An App Store webhook POST with a forged JWS (wrong signature) -> HTTP 401, entitlement does NOT change.
10. A Zalo Pay webhook POST with a valid MAC -> entitlement is updated; a wrong MAC -> HTTP 401.
11. `EntitlementClient.get()` calls the API the first time and caches; a second call within 24h uses the cache (0 additional API requests).
12. `EntitlementClient.get()` after the 24h TTL expires calls the API again.
13. 7-day trial: calling `POST /api/entitlement/trial` the first time -> the tier moves to premium, `trialUsed = true`, `validUntil = now() + 7 days`. Calling a second time -> HTTP 409.
14. Trial expiry: `validUntil < now()` -> the tier automatically moves back to Free; the Premium data is kept for 30 days (`gracePeriodEndsAt = validUntil + 30 days`).
15. `UpgradePrompt` appears when a Free user taps AI Genie; the prompt has text describing the specific benefit ("Ask about offering trays, holiday meanings") and a "Try 7 days free" button if `trialAvailable = true`.

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

`TIER_FEATURES` in §3 is the single source of truth for every gate decision. Two key points:

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

Upstream: TASK-LUNAR-015 (the AI Genie Claude proxy) - TASK-020 adds a server-side gate into TASK-015's `api/genie.ts`; TASK-015 must already exist before the gate can be added. TASK-LUNAR-018 (family sharing cloud sync) - TASK-020 adds the `familySharing` gate into TASK-018's `api/sync.ts`.

Downstream: TASK-020 blocks no task. But the entire Phase 3 depends on TASK-020 working to earn revenue: without the entitlement gate there is no tier distinction, no conversion incentive, and the operating cost of AI Genie and ZNS rises uncontrolled.

Cross-cutting: TASK-LUNAR-019 (PDPL consent) - if `analyticsUsage = true`, TASK-020 can track the conversion rate. TASK-LUNAR-016 (Zalo Mini App) - the entitlement check must work similarly on the Zalo Mini App client (calling the same `/api/entitlement` API).

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

Resolved:
- Three tiers (Free/Premium/Family): defined immutably in `TIER_FEATURES` (DEC-LUNAR-200); changing a tier needs a new DEC.
- Server-side gate: the pattern in §6 applies to all Premium features (DEC-LUNAR-201).
- Rate-limit storage: Supabase `genie_usage_monthly` is enough for the initial phase; can move to Upstash Redis if higher speed is needed in Phase 4.
- Cache TTL 24h: a balance between UX and freshness (DEC-LUNAR-204); used for Phase 3.

Still deferred:
- Payment UI (StoreKit for iOS, the Zalo Pay SDK for the Mini App): outside the scope of TASK-020 (DEC-LUNAR-203). Will be split into a separate task once the payment provider is chosen.
- Specific pricing (VND/month for Premium and Family): not yet set. The success metric (>= 3% conversion - DEC-LUNAR-205) is the threshold for adjusting price later.
- Subscription management (cancel, pause, resume via the App Store): depends on App Store subscription management; deferred until there is a payment integration.
- Promo code / referral: can be added once there is real conversion data; not suitable for the initial Phase 3.
- Detailed analytics on the conversion rate: depends on `consentFlags.analyticsUsage = true` from TASK-019; deferred until there is enough data.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Client-trusted entitlement (edited localStorage) | The server-side gate does not read client data | HTTP 403 correctly | Not needed - the server gate works |
| Forged webhook (wrong HMAC) | Verify the HMAC before processing | HTTP 401, entitlement unchanged | Log the request IP; do not grant the tier |
| Entitlement expired but not yet checked | `getEntitlement()` compares `valid_until` with `now()` | Auto-downgrade to Free | Graceful; data kept for 30 days |
| Genie quota exceeded | `checkAndIncrementGenieUsage()` counter | HTTP 429 with `Retry-After` | User waits for the start of the month or upgrades |
| Supabase down during the entitlement check | HTTP 5xx from the DB | Fallback to Free (fail-safe across the board) | Log the error; the user sees "service temporarily interrupted" |
| Race condition: 2 concurrent Genie calls at the quota threshold | Atomic upsert in `genie_usage_monthly` | One call goes through, one is blocked | Use `ON CONFLICT DO UPDATE` with an atomic increment |
| Premium user hits the Family gate (sharedWith) | `isFeatureAllowed(tier, "familySharing")` | Clear HTTP 403 | `UpgradePrompt` shows the Family tier with its benefits |
| Trial activated twice | Check `trial_used = true` before granting | HTTP 409 | Message "You have already used the trial" |
| Cache TTL expired but the server is down | `EntitlementClient.get()` falls back to the old cache | Use the old cache for another 1h (fallback window) | Log a warning; do not block UX |
| The 11th family member | Gate `maxFamilyMembers = 10` | HTTP 422 with a clear message | The family owner needs to upgrade or remove a member |

---

## §11 - Implementation notes

- `TIER_FEATURES` is the single source of truth: every "is feature X allowed" decision goes through `isFeatureAllowed(tier, feature)` reading from this table. MUST NOT hardcode tier checks in different places in the code - to avoid drift.
- `genie_usage_monthly` uses `year_month = "YYYY-MM"` (text) instead of TIMESTAMPTZ to simplify the start-of-month reset: `WHERE year_month = to_char(NOW(), 'YYYY-MM')`. Atomic increment uses `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1`.
- Webhook security: App Store uses JWS (JWT with RS256 + the Apple root certificate); Zalo Pay uses HMAC-SHA256 with `ZALO_PAY_KEY2` (an environment variable). Both must be verified before processing. Read each provider's official documentation - use the correct variable names and procedures.
- `EntitlementClient` on the client: cache in memory (not localStorage) to prevent the user from reading/editing the cache; the 24h TTL resets on app reload. `invalidateCache()` is called after the user finishes payment.
- Graceful downgrade of 30 days: needs a cron job (or a check at access time) to mark `grace_period_ends_at` and send a message "your Premium account will expire in X days". This cron is part of the TASK-017 infrastructure (ZNS), not built in TASK-020.
- `UpgradePrompt` should have A/B testing once there is enough data: test "Try 7 days" vs "Upgrade now - 30% off the first month". Depends on the analytics consent (TASK-019) and having enough users.
- Success metric DEC-LUNAR-205 (>= 3% conversion): track it by counting `user_entitlements` with `tier != 'free'` divided by total users; set an alert when it is not met after 90 days of Phase 3.
- The P3 migration numbers are distributed to avoid collisions: 0016-0017 for TASK-018, 0018 for TASK-017, 0019 for TASK-019, 0020 for TASK-020.

*End of TASK-LUNAR-020.*
