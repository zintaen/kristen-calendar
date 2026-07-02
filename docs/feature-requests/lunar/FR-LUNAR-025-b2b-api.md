---
id: FR-LUNAR-025
title: "B2B API (Calendar as a Service) - API for businesses"
module: LUNAR
priority: COULD
status: ready_to_implement
verify: T
phase: P4
milestone: P4 · slice 4
slice: 4
owner: Stephen Cheng
created: 2026-07-01
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: [FR-LUNAR-001, FR-LUNAR-011]
blocks: []
source_pages:
  - BACKLOG.md
source_decisions:
  - DEC-025 (Expand into B2B, providing a lunar calendar computation API for partners)
language: typescript
service: packages/genie-api
new_files:
  - packages/genie-api/src/routes/b2b-api.ts
  - packages/genie-api/src/middlewares/api-key.ts
modified_files:
  - packages/genie-api/src/index.ts
  - supabase/migrations/20260701000000_b2b_api_keys.sql
allowed_tools:
  - Express/Fastify (genie-api)
  - Supabase Database
  - Redis (for rate limiting)
disallowed_tools:
  - Exposing the core WASM directly without an API gateway
effort_hours: 15
sub_tasks:
  - "3h: Design the schema for storing API Keys for B2B partners"
  - "3h: Write middleware to authenticate the API Key and count quota usage (Rate Limit)"
  - "4h: Expose the endpoints: /v1/lunar/convert, /v1/lunar/events"
  - "2h: Write API Documentation (Swagger/OpenAPI)"
  - "3h: Set up a monitoring dashboard for B2B API usage"
risk_if_skipped: "Missing the B2B segment. Vegetarian restaurants and flower shops have a strong need to send automated messages to customers on the full moon day, but they do not have an accurate lunar calendar API to build on their own."
---

# Feature Request

> Turn Your Will Into Real.

## Summary

Build a public REST API (B2B API) that provides a "Calendar as a Service". Partner businesses (vegetarian restaurants, retail chains, spiritual services) can register an API Key and call into Genie's system to: convert solar/lunar dates, get the list of lunar occasions in a month, and compute auspicious and inauspicious days (if available). This API will be charged on a SaaS model (Pay-as-you-go or Tiered Subscription).

## Problem

Many F&B businesses (especially vegetarian restaurants) want to run marketing campaigns (SMS, Zalo ZNS) that automatically remind customers to book a table on the first of the month and the full moon day each month. However, accurately computing the lunar full moon day to the Vietnam standard (UTC+7 timezone, Ho Ngoc Duc algorithm) is not simple. They need a stable API to call instead of rebuilding the core engine themselves.

## Customer Quotes

<untrusted_content source="b2b-survey"> "We use a CRM with SMS integration, but we always have to enter the full moon day by hand every month. If there were an API that returned the first of the month and the full moon day for next month, I would have the dev plug it right into the CRM." </untrusted_content>

## §1 - Description (Normative Clauses)

1. **MUST** create a `b2b_api_keys` table in Supabase containing `id`, `partner_name`, `api_key_hash`, `tier` (free/pro/enterprise), `monthly_quota`, and `is_active`.
2. **MUST** implement a middleware in `genie-api` that intercepts `/v1/b2b/*` routes, validates the `x-api-key` header against the database, and enforces rate limits (e.g., via Redis or Supabase RPC).
3. **MUST** expose exactly two initial endpoints: `GET /v1/b2b/lunar/convert` (solar to lunar & vice versa) and `GET /v1/b2b/lunar/events?month=YYYY-MM`.
4. **MUST** return responses in strict JSON format matching the OpenAPI 3.0 specification.
5. **MUST** log all B2B API requests (metadata only, no PII payloads) to a `b2b_usage_logs` table for billing and throttling purposes.
6. **SHOULD** return a `429 Too Many Requests` HTTP status code immediately if a partner exceeds their monthly quota or burst rate limit.
7. **MUST** ensure the core engine (`amlich-core`) computes these requests deterministically and statelessly.
8. **MUST NOT** expose endpoints that mutate internal user data; this API is strictly a read-only computational service.

## §2 - Why this design

