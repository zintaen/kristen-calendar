---
id: FR-LUNAR-024
title: "Premium Widgets & Themes - Monetization In-App Purchase"
module: LUNAR
priority: COULD
status: ready_to_implement
verify: T
phase: P4
milestone: P4 · slice 3
slice: 3
owner: Stephen Cheng
created: 2026-07-01
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: [FR-LUNAR-020, FR-LUNAR-005]
blocks: []
source_pages:
  - BACKLOG.md
source_decisions:
  - DEC-024 (Implement IAP to sell premium Themes and Widgets, maximizing LTV)
language: typescript
service: apps/mobile-app
new_files:
  - apps/mobile-app/src/features/monetization/StorePage.tsx
  - apps/mobile-app/src/features/monetization/IAPService.ts
modified_files:
  - apps/mobile-app/src/App.tsx
  - packages/genie-api/src/services/revenuecat.ts
allowed_tools:
  - RevenueCat SDK (Cordova/Capacitor)
  - Supabase Database
disallowed_tools:
  - Custom IAP receipt validation (must use RevenueCat)
effort_hours: 20
sub_tasks:
  - "3h: Set up the RevenueCat project and Apple/Google credentials"
  - "4h: Integrate the RevenueCat SDK into the Capacitor app"
  - "4h: Build the StorePage UI showing the list of Themes/Widgets"
  - "5h: Implement lock/unlock logic for Themes based on Entitlements"
  - "4h: Integrate the Supabase webhook from RevenueCat to sync Premium status"
risk_if_skipped: "Skipping a strong direct revenue channel. Users are willing to pay for interface personalization (especially the spiritual/feng shui user segment)."
---

# Feature Request

> Turn Your Will Into Real.

## Summary

Implement an In-App Purchase (IAP) system through RevenueCat to sell Premium packages (feng shui Themes, exclusive Widgets). Users can buy individual themes or a Subscription package (Genie+). The system manages entitlements and syncs purchase status back to the Supabase database.

## Problem

The app is currently entirely free. Although Affiliate (FR-LUNAR-022) generates cash flow, IAP (direct sales) is still the most stable and scalable monetization model for utility apps (Calendar/Widget). Users have a high demand for personalization (changing the app color to match their feng shui element) but have no way to pay for that feature.

## Customer Quotes

<untrusted_content source="user-interview"> "My element is Fire. I want the app to be red or orange to match feng shui. Does the app sell themes so I can buy one?" </untrusted_content>

## §1 - Description (Normative Clauses)

