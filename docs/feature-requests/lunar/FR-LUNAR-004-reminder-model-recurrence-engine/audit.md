---
fr_id: FR-LUNAR-004
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-004 specifies the data model `Reminder`/`User`/`OccurrenceCache` plus the recurrence engine that generates solar dates from lunar dates. Scope: 16 §1 clauses (store lunar not solar, recurrence MONTHLY/ANNUAL/ONCE, type RAM/MUNG_MOT/GIO/CUSTOM/FESTIVAL, call convertLunar2Solar each year, leap-month fallback REGULAR/SKIP/ASK, clamp missing month days, lock Asia/Ho_Chi_Minh, lead-time fan-out, OccurrenceCache invalidate by engineVersion, validate/normalize, zero-dependency). 8 §2 paragraphs. §3 has the full Reminder/User/Occurrence/OccurrenceCache types, signatures for nextOccurrences/mergeAndSort/todayInHCM. 17 ACs. §5 has 12 vitest tests including the 1985 leap month 2 date + TZ lock. §10 lists 15 failure lines. §11 has 7 notes. Maps to PRD FR-B02, FR-B06, section 10 (Data Model + recurrence rule), section 11.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Storing the solar date is wrong across years
A death anniversary is a fixed lunar date; the solar date changes every year. Resolved: §1 #1 store lunarDay/lunarMonth/isLeapMonth + DEC-LUNAR-040; AC #1.

### ISS-002 - Interpolating 354/384 days drifts over time
The gap between two anniversaries in solar days is not fixed. Resolved: §1 #4 call convertLunar2Solar per targetLunarYear + DEC-LUNAR-041; AC #2; §10 line 2.

### ISS-003 - An anniversary falling in a leap month has no answer
If the entered year has no leap month, which day to observe. Resolved: §1 #5/#6 fallback REGULAR/SKIP/ASK + fellBack + DEC-LUNAR-042; AC #5/#6/#7.

### ISS-004 - Day 30 in a 29-day lunar month vanishes
Resolved: §1 #7 clamp to the last day of the month + dayClamped; AC #9; §10 line 6.

### ISS-005 - Deriving by device time is wrong when abroad
The actor persona travels far for shoots. Resolved: §1 #8 lock tz=7.0 via tz.ts + DEC-LUNAR-043; AC #12; test sets process.env.TZ.

### ISS-006 - The cache may serve wrong dates after the core changes
Resolved: §1 #11 OccurrenceCache carries engineVersion + isCacheStale + DEC-LUNAR-044; AC #13.

### ISS-007 - Lead-time is not yet clear as how many notifications
Resolved: §1 #9/#10 each (occurrence x leadTime) becomes an Occurrence with fireAtLocal for FR-LUNAR-005 to cut to 64; AC #10/#16.

## §3 - Resolution

The seven core issues are handled: store-lunar-derive-solar, recompute-each-year, leap-month fallback, clamp days, lock timezone, cache invalidation, lead-time fan-out. The Reminder type in §3 is synced field-by-field with PRD section 10; the recurrence engine calls the correct FR-LUNAR-001 functions. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **8/10**. Four defects the self-audit missed, fixed in the .md:

