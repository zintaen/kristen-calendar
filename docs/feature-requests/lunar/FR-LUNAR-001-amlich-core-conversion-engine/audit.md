---
fr_id: FR-LUNAR-001
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

FR-LUNAR-001 specifies the core lunar engine. Scope: 18 normative clauses in §1 (convertSolar2Lunar / convertLunar2Solar bidirectional 1900-2199, 105E with tz=7.0, leap month by "does not contain a Trung khi", jdFromDate with the 2299161 switch, NewMoon Meeus, SunLongitude J2000, three separate epochs, two synodic constants with separate roles, offline zero-dependency, < 5ms, freeze constants, jdToDate + lunarLeap 0|1). 7 §2 rationale paragraphs. §3 ports verbatim jdFromDate, jdToDate, NewMoon, SunLongitude, getSunLongitude, getNewMoonDay, getLunarMonth11, getLeapMonthOffset, convertSolar2Lunar, convertLunar2Solar with the exact PRD 6.2 constants. 16 acceptance criteria. §5 has 7 vitest test groups covering 5 Tet fixtures, the Julian/Gregorian switch, round-trip sweep 1900-2199, 1985 leap, getSunLongitude bound, performance, leap sentinel. §10 has 13 failure lines. §11 has 8 notes. Maps to PRD FR-A01, FR-A02, FR-A06, NFR-Offline, NFR-Performance, Lunar spec 6.1-6.5.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Three epochs easily confused
2415021.076998695, 2415020.75933, 2415021 look almost identical and are easy to merge by mistake. Resolved: §1 #11/#12, DEC-LUNAR-011, constants separated in §3 with JSDoc, §10 line 1, §11 note 1.

### ISS-002 - Two synodic constants may be merged
29.530588853 (index-k) and 29.53058868 (Meeus per-k) serve two roles. Resolved: §1 #6, DEC-LUNAR-013, §3 SYNODIC_INDEX_K vs MEEUS_SYNODIC, §10 line 2, §11 note 2.

### ISS-003 - Wrong timezone produces the Chinese calendar
Hard-coding 120E or UTC+8 makes 1985 and 2007/2030/2053 wrong. Resolved: §1 #3, DEC-LUNAR-010, VN_TIMEZONE = 7.0, AC #11, §10 line 3.

### ISS-004 - Off-by-one when deriving k
The first day of the month may be off by 1 if getNewMoonDay(k) is not decremented. Resolved: §1 #1, §6 pins the k-derivation order, round-trip sweep AC #5, §11 note 7.

### ISS-005 - Leap mismatch in L2S with no exit
convertLunar2Solar with a wrong-year leap flag needs a sentinel. Resolved: §1 #2, AC #16, returns [0,0,0], §8 payload 3, §10 line 8 (FR-LUNAR-004 applies the fallback).

### ISS-006 - Offline and zero-dependency commitment lacked a guard
Resolved: §1 #13/#14, DEC-LUNAR-012, AC #13 empty deps + AC #15 no network, disallowed_tools.

### ISS-007 - Constants could be modified silently at runtime
Resolved: §1 #16, DEC-LUNAR-016 freeze, AC #12 reassignment throws/no-op, §11 note 8.

## §3 - Resolution

All 7 substantive concerns are handled: the three epochs and two synodic constants are separated with JSDoc, the timezone is locked to 105E, off-by-one is blocked by the round-trip sweep, the leap sentinel connects to FR-LUNAR-004, offline and zero-dependency have guard tests, and the constants are frozen. The functions are ported verbatim from the canonical Ho Ngoc Duc source with the exact PRD 6.2 constants. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Readiness pass (2026-06-28, contract alignment)

This pass is TASK A (contract alignment): synchronize the §3 API with CONTRACT.md and the actual scaffold (`src/constants.ts`, `src/types.ts`). Changes:
- Constant renames: `VN_TIMEZONE` -> `VN_TZ`; `MEEUS_EPOCH` -> `MEEUS_NEW_MOON_EPOCH`; `MEEUS_SYNODIC` -> `MEEUS_SYNODIC_PER_K`; `LUNAR_MONTH11_INT` -> `LUNAR_MONTH11_EPOCH_INT`; `JULIAN_CENTURY` -> `JULIAN_CENTURY_DAYS`. Every new name matches the scaffold and CONTRACT.md exactly.
- Added `INVALID_SOLAR: SolarDate` and `isInvalidSolar(s): boolean` to §3 (CONTRACT.md requires it; already in the scaffold `src/types.ts`). Added §1 #17 (MUST), AC #17, and the "INVALID_SOLAR / isInvalidSolar" test group to §5.
- Added `VN_TZ_ID`, `VN_MERIDIAN`, `T_DIVISOR` to §3 for the full CONTRACT surface.
- SolarDate and LunarDate are now `readonly` tuples as in the scaffold.
- §11 notes: updated the constant names in prose.
- No logic or arithmetic change; only names synced to the scaffold as the source of truth.

---

## §4 - Independent adversarial pass (2026-06-27, reviewer other than the author)

Re-ran the canonical engine (jdFromDate/jdToDate/NewMoon/SunLongitude/convertSolar2Lunar/convertLunar2Solar) against each PRD 6.2 constant and every fixture. The arithmetic is CLEAN: 5 Tet dates match both directions, VN-vs-China 2007/2030/2053 are off by exactly 1 day, 1985 has a leap month 2 + VN Tet 21/01/1985, and the round-trip sweep 1900-2199 (109,573 days) has 0 mismatches. But found 2 MAJOR + 1 MINOR at the boundary/trace that the self-audit and the round-trip sweep did not reach:

- MAJOR (Defect B, fixed): §3 `jdToDate` used the guard `jd > GREGORIAN_SWITCH_JD` while the canonical Duc source uses `jd > 2299160`. The exact switch day JD 2299161 was pushed onto the Julian branch -> `jdToDate(2299161)` returns 5/10/1582 instead of 15/10/1582. The 1900-2199 sweep did not catch it because every JDN of that range is >> the boundary. Fix: change to `jd >= GREGORIAN_SWITCH_JD` + add a switch-day test in §5 + a §10 line.
- MAJOR (Defect A, fixed): AC #6 asserted `jdFromDate(14, 10, 1582) === 2299160` - WRONG, the function returns 2299170 (14/10/1582 is below the boundary so it falls on the Julian branch; Julian and Gregorian differ by 10 days at 1582). JD 2299160 is actually 4/10/1582 (Julian). Fix: change AC #6 assertion to `jdFromDate(4, 10, 1582) === 2299160` and note 14/10 -> 2299170.
- MINOR (Defect C, fixed): AC #12 cited `DEC-LUNAR-016` but `source_decisions` only has 010-015; the freeze decision is at DEC-LUNAR-011 (§1 #16). Fix: change the AC #12 citation to DEC-LUNAR-011. (Frontmatter kept per the editorial rule.)

Pre-fix score (independent): 7/10. After fix: the arithmetic and the boundary are both correct, with a test covering the switch boundary.

---

*End of audit FR-LUNAR-001.*
