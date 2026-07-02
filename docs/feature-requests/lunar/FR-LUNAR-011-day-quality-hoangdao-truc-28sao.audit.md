---
fr_id: FR-LUNAR-011
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-011 specifies the `dayquality` module that computes day quality by Vietnamese folk geomancy. Scope: 14 BCP-14 clauses in §1 (including the full-field DayQuality type, the 12 than truc nhat + 12 Truc + 28 sao + auspicious hours, pure function, no network, re-export); 8 design rationales in §2; the full TypeScript contract in §3 with 5 main types and 2 public functions; 15 testable ACs in §4; 7 concrete test cases using a fake mock in §5; a 15-row table in §10. The FR maps directly to PRD FR-E02, FR-E03, PRD §8 (auspicious/inauspicious/Truc/28 sao), and NFR-Offline (no network calls).

## §2 - Findings (all resolved during authoring)

### ISS-001 - No official DayQuality type yet

Without any TS type, FR-012 and FR-013 do not know what data to receive. Resolved: §3 fully defines `DayQuality`, `GioInfo`, `TrucInfo`, `Sao28Info`, `ThanTrucNhat`, `Truc`, `Sao28`; AC #12 requires re-export from index.ts.

### ISS-002 - The base JDN for the 28 sao could use the wrong source without anyone noticing

If `BASE_JDN_GIAC` is wrong, every day in 1900-2199 gets the wrong sao. Resolved: DEC-LUNAR-114 requires locking it with a fixture test (AC #5 a 28-day sequence); §11 requires a comment naming the specific reference source; §10 row 2 states the result and how to recover.

### ISS-003 - No mechanism to ensure the "for folk geomancy reference" disclaimer is present

The PRD Caveats state this label must be attached, but leaving it to the UI to add makes it easy to drop. Resolved: DEC-LUNAR-111 makes `disclaimer` a `readonly` literal type in `DayQuality`; AC #3 checks it for every day; §2 explains why it must be at the root level.

### ISS-004 - Risk of using a third-party library (lunar-typescript) for can-chi and drifting from the core

PRD §6.5 warns that lunar-typescript follows the Chinese 120E standard - using it as the primary source could drift can-chi from the FR-001 epoch. Resolved: DEC-LUNAR-112 bans third-party runtime imports; §1 #7 requires computing `(jdn + 9) mod 60` from FR-001's `jdFromDate`; §2 explains why.

### ISS-005 - `getMonthDayQualities` not yet defined, FR-012 has no API to list auspicious days

If there is only per-day `getDayQuality`, FR-012 must loop ~30 times. Resolved: §3 defines `getMonthDayQualities(year, month): DayQuality[]`; AC #6 checks consistency; AC #11 checks performance < 50ms.

### ISS-006 - No fixture guarding against an over-terse encoding of the auspicious hours

If the GIO_HOANG_DAO_TABLE has a wrong column without a concrete fixture, it goes undetected. Resolved: AC #2 ensures exactly 6 auspicious + 6 inauspicious per day; §8 example JSON has all 12 canh with the isHoang flag; the §5 test checks AC #2 directly.

## §3 - Resolution

After 6 findings and fixes: the DayQuality type has all fields with a disclaimer literal type, BASE_JDN_GIAC is locked with a fixture, the day can-chi is computed consistently with the core, `getMonthDayQualities` has a clear contract, the disclaimer is at the root level, and the auspicious-hours table has an AC checking the count. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27) - BLOCKER found + fixed

The self-audit above MISSED a blocker. An independent reviewer (who did not write the spec) found:

- **BLOCKER - the day earthly branch is off by 8 versus the core.** ISS-004 above "resolves" it by requiring §1 #7 to compute `(jdn + 9) mod 60` and then take the earthly branch `mod 12`. But FR-LUNAR-002 (owner of can-chi, DEC-LUNAR-020) defines `chi = (jdn + 1) mod 12`. `(jdn + 9) mod 12` is off by exactly +8 versus `(jdn + 1) mod 12` (verified by sweep: a constant offset of 8). Because `THAN_TRUC_NHAT_TABLE`, Truc, and the auspicious hours all key off the day earthly branch (PRD §8), the ENTIRE day-quality output is wrong and contradicts the can-chi that the calendar (FR-007 via FR-002) displays. `can = (jdn + 9) mod 10` matches, so the bug is only in the earthly branch - harder to see.
  - **Fix applied:** DEC-LUNAR-112 rewritten (call FR-002's `canChiDay(jdn)`, use `chiIndex = (jdn + 1) mod 12`); §1 #7 rewritten; §2 rationale rewritten; §3 contract adds a comment on getting can-chi from the core; §6 skeleton fixes the formula; added AC #16 (cross-check the earthly branch against `canChiDay` via a 60-day sweep) + AC #17 (Tet 2025 fixture); added 2 tests in §5 importing `canChiDay`/`jdFromDate` from the core; added 1 §10 row. The matching bug is also fixed in FR-LUNAR-013 (Swift).
  - **Adjusted score (pre-fix, independent): 5/10.** After fix: consistent with FR-002.

## §5 - Readiness pass (2026-06-28)

A second pass by an independent reviewer (not the author). The FR is now ready for context-free agent implementation:

- **getTietKhiForDate fully removed.** §1 #3, §1 #7, §6 (skeleton), §7 (dependencies) all now use the correct name `tietKhiStartDiaChi(jdn, tz?): number` from CONTRACT.md. The Truc formula in the §3 comment block is `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12`. There is no remaining reference to `getTietKhiForDate`.
- **Exports match CONTRACT.md.** `getDayQuality(solarDate: Date): DayQuality` and `getMonthDayQualities(year: number, month: number): readonly DayQuality[]` use the exact name and signature per the CONTRACT.md P2/P3 surface. `interface DayQuality` and `interface GioInfo` are in §3.
- **Earthly-branch invariant.** `canChiDay(jdn).chiIndex = (jdn+1)%12` is the confirmed invariant in §1 #7, the §3 comment, §6; the wrong `(jdn+9)%60%12` computation is clearly banned; AC #16/#17 + 2 tests in §5 catch this bug.
- **Complete traceability.** Every MUST clause in §1 has a matching AC in §4 and a test in §5. The `getMonthDayQualities` return type is updated to `readonly DayQuality[]` in both §3 and §1 #14.

**Verdict: PASS. Ready for implementation.**

*End of audit FR-LUNAR-011.*

*End of audit FR-LUNAR-011.*