1. **MUST** integrate RevenueCat SDK to handle App Store and Google Play billing securely.
2. **MUST** create a `StorePage` UI showcasing available premium items: "Feng Shui Themes" and "Advanced Widgets".
3. **MUST** lock premium themes in the `ThemeSelector` component if the user does not have the required RevenueCat Entitlement.
4. **MUST** set up a RevenueCat Webhook targeting a Supabase Edge Function to sync subscription/purchase states to the `user_settings.premium_tier` column.
5. **MUST** support offline entitlement checking (using RevenueCat's cached entitlements) so users don't lose access to their themes when offline.
6. **MUST** provide a "Restore Purchases" button in the Store UI, explicitly required by Apple App Store guidelines.
7. **SHOULD** implement a promotional introductory offer (e.g., "7 days free trial" for Genie+).
8. **MUST** log all successful purchase events to `genie.action_log` with `event_kind=monetization.purchase_success`.

## §2 - Why this design

**Why RevenueCat instead of native IAP (§1 #1)?** 
Implementing Apple StoreKit and Google Play Billing directly, along with secure backend receipt validation, is extremely complex and error-prone. RevenueCat abstracts this into a single SDK and provides a unified dashboard for metrics.

**Why sync to Supabase via Webhook (§1 #4)?**
While RevenueCat holds the source of truth, we need the `premium_tier` in our database to gate server-side features in the future (e.g., unlimited Claude requests) without querying RevenueCat's API on every request.

## §3 - API contract

```typescript
// Supabase Webhook Endpoint (receives from RevenueCat)
export interface RevenueCatWebhookPayload {
  event: {
    type: "INITIAL_PURCHASE" | "RENEWAL" | "CANCELLATION" | "EXPIRATION";
    app_user_id: string; // Maps to Supabase User ID
    product_id: string;
    entitlement_ids: string[];
    purchased_at_ms: number;
    expiration_at_ms?: number;
  };
}

// Client-side IAP Service
export interface IAPService {
  getOfferings(): Promise<Offering[]>;
  purchasePackage(pkg: Package): Promise<CustomerInfo>;
  restorePurchases(): Promise<CustomerInfo>;
  hasEntitlement(entitlementId: string): Promise<boolean>;
}
```

## §4 - Acceptance criteria

1. **Store Display** - When a user opens the StorePage, it successfully fetches and displays the active offerings from RevenueCat.
2. **Purchase Flow** - When a user taps "Buy", the native IAP sheet appears. Upon successful sandbox purchase, the Theme is immediately unlocked locally.
3. **Webhook Sync** - When a purchase occurs, RevenueCat fires a webhook to Supabase, updating the user's `premium_tier` to `true` within 5 seconds.
4. **Restore Purchases** - When a user uninstalls and reinstalls on a new device, tapping "Restore Purchases" unlocks their previously bought themes without double-charging.
5. **Offline Access** - When the app is launched without internet, previously unlocked themes remain unlocked based on cached entitlements.

## §5 - Verification

```typescript
// test/monetization/webhook.test.ts
import { handleRevenueCatWebhook } from '../../src/services/revenuecat';

describe('RevenueCat Webhook', () => {
  it('MUST update user_settings premium_tier to true on INITIAL_PURCHASE', async () => {
    // Arrange
    const payload = {
      event: {
        type: "INITIAL_PURCHASE",
        app_user_id: "123-abc",
        entitlement_ids: ["genie_plus"]
      }
    };
    
    // Act
    await handleRevenueCatWebhook(payload);
    
    // Assert
    const user = await DB.getUserSettings("123-abc");
    expect(user.premium_tier).toBe(true);
  });
});
```

## §6 - Implementation skeleton

```typescript
// IAPService.ts
import { Purchases, CustomerInfo } from '@revenuecat/purchases-capacitor';

export class IAPServiceImpl implements IAPService {
  async init(userId: string) {
    await Purchases.configure({ apiKey: "appl_XXXXXX", appUserID: userId });
  }

  async hasEntitlement(entitlementId: string): Promise<boolean> {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[entitlementId] !== undefined;
  }

  async purchasePackage(pkg: any): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      await logToAudit(customerInfo.originalAppUserId, "IAP_SUCCESS", pkg.identifier);
      return customerInfo;
    } catch (e) {
      if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled, ignore
      } else {
        throw e;
      }
    }
  }
}
```

## §7 - Dependencies

- **Upstream:** FR-LUNAR-005 (Widget engine - to support premium widget rendering).
- **Upstream:** FR-LUNAR-020 (Account management - to link purchases to Supabase UUIDs).

## §8 - Example payloads

**Audit Log Row:**
```json
{
  "event": "monetization.purchase_success",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "timestamp": "2026-08-14T01:00:05Z",
  "payload": {
    "product_id": "com.cyberskill.genie.theme.fire",
    "entitlement_id": "premium_themes",
    "sandbox": true
  },
  "trace_id": "5b23d9161a03f8373b..."
}
```

## §9 - Open questions

- `Resolved` - Should we use RevenueCat's anonymous IDs or require login to buy? Resolution: Require login (FR-020) so purchases can sync cross-platform (iOS to Android).

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| RevenueCat SDK fails to init | Promise rejects on boot | App runs in free mode | Retry next session |
| User denies payment | `PURCHASE_CANCELLED_ERROR` | Nothing happens | Expected behavior |
| Webhook fails to reach Supabase | RevenueCat dashboard alerts | DB out of sync | RevenueCat auto-retries webhook for 7 days |
| User tries to restore without logging into correct Apple ID | iOS StoreKit error | Alert shown | Instruct user to check App Store settings |
| Invalid signature on Webhook | Supabase rejects with 401 | Sync fails | Ensure shared secret is correctly configured in env vars |
| Apple rejects App Review | App Store Connect message | Delay in release | Ensure "Restore Purchases" is visible and EULA is linked per Apple guidelines |
| DB connection fails during Webhook | Supabase throws 500 | Webhook fails | Rely on RevenueCat webhook retry |
| App userID mismatch | RC uses anonymous ID instead of Supabase UUID | Purchases lost on uninstall | Call `Purchases.logIn(supabaseUser.id)` immediately after login |
| Network disconnect during purchase | SDK handles | Purchase queued | Will complete upon reconnect |
| Sandbox purchase leaks to Prod | Webhook detects `environment: "SANDBOX"` | Prod metrics skewed | Ensure Supabase webhook filters out sandbox events in production DB |

## §11 - Implementation notes

- **Apple Guidelines:** Apple is extremely strict about IAP. The StorePage MUST display a link to the Terms of Service, Privacy Policy, and clearly state the exact price, duration (if subscription), and how to cancel. Missing any of these guarantees an App Review rejection.
- **Login Lifecycle:** If a user logs out, we must call `Purchases.logOut()` to prevent the next user on the same device from inheriting their purchases.

## AI Authorship Disclosure

- **Tools used:** LLM agent acting as feature-request-author
- **Scope:** The entire FR content.
- **Human review:** Reviewed by the operator after generation.

*End of FR-LUNAR-024.*
