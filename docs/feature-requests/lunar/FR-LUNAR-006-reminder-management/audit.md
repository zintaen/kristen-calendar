---
fr_id: FR-LUNAR-006
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS = 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-006 specifies the reminder management layer: Ram/Mung Mot toggles, the anniversary/custom entry form, lead-time + notify time, the upcoming list, and choosing the notification tone (folds FR-F05). Scope: 16 §1 clauses (two independent MONTHLY toggles, anniversary/custom entry by lunar date, lunar date is the source + solar preview, lead-time multi-select {0/1/3/7} + notifyTime, upcoming sorted by solar date, reschedule after every CRUD, validate blocks bad saves, notificationStyle, render body from a static template without AI, edit/delete, read OccurrenceCache, enabled off keeps data, link content, offline, warn > 64). 7 §2 paragraphs. §3 has tone.ts/store.ts/component props + lead-time constants. 16 ACs. §5 has 9 vitest tests including toggle + CRUD-calls-reschedule + pure tone. §10 lists 13 failure lines. §11 has 7 notes. Maps to PRD FR-B01, FR-B03, FR-B04, FR-B07, FR-F05, section 13.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Enabling Ram/Mung Mot but the device does not ring
The toggle does not sync pending. Resolved: §1 #7 reschedule after each toggle + DEC-LUNAR-064; AC #3.

### ISS-002 - Allowing solar-date entry is wrong across years
Resolved: §1 #4 lunar date is the source, solar date is preview only + DEC-LUNAR-061; AC #4/#5.

### ISS-003 - Editing/deleting a reminder without updating pending
Resolved: §1 #7/#11 each CRUD calls reschedule + DEC-LUNAR-064; AC #9.

### ISS-004 - FR-F05 demands AI personalization in Phase 1 (no backend yet)
Resolved: §1 #9/#10 notificationStyle + render a static template by tone, AI deferred to FR-LUNAR-015 + DEC-LUNAR-065; AC #11/#12.

### ISS-005 - Recomputing the solar date every time the list opens is wasteful
Resolved: §1 #12 read OccurrenceCache if still valid by engineVersion + DEC-LUNAR-066; §10 line 8.

### ISS-006 - Too many reminders, the scheduler silently cuts
Resolved: §1 #16 use getPlanDiagnostics to warn about slotsDropped; AC #15.

## §3 - Resolution

The six core issues are handled: reschedule sync, lunar-date-source, CRUD-reschedule, non-AI personalization in Phase 1, cache display, overload warning. FR-B01 (Ram/Mung Mot toggle), FR-B03 (custom), FR-B04 (lead-time + notifyTime), FR-B07 (upcoming with solar date) map directly to clauses; FR-F05 folds via notificationStyle with static-template render. Every CRUD operation hooks into the FR-LUNAR-005 reschedule ensuring pending matches the data. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **7/10**. Two coherence-level defects the self-audit missed, fixed in the .md:

- **MAJOR - the model exposes `leapFallback` but the UI never surfaces it.** FR-LUNAR-004 §1 #5/#6 gives each `Reminder` a `leapFallback` policy (REGULAR/SKIP/ASK) and emits `fellBack`/`pendingUserChoice` per-occurrence with a clear note "for the UI to let the user confirm"; FR-LUNAR-005 §1 #15 carries this flag into `userInfo`. But FR-LUNAR-006 - the ONLY screen where the user creates/edits a GIO - originally had NO place to choose `leapFallback`, and did not display `fellBack`/`pendingUserChoice` anywhere (ReminderForm only entered the `isLeapMonth` flag). Exactly the brief definition: "a model that exposes a choice the UI never surfaces is a MAJOR." **Fixed:** §1 #2 adds a requirement that the form shows a `leapFallback` selector when `isLeapMonth=true`; §1 #6 adds a requirement that the upcoming list shows a "moved to the regular month" (fellBack) and "must choose the observance month" (pendingUserChoice) label; `ReminderFormProps` + `UpcomingItem` carry the matching fields.
- **MAJOR - `Reminder.notificationStyle` is not on the imported type.** §3 `tone.ts` redeclares `NotificationStyle` locally and §1 #9/AC #11 write `Reminder.notificationStyle`, but the `Reminder` type (owned by FR-LUNAR-004) does not have this field -> producer/consumer mismatch. **Fixed (matched in FR-004):** added `notificationStyle?: NotificationStyle` + type `NotificationStyle` to §3 of FR-LUNAR-004; §3 `tone.ts` of FR-006 changed to `import type { NotificationStyle } from "@cyberskill/amlich-core"` + `export type { NotificationStyle }`, `Tone = NotificationStyle["tone"]`; §1 #9 states clearly the field is owned by FR-004, not redeclared.
- **MINOR - §5 traceability gap.** AC #6 (custom reminder), AC #7 (lead-time multi-select + notifyTime), AC #14 (offline), AC #16 (link content) and AC #5 (solar preview, UI prop) have no test in §5 (9 tests, covering AC #1-#4/#8-#13/#15). Recorded for the implementation pass to add tests; no contract change.

Post-fix score: **10/10** (both majors fixed). sub_tasks (1.5+2.0+1.5+1.5+1.0+1.0+0.5+1.0) = 10.0 = effort_hours.

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

Fixed in FR-LUNAR-006.md:

1. **NotificationStylePicker import** - added `import type { NotificationStyle } from "@cyberskill/amlich-core"` to the component props block to match the "do NOT redeclare NotificationStyle" principle recorded in tone.ts.
2. **ReminderForm props - LeapFallback** - added `import type { Reminder, LeapFallback }` and the prop `onLeapFallbackChange?: (policy: LeapFallback) => void` to `ReminderFormProps` to surface the leapFallback choice when `isLeapMonth=true` (§1 #2, DEC-LUNAR-042, ISS-001 of the independent audit).
3. **AC #5 test - using require()** - rewrote the AC #5 test with `await import(...)` (ESM-safe), added the assert `"gregorianDate" in saved == false`, removed the buried `require(...)` logic that could fail in vitest ESM mode.
4. **AC #5/#6/#7/#14/#16 have tests** - §5 now covers all 16 ACs; the "traceability gap" bubble in the §4 audit is filled.
5. **DEC IDs confirmed** - DEC-LUNAR-060..066 exist in the frontmatter; every AC references the correct DEC ID.
6. **sub_tasks sum = effort_hours** - confirmed (1.5+2.0+1.5+1.5+1.0+1.0+0.5+1.0) = 10.0 = effort_hours; no change.

Verdict: FR-LUNAR-006 is ready for context-free agent implementation.

*End of audit FR-LUNAR-006.*

*End of audit FR-LUNAR-006.*
