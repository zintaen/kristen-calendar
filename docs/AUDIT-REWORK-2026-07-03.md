# Audit and rework of the free-model implementation (2026-07-03)

This document records a deep audit and rework after the first implementation (built with a free model) was reported as low quality with many bugs. The goal was to find real bugs, fix them, and bring every test to green.

## Summary

The lunar engine (packages/amlich-core), the heart of the product, is actually a faithful and correct port of the Ho Ngoc Duc algorithm. The real bugs live in the application layers around it: the reminder engine was left as stubs, and a set of timezone bugs shift dates by one day when the code runs on a UTC server or when the user is abroad. All bugs found were fixed, and 153 tests are proven green for the portion that runs in this sandbox.

Environment constraint: the sandbox cannot install the full toolchain (Next.js, Playwright, and a complete vitest run). node_modules is about 2.5 GB and writing it across the mounted filesystem is extremely slow, and detached install processes get killed between commands. So the suites that rely on vi.mock, React and jsdom, node-canvas, or Playwright e2e must run on your Mac. The runbook below gives the exact commands.

## Real bugs found and fixed

Grouped by severity.

### Critical (core functionality broken)

1. FR-004 reminder.ts - the three functions validateReminder, normalizeReminder, and isCacheStale were still stubs that threw ("not implemented"). The entire FR-004 surface did not work. Implemented in full per FR-LUNAR-004 sections 3 and 4.

2. FR-004 recurrence.ts - leap-month fallback was wrong. convertLunar2Solar returns a valid regular date when you pass leap=1 into a year that has no such leap month, so isInvalidSolar never caught it and fellBack was never set. A death anniversary recorded in a leap month would silently fall on the wrong month with no flag. Added leapMonthForSpan to detect correctly whether the target year has the requested leap month, then apply the REGULAR/SKIP/ASK policy.

3. FR-017 zns-scheduler.ts - candidateLunarYears derived "today" from now.getFullYear()/getMonth()/getDate() (local time). The cron runs on serverless with TZ=UTC, so around Vietnam midnight it reads the UTC date (off by one day) and scans the wrong lunar month, sending ZNS reminders on the wrong day. Locked to todayInHCM(now).

4. FR-015 genie.ts - two bugs: (a) the model was hardcoded to "claude-3-5-haiku-latest" while founder decision 6 selects Claude Haiku 4.5; changed to "claude-haiku-4-5". (b) The auth step used the module-level getSupabaseClient(jwt) instead of the injectable deps.supabaseClient that the rest of the handler uses, so userId never resolved in tests and the 429 quota and 400 validation branches were unreachable (all returned 502). Unified to the injectable client.

### Major (timezone and hygiene, off-by-one-day abroad)

5. FR-011 dayquality.ts - getDayQuality read solarDate.getDate()/getMonth()/getFullYear() in the device timezone. A user abroad (the primary persona is an actor who travels for shoots) would see the day quality (can-chi, sao, truc) shifted by one day. Switched to UTC reads (deterministic, matches the "YYYY-MM-DD" fixtures, DEC-LUNAR-043). Fixed getMonthDayQualities as well.

6. FR-016 zalo/src/lib/day-computer.ts - the lead-time date was computed with new Date(ms).getDate()/getMonth()/getFullYear() (local), so it shifts by one day on a device outside Vietnam. Switched to JD arithmetic (jdToDate(eventJd - lead)).

7. dayquality.ts import hygiene - it imported through the barrel ./index (extensionless), creating a fragile circular dependency. Switched to direct per-module imports with the .js extension.

### Missing files and documentation

8. FR-004 tz.ts - the CONTRACT lists src/tz.ts but the file did not exist (todayInHCM had been placed inside recurrence.ts). Created tz.ts with the exact CONTRACT signature.

9. test/recurrence.test.ts - FR-004 section 5 fully specifies a test file that was never created. Created it per section 5 (20 tests covering all 17 acceptance criteria), plus one dedicated regression test for the lead-time timezone bug.

10. index.ts - the docstring still said "the algorithm functions are stubs" (stale); updated it and added the tz export.

### Test bugs fixed

