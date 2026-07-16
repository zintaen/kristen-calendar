# Production readiness review - Genie Am Lich

Date: 2026-07-06
Scope: full monorepo (packages/amlich-core, packages/content, packages/ui, apps/web, services/genie-api, zalo, deploy, CI, docs, git history).
Method: four parallel code audits (core, web, backend, zalo/infra) plus direct verification of every blocker-level claim against source, git history, and current Vietnam PDPL requirements.

Every finding below includes a file reference. Items are numbered for tracking: S = security, F = functional, B = backend, W = web, C = core packages, Z = zalo, I = infra/CI, P = PDPL/privacy, Q = quality/testing, D = docs.

## Verdict

The engineering foundation is strong: the lunar engine is real, well-structured, and passes a 100,000+ day round-trip sweep; RLS is enabled on sensitive tables; the App Store webhook verification is exemplary; PDPL consent is modeled end to end. The project is NOT production-ready today. There are 7 security blockers (one payment-bypass hole, one leaked credential in git history, one client-shipped master-account backdoor), 8 functional blockers (the paid Genie feature cannot authenticate, the PWA has no service worker, iOS will crash on calendar permission, IAP is wired to placeholder keys), and a CI pipeline that tests only 1 of 6 workspaces.

Scorecard (1-5, 5 = production grade):

| Area | Score | One-line reason |
|---|---|---|
| Lunar core correctness | 4 | Solid algorithm and round-trip sweep; golden ground-truth fixtures are a 9-row placeholder |
| Backend security | 2 | RevenueCat webhook unauthenticated; cron secret not timing-safe; client-supplied userId trusted |
| Web app | 2.5 | Good architecture; no service worker, no error boundaries, auth token never written |
| iOS (Capacitor) | 2 | Missing Info.plist keys and entitlements will crash or silently disable features |
| Zalo Mini App | 2 | Two core pages are placeholder stubs; no app id; excluded from CI |
| Privacy (PDPL) | 3 | Consent modeled well client-side; server does not enforce it; deletion incomplete |
| CI/CD | 1.5 | Only amlich-core tested; lint silently skipped; no deploy path, no scanning |
| Infra | 3 | Clean network isolation and auto-TLS; no security headers, no rate limit, no resource limits |
| Docs | 2 | README claims the core is unimplemented; it is fully implemented; PRD file untracked |

---

## 1. Security blockers (fix before anything is publicly reachable)

S1. Rotate the leaked Supabase service_role key and scrub git history.
Commit `e3aacf0` added a real key (`SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0...`) to `.env.docker`; commit `6d0fffa` added earlier JWT-style keys. The file was emptied later, but history is on `origin/main`. A service_role key bypasses RLS entirely. Actions: rotate the Supabase key, the Anthropic key, and CRON_SECRET now; rewrite history with `git filter-repo` or BFG; force-push and invalidate stale clones; add gitleaks or trufflehog to CI plus a pre-commit hook so this class of leak cannot recur. DEPLOYMENT.md says "ACTION REQUIRED" for this rotation; nothing in the repo proves it happened.

S2. RevenueCat webhook has no authentication at all.
`services/genie-api/api/monetization/revenuecat.ts` parses the body and grants or revokes entitlements with the service-role client. Anyone who finds the URL can POST `{event:{type:"INITIAL_PURCHASE",app_user_id:"<uuid>"}}` and get premium for free, or expire another user's paid plan. Fix: require RevenueCat's `Authorization` header shared secret, compare with `crypto.timingSafeEqual`, dedupe on `event.id`, and add a test that unauthenticated posts return 401.

S3. Master-account backdoor ships in the client bundle.
`apps/web/app/login/page.tsx` lines 43-48 map username `kristen` + password `1991` to `kristen@master.com` / `1991_master_kristen`, and `services/genie-api/scripts/seed-master.ts` commits the same plaintext password. The web app is a static export, so this logic and the credential recipe are readable in shipped JS. Fix: delete the mapping, rotate that account's password, gate any seed users behind dev-only scripts, and re-point the Playwright fixture at a dev-seeded account injected via env.

