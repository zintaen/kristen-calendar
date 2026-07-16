---
fr_id: TASK-LUNAR-013
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; Swift XCTest fixtures from PRD §6.2 + App Group isolation + stale-cache fallback applied)
---

## §1 - Verdict summary

TASK-LUNAR-013 specifies the native Swift/SwiftUI WidgetKit target and the data-sharing mechanism via App Group with the TypeScript web layer. Scope: 14 BCP-14 clauses in §1 (native target required, App Group UserDefaults, DayInfoCache Codable, widget-cache-writer.ts, LunarCalcSwift re-implemented with PRD §6.2 constants, 12 entries by canh hour, 3 sizes systemSmall/Medium/Large, ban network, ban write state, Watch COULD, XCTest fixtures, getSnapshot < 1s); 8 design rationales in §2; 5 Swift contracts + 1 TypeScript contract in §3; 14 ACs in §4; 5 XCTest groups in §5; a 13-row failure table in §10. The task maps to PRD TASK-F01, TASK-F02 (COULD), PRD §9 (iOS native target note), and NFR-Offline.

## §2 - Findings (all resolved during authoring)

### ISS-001 - No mechanism yet to pass data from Capacitor to WidgetKit

The Capacitor bridge does not run in the widget extension process; without App Group the widget has no data. Resolved: DEC-LUNAR-131 chooses App Group UserDefaults; §1 #2/#3/#4/#5 define the whole write-read flow; `DayInfoCache.swift` with `load()`; `widget-cache-writer.ts` uses AppGroupStoragePlugin.

### ISS-002 - The Swift re-implementation could use the wrong epoch constant (3 easily-confused epochs)

PRD §6.2 warns "EXTREMELY IMPORTANT - do not confuse the 3 epochs". Resolved: DEC-LUNAR-132 and §1 #6 specify the 4 concrete constants clearly (2415021.076998695, 2415020.75933, 29.53058868, 2415021 int); the `LunarCalcSwift` struct has static constants; XCTest AC #2/#3/#4/#5 use PRD §6.6 fixtures to catch epoch errors.

### ISS-003 - The widget timeline has only 1 entry/day, so the auspicious hour does not update hourly

If the timeline has only 1 entry for today, the widget shows the same "current canh hour" from morning to night. Resolved: §1 #7 requires 12 entries, each representing 1 canh hour of 2h; §3 `LunarEntry.date` is the start of the canh hour; XCTest AC #7 checks exactly 12 entries.

### ISS-004 - No fallback when the cache is stale (user has not opened the app for > 24 hours)

If the widget only reads the cache and the cache is nil/stale, the widget goes blank. Resolved: §1 #6 requires `LunarCalcSwift` as a fallback; §1 #14 `getSnapshot` must use cache-or-compute; §6 skeleton describes the fast-path fallback logic; AC #8 `getSnapshot < 1s`.

### ISS-005 - No guarantee the widget does not call the network or write state

WidgetKit could similarly call URLSession. This needs a clear constraint in the spec. Resolved: §1 #10 bans `URLSession` explicitly; §1 #11 bans writing `UserDefaults.standard.set`; DEC-LUNAR-134 explains why; AC #9 and AC #10 check it.

### ISS-006 - No XCTest fixture yet in §5

This task is written in Swift, but if §5 has no concrete XCTest then there is no meaningful "Test: T". Resolved: §5 has 4 XCTest groups with PRD §6.6 fixtures: Tet 2025, Tet 2023, 1985 leap, 2007 VN offset, round-trip constants check, DayInfoCache isStale, timeline count, snapshot measure.

### ISS-007 - The Watch complication (TASK-F02) is not clearly separated as COULD or must-build-now

PRD TASK-F02 says "optional" but this is not clear in the TASK-013 spec. Resolved: DEC-LUNAR-133 confirms COULD; §1 #12 defines COULD with watchOS 9+ WidgetKit; §11 describes how to reuse LunarCalcSwift if it is decided to build; the bundle structure states only `LunarWidgetSmall()` first.