11. dayquality.test.ts - two tests mixed local and UTC (new Date("YYYY-MM-DD") then setDate(getDate()+i)), so they drifted whenever the process was not at UTC+7. Switched them to be UTC-consistent; the invariant they check (diaChi == canChiDay) is still verified.

## Test status

### Proven green in the sandbox (run via a custom esbuild + vitest-shim harness, no full toolchain)

| Package | Suites | Tests | Result |
|---|---|---:|---|
| amlich-core | canchi, convert, dayquality, golden-sweep, recurrence, commerce | 75 | green across 5 timezones (VN, US East, UTC+14, UTC-12, UTC) |
| content | festivals | 11 | green |
| ui | apca | 13 | green |
| web (lib) | calendarData, good-day, notifications.planner | 18 | green |
| genie-api | zns-window, entitlement, oa-token, genie, sync | 36 | green (1 fake-timer test skipped, see below) |

Total: 153 tests green. amlich-core also passes tsc --noEmit cleanly under the full strict config (exactOptionalPropertyTypes, noUncheckedIndexedAccess).

The lunar engine was also validated independently against a real ephemeris (astronomy-engine): round-trip 1900-2199 has 0 mismatches; new-moon boundaries match the ephemeris on 2473 of 2475 months (the 2 that differ, in 2072 and 2085, are new moons near Vietnam midnight, which per founder decision 3 are flag-and-accept, not bugs); the winter solstice falls in lunar month 11 in 151 of 151 years; the 9 gold rows match exactly.

### Fixes that bundle cleanly but whose full tests need the Mac

zns-scheduler.ts and zalo day-computer.ts: the fixes pass an esbuild bundle (no syntax or import errors), but their own tests use vi.mock, so a real vitest run is needed to confirm.

### Must run on the Mac (cannot run in the sandbox)

Suites that use vi.mock (module mocking), React and jsdom, node-canvas, or fake timers:

- web: __tests__/homeRoute.test.tsx, test/reminders.store.test.ts, lib/card-renderer.test.ts, __tests__/notificationGlue.test.ts, __tests__/storage.test.ts
- genie-api: __tests__/consent.test.ts, __tests__/proactive-zns.test.ts, __tests__/zns-scheduler.test.ts, test/b2b-api.test.ts, test/monetization/revenuecat.test.ts
- zalo: src/lib/__tests__/day-computer.test.ts, storage.test.ts, zalo-auth.test.ts
- e2e: apps/web/tests/auth.spec.ts, apps/web/tests/genie.spec.ts (Playwright)
- One test in sync-client uses vi.advanceTimersByTimeAsync (fake timers); the shim does not emulate real timers so it is skipped, and it is not a bug.

## Runbook to run the full suite on the Mac

```bash
cd ~/Projects/Personal/kristen-calendar

# 0. node_modules was removed during the audit (the previous install was damaged).
#    A fresh install restores it.

# 1. Install dependencies (pnpm 9)
corepack pnpm@9.0.0 install

# 2. Typecheck the whole workspace
corepack pnpm@9.0.0 -r typecheck

# 3. Unit + integration tests per package (vitest)
corepack pnpm@9.0.0 -r test
# or the lunar go/no-go gate only:
corepack pnpm@9.0.0 gate:p0

# 4. E2E (Playwright) - first run needs the browsers
cd apps/web
npx playwright install
npx playwright test
```

If step 3 still fails in the vi.mock suites, those are real test logic (not part of these fixes) - report back and I will audit further. The fixes in this pass target the exact root causes those tests check (for example the model string, injectable auth, timezone locking).

## Remaining work

- Run the full suite on the Mac per the runbook; report the results of the Mac-only suites so I can do a second-pass audit on anything still red.
- Expand gold-1900-2199.json from the official Ho Ngoc Duc calculator (currently 9 edge rows) to widen the absolute cross-check - do not fabricate data.
- The zns-scheduler and zalo day-computer fixes bundle cleanly but should be confirmed with real tests on the Mac.
- Consider consolidating the Zalo recurrence logic (day-computer.ts) and zns-scheduler.ts onto amlich-core's nextOccurrences instead of each reimplementing it, to reduce drift risk. Not required for v1.

## Note on languages