S4. Cron endpoints compare CRON_SECRET with `!==` and accept caller-supplied payloads.
`api/zns.ts:15` and `api/proactive-zns.ts:13` use plain string inequality (a timing side channel), while the same codebase already has `safeEqualHex` for Zalo Pay. Worse, `/api/zns` reads `reminders` (phone numbers plus template data) from the request body, so whoever holds the secret can send arbitrary ZNS messages through your OA - a smishing and quota-burning vector. Fix: timing-safe compare on both routes, and make the cron scan Supabase itself instead of trusting the body.

S5. ZNS idempotency is a no-op in production.
`api/zns.ts:34` calls `runZNSCron(reminders)` without the `alreadySentChecker` argument, so the default `async () => false` is used and every rerun resends everything (duplicate messages, real money, OA quota). The checker logic exists and is unit-tested, it just is not wired. Fix: wire a checker backed by `zns_send_log`, and add a unique constraint on (reminder_id, phone, send window) so the database backstops the check-then-insert race.

S6. `/api/sync/push` trusts client-supplied userId.
`api/sync.ts:45-57` and `lib/rls-helpers.ts:21` upsert rows with `user_id` taken from the request body; only the Postgres RLS policy stops cross-user writes. One future migration mistake or a switch to the service-role client turns this into full cross-user write. Fix: resolve identity server-side via `client.auth.getUser()` and reject any row whose userId differs; add a test that a mismatched userId is refused.

S7. Zalo Pay webhook fails open outside strict production.
`api/webhook-payment.ts:190-195` uses the literal `"dummy_key"` HMAC key whenever `NODE_ENV !== "production"` - so a staging box or a container with NODE_ENV unset accepts forged payment callbacks signed with a key printed in the source. Fix: deny by default; allow the dummy key only when an explicit `ALLOW_DUMMY_WEBHOOK_KEY=true` dev flag is set.

## 2. Functional blockers (the product does not work as designed)

F1. The backend auth token is never written, so Genie and entitlements are always anonymous.
`lib/genie-client.ts:48`, `lib/entitlement-client.ts:42`, and `components/UpgradePrompt.tsx:38` all read `Preferences.get({key:'token'})`; nothing in the codebase ever writes that key (verified by grep - the only `Preferences.set` is the generic storage layer with its own keys). Every Genie call therefore arrives with an empty bearer, gets treated as anonymous, and is rejected 403 by the free-tier gate. The flagship paid feature is broken end to end. Fix: after Supabase login, persist the access token (or better, call `supabase.auth.getSession()` at request time and drop the parallel token store entirely), and add refresh handling.

F2. There is no service worker, so the PWA is not a PWA.
No sw.js, workbox, serwist, or next-pwa anywhere in apps/web. No offline shell, no install-time caching, no update flow. For an app whose core promise is "works offline, reminds you", this is a launch blocker on web. Fix: adopt Serwist (the maintained successor to next-pwa, compatible with Next 15 static export), precache the app shell and fonts, and add an update-available toast.

F3. Web notifications are a stub that always refuses.
`lib/notificationGlue.ts` WebNotificationStub returns false from requestPermission and no-ops all scheduling. Web/PWA users get zero reminders. Fix: either implement Notification API + service-worker scheduled notifications (with the honest caveat that background delivery on web is best-effort) or clearly scope web as a companion and push users to iOS/Zalo for reminders - today the UI silently pretends.

F4. iOS will crash the moment calendar access is requested.
`components/EventKitBridge.ts` calls a native calendar permission request, but `ios/App/App/Info.plist` has no `NSCalendarsUsageDescription` / `NSCalendarsFullAccessUsageDescription`. iOS kills the app with SIGABRT on that code path. App Store review would also reject it.

F5. iOS push and background refresh are silently dead.
`App.entitlements` lacks `aps-environment` while `usePushNotifications.ts` calls `PushNotifications.register()`; `BGRefresh.swift` registers `world.cyberskill.genieamlich.refresh` but Info.plist lacks `BGTaskSchedulerPermittedIdentifiers` and `UIBackgroundModes`. Registration and refresh no-op with no error surfaced.

