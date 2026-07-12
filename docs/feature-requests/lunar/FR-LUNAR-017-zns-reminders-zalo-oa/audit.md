---
fr_id: FR-LUNAR-017
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-170..175 applied; ZNS window, token refresh, idempotency, template rules encoded)
---

## §1 - Verdict summary

FR-LUNAR-017 specifies the serverless ZNS sender for "Genie Am Lich". Scope: 14 BCP-14 clauses in §1 (send only to people who provided a number via the Zalo Mini App + consented, template <= 400 characters >= 1 parameter, ban advertising, window 06:00-22:00 Asia/Ho_Chi_Minh, range <= 7 days, OA token auto-refresh < 10 minutes to expiry, CRON_SECRET auth, serverless cron <= 15 minutes, amlich-core computes dates, log zns_send_log, handle error codes and no immediate retry, support distributors, fill all template parameters, idempotency). 7 §2 rationale blocks. §3 has the full interfaces (OATokenPair, SendWindowResult, ZNSPayload, ZNSSendResult, SchedulerReminder, CronRunResult), functions `isWithinHourWindow`, `isWithinDayRange`, `canSendNow`, `sendZNS`, `runZNSCron`, the Vercel Function handler. 14 acceptance criteria. §5 has tests for the window (4 hour-boundary tests, 4 day-boundary tests, 1 combined test, 1 template length check), the scheduler (3 tests), and oa-token (1 test). §6 has the migration SQL `zns_send_log` and the idempotency pattern. §10 has 13 failure rows. §11 has 7 implementation notes. Maps to PRD FR-B08, §11 (ZNS architecture), Key Findings 4, Caveats (ZNS price/rules).

## §2 - Findings (all resolved during authoring)

### ISS-001 - The send window is computed in UTC only, ignoring the Asia/Ho_Chi_Minh conversion
If `isWithinHourWindow` uses `new Date().getHours()` (UTC server time), the 06:00-22:00 window is computed wrong when the server is in AWS us-east or Cloudflare - it could send at 2:00 am VN. Resolved: §1 #4 + §3 `isWithinHourWindow` uses `toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })`; AC #1 tests with specific UTC timestamps; §11 note 3.

### ISS-002 - The OA access token expires mid-cron -> the whole batch fails quietly
Without a proactive refresh mechanism, a cron run misses reminders for all users. Resolved: §1 #6 checks expiry before each cron batch; `ensureFreshToken` refreshes when < 10 minutes remain; `oa-token.ts` in §3; AC #8; test "refresh when 5 minutes remain" in §5.

### ISS-003 - Cron runs multiple times (Vercel retry) sends duplicate ZNS -> over-billing
Vercel Cron can call the endpoint more than once on timeout/retry; each successful send costs Zalo ~200 VND -> it could send twice. Resolved: §1 #14 idempotency required; §6 pattern `SELECT FROM zns_send_log WHERE reminder_id AND date = today` before sending; AC #7; §10 row "Duplicate send due to cron retry".

### ISS-004 - getPhoneNumber returns a token not the real number -> stored wrong into User.phone
If the "token" from `getPhoneNumber` is stored directly into `User.phone` and sent straight to ZNS, Zalo replies "invalid_phone". Resolved: §1 #1 states clearly to send only to "the phone number provided"; §11 note 1 describes the token-exchange process via the OA API; DEC-LUNAR-163 (from FR-016) is referenced; §8 payload has the real number "0909123456".

### ISS-005 - A ZNS template with advertising content or missing parameters -> rejected by Zalo/OA locked
If the template is not approved or has pure advertising, Zalo may reject the send and/or lock the OA. Resolved: §1 #2 + #3 tight constraints (approved, <= 400 characters, >= 1 parameter, ban advertising); DEC-LUNAR-171; §8 sample template of 84 characters with 4 parameters; AC #13 tests length and parameters; §5 "default template <= 400 characters".

### ISS-006 - No CRON_SECRET auth -> anyone can trigger /api/zns to send bulk ZNS
If the cron endpoint is exposed public without authentication, it can be called arbitrarily, spending ZNS money in bulk and violating Zalo rules. Resolved: §1 #7 + §3 handler checks `Authorization: Bearer CRON_SECRET`; AC #12 tests 401 on a wrong header; DEC-LUNAR-170; NFR-Security.