- **MAJOR - `nextOccurrences` signature is internally inconsistent.** §1 #4 and the sub_task declare `nextOccurrences(reminder, fromYear, count)` (3 positional params) but §3, §5, §6 all use `nextOccurrences(r, opt: RecurrenceOptions)` (object form). The §1 normative clause contradicts the actual contract. **Fixed:** §1 #4 + sub_task changed to `nextOccurrences(reminder, opt)` object form, matching §3/§5/§6 and the brief audit.
- **MAJOR - the `notificationStyle` field is not on the Reminder type that FR-LUNAR-006 consumes.** FR-LUNAR-006 (§1 #9, §3 tone.ts, AC #11, payload, DEC-LUNAR-065) writes `Reminder.notificationStyle`, but the `Reminder` type in §3 (owned by FR-004) and the mirror in FR-LUNAR-010 both do NOT have this field -> a compile-level mismatch between producer (004) and consumer (006), exactly the "calling an undeclared field/method" defect the CLICK precedent caught. **Fixed:** added `notificationStyle?: NotificationStyle` + type `NotificationStyle {tone, emoji, imageId?}` to §3 of FR-004 (owner); FR-LUNAR-006 changed `tone.ts` to `import type { NotificationStyle } from "@cyberskill/amlich-core"` instead of redeclaring.
- **MAJOR - `count` vs lead-time is ambiguous + infinite loop at ONCE+SKIP.** §3 says `count` = "the number of occurrences wanted (before receiving lead-time)" but the skeleton loops `while (out.length < occurrenceBudget)` while `out` has already fanned out by leadTimes; `occurrenceBudget` is not pinned. Also the `resolved.skip` branch of `recurrence="ONCE"` (fixed year) keeps incrementing `lunarYear` while `targetYear` does not change and `lunarOccCount` does not advance -> hang. **Fixed:** §1 #4 pins `total Occurrences = count * leadTimes.length`; the skeleton counts `lunarOccCount` (increments only when an occurrence is generated), adds a `MAX_SKIP_SCAN` guard and `if (ONCE) break` in the skip branch; added a comment that REGULAR fallback sets `isLeap=false` so `convertLunar2Solar` does not return the sentinel `[0,0,0]`.
- **MINOR - the §5 fellBack test uses a weak assert.** The "leap-month anniversary falls back" test asserts `lunarLabel.toContain("16/2")`, which matches both the leap label and the regular label so it cannot tell that the REGULAR fallback dropped "(nhuan)". Recorded as an implementation note (tighten to `not.toContain("(nhuan)")` when implementing); no contract change.

**Cross-FR note (not fixed in the 3 target FRs):** FR-LUNAR-010 §3 redeclares a `Reminder` mirror for the storage layer; it also lacks `notificationStyle`. Runtime is safe because `JSON.parse(...) as Reminder` round-trips every optional field, but the two 004/010 type copies are a duplicate that can drift - recommend FR-010 import `Reminder` from amlich-core rather than keeping a copy (recorded for the shell implementation pass).

Post-fix score: **10/10** (code-level majors fixed).

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

All of the following were fixed in FR-LUNAR-004.md:

1. **todayInHCM signature** - changed from `todayInHCM(nowUtcMs?: number): {dd,mm,yy}` to `todayInHCM(now?: Date): SolarDate` (exact CONTRACT). The matching sub_task is updated.
2. **Occurrence is readonly** - 8 fields got `readonly`; `gregorianDate` is a `string` (not a SolarDate tuple) - noted clearly.
3. **RecurrenceOptions.engineVersion REQUIRED** - confirmed no `?`; added the comment "REQUIRED - CONTRACT".
4. **nextOccurrences / mergeAndSort return type** - changed to `readonly Occurrence[]` for both the signature and the skeleton.
5. **ReminderChannel** - renamed the type from `Channel` to `ReminderChannel` to match CONTRACT.
6. **Reminder.lunarYear** - changed from `lunarYear?: number` to `lunarYear: number | null` (CONTRACT).
7. **Reminder.sharedWith** - changed from `sharedWith: string[]` to `sharedWith?: readonly string[]` (CONTRACT).
8. **Reminder readonly fields** - added `readonly` for every Reminder field.
9. **§5 test AC #12** - changed `todayInHCM(fixedNoon)` (number) to `todayInHCM(fixedNow)` (Date); destructure by tuple `result[0]/[1]/[2]` instead of `{dd,mm,yy}`.
10. **§5 import** - added `type SolarDate` to the import for the test type-check.

Verdict: FR-LUNAR-004 is ready for context-free agent implementation.

*End of audit FR-LUNAR-004.*

*End of audit FR-LUNAR-004.*