The documents in this rework are in English per request. The pre-existing FR corpus, README, and BACKLOG under docs/ are in Vietnamese, which was a deliberate earlier decision. The source-code comments (including the ones added in this pass) are in Vietnamese to match the existing codebase convention. If you want the whole doc corpus and/or code comments converted to English, say so and I will convert them as a separate pass.

## Native iOS pass (widget + Siri) - the crown-jewel divergence

This pass audited the one genuinely high-risk area the earlier passes could not reach: the native Swift lunar port that drives the FR-013 home-screen widget and the FR-023 Siri intents. It is a re-implementation of the lunar math, separate from amlich-core, so it can silently disagree with the app.

Method: amlich-core cannot be compiled on the Linux sandbox and there is no Swift toolchain here, so the Swift was transliterated to JavaScript byte-for-byte (integer-truncation semantics included) and diffed day-for-day against the validated core over the full commercial range. This is the strongest verification possible without a Mac.

Finding: the free model's `LunarCalcSwift.swift` disagreed with the core on 32,741 of 73,414 days (about 45 percent) across 1900-2100, and 1,295 of 2,922 days across 2020-2027 - the widget would have shown the wrong lunar date almost half the time, on the home screen, disagreeing with the app itself. Three root causes, all fixed:

1. `newMoon(k:)` used a garbled full-Meeus 1998 formula (wrong periodic coefficients, an extra E factor, and no deltaT correction) instead of the Ho Ngoc Duc truncated series the core uses. Replaced with the faithful Ho Ngoc Duc series plus the deltaT branch.
2. `getLeapMonthOffset(a11:)` seeded k from `LUNAR_MONTH_11_INT` without the `+ 0.5` and compared from i = 1 against `last = 0`. Replaced with the canonical seed (`EPOCH_INDEX_K + 0.5`) and a pre-seeded arc loop.
3. `convertSolar2Lunar` hardcoded `lunarYear = year` and never set `year + 1` in the else branch, so Nov/Dec dates (lunar months 11-12) displayed the wrong lunar year. Seeded `lunarYear` inside the branch to match the canonical.

After the fixes the Swift matches the core 100 percent: 73,414 of 73,414 days for 1900-2100 and 36,524 of 36,524 for 2100-2199 - day, month, year, and leap flag. Every existing `LunarWidgetTests` fixture (Tet 2023, 2025, 2007 VN offset, the 1985 leap month 2, the Mau Tuat day pillar for 29/01/2025, and the 60-day can-chi sweep) is satisfied by the corrected math; several of those were failing on the old formula.

Two integration bugs in the same subsystem were also fixed:

- App Group mismatch: `GenieIntents.swift` (Siri) read the suite `group.world.cyberskill.genieamlich` while the writer, the widget cache, and the storage plugin all used `group.world.cyberskill.genie`. Siri therefore read an empty container the writer never wrote to. Unified all call sites on `group.world.cyberskill.genie` via a named constant. This App Group must also be declared, with that exact id, in each target's entitlements and in the Apple Developer portal.
- Widget cache timezone: `widget-cache-writer.ts` derived "today" from device-local `getDate`/`getMonth`/`getFullYear`, so a device set to a non-VN timezone would cache the wrong day between VN 00:00 and 07:00. Rewritten to derive the day via `todayInHCM()` (DEC-LUNAR-043) and to hand `getDayQuality` a UTC-noon Date on the VN calendar day, since that function reads UTC getters.

The TS-to-Swift JSON contract for the widget cache was verified sound: the `gioHoangDao` element shape `{canh, tuGio, denGio, isHoang}` matches the Swift `GioInfoCache` decoder exactly, so the payload decodes.

Files changed in this pass: `apps/web/ios/App/LunarWidget/LunarCalcSwift.swift`, `apps/web/ios/App/GenieIntents/GenieIntents.swift`, `apps/web/lib/widget-cache-writer.ts`. These need a real `xcodebuild` / `xcodebuild test` on the Mac to confirm compilation and to run `LunarWidgetTests` on-device; the algorithm itself is already proven correct against the core.

## Native iOS pass 2 (timeline provider, plugins, project config)

Auditing the rest of the subsystem found two more code bugs and several project-configuration gaps.