## §3 - Resolution

After 7 findings and fixes: the App Group mechanism is defined with a full contract, the epoch constants are locked with constants + XCTest, the timeline has 12 entries for the auspicious hours, the stale-cache fallback is clear, network/write-state are banned in the spec + test, §5 has full XCTest with PRD §6.6 fixtures, and the Watch is clearly COULD. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27) - BLOCKER + 2 issues found + fixed

The self-audit above missed a blocker and two issues. The independent reviewer found:

- **BLOCKER - the day earthly branch is off by 8 versus the core (same bug as TASK-011).** The §3 contract of `canChiNgayFromJDN` writes `canChi index = (jdn + 9) % 60; diaChiIndex = canChiIndex % 12`. `(jdn + 9) % 12` is off by +8 versus TASK-LUNAR-002 `canChiDay`'s `(jdn + 1) % 12`. The widget displays can-chi/auspicious hours by the earthly branch, so the widget will drift from the can-chi the app/web displays.
  - **Fix:** the §3 contract comment + §1 #6 + §6 skeleton require `diaChiIndex = (jdn + 1) % 12`; added §1 #16 + AC #15 + XCTest `testCanChi_MatchesCore_60DaySweep` (a 60-day sweep against the core formula).
- **MAJOR - the day can-chi fixture is wrong.** §5 `testCanChiNgay_Tet2025` and AC #4 assert 29/01/2025 is "At Ty". That is the YEAR can-chi (At Ty), not the DAY can-chi. By the core formula, the day can-chi for 29/01/2025 is **Mau Tuat** ("Mau Tuat"). PRD 6.6 only lists "At Ty" in the year column.
  - **Fix:** AC #4 and the test changed to "Mau Tuat" + assert `diaChiIndex == (jdn + 1) % 12`; §1 #13 clarifies At Ty is the year can-chi.
- **MAJOR - tz is inconsistent + the round-trip is not feasible.** The contract mixes conventions: `convertSolar2Lunar`/`getNewMoonDay` drop the tz parameter (must use `TZ_VN` internally) but the spec does not say so clearly; and §1 #13 + the test named `testRoundTrip_L2S_S2L` while the minimal contract does NOT have `convertLunar2Solar`.
  - **Fix:** added §1 #15 (every timezone-dependent function uses `TZ_VN = 7.0` internally) + AC #16; annotated that `getSunLongitude`/`getNewMoonDay` use `TZ_VN`; changed the test to `testConvertSolar2Lunar_Tet2025_Identity` (S2L direct) and fixed §1 #13.
  - **Adjusted score (pre-fix, independent): 6/10.**

## §5 - Readiness pass (2026-06-28)

A second pass by an independent reviewer.

- **Can-chi/convert invariants match CONTRACT.md.** `canChiNgayFromJDN` uses `canIndex = (jdn+9)%10` and `diaChiIndex = (jdn+1)%12` (not `(jdn+9)%60%12`); confirmed in §1 #6, the §3 contract comment, the §6 skeleton. `convertSolar2Lunar` uses TZ_VN = 7.0 internally and consistently (§1 #15).
- **The day can-chi fixture is correct.** AC #4 and `testCanChiNgay_Tet2025` assert "Mau Tuat" (day can-chi for 29/01/2025), not "At Ty" (year can-chi). AC #15 + `testCanChi_MatchesCore_60DaySweep` sweeps 60 days.
- **Complete traceability.** §1 #1-#16 have matching ACs (§4 has 16 ACs). §1 #9 (purple theme colors) is SHOULD; the lack of an AC on color is acceptable for a visual SHOULD.
- **No missing function names.** No reference to `getTietKhiForDate` or any wrong function name in this task.

**Verdict: PASS. Ready for implementation.**

*End of audit TASK-LUNAR-013.*

*End of audit TASK-LUNAR-013.*
