# EPIC I - testing (Q1-Q7)

Report section 9. Q1-Q4 run in wave 4 alongside CI work; Q5-Q7 in wave 5.

---

## Q1. Coverage reporting with thresholds

Priority P1 | Effort S | Depends: I1 | Executor: agent

Steps: add `@vitest/coverage-v8` to the workspaces with tests; root script `test:coverage` = `pnpm -r test -- --coverage`; per-package vitest config `coverage.thresholds` starting at current-measured minus nothing (ratchet-only: set thresholds to the measured baseline so coverage can only rise); upload lcov as a CI artifact; record the baseline table in the handoff.

Acceptance criteria:
- [ ] CI publishes coverage per workspace; lowering coverage below baseline fails the build.

Verify: `pnpm --filter genie-web test -- --coverage`

---

## Q2. e2e tests for the money paths

Priority P1 | Effort L | Depends: F1, F8, W3 | Executor: agent

Context: Playwright covers only the (removed in S3) master login and one stubbed Genie reply. The core product flows have zero e2e coverage.

Steps, one spec file each:
1. `reminders.spec.ts`: create a GIO reminder (title + lunar date), see it in the upcoming list, edit it, delete it; toggle Mung Mot / Ram and verify list changes; invalid day shows the W3 inline error.
2. `calendar.spec.ts`: navigate months, tap a festival day, detail panel shows lunar date and festival content, share-card sheet opens.
3. `consent.spec.ts`: fresh profile sees the consent gate; Reject All -> no network calls to sync endpoints (assert via `page.route` counters); accepting cloudSync enables sync client calls; policy-version bump re-prompts.
4. `auth.spec.ts` (rewrite): login with env-injected dev credentials against stubbed Supabase routes; logout clears session.
5. `genie.spec.ts` (extend): authenticated request carries the bearer header (F1); free tier sees the upgrade prompt (stub 403), premium stub gets a reply.
Run against the static export (`next build && serve out`) rather than dev where feasible, matching production behavior; keep stubs for Supabase and the API.

Acceptance criteria:
- [ ] All five specs green in CI on the export build; consent spec proves the no-consent-no-network property.

Verify: `pnpm --filter genie-web run test:e2e`

---

## Q3. Direct tests for api/sync handlers

Priority P1 | Effort M | Depends: S6 | Executor: agent

Context: the file named `__tests__/sync.test.ts` tests frontend code; no test exercises `handlePush/handlePull/handleShare/handleInvite/handleInviteAccept/handleDeleteAccount`.

Steps: new `__tests__/sync-handlers.test.ts` with a mocked Supabase client factory: push with mismatched userId -> 400 (S6); push valid rows -> upsert called with JWT subject; pull returns only caller rows; share respects owner RLS expectations; invite accept enforces jti one-time use and family limit; delete removes the documented categories (extends in PD1); malformed bodies -> 400 via B3 schemas.

Acceptance criteria:
- [ ] Every handler in `api/sync.ts` has at least one happy-path and one adversarial test; the S6 mismatch case is covered explicitly.

Verify: `pnpm --filter @cyberskill/genie-api test -- sync-handlers`

---

## Q4. Webhook contract tests

Priority P1 | Effort S | Depends: S2, S7 | Executor: agent

Steps: consolidate a `__tests__/webhooks.contract.test.ts` asserting the cross-provider security contract in one place: RevenueCat - no auth 401, bad secret 401, duplicate event.id skipped; Zalo Pay - bad MAC 401, missing key fails closed in production and staging, dummy key only with the explicit dev flag; App Store - existing fail-closed branches (import the cases, keep them living here so a refactor cannot silently drop one); replay - same provider event twice grants once (B8 when landed, otherwise assert idempotent upsert result).

Acceptance criteria:
- [ ] One file documents and enforces the full webhook security contract; runs in CI (I1).

---

## Q5. Fill or delete the empty card-renderer test stub

Priority P2 | Effort S | Executor: agent

Context: `lib/card-renderer.test.ts` "drawCard runs with fallback font when load fails" sets up fake timers and asserts nothing - a passing empty test.

Steps: implement it - mock `FontFace.load` rejection, assert drawCard resolves using the fallback stack and the canvas still meets the APCA gate; or delete the stub with a comment. Implementing is preferred; the fallback path is real production behavior.

Acceptance criteria:
- [ ] No test in the repo passes without at least one assertion (spot-grep `it(` blocks lacking `expect`).

---

## Q6. Property-based tests for the lunar core

Priority P2 | Effort M | Depends: C1 | Executor: agent

Steps: add `fast-check` as a devDependency of amlich-core; properties over 1900-2199: round-trip identity (random valid solar date), month-start monotonicity (consecutive lunar months start 29 or 30 days apart), leap invariants (a leap year has exactly 13 months; leap month index within 1-11 per the algorithm's constraints), can-chi day cycle (canChiDay(jdn+60) equals canChiDay(jdn)); seed-pinned runs so CI is deterministic, plus a nightly unpinned run if desired.

Acceptance criteria:
- [ ] Four properties running in the core test suite with fixed seeds; failures print the shrunk counterexample date.

Verify: `pnpm --filter @cyberskill/amlich-core test -- property`

---

## Q7. iOS smoke test for the Capacitor shell

Priority P2 | Effort M | Depends: F4, F5 | Executor: agent+human

Context: all native-bridge code (notifications, preferences, EventKit, LiveActivity, AppGroup storage) is untested by anything automated.

Agent steps: add an XCUITest target with one smoke test - app launches, bottom nav tabs render, settings opens; plus a unit test target for `DayInfoCache` (App Group read/write round-trip) and the BGRefresh task registration guard. Wire `xcodebuild test` into a documented script (`apps/web/ios/run-tests.sh`); CI integration optional (macOS runners cost - document the tradeoff, run locally per release at minimum).

Human steps: run the suite on a simulator per release; record results in the release checklist (D5).

Acceptance criteria:
- [ ] `./apps/web/ios/run-tests.sh` passes locally on a simulator; release checklist references it.
