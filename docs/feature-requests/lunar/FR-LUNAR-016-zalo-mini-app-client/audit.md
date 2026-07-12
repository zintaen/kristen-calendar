---
fr_id: FR-LUNAR-016
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS > 6 minimum; DEC-LUNAR-160..165 applied; consent + storage + push-limitation rules encoded)
---

## §1 - Verdict summary

FR-LUNAR-016 specifies the Zalo Mini App client for "Genie Am Lich". Scope: 15 BCP-14 clauses in §1 (initialize zmp-sdk, import amlich-core offline, zmp Storage stores only settings and reminders, Home + CalendarGrid + Reminder CRUD, ConsentSheet before getUserInfo and getPhoneNumber, ZNS-only push, purple theme, Settings deletes data, occurrence cache in memory). 6 §2 rationale blocks. §3 has the full types (`ZaloReminder`, `ZaloSettings`, `StorageData`, `UpcomingOccurrence`), storage.ts, zalo-auth.ts, day-computer.ts, reminder-service.ts and an app-config.json excerpt. 14 testable acceptance criteria. §5 has 5 test cases covering the Storage round-trip, lunar date fixtures, leap-month fallback, the consent guard and the phone token. §10 lists 14 failure rows. §11 has 7 implementation notes. Maps to PRD §9 (Zalo client), §14 (Phase 3), Key Findings 3 (Zalo reach ~80 million users), and NFR-Privacy/PDPL.

## §2 - Findings (all resolved during authoring)

### ISS-001 - The Mini App calls getUserInfo implicitly on startup, violating PDPL
If it calls `getUserInfo` in a startup `useEffect` without consent, the app collects personal data before the user agrees - violating PDPL effective 01/01/2026 and Zalo policy. Resolved: §1 #7 requires a ConsentSheet before calling the API; DEC-LUNAR-163; AC #5; the "consent guard" test in §5.

### ISS-002 - getPhoneNumber returns a token, not the real number - risk of storing the wrong thing
Many developers wrongly assume `getPhoneNumber` returns the real phone number and store it straight into Storage to send ZNS; in reality the token must be exchanged via the OA API on the server. Resolved: §1 #8 states clearly to store only the token; §6 notes "the hardest point"; DEC-LUNAR-163; §8 payload has `"phone": "zalo_phone_token_xyz"`; §11 note 2.

### ISS-003 - The Mini App sends push notifications itself, violating the Zalo platform limitation
There is no native push API in a Zalo Mini App; if the design allows channels: ["LOCAL"] it will have no effect and confuse users. Resolved: §1 #13 MUST NOT send push itself; DEC-LUNAR-162; type `ReminderChannel = "ZNS"` only (no "LOCAL"); AC #12 confirms no lunar-calendar network call; §10 row "redirect to FR-017".

### ISS-004 - zmp Storage is over-written with a full OccurrenceCache, exceeding the limit
Storing every `OccurrenceCache` for multiple years into zmp Storage quickly exceeds the ~1 MB limit. Resolved: §1 #3 + DEC-LUNAR-161 stores only Settings + Reminder[]; §4 AC #7 confirms Storage has no cache; `day-computer.ts` computes on-the-fly; §10 row "User with >50 Reminders" handled separately.

### ISS-005 - amlich-core may not build in zmp's webpack due to ESM/CJS conflict
The Zalo Mini App uses webpack; `@cyberskill/amlich-core` will not import into the Zalo bundle if it only exports ESM. Resolved: §11 note 3 ("check the exports field in the core's package.json to ensure the CJS bundle is exported"); AC #13 confirms `zmp build` has no warning; DEC-LUNAR-164.

### ISS-006 - The purple theme is "swallowed" by zmp-ui's CSS specificity
zmp-ui injects CSS with high priority; overriding with an ordinary class means the purple is overwritten by the default color. Resolved: §1 #11 + DEC-LUNAR-165 override via CSS variables; §11 note 4 (embed into `zalo/src/styles/theme.css` and check specificity); AC #8 checks the visual no longer has the default blue.

## §3 - Resolution

All 6 substantive issues resolved during authoring. Consent before getUserInfo/getPhoneNumber (ISS-001) is the most important item for both PDPL and Zalo policy; token vs. phone number (ISS-002) and the push limitation (ISS-003) are traps that can cost hours of debugging if not stated clearly from the start. Storage over-write (ISS-004), ESM conflict (ISS-005) and CSS specificity (ISS-006) are concrete implementation issues that must be pinned before coding. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

The independent reviewer compared §3/§5 against the upstream FR-LUNAR-001/004 contract. Pre-fix independent: 8/10. Two defects fixed:

- MAJOR - `todayLunar()` reads `now.getDate()/getMonth()/getFullYear()` by device TZ then passes it into the engine with `tz=7.0`. When the user is abroad, the device's civil date differs from the Vietnam date -> "today's" lunar date is wrong, violating §1 #12 and AC #14 (the calendar must lock to Asia/Ho_Chi_Minh). Fixed: import `todayInHCM()` from amlich-core (FR-004) and derive the HCM date before calling `convertSolar2Lunar`.
- MAJOR (test) - the §5 test reads `lunar.lunarDay/.lunarMonth/.lunarYear` on the result of `todayLunar()`, but FR-001's `LunarDate` is a tuple `[day, month, year, leap]` (not an object) -> the test does not compile/run. Fixed: destructure the tuple `const [lunarDay, lunarMonth, lunarYear] = todayLunar()`.
- MINOR - the §10 row "convertLunar2Solar returns null" changed to the sentinel `[0,0,0]` (the engine does not return null).

Recorded (not fixed): `ZaloReminder` lacks the `recurrence` and `sharedWith` of the FR-004 model - acceptable for a client computing on-the-fly but it should carry `recurrence` to distinguish MONTHLY/ANNUAL when generating occurrences; AC #14 has no backing test (only a description). Post-fix: 9/10.

## §4 - Readiness pass (2026-06-28)

Applied 3 changes per the harden task:

1. The import `canChi` (nonexistent) changed to `canChiDay` (the correct name in CONTRACT.md).
2. `todayInHCM()` returns a TUPLE `SolarDate` - changed from `const { dd, mm, yy } = todayInHCM()` to `const [dd, mm, yy] = todayInHCM()`.
3. `ZaloReminder` added the field `recurrence: "MONTHLY" | "ANNUAL" | "ONCE"` - needed for `getUpcomingOccurrences` to distinguish Ram/Mung Mot (MONTHLY) from a death anniversary (ANNUAL); all fixtures in §5 and §8 updated accordingly.

No change to frontmatter ids/depends_on/blocks/DEC-ids/effort_hours. Ready for handoff without further context.

*End of audit FR-LUNAR-016.*
