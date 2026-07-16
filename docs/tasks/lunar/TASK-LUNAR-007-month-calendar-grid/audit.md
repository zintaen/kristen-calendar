---
fr_id: TASK-LUNAR-007
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; DEC-LUNAR-070..074 assigned; NFR-Performance render < 100ms enforced; placeholder pattern for TASK-011 encoded)
---

## §1 - Verdict summary

TASK-LUNAR-007 specifies the dual-system month calendar grid component (solar + lunar), the main screen of MVP Phase 1 slice 3. Scope: 16 BCP-14 clauses in §1 (buildMonthGrid once, useMemo, lunar header, padding, highlight today, tap detail, TASK-011 placeholder, offline, swipe). 7 rationale paragraphs in §2 explaining DEC-LUNAR-070..074 and the architectural decisions. §3 has 4 TypeScript interfaces and full function signatures for CalendarGrid, DayCell, DayDetailPanel, buildMonthGrid, computeReminderDatesForMonth. 15 testable ACs in §4 including the 1985 leap month edge case, tiet khi, today, padding, offline. §5 has 7 concrete unit tests with a January 2025 fixture (Tet At Ty) and a spy counting call counts. §10 lists 12 failure-mode rows including SSR/client timezone, portal clip, swipe debounce. Maps to TASK-A05 (grid), NFR-Performance (< 100ms), §13 (month calendar).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Calling convertSolar2Lunar per cell in the render loop violates NFR-Performance
If called 31 times synchronously in the render cycle, the total time can exceed 100ms. Resolved: §1 #6 + DEC-LUNAR-070 + buildMonthGrid computed once; AC #3 + §5 spy test counting calls.

### ISS-002 - useMemo skipped, buildMonthGrid recomputes on every re-render
Unstable deps (a new object each render) disable useMemo. Resolved: §1 #7 + DEC-LUNAR-071 + §5 mock test counting calls; §11 note on key stability.

### ISS-003 - No placeholder for TASK-LUNAR-011, blocking Phase 2
If the DayDetailPanel layout is hard-wired to Hoang dao/Truc/28 sao it blocks TASK-007 shipping in slice 3. Resolved: §1 #14 + DEC-LUNAR-072 + hoangDao/truc/sao28 fields typed null in DayCellData; §8 example payload has the comment "(Phase 2 - not yet)".

### ISS-004 - SSR vs client timezone makes startPadding wrong
`new Date(year, month-1, 1).getDay()` in Next.js SSR runs UTC, off by 7 hours from Asia/Ho_Chi_Minh. Resolved: §11 second note on Intl + timeZone Asia/Ho_Chi_Minh; §10 failure row "Wrong padding".

### ISS-005 - DayDetailPanel clipped by the grid container's overflow:hidden
A slide-up panel rendered inside the grid container will be clipped. Resolved: §11 note "createPortal attached to document.body"; §10 failure row "DayDetailPanel re-render grid" has the same cause.

### ISS-006 - No test covers the leap-month and offline cases
Missing the 1985 leap-month fixture and a no-network check. Resolved: §5 test "March 1985: has leap month 2" and test "No network request in buildMonthGrid" with fetchSpy.

## §3 - Resolution

After handling the 6 issues above, TASK-LUNAR-007 has 16 BCP-14 clauses, 15 ACs, 7 concrete unit tests, 12 failure rows, 7 implementation notes. All of DEC-LUNAR-070..074 are created and fully referenced. Score after self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

An independent reviewer (not the author) re-scored against the optimistic self-audit assumptions. Pre-fix score: **5/10**. The self-audit 10/10 missed three contract-level defects with TASK-LUNAR-001/002:

- **MAJOR (BLOCKER-level) - imports a nonexistent function.** §3 line 102 + §6 import `getTietKhi` from amlich-core, but TASK-LUNAR-002 exports `tietKhiAt(jdn, tz)`, NOT `getTietKhi` (PRD §6 also does not define it). The build breaks. Fixed: §3 + §6 changed to `tietKhiAt`; added the helper `isTietKhiStart`; §11 note 5 and the §10 row updated accordingly.
- **MAJOR - tuple vs object + can-chi/zodiac never computed.** §6 does `const lunar = convertSolar2Lunar(...)` then `lunarDate: { ...lunar }`. But convertSolar2Lunar returns a TUPLE `[day,month,year,leap]`; spreading an array into an object yields `{0,1,2,3}`, losing every field name. can-chi (§1 #2) and zodiac are never populated even though AC #1 requires them. canChiDay/tietKhiAt take a JDN, not d/m/y. Fixed: §6 destructures the tuple, computes `jdFromDate(d,m,y)` once, calls `canChiDay(jdn)/canChiMonth(lMonth,lYear)/canChiYear(lYear)/zodiacOf(lYear)/tietKhiAt(jdn,tz)` and assembles the DTO; §3 imports the correct symbols.
- **MAJOR - SSR/timezone start-padding bug shipped in the skeleton.** §6 uses `firstDay.getDay()` (reads the runtime timezone; static-export prerender runs UTC -> off week-start day), even though §11 and §10 already warned in prose. The spec describes the bug but STILL ships the broken code. Fixed: §6 replaced with `startPaddingFor()` (Intl + timeZone Asia/Ho_Chi_Minh over `Date.UTC(...,12)`), `daysInMonth` uses `getUTCDate()`; the §10 row + §11 note 2 updated to the shipped code.

The items already-resolved in the self-audit (TASK-011 placeholder, portal clip, 1985/offline fixture, useMemo) still hold. After fix: NFR-Performance render < 100ms is still handled (§1 #12, AC #3/#4); the fixture tests do not change results (Jan 2025 still 3 padding cells, Tet 29/01 still day 1). **Post-fix score = 9/10** (deferred Web Worker + 6-row layout are still implementation-time, not contract defects).

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **VN_TIMEZONE -> VN_TZ**: `VN_TIMEZONE` does not exist in CONTRACT.md; `VN_TZ = 7.0` is the correct export. Fixed the import and every use point in §3, §6. All 4 occurrences replaced successfully.
- **zodiacOf signature**: CONTRACT declares `zodiacOf(chiIndex: number)`, NOT `zodiacOf(lunarYear)`. Fixed the §3 comment (chiIndex), the §6 skeleton (`zodiacOf(canChiYear(lYear).chiIndex)`), and the prose comment in §6. The negative note in §7 ("NOT getTietKhi") kept - correct.
- **getTietKhi**: No actual import; it appears only in negative-prose text (accepted). No code calls `getTietKhi`. PASS.
- **Traceability Task B**: 16 BCP-14 clauses in §1, 15 ACs in §4, 7 tests in §5. Every MUST has a matching AC and test. DEC-LUNAR-070..074 exist and are fully referenced.

**Post-alignment score: READY.**

*End of audit TASK-LUNAR-007.*
