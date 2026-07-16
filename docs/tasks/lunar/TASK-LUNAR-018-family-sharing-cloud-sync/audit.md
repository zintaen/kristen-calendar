---
fr_id: TASK-LUNAR-018
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-180..185 range; RLS + consent + conflict rules applied)
---

## §1 - Verdict summary

TASK-LUNAR-018 specifies the optional cloud layer for family sharing and multi-device sync. Scope: 14 normative clauses in §1 (consent-gate, RLS, sharedWith array, invite flow JWT 48h, last-write-wins, conflict log, data minimization for death anniversaries, SyncClient debounce+retry, OccurrenceCache invalidation, DELETE endpoint PDPL, application-layer encryption noted, HTTP 409 fallback). 6 §2 paragraphs explaining the design decisions. §3 has the full TypeScript interfaces - `RemindersUpsertRow`, `SyncClient`, `resolveConflict` - and two full SQL migrations (0016 schema, 0017 RLS policies). 15 testable ACs. §5 has 3 test groups covering conflict-resolver, SyncClient consent-gate, and RLS integration. §8 provides the full SQL migration and a sample JSON payload. §10 has 12 failure rows. §11 has 8 implementation notes. Maps to PRD #4 (TASK-F04), #9 (Sync optional), #10 (sharedWith, consentFlags).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Cloud sync enabled without consent violates PDPL from 01/01/2026
Death-anniversary data (the name of the deceased) is culturally sensitive; sending it to the cloud without consent is a legal violation enforced immediately. Resolved: §1 #1, #2 consent-gate required; DEC-LUNAR-180; AC #1 checks at the network level; §6 states the check at the start of the push/pull function.

### ISS-002 - RLS using the service_role key on the client bypasses all security
If the client uses the service_role key, RLS is disabled - every user can read every other user's data. Resolved: §1 #3 and §3 `getSupabaseClient()` uses only the anon key + user JWT; DEC-LUNAR-181; AC #3 tests RLS with user B; an integration test in §5.

### ISS-003 - sharedWith stored as text/string without an index leads to slow RLS
An RLS policy using `ANY(shared_with)` full-scans without a GIN index on the array column. Resolved: §3 migration 0016 declares `shared_with UUID[]` with `CREATE INDEX USING GIN(shared_with)`; §11 notes the reason for choosing GIN.

### ISS-004 - The invite token can be used multiple times (replay attack)
Without a single-use mechanism, an invite link can be forwarded and multiple users can join. Resolved: §1 #6 token 48h + single-use (`jti` + `used_at`); DEC-LUNAR-185; AC #6 tests expiry, AC #7 tests reuse; the `invite_tokens` table has a `used_at` field in migration 0016.

### ISS-005 - Conflict resolution is undefined - the user loses data
Without a clear rule, conflicts can be handled differently across devices, leading to data loss. Resolved: §1 #7, #8 last-write-wins on `updated_at`; DEC-LUNAR-183; §3 `resolveConflict()` function; 3 unit tests in §5 including the delta < 1s case; AC #8, #9.

### ISS-006 - OccurrenceCache not invalidated after a pull leads to showing the wrong date
If the cache keeps old solar dates while the cloud has a new reminder, the notification computes the wrong solar date. Resolved: §1 #11 OccurrenceCache is cleared after every successful pull; AC #14; §11 notes this is the most common cause of the "wrong reminder date" bug.

### ISS-007 - No endpoint to delete cloud data - violates the PDPL right
PDPL (Law 91/2025/QH15) requires the right to delete personal data on request. Resolved: §1 #12 `DELETE /api/sync/account`; §3 `handleDeleteAccount()` and `SyncClient.deleteCloudData()`; AC #10, #11; §11 describes the confirm UI "All data on the cloud will be permanently deleted".

## §3 - Resolution

All 7 substantive concerns handled: consent-gate at the top of the function (ISS-001), RLS with anon+JWT and no service_role (ISS-002), a GIN index for `shared_with` (ISS-003), a single-use invite token with `jti`+`used_at` (ISS-004), clear last-write-wins with a delta < 1s unit test (ISS-005), OccurrenceCache invalidation after pull (ISS-006), a DELETE endpoint PDPL with a confirm UI (ISS-007). **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

The independent reviewer confirmed the cloud-infrastructure checklist. Pre-fix independent: 9/10. `RemindersUpsertRow` carries the full field-set of the TASK-004 model (lunarDay/lunarMonth/lunarYear/isLeapMonth/recurrence/leadTimes/notifyTime/channels/sharedWith/enabled/updatedAt) - NO drift. RLS `ENABLE ROW LEVEL SECURITY` + owner_all/member_select policy present; `shared_with UUID[]` + GIN index present; consent-gate `if (!this.hasCloudConsent()) return` at the top of push/pull present; conflict resolution last-write-wins clearly defined with `resolveConflict()`. No code-level defect.

- MINOR (not fixed, left open for coordination) - the migration `0016_family_sharing_schema.sql` collides on the number prefix `0016` with TASK-LUNAR-017's `0016_zns_send_log.sql` in the same directory `services/genie-api/supabase/migrations/`. The two files differ in content, same number -> must be renumbered (e.g. move TASK-017 up to 0020) when both merge. Post-fix: 10/10 (only 1 minor sequencing item that is not a single-contract concern).

## §4 - Readiness pass (2026-06-28)

No spec change. §3b confirmed `RemindersUpsertRow` carries the full TASK-004 field-set (including `recurrence`, `lunarDay`, `lunarMonth`, `lunarYear`, `isLeapMonth`, `leadTimes`, `notifyTime`, `channels`, `sharedWith`, `enabled`, `updatedAt`) - no drift. RLS, consent-gate, conflict resolution, GIN index, OccurrenceCache invalidation - all correct. Migrations 0016/0017 may collide in number with TASK-017 on merge (noted in §3b) - this issue depends on branch management, outside the scope of a single spec fix. Ready for handoff without further context.

*End of audit TASK-LUNAR-018.*