**Why a separate API Key table instead of Supabase Auth (§1 #1)?** 
B2B integrations are Server-to-Server (M2M). Supabase JWTs are designed for client-side user sessions and expire frequently. A long-lived, revokable API Key (hashed in DB) is the standard for M2M APIs (like Stripe or Twilio).

**Why rate limiting is critical (§1 #6)?**
Computing lunar calendars (especially generating a whole year's events) is CPU-bound. Without strict rate limiting, a single partner could DDoS the `genie-api` server, affecting the mobile app's performance.

## §3 - API contract

```json
// GET /v1/b2b/lunar/events?month=2026-08
// Headers: x-api-key: b2b_test_12345
{
  "status": "success",
  "data": [
    {
      "solar_date": "2026-08-13",
      "lunar_date": "2026-07-01",
      "event_name": "Mùng 1",
      "is_major": true
    },
    {
      "solar_date": "2026-08-27",
      "lunar_date": "2026-07-15",
      "event_name": "Rằm Tháng Bảy (Vu Lan)",
      "is_major": true
    }
  ],
  "meta": {
    "quota_remaining": 9998,
    "compute_time_ms": 12
  }
}
```

## §4 - Acceptance criteria

1. **Authentication** - When a request is made to `/v1/b2b/lunar/convert` without an `x-api-key` header, the server returns `401 Unauthorized`.
2. **Quota Enforcement** - When a partner's `b2b_usage_logs` count exceeds their `monthly_quota` for the current month, subsequent requests return `429 Too Many Requests`.
3. **Accuracy** - When requesting events for August 2026, the API correctly returns the Vu Lan festival (15th of the 7th Lunar Month).
4. **Billing Telemetry** - When a successful 200 OK request is served, exactly one row is written to `b2b_usage_logs` with the partner ID and endpoint path.

## §5 - Verification

```typescript
// test/routes/b2b-api.test.ts
import request from 'supertest';
import { app } from '../../src/index';

describe('B2B API endpoints', () => {
  it('MUST reject requests without valid API Key (401)', async () => {
    const res = await request(app).get('/v1/b2b/lunar/events?month=2026-08');
    expect(res.status).toBe(401);
  });

  it('MUST return 429 if quota exceeded', async () => {
    // Mock DB to return 0 quota remaining
    const res = await request(app)
      .get('/v1/b2b/lunar/convert?date=2026-08-15')
      .set('x-api-key', 'valid_test_key_with_0_quota');
    
    expect(res.status).toBe(429);
  });
});
```

## §6 - Implementation skeleton

```typescript
// middlewares/api-key.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');
  if (!apiKey) return res.status(401).json({ error: "Missing x-api-key header" });

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const partner = await DB.getPartnerByApiKeyHash(hash);
  
  if (!partner || !partner.is_active) {
    return res.status(401).json({ error: "Invalid or revoked API Key" });
  }

  const usage = await DB.getCurrentMonthUsage(partner.id);
  if (usage >= partner.monthly_quota) {
    return res.status(429).json({ error: "Monthly quota exceeded" });
  }

  // Inject partner info for downstream logging
  req.partner = partner; 
  next();
}
```

## §7 - Dependencies

- **Upstream:** FR-LUNAR-001 (Core Lunar Engine - `amlich-core`).
- **Upstream:** FR-LUNAR-011 (API Backend initialization).

## §8 - Example payloads

**Audit Log Row:**
```json
{
  "event": "b2b.api_request",
  "partner_id": "00000000-0000-0000-0000-000000000002",
  "timestamp": "2026-08-14T01:00:05Z",
  "payload": {
    "endpoint": "/v1/b2b/lunar/events",
    "status_code": 200,
    "compute_ms": 15
  },
  "trace_id": "5b23d9161a03f8373b..."
}
```

## §9 - Open questions

- `Deferred: P5` - Self-serve developer portal. For P4, API keys will be generated manually by admins and emailed to partners.

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| API Key compromised | Partner reports unauthorized usage | Quota drained rapidly | Admin revokes key manually, regenerates new hash |
| Redis (Rate Limiter) goes down | DB connection timeout | All requests fail or bypass limits | Fallback to in-memory rate limiter or fail-open depending on risk appetite |
| Partner spams API maliciously | WAF/Cloudflare flags 429s | 429 returned | Cloudflare automatically IP bans the attacker |
| Core engine throws exception | `amlich-core` panic | 500 Internal Server Error | Express error handler catches, returns sanitized 500 JSON, alerts Sentry |
| Date parsing fails | Invalid `month` parameter | 400 Bad Request | Return explicit error: "month must be YYYY-MM" |
| Billing DB write fails | `logUsage` fails post-request | Free compute given | Accept minor revenue leakage; do not block response on logging |
| Timezone ambiguity | Partner expects PST, we return UTC+7 | Logic bug | Document explicitly that all calculations are strictly UTC+7 (Vietnam standard time) |
| SHA256 collision | Highly improbable | Auth bypass | Use secure UUIDs for keys |
| Response exceeds payload size | Requesting 100 years of events | 413 Payload Too Large | Enforce hard limit (e.g., max 1 year per request) in schema validation |
| API Gateway timeout | Lambda execution > 10s | 504 Gateway Timeout | Optimize Core engine |

## §11 - Implementation notes

- **Key Generation:** Keys should be formatted like `gn_live_xxxxxxxxxxxxxxxxxxxxxxxx`, allowing regex scanning for leaked secrets in GitHub repos.
- **Fail-Open vs Fail-Closed:** If the Redis usage counter goes down, the API MUST "fail-closed" (return 503) or risk severe financial/resource drain if a partner gets stuck in an infinite retry loop.
- **API Versioning:** The URL MUST include `/v1/`. Breaking changes will require spinning up `/v2/`.

## AI Authorship Disclosure

- **Tools used:** LLM agent acting as feature-request-author
- **Scope:** The entire FR content.
- **Human review:** Reviewed by the operator after generation.

*End of FR-LUNAR-025.*