F6. IAP is hardwired to placeholders.
`lib/monetization/IAPService.ts` uses `apiKey: "appl_XXXXX"` / `"goog_XXXXX"` and `appUserID = "local-dev-user"` for every user, so purchases cannot work and would all collapse into one RevenueCat identity. Fix: env-inject real keys at build time, log in to RevenueCat with the Supabase user id after auth, and call `Purchases.logIn` on auth changes.

F7. The Zalo Mini App cannot ship and two core screens are stubs.
`zalo/app-config.json` has no app id, so `zmp deploy` fails. `zalo/src/pages/calendar/index.tsx` renders "Tinh nang lich thang (Grid) se hien thi o day" and `reminder-form/index.tsx` has no fields and a Save button that just navigates back. Both routes are live in the nav, so users hit dead ends. The task manifest marks TASK-016 PASS 10/10, which is wrong.

F8. No error boundaries anywhere in a static-export app.
Zero `error.tsx`, `not-found.tsx`, or `loading.tsx` under `app/`; no class error boundary. Any uncaught render error is a permanent white screen with no recovery. Add a root `error.tsx` and `not-found.tsx` at minimum, plus per-route boundaries for calendar and reminders.

## 3. Backend majors (services/genie-api)

B1. CORS is `*` on every route (`index.ts:26`), including sync, consent, and entitlements. Restrict to the real web origin(s), the Capacitor origin, and the Zalo Mini App origin, and vary per environment.

B2. Nearly every handler returns raw `error.message` to the client on 500 (sync, consent, entitlement, commerce, revenuecat), leaking Postgres and Supabase internals. Route errors through the existing (good) global onError and return a request id instead.

B3. zod is installed and imported but never used; all body validation is hand-rolled and several bodies are just `as`-cast interfaces. Add zod schemas per route (SyncPushBody, SharePatchBody, ConsentLogEntry, Genie body including a max size on `context`), and wire `@hono/zod-validator`.

B4. No body-size limits anywhere. A large `context` on `/api/genie` directly inflates Anthropic token cost; an unbounded reminders array hits Postgres in one upsert. Add Hono `bodyLimit` (for example 64KB default, 8KB for genie) plus an array-length cap on sync push.

B5. Redis down takes Genie down. `lib/rate-limiter.ts` falls back to Postgres only when REDIS_URL is unset; a configured-but-unreachable Redis rejects and bubbles up as 502 for all users. Catch Redis errors and fall through to the Postgres RPC path.

B6. `/api/genie` treats missing/invalid JWT as `userId="anonymous"` and relies on the free-tier flag to say no. Require a valid JWT (401) before any entitlement logic.

B7. Fire-and-forget entitlement grants. The Zalo Pay handler responds 200 then processes the grant in a detached promise; a crash or deploy drops a paid grant silently and Zalo will not retry. Await the grant before responding (webhook senders tolerate latency), or persist an outbox row first.

B8. No replay ledger for payment webhooks. Upsert semantics limit damage, but record processed transaction ids (Apple transactionId, Zalo orderId, RevenueCat event.id) and skip duplicates.

B9. Three payment sources (App Store direct, Zalo Pay, RevenueCat) write `user_entitlements` with no precedence or reconciliation. Decide the source of truth per platform and reject or log conflicting writes.

B10. No env validation at boot. Missing SUPABASE_URL, ANTHROPIC_API_KEY, CRON_SECRET, or JWT_SECRET silently degrade to dev fallbacks (`"dummy-service-key"`, `"fallback-secret-for-dev"` in `lib/invite.ts:4`). Add a zod env schema that hard-fails startup in production.

B11. The Dockerfile copies the entire monorepo (all workspaces, devDependencies, source) into the runtime image and runs `tsx` against source. Add a real build (tsc), `pnpm deploy --prod` or prune, a slim runner stage without the cairo/pango toolchain, and a `HEALTHCHECK` instruction.

