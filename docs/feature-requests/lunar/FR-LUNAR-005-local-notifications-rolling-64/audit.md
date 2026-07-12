---
fr_id: FR-LUNAR-005
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-005 specifies the local notification scheduler using the rolling-64 strategy on iOS. Scope: 16 §1 clauses (removeAll + reschedule the 64 nearest, read Occurrence from FR-LUNAR-004 without computing dates itself, app-open is the primary trigger and BGAppRefreshTask is best-effort, lead-time counts slots, userInfo deep-link, horizon 6-12 months + slotsDropped, fairness across reminders, deterministic idempotent id, requestPermissions, separate planner/adapter, web push auxiliary, lock +07:00, drop past occurrences, getPlanDiagnostics). 7 §2 paragraphs. §3 has planner/adapter/scheduler/deeplink + BGRefresh.swift. 14 ACs. §5 has 9 vitest tests including a 100-reminder-budget + cancel-before-schedule ordering. §10 lists 14 failure lines. §11 has 7 notes. Maps to PRD FR-B05, section 11, Key Findings 5/6, Caveats iOS background.

## §2 - Findings (all resolved during authoring)

### ISS-001 - iOS silently drops notifications beyond 64
The system keeps only the 64 earliest pending. Resolved: §1 #1 removeAll + reschedule the 64 nearest + DEC-LUNAR-050; AC #1/#2.

### ISS-002 - Treating BGAppRefreshTask as a guaranteed channel will miss reminders
iOS does not promise on-time background runs. Resolved: §1 #3 app-open is the primary trigger, BG best-effort + DEC-LUNAR-051; §10 line 3.

### ISS-003 - Lead-time silently exceeds the budget
Resolved: §1 #4 each (occurrence x leadTime) consumes a slot, counted at the notification level + DEC-LUNAR-052; AC #4.

### ISS-004 - User taps a notification and opens the wrong screen
Resolved: §1 #5 userInfo carries reminderId + occurrenceDate -> deep-link + DEC-LUNAR-053; AC #5.

### ISS-005 - One reminder swallows all 64 slots
Resolved: §1 #7 a fairness pass takes the nearest occurrence of each reminder first; AC #8.

### ISS-006 - The scheduler cannot be tested because it needs a device
Resolved: §1 #10 separate a pure-computation planner + a thin adapter + DEC-LUNAR-056; §5 9 tests run in Node.

### ISS-007 - Web push is mistaken for the primary channel on iPhone
iOS Web Push is only 16.4+ A2HS, low reach. Resolved: §1 #11 treat web push as auxiliary + DEC-LUNAR-055; AC #13.

## §3 - Resolution

The seven core issues are handled: the 64 ceiling, the reschedule trigger, lead-time counting, deep-link, fairness, testability, the role of web push. The rolling-64 algorithm is written precisely: removeAllPendingNotificationRequests then schedule the 64 nearest occurrences within 6-12 months, lead-time counts against the budget, userInfo carries reminderId. The pure-computation planner is separated from the Capacitor adapter so CI can assert the limit. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **9/10**. The rolling-64 math is correct at the points the brief required checking: the budget CUTS total notifications at 64 (not 64 x leadTimes), `slotsDropped = max(0, total-64)` with `total` counted AFTER lead-time fan-out so `scheduled + slotsDropped = total` is consistent (AC #12), and the plan keeps the nearest first (AC #1/#2). iOS-drop-beyond-64 is correctly avoided.

- **MAJOR (latent) - horizon coverage depends on an unspecified `count`.** The skeleton uses `count: enoughFor(horizon, r)` (an undefined helper). If the `count` passed to `nextOccurrences` for a reminder is smaller than the number of occurrences within the horizon, the planner silently misses that reminder's near-future notifications and breaks the "64 nearest" guarantee - but no AC catches it. **Fixed:** §1 #6 adds a normative condition: `count` per reminder MUST cover `horizonMonths` (MONTHLY `>= ceil(horizonMonths)+1`) before cutting to 64; turns the silent risk into a correctness condition.
- **MINOR (accepted) - fairness vs "absolute 64 nearest".** §1 #7 takes 1 occurrence/reminder first, then fills globally, so when #reminders > 64 the retained set is NOT the absolute 64 smallest fireAtLocal (a deliberate trade so no reminder is forgotten). AC #2 still holds because it asserts the order WITHIN the retained set, not the selection criterion. Noted, not fixed - matches the §1 #7 design.
- **MINOR - §5 traceability gap.** AC #8 (fairness/remindersCovered), AC #12 (accurate diagnostics), AC #13 (web push auxiliary), AC #14 (fellBack carries the flag) have no matching test in §5 (only 8 tests, covering AC #1-#7/#9-#11). Recorded for the implementation pass to add tests; no contract change.

Post-fix score: **10/10** (latent major fixed).

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

Fixed in FR-LUNAR-005.md:

1. **Import getPlanDiagnostics** - added `getPlanDiagnostics` to the §5 test import block (previously the AC #12 test called this function without importing it -> compile error).
2. **AC #8/#12/#13/#14 have tests** - §5 now has all 14 tests, covering all 14 ACs. The "traceability gap" bubble in the §4 audit is filled.
3. **CONTRACT alignment** - FR-005 imports `Reminder, Occurrence` from `@cyberskill/amlich-core` with the correct names; `planSchedule` takes `Reminder[]` and `nowUtcMs: number` (ms UTC, different from `todayInHCM(now?: Date)` - correct design because the scheduler uses ms to compare against the ISO string fireAtLocal).
4. **DEC IDs confirmed** - DEC-LUNAR-050..056 exist in the frontmatter; every AC references the correct DEC ID.

Verdict: FR-LUNAR-005 is ready for context-free agent implementation.

*End of audit FR-LUNAR-005.*

*End of audit FR-LUNAR-005.*