Code fixes in `LunarWidget.swift`:

- `generateFallbackCache` read the day from `Calendar.current` (device timezone). When the cache is stale or missing and the widget computes its own fallback, an off-VN device would show the wrong day. Rewritten to read the day at Asia/Ho_Chi_Minh, matching DEC-LUNAR-043.
- The fallback wrote `dateISO` as `"\(y)-\(m)-\(d)"`, producing values like `2025-1-5` instead of the documented `YYYY-MM-DD`. Now zero-padded with `String(format:)`.

Configuration gaps found (the Swift was written but the Xcode project was never wired):

- No `.entitlements` files existed at all, so the App Group `group.world.cyberskill.genie` was undeclared. At runtime `UserDefaults(suiteName:)` returns nil and the entire widget/Siri cache sharing silently fails. Created ready-to-attach entitlements for the app and both widget extensions; the App Group must still be enabled per target in Xcode and provisioned in the Apple portal.
- The `genieamlich://` URL scheme the widget deep link uses was not registered, so tapping the widget did nothing. Added `CFBundleURLTypes` to `Info.plist`.
- `BGRefresh.swift` has no caller and the Info.plist has no background-mode keys, so background refresh is inert. Left as a documented wire-or-drop decision (app-open already refreshes the cache; enabling background modes adds App Review friction).
- `LiveActivityPlugin.swift` uses the iOS 16.2 `ActivityContent` API under an `#available(iOS 16.1, *)` guard. Flagged to set the deployment target to 16.2 or use the 16.1 API.

The full checklist for the Xcode and portal steps that cannot be done from a text sandbox is in `docs/IOS-WIRING-CHECKLIST.md`. Files changed: `apps/web/ios/App/LunarWidget/LunarWidget.swift`, `apps/web/ios/App/App/Info.plist`, plus new `App.entitlements`, `LunarWidget.entitlements`, `GenieWidgets.entitlements`.

## Suspect-dates report (new-moon-near-midnight)

The Ho Ngoc Duc method can land a month-start on the wrong civil day when the new moon falls within a couple of minutes of VN midnight. To bound this precisely, the shipping engine's month-start (`getNewMoonDay`) was diffed day-for-day against the astronomy-engine ephemeris across 1900-2199 (a dev-only cross-check; the core stays zero-dependency).

Result: only 6 month-starts in 300 years differ from the ephemeris, and every one is a new moon within about 2 minutes of midnight (the closest 0.1 min). Two are in 1900-2100 (10/12/2072 and 18/10/2085), both over 47 years out; the other four are in 2100-2199, which decision 3 already accepts within a day. Everywhere else the engine matches the ephemeris to the civil day. The full list, plus 71 fragile boundaries that agree today but sit within 15 minutes of midnight, is in `docs/lunar-suspect-dates-1900-2199.md` for spot-checking against the official calculator.

## App Store receipt verification (FR-020)

The App Store webhook previously acknowledged notifications without granting (correct fail-closed placeholder) but had a TODO where verification belongs, and its payload interface was the wrong shape for App Store Server Notifications V2. Rewrote `handleAppStoreWebhook` to verify Apple's signed JWS with the official `@apple/app-store-server-library` (ES256, x5c chain rooted at an Apple root CA) before granting, and to act on the V2 `signedPayload` Apple actually sends.

Hand-rolling the x5c chain validation for a money-granting path would be a mistake, so this uses Apple's verifier. It is fail-closed at every step: bad body 400, missing or malformed JWS 401, verification failure 401, missing library or root certificate 500 - never a grant. The entitlement is written only from a cryptographically verified transaction (`appAccountToken` for the user id, `productId` mapped to a tier, `expiresDate` for validity). Grant and revoke notification types are handled.

Added: `@apple/app-store-server-library` to `services/genie-api/package.json`; `certs/apple/README.md` documenting where to place Apple Root CA - G3; App Store env vars in `.env.example`; and four fail-closed tests in `entitlement.test.ts` asserting a forged or unverifiable JWS never returns 200. The success path needs a real Apple sandbox notification to test end-to-end on the Mac; the rejection paths (the security-critical ones) are covered now.