B12. No graceful shutdown. Add SIGTERM/SIGINT handlers that stop accepting connections, flush pending writes, and quit Redis.

B13. Observability is near zero: one structured log line on genie only, no request ids elsewhere, no metrics, no error tracker. Add pino with request-id middleware, Sentry (or self-hosted GlitchTip), and a `/ready` readiness probe that checks Supabase and Redis.

B14. B2B API keys have no brute-force protection and `decision_boards/options/votes` are public read+insert with no rate limit (spam vector). Add per-IP rate limiting at Caddy and per-key backoff in `b2b/middleware.ts`; require captcha-lite or authenticated inserts for polls, or at minimum a per-IP insert cap.

B15. LM Studio branch (`api/genie.ts:149-185`) has no timeout, no schema validation of the response, and skips the tool-safety design. Add an AbortController timeout and response validation; keep the env-var allow-list note if it ever becomes per-tenant config.

## 4. Web app majors (apps/web)

W1. Localhost fallbacks ship silently. `lib/config.ts:4` falls back to `http://localhost:3000` and `lib/supabase-client.ts:4-5` to a local URL plus a fake anon key. A build with missing NEXT_PUBLIC vars "works" and talks to nothing. Fail the build instead: validate env in `next.config.ts` (throw when production and unset) and delete the fallbacks.

W2. "Today" uses device time in the calendar. `components/CalendarGrid.tsx:29` uses `new Date()` for the today highlight, violating the repo's own DEC-LUNAR-043 rule; a user abroad sees the wrong day highlighted for up to 7 hours daily. Use `todayInHCM()` like everywhere else.

W3. Reminder validation errors are thrown away. `app/reminders/page.tsx:41` ignores the `{errors}` returned by `globalReminderStore.upsert()`, and the form itself only checks title. Invalid day/month silently "saves" and closes the form. Surface errors in the form, enforce ranges in inputs, and keep the store as the source of truth.

W4. Notification id collisions. `lib/notifications/scheduler.ts:28` truncates a string hash to 9 chars then parseInt - two occurrences can collide and silently overwrite each other in `LocalNotifications.schedule`. Use a stable numeric hash over the full string (or an incrementing id map persisted with the plan).

W5. Cross-app import into the backend. `lib/consent-store.ts:1` and `components/ConsentGate.tsx:6` import from `../../../services/genie-api/lib/consent`. Move shared consent types/constants into a package (for example `@cyberskill/genie-shared`) so client bundles never reach into server source.

W6. Consent flags live in raw localStorage while reminders use Capacitor Preferences (`lib/consent-store.ts`), so consent does not survive the same way on native. Route consent through the same storage abstraction.

W7. No stored-data versioning or migration. `lib/storage.ts` JSON-parses a single blob with no schema version; any future Reminder shape change corrupts existing installs. Add `{schemaVersion, data}` envelope plus a migration ladder, and an export/import (JSON file) feature for device moves - it also doubles as a PDPL portability answer.

W8. Genie chat is in the initial bundle of every page. `GlobalGenie` statically imports `GenieChat` (react-markdown + remark-gfm) in the root layout. Lazy-load with `next/dynamic` on first open. Also dedupe fonts: layout loads Be Vietnam Pro via Google Fonts link while `lib/card-renderer.ts:59` fetches it again via FontFace; switch the page to `next/font` and pass the loaded face to the canvas renderer.

W9. Security headers are nobody's job right now. Static export cannot set headers from next.config, and Caddy sets none (see I2). Decide the owner (Caddy) and ship CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

W10. Accessibility basics are missing: 2 of ~23 client components use any aria attribute; `DayCell` and `GoodDayList` are clickable divs with no role/tabIndex/keyboard handler; bottom sheets (`DayDetailPanel`, `ShareCardSheet`) do not trap or restore focus; nav lacks `aria-current`. For an app whose design system enforces APCA contrast, interaction a11y should match: adopt button semantics for tappables, focus-trap the sheets, label the form fields.

