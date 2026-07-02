---
fr_id: FR-LUNAR-020
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; DEC-LUNAR-200..205 range; server-side entitlement + rate-limit + webhook HMAC rules applied)
---

## §1 - Verdict summary

FR-LUNAR-020 specifies the three-tier freemium mechanism (Free/Premium/Family) and server-side entitlement gating for "Genie Am Lich". Scope: 13 normative clauses in §1 (immutable TIER_FEATURES, server-side gate required, cache 24h TTL re-validate, Genie rate-limit 0/50/100 per month, familySharing gate Family-only, webhook HMAC verification, do not build payment UI, full GET /api/entitlement, UpgradePrompt with concrete benefits, lock icon instead of hiding the UI, track the conversion rate, graceful 30-day downgrade, single-use 7-day trial). 6 §2 paragraphs explaining the design decisions. §3 has full TypeScript - `Tier`, `EntitlementRecord`, `FeatureGate`, `TIER_FEATURES`, `EntitlementClient`, webhook payload types - and migration SQL 0019 with RLS. 15 testable ACs. §5 has 5 test groups: immutable TIER_FEATURES, `isFeatureAllowed`, rate-limiter, webhook HMAC, EntitlementClient cache TTL. §8 has the SQL migration, 4 sample JSON payloads (Free, Family, 403, 429). §10 has 10 failure rows. §11 has 7 implementation notes. Maps to PRD #14 (Phase 3 monetization), #15 (Success Metrics - conversion rate >= 3%).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Client-trusted entitlement: editing localStorage is enough to get Premium for free
This is a basic security hole for any freemium. Resolved: §1 #2 the gate MUST be server-side in every handler; DEC-LUNAR-201; the §6 pattern calls `getEntitlement(userId)` from the database before every action; AC #7 tests exactly this scenario; §5 test exceeding the quota at the server.

### ISS-002 - No immutable definition for the tier - the logic drifts over time
If each file conditions the tier in its own way, changing a quota value gets missed in some places. Resolved: §3 `TIER_FEATURES: Record<Tier, FeatureGate>` is the single source of truth; §11 stresses "MUST NOT hard-code tier checks in different places"; §5 tests `TIER_FEATURES` directly; DEC-LUNAR-200 states the definition is immutable.

### ISS-003 - The payment webhook has no HMAC verification - anyone grants Premium for free
If the webhook only accepts a POST without verifying the signature, the attack is trivial. Resolved: §1 #6 HMAC/JWT verification required before processing; §3 `AppStoreWebhookPayload.signedTransactionInfo` (JWS) and `ZaloPayWebhookPayload.mac` (HMAC-SHA256); §5 test a wrong webhook MAC -> HTTP 401; AC #8, #9, #10; disallowed_tools states it clearly.

### ISS-004 - The Genie rate-limit has no atomic mechanism: a race condition at the quota threshold
If two concurrent requests both check "used 49/50" both are allowed, actually using 51 calls. Resolved: §3 `checkAndIncrementGenieUsage()` uses `INSERT ... ON CONFLICT DO UPDATE` atomically; §11 notes this technique; §10 row "Race condition: 2 concurrent Genie calls" states the fix.

### ISS-005 - EntitlementClient cache in localStorage: the user can edit it to bypass
A cache in localStorage can be edited like any other client storage. Resolved: §3 `EntitlementClient` states clearly "cache in memory (not localStorage)"; §11 explains why; AC #7 checks that editing localStorage does NOT bypass the server gate.

### ISS-006 - No graceful downgrade: the user loses Premium data the moment it expires
Abrupt expiry losing sharedWith and Genie history creates a bad experience and can lead to charge-backs. Resolved: §1 #12 graceful 30-day downgrade keeps data; §3 `gracePeriodEndsAt` in `EntitlementResponse`; §6 `getEntitlement()` auto-downgrade logic with the comment "keep data for 30 days"; AC #14; §11 notes a cron job to notify in advance.

## §3 - Resolution

All 6 substantive concerns handled: a server-side gate with an explicit pattern in §6 (ISS-001), `TIER_FEATURES` as the single source of truth (ISS-002), HMAC JWS + HMAC-SHA256 verification before processing the webhook (ISS-003), an atomic increment preventing the race condition at the quota threshold (ISS-004), cache in memory not localStorage (ISS-005), a graceful 30-day downgrade keeping data (ISS-006). **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

The independent reviewer confirmed the entitlement security axis (a BLOCKER-class checklist). Pre-fix independent: 9/10. Server-side gate: the §6 pattern `getEntitlement(userId)` reads from the DB, `isFeatureAllowed(tier, ...)` before every action; the client does NOT decide the tier (AC #7 checks editing `localStorage.tier` still 403). Webhook: verify JWS (App Store) + HMAC-SHA256 (Zalo Pay) BEFORE granting entitlement; a wrong MAC -> 401 (AC #9/#10). Atomic quota: `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1` prevents the race at the threshold. `user_entitlements` has RLS + `server_update_entitlement WITH CHECK (FALSE)`. No client-trusted gate -> NO BLOCKER.

- NIT (not fixed) - FR-020's migration is `0019_entitlements.sql`; because FR-017 and FR-018 both create `0016_*`, the 0016-0019 sequence needs consistent renumbering when the whole P3 branch merges (see the number-collision note in the FR-017/018 audits). `genie_usage_monthly` is declared in migration 0019 but not listed in FR-020's frontmatter `new_files` (only the overall .sql file is listed) - cosmetic. Post-fix: 10/10.

## §4 - Readiness pass (2026-06-28)

Confirmed the three security/commercial axes:

1. Server-side entitlement: AC #7 ("editing localStorage.tier still 403") + §5 test `describe("rate-limiter")` + the §6 pattern `getEntitlement(userId)` from the DB before every action - present.
2. Webhook verify HMAC: AC #8/#9/#10 (AppStore JWS + ZaloPay MAC) + §5 test `describe("webhook - verify HMAC")` - present.
3. Atomic quota: AC #2/#3 (rate-limit 429 after 50/100 calls) + §5 test `describe("rate-limiter")` + §11 states `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1` - present.
4. Small fix: the sub_tasks "migration 0019" changed to "migration 0020_entitlements.sql" to match the actual file name.

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours unchanged. Ready for handoff without further context.

*End of audit FR-LUNAR-020.*
