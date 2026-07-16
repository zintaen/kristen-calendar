---
id: TASK-LUNAR-021
title: "Proactive AI (Genie 2.0) - Automated cron check and smart ZNS push for major occasions"
module: LUNAR
priority: MUST
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
depends_on: [TASK-LUNAR-015, TASK-LUNAR-017]
blocks: []
source_pages:
  - BACKLOG.md
source_decisions:
  - DEC-021 (Automatically send personalized ZNS greetings through the Claude proxy on major occasions)
language: typescript
service: packages/genie-api
new_files:
  - packages/genie-api/src/workers/proactive-zns.ts
  - packages/genie-api/src/services/zalo-zns.ts
modified_files:
  - packages/genie-api/src/index.ts
allowed_tools:
  - Claude API
  - Zalo OA ZNS API
  - Supabase Edge Functions / Cron
disallowed_tools:
  - Local polling in client app (must be server-side)
effort_hours: 15
sub_tasks:
  - "2h: Design the data model for user opt-in to Proactive AI"
  - "3h: Integrate the Zalo ZNS API service"
  - "3h: Configure the cron worker to scan users and call the Claude API"
  - "4h: Handle rate limits, error handling, retry logic"
  - "3h: Unit tests and integration tests for the worker"
risk_if_skipped: "Missing the ability to proactively send personalized notifications will reduce Genie's engagement and personalization. Users would only interact when they actively open the app, missing the core value of a smart reminder 'Genie'."
---

# Task

> Turn Your Will Into Real.

## Summary

Implement Proactive AI (Genie 2.0) by setting up a server-side cron job on `genie-api`. This cron scans upcoming major lunar occasions (e.g., full moon, first of the month, Tet holidays), finds users who have opted in, calls the Claude proxy to generate a personalized greeting, and pushes it via Zalo ZNS.

## Problem

Users today only receive local push notifications (per TASK-LUNAR-004) with static content. They want Genie to proactively engage with personalized content, smartly suggesting how to prepare offerings via Zalo ZNS, like a real virtual assistant.

## Customer Quotes

<untrusted_content source="user-feedback"> "The app reminding me of the full moon day is nice, but the content keeps repeating. It would be so convenient if it messaged me on Zalo to greet me and remind me to buy offering supplies too." </untrusted_content>

## §1 - Description (Normative Clauses)

1. **MUST** add `proactive_zns_opt_in` (boolean) to the `user_settings` table. Defaults to `false`.
2. **MUST** implement a Supabase Cron Worker (or Cloudflare Worker) that executes daily at 08:00 AM VN time (UTC+7).
3. **MUST** query users where `proactive_zns_opt_in = true` and cross-reference with the Lunar engine to determine if T+1 is a major event (e.g., 1st or 15th of the Lunar Month).
4. **MUST** call the Claude proxy (`TASK-LUNAR-015`) to generate a personalised message for each user, providing user metadata (name, age, past interactions) without including PII like phone numbers.
5. **MUST** send the generated message via Zalo ZNS API using an approved ZNS template.
6. **MUST** implement a batching mechanism for ZNS API calls (max 50 requests/sec) to avoid rate limits.
7. **MUST** implement a retry mechanism (max 3 attempts with exponential backoff) for Claude API or ZNS API transient failures.
8. **MUST** log all ZNS delivery statuses to `genie.action_log` with phone numbers strictly redacted (e.g., `09****123`).
9. **SHOULD** fallback to a static message payload if the Claude API times out after 5 seconds, ensuring the notification is still delivered.
10. **MUST** ensure the worker is idempotent (if re-run for the same date, it must not send duplicate messages to the same user).

## §2 - Why this design