### ISS-007 - No zns_send_log -> cannot report cost, debug errors, or prevent duplicate sends
Without a log table: (a) no ZNS cost report, (b) cannot debug whose "invalid_phone" error, (c) idempotency (ISS-003) cannot be done. Resolved: §1 #10 requires logging each send; §3 `ZNSSendResult` has `zaloMessageId`; §6 migration SQL `0016_zns_send_log.sql` with full columns; AC #9 and #10 check the insert into the log on both success and error; §10 row "OA token leakage into logs" noted additionally.

## §3 - Resolution

All 7 substantive issues resolved during authoring. Correct ICT time (ISS-001) and token auto-refresh (ISS-002) are high-difficulty implementation traps; idempotency (ISS-003) and phone token vs. real number (ISS-004) are common mistakes in Zalo integration; template compliance (ISS-005) and CRON_SECRET (ISS-006) are security constraints; and full logging (ISS-007) is the basis for all cost reporting and debugging. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

The independent reviewer (who did not write the spec) re-ran a comparison of §3 against the upstream FR-LUNAR-001/004 contract. Pre-fix independent: 7/10. Three defects found and fixed, all in `zns-scheduler.ts` §3:

- MAJOR - drift in the return type of `convertLunar2Solar`. FR-001 declares `convertLunar2Solar(...): SolarDate` with `SolarDate = [day, month, year]` (tuple) and a sentinel `[0,0,0]` when the leap month does not match (NEVER returns null). But the scheduler (a) `if (!solarDate)` - a tuple is always truthy, the sentinel `[0,0,0]` is also truthy -> an invalid occurrence is NOT skipped, and (b) reads `solarDate.year/.month/.day` - undefined on a tuple -> `new Date("undefined-undefined-...")` = Invalid Date. Runtime consequence: garbage occurrences slip past the window check. Fixed: destructure `[gd, gm, gy]`, check `gd===0 && gm===0 && gy===0`, build the ISO with zero-pad.
- MAJOR (same root) - `ngay_duong` in templateData reads `eventDate.getDate()/getMonth()/getFullYear()` by the server's runtime TZ -> off by 1 day on a UTC server, violating the requirement to lock to Asia/Ho_Chi_Minh. Fixed: build `ngay_duong` directly from the ICT tuple `${dd}/${mm}/${gy}`.
- MINOR - the §10 row "convertLunar2Solar returns null" describes the wrong detection (the engine does not return null). Fixed to the sentinel `[0,0,0]`.

Recorded (not fixed, left open for the founder): `SchedulerReminder` lacks the FR-004 model's `recurrence` field; the cron currently computes only 1 occurrence/year so MONTHLY reminders (Ram/Mung Mot, recurrence=MONTHLY) would not repeat the correct 12 times/year server-side -> propose adding `recurrence` + a month-expansion loop, or clearly limiting ZNS to ANNUAL/ONCE in §1. The migration `0016_zns_send_log.sql` collides in number with FR-018's `0016_family_sharing_schema.sql` (same directory `services/genie-api/supabase/migrations/`) - must be renumbered on merge. Post-fix: 9.5/10.

## §4 - Readiness pass (2026-06-28)

The MONTHLY recurrence issue left open in §3b is fully resolved per the founder's decision (full commercial product):

1. `SchedulerReminder` added the field `recurrence: "MONTHLY" | "ANNUAL" | "ONCE"`.
2. The function `candidateLunarYears()` was added to `zns-scheduler.ts`: MONTHLY generates the list of lunar months within the scan window (the current month + the coming months for both the current year and next year); ANNUAL/ONCE scan by year as before.
3. `runZNSCron` was refactored to loop over `candidateLunarYears` instead of just 1 fixed year.
4. §1 #15 (MUST clause MONTHLY) + AC #15 + a MONTHLY test in §5 were added.
5. The §9 open question about MONTHLY is marked RESOLVED with the note "BACKLOG decision 8 needs updating".
6. The `validReminder` fixture in §5 added `recurrence: "ANNUAL"`.

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours unchanged. Ready for handoff without further context.

*End of audit FR-LUNAR-017.*