W11. UX polish items: replace `alert()` calls (store, polls, good-day picker, EventKitBridge) with the existing toast/sheet patterns; give `settings/page.tsx` a real loading state instead of `return null`; add dark mode (tokens exist in genie-ui to build on); add `React.memo` to DayCell; consider `id`, `scope`, maskable icons, and screenshots in manifest.json.

W12. tsconfig hygiene: `target: "es5"` in a React 19/Next 15 app is vestigial (bigger, slower output when not using SWC-minified paths); the `@/*` path alias is defined but unused. Bump target to ES2022 and either adopt or remove the alias.

## 5. Core packages (packages/*)

C1. The golden gate does not match its claim. `test/fixtures/gold-1900-2199.json` holds 9 rows, its README calls itself a placeholder, and no test loads it. What actually runs is a round-trip self-consistency sweep - necessary but not sufficient (a self-consistent but biased port would pass). Before calling the P0 gate green per founder decision 3, export a real golden table from the Ho Ngoc Duc reference (at minimum: every lunar month start 1900-2100, all leap months, Tet dates, plus the documented VN/China divergence years) and assert against it in `gate:p0`.

C2. Day-quality is unverified and has a timezone trap. Fixtures are generated by the function under test, and `dayquality.test.ts:15` contains a tautology (`expect(q.truc.name).toBe(q.truc.name)`). Separately `dayquality.ts:74-76` reads the Date via getUTC* - callers passing `new Date()` get the wrong VN day for 7 hours around midnight. Verify Truc/Hoang Dao/28 sao against an independent almanac sample, and change the API to accept `(dd,mm,yy)` or a JDN instead of a Date.

C3. Commerce code inside the math engine. `src/commerce/affiliate-resolver.ts` (mock offers, example.com images) is exported from the amlich-core barrel and consumed by web and API. Move it to a `@cyberskill/genie-commerce` package; keep the core zero-scope as documented.

C4. Package hygiene for the future: stale `dist/` (built from the stub era) should be deleted and `dist` gitignored or rebuilt in CI; remove unused `astronomy-engine` devDependency (or actually add the cross-check test the comment claims); add `license`, `files`, `sideEffects: false`; fix the duplicate conflicting `apca-w3` ambient declarations in packages/ui (delete one, then remove the `as any` casts in `apca.ts`); dedupe the leap-month span logic shared by convert.ts and recurrence.ts into one helper; have content/index.ts use `isInvalidSolar()` instead of an inline check; add tests for `canChiMonth`/`canChiYear` (historically error-prone in HND ports).

C5. Content package i18n. All strings are hardcoded Vietnamese in TS. Fine for v1; if English or regional variants are on the roadmap (App Store metadata suggests yes eventually), introduce a locale-keyed structure now while there are only 13 records.

## 6. Zalo Mini App majors

Z1. Fill the two stub pages (calendar grid, reminder form) or remove them from navigation until real - shipping dead ends fails Zalo review.
Z2. Add the registered Zalo app id to `app-config.json` and document the `zmp login`/deploy flow in DEPLOYMENT.md.
Z3. Error handling: `saveReminders`/`saveSettings`/`clearAll` in `zalo/src/lib/storage.ts` have no try/catch, and ConsentSheet swallows failures silently - surface a toast and keep the sheet open on failure.
Z4. Type the home page state with `LunarDate`/`CanChi` instead of `any`; remove the unused `todayJdn` in day-computer and hoist the per-iteration `todayInHCM()` call.
Z5. Add zalo tests and typecheck to CI (see I5) - all three existing test files never run in CI today.

## 7. PDPL and privacy (now governed by Law 91/2025/QH15, effective 2026-01-01)

Vietnam's protection regime moved from Decree 13/2023 to the Personal Data Protection Law 91/2025/QH15 on January 1, 2026, with Decree 356/2025/ND-CP as the implementing decree. The TASK-019 work models consent well, but four gaps matter under the new law:

