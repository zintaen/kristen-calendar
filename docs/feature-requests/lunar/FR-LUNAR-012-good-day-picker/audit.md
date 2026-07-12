---
fr_id: FR-LUNAR-012
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS minimum; offline + EventKit opt-out + clamp rules applied)
---

## §1 - Verdict summary

FR-LUNAR-012 specifies the "good-day picker" screen, a pure UI over `getDayQuality`/`getMonthDayQualities` from FR-011. Scope: 12 BCP-14 clauses in §1 (3 UI regions, 4 work types, clamp 90 days, auspicious filter, display 5 fields + top auspicious hours, fixed disclaimer, offline, EventKit is COULD); 6 design rationales in §2; 5 TypeScript types and 3 public functions in §3; 12 ACs in §4; 5 test groups in §5; an 11-row failure table in §10. The FR maps to PRD FR-E01, FR-E04 (COULD), PRD §13 (actor specifics), and NFR-Offline.

## §2 - Findings (all resolved during authoring)

### ISS-001 - An unbounded date range can cause poor performance and an unusable list

If the user picks 1 year (365 days), there could be 180+ auspicious results. Resolved: DEC-LUNAR-124 caps at 90 days; §1 #3 clamp + notice; AC #3 tests the clamp; §11 note on the December->January edge case.

### ISS-002 - EventKit is SHOULD in the PRD but making it mandatory in the build would delay shipping

FR-E04 in the PRD says "optional". Implementing it as SHOULD creates pressure to test the native Calendar on iOS before the basic feature exists. Resolved: DEC-LUNAR-122 downgrades to COULD; §1 #11 lazy permission + the main flow is unaffected; AC #9 tests the opt-out case; §11 platform check.

### ISS-003 - No mechanism ensures the disclaimer is displayed (different from the disclaimer in DayQuality)

DayQuality has a `disclaimer` field but the UI may not render it. Resolved: §1 #6 requires a fixed disclaimer banner; AC #6 DOM query test; §11 requires exact copy-paste.

### ISS-004 - Unclear how to handle a date range crossing the new-year boundary

The range 15/12/2025 - 15/02/2026 needs `getMonthDayQualities` for 3 different months across 2 years. Resolved: §6 skeleton states the loop over increasing months with year handling clearly; §11 note on the December->January edge case.

### ISS-005 - The screen could call the network if done wrong

FR-010 (app shell) has a data-fetching layer; if a developer copies the pattern they could accidentally add a network call. Resolved: §1 #7 explicitly bans the network; AC #8 mocks fetch; DEC-LUNAR-120 confirms "data from amlich-core, no network calls".

### ISS-006 - "Work type" is not yet defined concretely

PRD §13 mentions actor specifics but does not list the final 4 values. Resolved: §1 #2 lists 4 concrete values from PRD §13 + Persona 1 (Chu Linh) + Persona 3 (Anh Tuan); §3 `WorkType` union type with 4 values; `WORK_TYPE_OPTIONS` with Vietnamese labels.

## §3 - Resolution

After 6 findings and fixes: the 90-day range has a clamp + test, EventKit is downgraded to COULD with lazy permission, the disclaimer has a DOM AC test, the multi-year boundary is handled in the skeleton, network calls are banned + tested, and the 4 work types are defined concretely. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

The independent reviewer confirmed FR-012 is genuinely a pure UI over FR-011 (DEC-LUNAR-120), the 90-day clamp, EventKit COULD not blocking - no blocker. One MINOR fixed: §3 `good-day.ts` references `DayQuality`/`GioInfo` without importing them; added `import type { DayQuality, GioInfo }` and `import { getMonthDayQualities }` from `@cyberskill/amlich-core` so the contract compiles and to make clear FR-012 consumes FR-011 (does not compute itself). **Independent score (pre-fix): 8.5/10.**

## §5 - Readiness pass (2026-06-28)

A second pass by an independent reviewer.

- **Imports match CONTRACT.md.** §3 `good-day.ts` imports `DayQuality`, `GioInfo` (type), and `getMonthDayQualities` with the exact names from `@cyberskill/amlich-core`. FR-012 does not compute geomancy itself (DEC-LUNAR-120).
- **AC #13 added.** §1 #8 (MUST NOT auto-create a Reminder) previously lacked a matching AC. Added AC #13 and 2 tests in §5 confirming `filterGoodDays` and `computeGoodDays` do not call createReminder or an EventKit write (DEC-LUNAR-123).
- **Complete traceability.** Every MUST clause §1 #1-#8 has an AC in §4 and a test in §5.

**Verdict: PASS. Ready for implementation.**

*End of audit FR-LUNAR-012.*

*End of audit FR-LUNAR-012.*
