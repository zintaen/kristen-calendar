---
id: FR-LUNAR-022
title: "O2O Commerce (Ritual Marketplace) - Gợi ý đồ cúng và dịch vụ qua affiliate links"
module: LUNAR
priority: SHOULD
status: ready_to_implement
verify: T
phase: P4
milestone: P4 · slice 1
slice: 1
owner: Stephen Cheng
created: 2026-07-01
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: [FR-LUNAR-010, FR-LUNAR-016, FR-LUNAR-021]
blocks: []
source_pages:
  - BACKLOG.md
source_decisions:
  - DEC-022 (Xây dựng O2O Commerce model qua affiliate links cho các dịp lễ cúng)
language: typescript
service: packages/amlich-core
new_files:
  - packages/amlich-core/src/commerce/affiliate-resolver.ts
  - apps/zalo-mini-app/src/components/commerce/AffiliateWidget.tsx
modified_files:
  - apps/zalo-mini-app/src/pages/event-detail.tsx
  - packages/genie-api/src/workers/proactive-zns.ts
allowed_tools:
  - Zalo Mini App SDK
  - Supabase Edge Functions
disallowed_tools:
  - Direct payment gateway integration (use affiliate out-links only)
effort_hours: 10
sub_tasks:
  - "2h: Thiết kế schema lưu trữ đối tác affiliate"
  - "3h: Viết AffiliateResolver trong amlich-core để match dịp lễ với ngành hàng"
  - "3h: Xây dựng AffiliateWidget UI trên Zalo Mini App"
  - "2h: Tích hợp logic chèn link affiliate vào Proactive ZNS (FR-021)"
risk_if_skipped: "Bỏ lỡ cơ hội kiếm doanh thu O2O. Việc chỉ nhắc nhở ngày lễ mà không gợi ý giải pháp mua sắm đồ cúng khiến trải nghiệm người dùng bị đứt gãy, họ vẫn phải tự đi tìm nơi mua."
---

# Feature Request

> Turn Your Will Into Real.

## Summary

Tích hợp tính năng thương mại O2O (Online-to-Offline) vào Genie bằng cách xây dựng hệ thống gợi ý đồ cúng và dịch vụ tâm linh thông qua affiliate links. Người dùng khi xem chi tiết một dịp lễ (VD: Rằm tháng 7) hoặc nhận ZNS sẽ thấy các gợi ý mua sắm (hoa, mâm cúng, dịch vụ dọn dẹp) trỏ tới các đối tác liên kết (Tiki, Shopee, GrabMart, hoặc đối tác local), giúp monetization ứng dụng.

## Problem

Việc nhắc nhở các dịp lễ Âm lịch chỉ giải quyết 50% nhu cầu của người dùng. 50% còn lại là "chuẩn bị gì cho lễ này và mua ở đâu?". Hiện tại ứng dụng chưa có luồng monetization rõ ràng ngoài freemium (FR-LUNAR-020). Cung cấp affiliate link giải quyết cả nỗi đau của người dùng lẫn bài toán doanh thu.

## Customer Quotes

<untrusted_content source="user-interview"> "Sắp tới rằm tháng 7 tôi bận quá không kịp đi chợ mua đồ cúng. Nếu app nhắc xong mà có chỗ đặt luôn mâm cúng giao tận nhà thì tôi đặt liền." </untrusted_content>

## §1 — Description (Normative Clauses)

1. **MUST** implement a generic `AffiliateResolver` in `amlich-core` that accepts a `LunarEventId` and returns a list of matching `AffiliateOffer` objects (e.g., matching "Rằm" with "Hoa tươi", "Trái cây").
2. **MUST** define `AffiliateOffer` schema including `id`, `provider_name`, `category`, `image_url`, `click_url`, and `priority`.
3. **MUST** display an `AffiliateWidget` on the Event Detail page in the Zalo Mini App if the event has active matching offers.
4. **MUST** inject a dynamic `action_link` (an affiliate link or a deep link to the Zalo Mini App event page) into the Proactive ZNS template (FR-LUNAR-021).
5. **MUST** append a `utm_source=genie_lunar` and `utm_campaign={event_id}` to all out-bound affiliate URLs for tracking.
6. **MUST** log every outgoing click to `genie.action_log` with `event_kind=commerce.affiliate_click` to calculate CTR and reconciliation.
7. **SHOULD** allow A/B testing of different affiliate providers by rotating offers based on server-side probability.
8. **MUST NOT** process any payments directly within the app; all commerce must hand off to the affiliate partner's site/app.

## §2 — Why this design