P1. Deletion is incomplete. `handleDeleteAccount` deletes only reminders; the users row, consent_log, zns_send_log (with cleartext phone), genie_action_log, push tokens, and entitlements all remain. Implement full erasure or documented anonymization with a defined SLA, and rename the endpoint honestly until it does what it says.

P2. Consent is enforced client-side only. The server never checks the consent_log before sync push/pull, Genie calls, or ZNS sends (reminder.channels is a preference, not consent). Add server-side consent checks per data purpose - under PDPL the operator, not the client app, carries the burden of proof.

P3. Cross-border transfer assessment is partial. Every Genie call sends user content to Anthropic (offshore) but the DPIA gate in `lib/data-minimization.ts` only fires for GIO-type reminders; RAM/MUNG_MOT/CUSTOM titles go out unstripped. Apply sanitization to all types, and prepare the cross-border transfer impact dossier (CTIA) that the new law expects within 60 days of first transfer.

P4. Data minimization and retention: `zns_send_log.phone` is cleartext (the proactive path already redacts - make the main path match); reminder titles containing deceased relatives' names are cleartext at rest (consider app-layer encryption or at least documented justification); define retention windows plus cleanup jobs for consent_log, zns_send_log, genie_action_log; add a data-export endpoint (portability) to pair with deletion.

## 8. Infra, CI/CD, and ops

I1. CI tests 1 of 6 workspaces. `ci.yml` runs only amlich-core tests; content, ui, web, genie-api (including all the webhook security tests), and zalo never run. Change the gate to `pnpm -r test` plus per-package typecheck, and make Playwright a required check with a `test:e2e` script.

I2. Caddy hardening: add a header block (HSTS with preload, X-Content-Type-Options, X-Frame-Options or frame-ancestors via CSP, Referrer-Policy, Permissions-Policy, a CSP tuned for the app + Supabase + API origins), rate limiting for `/api/*` (caddy-ratelimit plugin or a small sidecar), and a healthcheck for the caddy service itself.

I3. Compose hardening: add resource limits (mem/cpu) per service, `read_only: true` where possible, and pin image digests. Consider `restart: always` for caddy.

I4. Lint actually never runs: root package.json has no `lint` script so the CI step always skips via `--if-present`. Add `"lint": "eslint ."` (or per-package lint scripts plus `pnpm -r lint`) and plan the ESLint 9 flat-config migration.

I5. Supply-chain and secrets: add dependabot (or Renovate), `pnpm audit --prod` in CI, CodeQL, and gitleaks. None exist today, and S1 proves the need.

I6. No CD path. Docker images are built in CI then discarded; deployment is manual `git pull && docker compose up -d --build` on the VPS. Minimum viable CD: push tagged images to GHCR from CI, then a deploy job (SSH action or watchtower pull) keyed to releases, with `docker compose config` validation and a rollback tag.

I7. Version alignment: CI runs Node 20, Dockerfiles run node:24, engines say >=20. Pick one (suggest 22 LTS or 24 everywhere) and test what you ship. Pin vite in zalo to the same 5.4.11 as the root.

I8. Backups and runbook: redis AOF volume and Caddy certs have no backup or restore drill; Supabase is managed but point-in-time recovery settings should be verified and documented. Add an ops runbook (deploy, rollback, key rotation, incident) - DEPLOYMENT.md is a good start and should absorb it.

I9. Uptime and alerting: add an external uptime check on `/health` and the web root, plus alert routing (email/Zalo/Telegram). Right now nobody is paged when it breaks.

## 9. Testing strategy

