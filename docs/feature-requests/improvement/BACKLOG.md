# Improvement backlog - status ledger

Single source of truth for task status. Specs live in the EPIC files; the review lives at `docs/PRODUCTION-READINESS-REVIEW-2026-07-06.md`. Update rules are in `README.md` (agent may set in_progress / in_review / blocked; only the human sets done).

Effort: S = under 2h, M = half to one day, L = more than one day.
Executor: agent | human | agent+human (split defined in the task spec).

## Wave 1 - security and truth (do first)

| ID | Title | Prio | Effort | Depends | Executor | Status | Note |
|---|---|---|---|---|---|---|---|
| S1 | Rotate leaked keys and scrub git history | P0 | M | - | agent+human | todo | keys first, history second |
| S2 | Authenticate the RevenueCat webhook | P0 | S | - | agent | todo | |
| S3 | Remove client-side master-account backdoor | P0 | S | - | agent+human | todo | |
| S4 | Timing-safe cron auth; stop trusting request-body reminders | P0 | M | - | agent | todo | pair with S5 |
| S5 | Wire ZNS idempotency and DB backstop | P0 | M | S4 | agent | todo | same files as S4 |
| S6 | Enforce server-side identity on sync push | P0 | S | - | agent | todo | |
| S7 | Fail closed on Zalo Pay webhook outside production | P0 | S | - | agent | todo | |
| B10 | Validate env at boot; remove insecure dev fallbacks | P1 | S | - | agent | todo | pulled into wave 1 |
| D1 | Fix README and BUILD-RUNBOOK false "stubs" status | P1 | S | - | agent | todo | |
| D3 | Rename and commit the untracked PRD/SRS file | P1 | S | - | agent | todo | |

## Wave 2 - make the product function

| ID | Title | Prio | Effort | Depends | Executor | Status | Note |
|---|---|---|---|---|---|---|---|
| F1 | Persist and send the Supabase auth token to the backend | P0 | M | - | agent | todo | unblocks Genie + entitlements |
| F4 | Add missing iOS calendar usage descriptions | P0 | S | - | agent+human | todo | human verifies on device |
| F5 | Add aps-environment and BG task identifiers | P0 | S | - | agent+human | todo | human handles provisioning |
| F6 | Env-driven RevenueCat keys and real appUserID | P0 | M | F1 | agent+human | todo | human supplies keys |
| F8 | Add error boundaries and not-found pages | P0 | S | - | agent | todo | |
| W1 | Remove localhost fallbacks; fail builds on missing env | P1 | S | - | agent | todo | |
| W3 | Surface reminder validation errors in the form | P1 | S | - | agent | todo | |

## Wave 3 - web/PWA and Zalo completion

| ID | Title | Prio | Effort | Depends | Executor | Status | Note |
|---|---|---|---|---|---|---|---|
| F2 | Add a service worker (Serwist) and offline shell | P0 | L | - | agent | todo | |
| F3 | Implement web notifications or scope web honestly | P0 | M | F2 | agent | todo | decision needed, see spec |
| Z1 | Build the Zalo calendar grid and reminder form pages | P0 | L | - | agent | todo | was review F7 part 1 |
| Z2 | Add the Zalo app id and deploy flow | P0 | S | - | agent+human | todo | was review F7 part 2 |
| Z3 | Add error handling to Zalo storage and consent flows | P1 | S | - | agent | todo | |
| W2 | Use todayInHCM() for calendar "today" highlight | P1 | S | - | agent | todo | |
| W4 | Fix notification id collision risk in scheduler | P1 | S | - | agent | todo | |
| W5 | Move shared consent code into a workspace package | P2 | M | - | agent | todo | |
| W6 | Unify consent storage with the storage abstraction | P2 | S | W5 | agent | todo | |
| W7 | Version stored data; add export/import | P1 | M | - | agent | todo | |
| W8 | Lazy-load Genie chat; dedupe font loading | P2 | S | - | agent | todo | |

## Wave 4 - privacy, correctness gates, CI

| ID | Title | Prio | Effort | Depends | Executor | Status | Note |
|---|---|---|---|---|---|---|---|
| PD1 | Complete PDPL account deletion | P1 | M | - | agent | todo | review item P1 |
| PD2 | Enforce consent server-side per purpose | P1 | M | W5 | agent | todo | review item P2 |
| PD3 | Sanitize all reminder types sent to Claude; CTIA dossier | P1 | M | - | agent+human | todo | review item P3 |
| PD4 | Redact stored phones; retention jobs; export endpoint | P1 | M | PD1 | agent | todo | review item P4 |
| C1 | Build a real golden-fixture table and wire the P0 gate | P1 | L | - | agent+human | todo | launch exit criterion |
| C2 | Verify day-quality against ground truth; fix UTC trap | P1 | M | C1 | agent | todo | |
| I1 | CI runs tests and typecheck for all workspaces | P1 | S | - | agent | todo | includes zalo (review Z5) |
| I4 | Add a working lint gate | P1 | S | I1 | agent | todo | |
| Q1 | Coverage reporting with thresholds | P1 | S | I1 | agent | todo | |
| Q2 | e2e tests for reminders, calendar, consent, login | P1 | L | F1, F8, W3 | agent | todo | |
| Q3 | Direct tests for api/sync handlers | P1 | M | S6 | agent | todo | |
| Q4 | Webhook contract tests (RevenueCat, Zalo Pay, replay) | P1 | S | S2, S7 | agent | todo | |