**Why affiliate links only (§1 #8)?** 
Building a full e-commerce checkout, handling payments, refunds, and logistics is extremely complex and outside the core competency of a calendar app. Affiliate out-links provide 80% of the monetization value with 5% of the effort.

**Why build AffiliateResolver in `amlich-core` (§1 #1)?**
The mapping between a lunar event (e.g., "Tết Hàn Thực") and the required items (e.g., "Bánh trôi, bánh chay") is domain logic. It belongs in the core engine so any client (Zalo, iOS, Web) can resolve it identically.

## §3 — API contract

```typescript
export interface AffiliateOffer {
  id: string;
  provider_name: string; // e.g. "GrabMart", "ShopeeFood"
  category: "flowers" | "offerings" | "services";
  title: string;
  image_url: string;
  click_url: string;
  priority: number;
}

export interface AffiliateResolver {
  // Returns sorted offers for a specific event
  getOffersForEvent(eventId: string, region?: string): AffiliateOffer[];
  
  // Track click to audit log
  logClick(offerId: string, userId: string, traceId: string): Promise<void>;
}
```

## §4 — Acceptance criteria

1. **Tier 1 hits first** — When an event is "Mùng 1", the event detail page successfully displays at least one "Hoa tươi" affiliate offer.
2. **URL Construction** — When a user clicks an offer, the resulting URL strictly contains `utm_source=genie_lunar` and the correct campaign tracking ID.
3. **Telemetry** — When a click occurs, exactly one `commerce.affiliate_click` row is written to `genie.action_log`.
4. **Proactive ZNS Injection** — When generating a ZNS payload (via FR-021), the `action_link` is populated with a valid redirect link provided by the AffiliateResolver.

## §5 — Verification

```typescript
// test/commerce/affiliate-resolver.test.ts
import { AffiliateResolverImpl } from '../../src/commerce/affiliate-resolver';

describe('AffiliateResolver', () => {
  it('MUST append UTM params to click_url', () => {
    const resolver = new AffiliateResolverImpl();
    const offers = resolver.getOffersForEvent('mung_1');
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0].click_url).toContain('utm_source=genie_lunar');
    expect(offers[0].click_url).toContain('utm_campaign=mung_1');
  });
  
  it('MUST return strictly localized offers if region provided', () => {
     // test regional targeting (e.g. only GrabMart in VN)
  });
});
```

## §6 — Implementation skeleton

```typescript
export class AffiliateResolverImpl implements AffiliateResolver {
  getOffersForEvent(eventId: string, region?: string): AffiliateOffer[] {
    const offers = DB.getOffersByTag(eventId); // e.g. mock DB or config
    
    return offers.map(offer => {
      const url = new URL(offer.base_url);
      url.searchParams.append('utm_source', 'genie_lunar');
      url.searchParams.append('utm_campaign', eventId);
      
      return {
        ...offer,
        click_url: url.toString()
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  async logClick(offerId: string, userId: string, traceId: string) {
    await auditLogger.log({
       module: 'commerce',
       event_kind: 'affiliate_click',
       user_id: userId,
       payload: { offer_id: offerId },
       trace_id: traceId
    });
  }
}
```

## §7 — Dependencies

- **Upstream:** FR-LUNAR-010 (Event detail pages to host the widgets).
- **Upstream:** FR-LUNAR-016 (Zalo Mini App runtime environment).
- **Upstream:** FR-LUNAR-021 (Proactive AI - to inject links into ZNS).

## §8 — Example payloads

**Audit Log Row (Redacted PII):**
```json
{
  "event": "commerce.affiliate_click",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "timestamp": "2026-08-14T01:00:05Z",
  "payload": {
    "offer_id": "grabmart_flowers_01",
    "event_id": "ram_thang_7",
    "region": "VN"
  },
  "trace_id": "5b23d9161a03f8373b..."
}
```

## §9 — Open questions

- `Deferred: P4 slice 2` - Affiliate partner onboarding strategy (who are the initial partners?). For now, mock URLs will be used for system testing.

## §10 — Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Affiliate URL is malformed | Unit test URL parser fails | URL construction panics | Wrap in try-catch, drop offer from list |
| Affiliate network goes down | User clicks link and gets 404/500 on partner site | Bad UX | Out of our control; monitor CTR to detect anomalous drops |
| Missing `utm_source` | E2E integration test assertion | Attribution lost | CI blocks PR |
| Click audit logging fails (DB down) | `logClick` throws exception | Audit log lost | Swallow error so user is still redirected, but log locally to stderr |
| Widget rendering fails on ZMA | React Error Boundary catches | Widget omitted | Core page still functions |
| No offers found for event | `getOffersForEvent` returns [] | Widget hidden | Expected behavior |
| ZNS template max chars exceeded | Zalo API returns 400 | ZNS send fails | Truncate URL or use shortlink service (e.g. bit.ly wrapper) |
| Invalid UUID format for user_id | `Uuid::parse` fails | Click logging fails | Fallback to Uuid::nil() |
| Regional targeting misconfigured | User sees irrelevant offer | Low CTR | Fix in admin DB |
| Ad blocker strips UTMs | Analytics mismatch | Under-reporting | Acceptable baseline loss |

## §11 — Implementation notes

- **Shortlinks:** If the affiliate URLs are too long for Zalo ZNS templates, we must route them through a URL shortener or our own `genie-api/r/:id` endpoint that expands and redirects.
- **Click Logging:** The `logClick` function should execute synchronously *before* the client-side redirect happens (or fire-and-forget simultaneously) to ensure the click is recorded before the browser unloads the page.

## AI Authorship Disclosure

- **Tools used:** LLM agent acting as feature-request-author
- **Scope:** Toàn bộ nội dung FR.
- **Human review:** Được operator review sau khi sinh.

*End of FR-LUNAR-022.*