**Why use server-side cron instead of Capacitor background fetch (§1 #2)?** 
Local background tasks on iOS/Android are highly constrained and unreliable. To guarantee ZNS message delivery at exactly 08:00 AM, a server-side cron orchestrator is required.

**Why batching ZNS requests (§1 #6)?**
Zalo OA has strict API rate limits (typically 50 req/sec). Processing users sequentially is too slow, while `Promise.all` without chunks will hit rate limits.

**Why Claude fallback (§1 #9)?**
LLM latency can spike or the API can go down. The core value is the reminder; personalization is a bonus. We must never drop the reminder just because the AI is slow.

## §3 - API contract

```typescript
// ZNS Payload Schema
export interface ZnsPayload {
  phone: string; // Will be mapped to Zalo user ID or raw phone
  template_id: string;
  template_data: {
    user_name: string;
    event_name: string;
    ai_message: string;
    action_link: string;
  };
  tracking_id: string; // for idempotency
}

// Supabase Edge Function / Cron interface
export interface ProactiveZnsWorkerConfig {
  batchSize: number; // default 50
  maxRetries: number; // default 3
  claudeTimeoutMs: number; // default 5000
}

export async function processProactiveZnsBatch(date: Date, config: ProactiveZnsWorkerConfig): Promise<void>;
```

## §4 - Acceptance criteria

1. **Tier 1 hits first** - When a user has `proactive_zns_opt_in = true` and T+1 is a lunar event, the cron job successfully generates a personalized message via Claude and dispatches it via ZNS.
2. **Rate Limit Handling** - When 1000 users are eligible, the worker batches calls to Zalo API such that it never exceeds 50 requests per second.
3. **LLM Fallback** - When Claude API takes > 5000ms, the system falls back to a predefined static string without failing the ZNS dispatch.
4. **Idempotency** - When `processProactiveZnsBatch` is called twice for the same `date`, it queries the database and sends 0 duplicate ZNS messages.
5. **PII Redaction** - When writing to `genie.action_log`, the `phone` field is redacted to mask middle digits.

## §5 - Verification

```typescript
// test/workers/proactive-zns.test.ts
import { processProactiveZnsBatch } from '../../src/workers/proactive-zns';
import { ZaloZnsService } from '../../src/services/zalo-zns';

describe('Proactive ZNS Worker', () => {
  it('MUST NOT send duplicate messages on double invocation (Idempotency)', async () => {
    // Arrange
    const mockZnsService = jest.spyOn(ZaloZnsService, 'sendTemplate').mockResolvedValue(true);
    const date = new Date('2026-08-15T01:00:00Z');
    
    // Act
    await processProactiveZnsBatch(date, { batchSize: 50, maxRetries: 1, claudeTimeoutMs: 5000 });
    const firstCallCount = mockZnsService.mock.calls.length;
    
    await processProactiveZnsBatch(date, { batchSize: 50, maxRetries: 1, claudeTimeoutMs: 5000 });
    const secondCallCount = mockZnsService.mock.calls.length;

    // Assert
    expect(firstCallCount).toBeGreaterThan(0);
    expect(secondCallCount).toBe(firstCallCount); // No new calls
  });

  it('MUST fallback to static message if Claude times out', async () => {
    // Implement mock Claude API with 6000ms delay
    // Assert ZnsPayload.template_data.ai_message === "Chúc bạn ngày Rằm an lành!"
  });
});
```

## §6 - Implementation skeleton

The cron worker will be deployed as a Supabase Edge Function triggered by pg_cron.

```typescript
export async function processProactiveZnsBatch(targetDate: Date, config: ProactiveZnsWorkerConfig) {
    const eligibleUsers = await fetchEligibleUsers(targetDate);
    
    // Chunking for rate limits
    for (let i = 0; i < eligibleUsers.length; i += config.batchSize) {
        const batch = eligibleUsers.slice(i, i + config.batchSize);
        
        await Promise.all(batch.map(async (user) => {
            if (await hasAlreadySent(user.id, targetDate)) return;

            let aiMessage = "Chúc bạn một ngày an lành!"; // Fallback
            try {
                aiMessage = await withTimeout(callClaude(user), config.claudeTimeoutMs);
            } catch (e) {
                console.warn(`Claude timeout for user ${user.id}, using fallback.`);
            }

            const payload: ZnsPayload = {
                phone: user.phone,
                template_id: "LUNAR_EVENT_1",
                template_data: { user_name: user.name, event_name: "Rằm", ai_message: aiMessage, action_link: "https://zalo.me/s/..." },
                tracking_id: `${user.id}_${targetDate.toISOString().split('T')[0]}`
            };

            await ZaloZnsService.sendTemplate(payload);
            await logToAudit(user.id, redactPhone(user.phone), "ZNS_SENT");
            await markAsSent(user.id, targetDate);
        }));
        
        // rudimentary rate limiting delay
        await new Promise(res => setTimeout(res, 1000));
    }
}
```

## §7 - Dependencies

- **Upstream:** TASK-LUNAR-015 (Claude proxy for AI text generation).
- **Upstream:** TASK-LUNAR-017 (Zalo Mini App integration for OA privileges).
- **Downstream:** TASK-LUNAR-022 (O2O Commerce - injecting affiliate links into the ZNS template).

## §8 - Example payloads

**Audit Log Row (Redacted PII):**
```json
{
  "event": "proactive.zns_sent",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "timestamp": "2026-08-14T01:00:05Z",
  "payload": {
    "target_date": "2026-08-15",
    "template_id": "LUNAR_EVENT_1",
    "phone_redacted": "09****456",
    "claude_fallback_used": false
  }
}
```

## §9 - Open questions

- `All resolved.` (Wait on Zalo OA template approval, but technical spec is clear).

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Claude API 500 error | `callClaude()` throws | Catch block triggers | Fallback to static message |
| Claude API timeout (>5s) | `withTimeout()` throws | Catch block triggers | Fallback to static message |
| Zalo ZNS API 429 Rate Limit | HTTP 429 response | Worker throws | Exponential backoff retry (max 3) |
| Zalo ZNS API 500 error | HTTP 5xx response | Worker throws | Exponential backoff retry, alert on Sentry |
| User phone missing/invalid | `sendTemplate()` fails Zalo validation | ZNS rejects | Log `proactive.zns_failed`, do not retry |
| DB connection fails during markAsSent | `markAsSent()` throws | Row not saved | Idempotency might fail on retry. Need transaction block for ZNS send + DB write if possible, or accept rare dupe risk. |
| pg_cron fails to trigger | No audit logs at 08:05 AM | Batch missed | Manual trigger via CLI `cyberos-app trigger-zns` |
| Invalid AI JSON output | JSON parse fails | Catch block triggers | Fallback to static message |
| ZNS template rejected by Zalo | HTTP 400 with specific code | ZNS rejects | Log `template_rejected`, requires PM action |
| User opts out mid-batch | `proactive_zns_opt_in` is false | N/A (query happens once) | Sent anyway for this batch. Will not trigger next time. |

## §11 - Implementation notes

- **PII Scrubbing:** The `redactPhone` utility must replace all but the first two and last three digits with `*`. This must happen *before* calling the logging service.
- **Transactions:** It is difficult to wrap an external HTTP call (Zalo ZNS) in a DB transaction reliably without holding connections open for too long. We mark the tracking ID in DB *after* sending. If the DB write fails, a subsequent retry might send a duplicate ZNS. The risk of occasional duplicate ZNS is acceptable compared to holding Postgres transactions open across network calls.
- **Zalo OA Account Balance:** Ensure there is a monitoring alert for Zalo OA balance, as ZNS messages cost money.

## Sales/CS Summary

Genie is now smarter than ever! Turn on Genie Proactive to receive personalized reminders and greetings via Zalo ahead of important lunar occasions.

## AI Authorship Disclosure

- **Tools used:** LLM agent acting as task-author
- **Scope:** The entire task content.
- **Human review:** Reviewed by the operator after generation.

*End of TASK-LUNAR-021.*