## Wave 5 - hardening and polish

| ID | Title | Prio | Effort | Depends | Executor | Status | Note |
|---|---|---|---|---|---|---|---|
| B1 | Restrict CORS to known origins | P1 | S | - | agent | todo | |
| B2 | Stop leaking error.message; use global error handler | P1 | S | - | agent | todo | |
| B3 | zod schemas on every route body | P1 | M | - | agent | todo | |
| B4 | Body-size and array-length limits | P1 | S | B3 | agent | todo | |
| B5 | Redis failure falls back to Postgres rate limiting | P1 | S | - | agent | todo | |
| B6 | Require valid JWT on /api/genie (401, no anonymous) | P1 | S | F1 | agent | todo | |
| B7 | Await entitlement grants before webhook response | P1 | S | - | agent | todo | |
| B8 | Replay ledger for payment webhooks | P2 | M | S2, S7 | agent | todo | |
| B9 | Entitlement source-of-truth reconciliation | P2 | M | B8 | agent | todo | |
| B11 | Real build step and pruned runtime image for the API | P1 | M | - | agent | todo | |
| B12 | Graceful shutdown handlers | P2 | S | - | agent | todo | |
| B13 | Structured logging, request ids, error tracking, /ready | P1 | M | - | agent | todo | |
| B14 | Rate-limit B2B key guessing and public poll inserts | P2 | M | - | agent | todo | |
| B15 | Timeout and validation on the LM Studio branch | P2 | S | - | agent | todo | |
| W9 | Security headers via Caddy (CSP, HSTS, XCTO, RP, PP) | P1 | S | I2 | agent | todo | lands with I2 |
| W10 | Interaction accessibility pass | P1 | M | - | agent | todo | |
| W11 | UX polish: toasts over alert(), loading states, dark mode, manifest | P2 | M | - | agent | todo | |
| W12 | tsconfig target and path alias cleanup | P2 | S | - | agent | todo | |
| C3 | Move commerce code out of amlich-core | P2 | M | - | agent | todo | |
| C4 | Core package hygiene (dist, deps, d.ts conflict, dedupe) | P2 | M | C3 | agent | todo | |
| C5 | Locale-keyed content structure | P2 | M | - | agent | todo | |
| Z4 | Type Zalo home state; clean day-computer | P2 | S | - | agent | todo | |
| I2 | Caddy hardening: headers, rate limit, healthcheck | P1 | M | - | agent | todo | |
| I3 | Compose resource limits and image pinning | P2 | S | - | agent | todo | |
| I5 | Dependabot, pnpm audit, CodeQL, gitleaks in CI | P1 | S | S1 | agent+human | todo | |
| I6 | Push images to GHCR; minimal CD with rollback | P2 | M | I1 | agent+human | todo | |
| I7 | Align Node and Vite versions everywhere | P2 | S | - | agent | todo | |
| I8 | Backup and restore runbook (Redis, certs, Supabase PITR) | P2 | M | - | agent+human | todo | |
| I9 | Uptime checks and alerting | P1 | S | - | agent+human | todo | |
| Q5 | Fill or delete the empty card-renderer test stub | P2 | S | - | agent | todo | |
| Q6 | Property-based tests for the lunar core | P2 | M | C1 | agent | todo | |
| Q7 | iOS smoke test for the Capacitor shell | P2 | M | F4, F5 | agent+human | todo | |
| D2 | Split spec_audit from implementation_status in manifest | P1 | S | - | agent | todo | |
| D4 | gitignore playwright-report; add apps/web/.env.example | P2 | S | - | agent | todo | |
| D5 | DEPLOYMENT.md: rotation record, cert, RC secret, Zalo id | P1 | S | S1 | agent+human | todo | |

## Launch exit criteria

All S and F tasks done; Z1 and Z2 done (they carry review F7); C1 golden gate green; PD1-PD3 done; I1, I2, I4 done; I9 alerting live. Everything else may follow launch.

## Rejection log

Append entries here when a review sends a task back: `YYYY-MM-DD <ID> - reason - what to change`.
