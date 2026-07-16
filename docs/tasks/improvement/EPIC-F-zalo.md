# EPIC F - Zalo Mini App (Z1-Z4)

zalo/. Report sections 2 (F7) and 6. Z1 + Z2 together carry review blocker F7. Review item Z5 (zalo in CI) is merged into I1.

---

## Z1. Build the Zalo calendar grid and reminder form pages

Priority P0 | Effort L | Executor: agent

Context: `zalo/src/pages/calendar/index.tsx` renders a placeholder sentence; `reminder-form/index.tsx` has no fields and its Save button just navigates back. Both routes are live in navigation, so users hit dead ends. This is half of review blocker F7.

Steps:
1. Calendar page: month grid using `@cyberskill/amlich-core` (`convertSolar2Lunar`, festival dots via `@cyberskill/genie-content`'s `buildFestivalDateSet`), month prev/next, day tap opens a detail sheet (lunar date, can chi, festival if any). Mirror the web `buildMonthGrid` logic; if practical, lift that pure helper into the core or shared package instead of copying (respect the no-duplication rule).
2. Reminder form page: fields matching the web form (title, lunar day 1-30, lunar month 1-12, leap-month handling with `leapFallback`, lead times, notify time); validate through the same rules as `validateReminder` in amlich-core; save via `reminder-service.upsertReminder`; on success navigate to the list with a toast; on failure show errors inline (Z3 covers the storage error path).
3. Handle the `/reminder/:id` edit route (load existing, prefill, update).
4. Tests: form validation mapping, calendar grid month math for a leap-month year (1985 or 2025), edit round-trip against a mocked storage.

Acceptance criteria:
- [ ] No placeholder text remains anywhere under `zalo/src/pages` (`git grep -n "se hien thi o day\|se o day" zalo/src` empty).
- [ ] Create, edit, and list a reminder end to end against mocked zmp APIs in tests.
- [ ] Calendar renders a correct grid for 2025-06 (leap month year) in a test.

Verify: `pnpm --filter @cyberskill/genie-zalo test && pnpm --filter @cyberskill/genie-zalo build`

---

## Z2. Add the Zalo app id and deploy flow

Priority P0 | Effort S | Executor: agent+human

Context: `zalo/app-config.json` has no app id, so `npx zmp deploy` (root `deploy:zalo` script) cannot target an app. The other half of review blocker F7.

Agent steps: add the `app.id` field wired from a checked-in non-secret id (Zalo Mini App ids are public identifiers); document the full flow in DEPLOYMENT.md - `zmp login`, `pnpm deploy:zalo`, testing via the Zalo sandbox QR; add a preflight check in the deploy script that fails with a clear message when the id is missing.

Human steps: register or confirm the Mini App in the Zalo Developer console, supply the id, run the first deploy, verify the sandbox build opens on a device.

Acceptance criteria:
- [ ] `pnpm deploy:zalo` reaches the upload step (or fails only on credentials, not config).
- [ ] DEPLOYMENT.md documents login, deploy, sandbox test, and release approval steps.

---

## Z3. Add error handling to Zalo storage and consent flows

Priority P1 | Effort S | Executor: agent

Context: `saveReminders`/`saveSettings`/`clearAll` in `zalo/src/lib/storage.ts` have no try/catch; a failed `setStorage` rejects unhandled with no user feedback. `ConsentSheet.tsx` catches errors but silently closes, so a failed consent looks like success.

Steps: wrap the three write paths, surface failures to callers as typed results (`{ok:false, error}`); pages show a zmp-ui toast/snackbar with a retry action; ConsentSheet stays open on failure with an inline error and retry; distinguish first-run empty storage from read errors in `loadStorageData` (log the latter). Tests: mocked `setStorage` rejection produces the error result and the sheet stays open.

Acceptance criteria:
- [ ] No unhandled promise rejection from any storage write (test proves the rejection path).
- [ ] Failed consent shows an error and does not report ZNS as enabled.

Verify: `pnpm --filter @cyberskill/genie-zalo test -- storage`

---

## Z4. Type the home state; clean day-computer

Priority P2 | Effort S | Executor: agent

Context: `pages/home/index.tsx:8-9` uses `useState<any>` for lunarDate and canChi, discarding core types; `lib/day-computer.ts:54` computes an unused `todayJdn` while `addOccurrence` recomputes `todayInHCM()` per loop iteration.

Steps: type the state as `LunarDate | null` and `CanChi | null` from `@cyberskill/amlich-core`; hoist one `todayInHCM()`/`jdFromDate` result outside the loop in `getUpcomingOccurrences` and pass it down; delete the dead variable; confirm the existing leap-month lead-time test still passes.

Acceptance criteria:
- [ ] `git grep -n "useState<any>" zalo/src` empty; no unused-var lint warnings in day-computer.
- [ ] Existing tests green.