Q1. Raise the floor: run every workspace's tests in CI (I1) and add coverage reporting (vitest --coverage with c8) with a modest initial threshold so it can only go up.
Q2. e2e the money paths: reminders CRUD (create, edit, delete, toggles), calendar navigation + day detail, consent accept/reject flows, login (against a dev-seeded user, not the backdoor), Genie happy path with a stubbed API. Today only auth and one Genie stub flow exist.
Q3. Backend handler tests: api/sync.ts has zero direct tests (the file named sync.test.ts tests frontend code). Add tests for push/pull/share/invite/accept/delete including the userId-mismatch case (S6) and consent enforcement (P2).
Q4. Contract tests for webhooks: unauthenticated RevenueCat 401 (S2), Zalo Pay staging fail-closed (S7), replayed transaction ignored (B8).
Q5. Fill the empty test stub in `lib/card-renderer.test.ts` ("fallback font" case) or delete it - a passing empty test is worse than none.
Q6. Property tests for the core: with fast-check, assert round-trip plus monotonicity of month starts and leap-month invariants across random dates; it complements the golden table (C1).
Q7. iOS: add at least a smoke UI test on the Capacitor shell (launch, tab through, schedule one local notification in a test target) - the native bridge code is currently untested by anything.

## 10. Documentation fixes

D1. README and BUILD-RUNBOOK say the core algorithm is unimplemented stubs with a red harness; the code is fully implemented with green tests. Anyone (human or agent) following the docs would re-do finished work. Rewrite the Status section to describe reality, and add a "docs updated" gate to the task done-flow so this cannot drift again.
D2. `docs/tasks/lunar/manifest.json` marks all 20 tasks PASS 10/10 while TASK-016 has stub pages (F7) and TASK-020 has placeholder keys (F6). Split `spec_audit` from `implementation_status` in the manifest schema.
D3. The PRD/SRS file is untracked (its filename contains an em dash and combining diacritics, violating the repo's own naming convention). Rename to ASCII (for example `docs/PRD-SRS-genie-am-lich.md`) and commit it - it is the declared source of every task and is currently missing from clones.
D4. Add `playwright-report/` to .gitignore and remove the committed report; add an `apps/web/.env.example` documenting all NEXT_PUBLIC vars.
D5. DEPLOYMENT.md: record that key rotation from S1 was completed (date + who), and document the Apple root cert placement, RevenueCat webhook secret, and Zalo app id steps.

## 11. Suggested order of attack

Week 1 (security + truth): S1-S7, B10, D1, D3. Rotate keys first, everything else follows.
Week 2 (make the product function): F1, F4, F5, F6, F8, W1, W3.
Week 3 (web/PWA + zalo): F2, F3, F7/Z1-Z3, W2, W4-W8.
Week 4 (privacy + gates): P1-P4, C1, C2, I1, I4, Q1-Q4.
Week 5 (infra + polish): I2, I3, I5-I9, B1-B9, B11-B15, W9-W12, remaining C/Z/Q/D items.
Exit criteria for launch: all S and F items closed, CI green across all workspaces with the golden table wired (C1), PDPL items P1-P3 closed, security headers + rate limiting live, uptime alerting on.

## 12. Strengths worth keeping

The shared-core architecture works as designed: web, API, and zalo all consume @cyberskill/amlich-core with zero duplicated lunar math. The VN-timezone discipline (todayInHCM, DEC-LUNAR-043) is documented and mostly enforced, with tests that survive TZ tampering. RLS posture on sensitive tables is correct (WITH CHECK (FALSE) forcing service-role writes). App Store JWS verification fails closed at every stage with regression tests, and Zalo Pay HMAC uses a timing-safe compare with a test guarding a previously removed backdoor. The 64-slot notification planner with fairness allocation matches its spec and is well tested. Consent UX (equal-weight buttons, policy re-versioning) is unusually careful. TypeScript is genuinely strict monorepo-wide. Docker networking exposes only Caddy. Decision-traceability comments (DEC-LUNAR-xxx, TASK-LUNAR-xxx) give this codebase better institutional memory than most teams manage.

## Appendix: external references

Vietnam PDPL status verified 2026-07-06: Law No. 91/2025/QH15 effective 2026-01-01, implementing Decree 356/2025/ND-CP dated 2025-12-31 (sources: luatvietnam.vn, dlapiperdataprotection.com, fpf.org, rouse.com). Consent must be specific and informed, silence is not consent, cross-border transfers require an impact assessment filed within 60 days of first transfer.
