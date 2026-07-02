---
fr_id: FR-LUNAR-002
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

FR-LUNAR-002 specifies can-chi, the Vietnamese zodiac, and the 24 tiet khi. Scope: 15 normative clauses in §1 (day can-chi from JDN, year can-chi, month can-chi, VN zodiac Meo/Trau, zodiacOf, tiet khi via getSunLongitude at 15-degree resolution, table of 24 tiet with 12 Trung khi, Dong chi consistent with getLunarMonth11, pure offline, tietKhiAt, cross-check only timezone-independent, export type, Vietnamese with diacritics, freeze the table). 6 §2 rationale paragraphs. §3 has canChiDay/Year/Month, ZODIAC_VN + zodiacOf, TIET_KHI + tietKhiAt with concrete formulas. 14 acceptance criteria. §5 has 2 test files (canchi.test.ts, tietkhi.test.ts) covering 5 year can-chi fixtures, VN zodiac, continuous JDN cycle, tiet khi bound, Dong chi. §10 has 12 failure lines. §11 has 7 notes. Maps to PRD FR-A03, FR-A04, 6.3, #8.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Can-chi computed from lunarDay is wrong across the month boundary
Resolved: §1 #1/#2, DEC-LUNAR-020 computes from JDN, AC #6 continuous cycle, §10 line 1, §11 note 1.

### ISS-002 - Using the Chinese zodiac instead of the VN one
Tho/Bo is wrong versus Meo/Trau; Tet 2023 must be Meo. Resolved: §1 #5, DEC-LUNAR-021, ZODIAC_VN table, AC #4/#5, §10 line 2.

### ISS-003 - Tiet khi may be split at the wrong resolution
Dividing by 6 for 12 values instead of 24. Resolved: §1 #7, DEC-LUNAR-024 divide by 12, AC #8/#10, §10 line 4.

### ISS-004 - Dong chi may drift from the core
The tiet khi table and getLunarMonth11 must agree on Dong chi. Resolved: §1 #9, AC #11, §6, §11 note 3, shared SunLongitude.

### ISS-005 - Risk of using lunar-typescript to fix timezone-dependent values
Resolved: §1 #12, DEC-LUNAR-025, cross-check only can-chi/Truc that are timezone-independent, disallowed_tools, §10 line 7.

### ISS-006 - Month can-chi does not rotate with the year can
A wrong month can makes the FR-011 input wrong. Resolved: §1 #4, DEC-LUNAR-022, AC #7, §11 note 5.

## §3 - Resolution

After ISS-001..006 are handled: can-chi from JDN, a separate VN zodiac, tiet khi at 15-degree resolution consistent with the core, Dong chi synced with getLunarMonth11, lunar-typescript only cross-checking timezone-independent values, month can-chi rotating with the year can. The tables are in Vietnamese with diacritics and frozen. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Readiness pass (2026-06-28, contract alignment + tietKhiStartDiaChi)

This pass is TASK A + TASK B: sync CONTRACT.md and add the function FR-011 needs. Changes:
- The `CanChi` interface in §3 dropped the `can`/`chi` string fields (not in CONTRACT.md or the scaffold `types.ts`); it keeps only `{ canIndex, chiIndex, label }`. canChiDay/Year/Month updated accordingly.
- Added `canChiLabel(canIndex, chiIndex): string` to §3 (CONTRACT.md pure helper; already in the scaffold `src/canchi.ts`). Added §1 #6a, AC #5a, "canChiLabel" test group.
- `zodiacOf` signature fixed: `zodiacOf(chiIndex: number): string` (CONTRACT.md and scaffold). The FR previously wrote `zodiacOf(lunarYear)` with the wrong signature; the ACs and tests now use `(lunarYear + 8) % 12` as the chiIndex correctly.
- Added `tietKhiStartDiaChi(jdn, tz?): number` to §3 with spec clause §1 #11a, AC #15-17, and the "tietKhiStartDiaChi" test group in §5 (TASK A: CONTRACT.md already has it; the scaffold has a stub; FR-011 needs it to compute Truc).
- AC #7 and the "thang Gieng" test: change from `.chi === "Dan"` to `.chiIndex === 2` (matches the new interface).
- Test file imports fixed: `VN_TIMEZONE` -> `VN_TZ`; also import `tietKhiStartDiaChi` and `canChiLabel`.
- effort_hours: 10 -> 10.5 (added 0.5h for tietKhiStartDiaChi).
- Added a new sub-task line for tietKhiStartDiaChi.

---

## §4 - Independent adversarial pass (2026-06-27, reviewer other than the author)

Checked by calculation: year can-chi `(y+6)%10,(y+8)%12` is correct (2025 At Ty, 2023 Quy Mao, 1984 Giap Ty, 1985 At Suu, 2021 Tan Suu); VN zodiac is correct (2023 Meo, 2021 Trau); month can-chi CAN `(yearCan*2+lunarMonth+1)%10` is correct (Giap year, first month = Binh Dan, i.e. the ngu ho don rule); month chi `(lunarMonth+1)%12` -> month 1 = Dan; the TIET_KHI table matches longitude (idx 0 Xuan phan, 6 Ha chi, 12 Thu phan, 18 Dong chi, 21 Lap xuan); §8 payload JD 2460667 = 22/12/2024, tietKhiAt idx 18 = Dong chi isTrungKhi true - correct. The arithmetic is CLEAN.

- NIT (Defect D, fixed): sub_task wrote `tietKhiAt ... returns ... a 30-degree cung` but the `TietKhi` interface has only `{index, name, isTrungKhi}` and the resolution here is 15 degrees (24 tiet), not 30 degrees. Fix: change sub_task to "returns index 0-23 + name + isTrungKhi flag (15-degree resolution)".

Pre-fix score (independent): 9/10. After fix: 10/10.

---

*End of audit FR-LUNAR-002.*
