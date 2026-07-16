# EPIC C - backend hardening (B1-B15)

services/genie-api. Report section 3. B10 runs in wave 1; the rest mostly wave 5.

---

## B1. Restrict CORS to known origins

Priority P1 | Effort S | Executor: agent

Context: `index.ts:26` uses `cors()` defaults, reflecting `*` on every route including sync, consent, and entitlements.

Steps: read an `ALLOWED_ORIGINS` env (comma-separated); configure Hono `cors({origin})` to allow only those plus `capacitor://localhost` and the Zalo Mini App origin (`https://h5.zdn.vn` - confirm against the running Mini App and record in handoff); keep webhooks and `/health` origin-agnostic (server-to-server, no CORS needed). Add to `.env.example` and compose. Test preflight allowed vs denied origins.

Acceptance criteria:
- [ ] Disallowed origin gets no `Access-Control-Allow-Origin` echo on `/api/sync/*`, `/api/consent`, `/api/entitlement`, `/api/genie`.
- [ ] Web app, Capacitor shell, and Zalo Mini App all still function (manual check noted in handoff).

Verify: `pnpm --filter @cyberskill/genie-api test -- cors`

---

## B2. Stop leaking error.message to clients

Priority P1 | Effort S | Executor: agent

Context: sync, consent, entitlement, commerce, and revenuecat handlers all `return Response.json({error: error.message}, {status: 500})`, exposing Postgres/Supabase internals. The global `app.onError` already does it right but never gets the chance.

Steps: remove per-handler catch-alls (or rethrow after logging) so errors reach `app.onError`; extend it to log with a request id (B13) and return `{error: "Internal Server Error", requestId}`. Keep deliberate 4xx paths explicit. JSON parse failures become 400 (see B3). Test: a handler that throws returns the generic body.

Acceptance criteria:
- [ ] `git grep -n "error.message" services/genie-api/api` shows no 500 response paths.
- [ ] Thrown Supabase errors produce generic 500 + request id.

---

## B3. zod schemas on every route body

Priority P1 | Effort M | Executor: agent

Context: zod and `@hono/zod-validator` are dependencies, imported and unused; bodies are `as`-cast TypeScript interfaces with zero runtime validation, failing late as Postgres 500s.

Steps: define schemas in `lib/schemas.ts` for genie (question max 500, bounded `context` object, see B4), sync push (row shape, array max), share patch, invite accept, consent entry, commerce click, revenuecat event, zalopay body; wire `zValidator("json", schema)` per route so malformed bodies get 400 with field errors; delete the `as` casts. Property: schemas reject unknown extra fields on sensitive routes (`.strict()`).

Acceptance criteria:
- [ ] Every POST/PATCH route validates its body through zod before any DB or upstream call.
- [ ] Malformed JSON or wrong shapes return 400, not 500.
- [ ] `git grep -n " as SyncPushBody\| as SharePatchBody\| as ConsentLogEntry" services/genie-api` is empty.

Verify: `pnpm --filter @cyberskill/genie-api test`

---

## B4. Body-size and array-length limits

Priority P1 | Effort S | Depends: B3 | Executor: agent

Context: no body limits anywhere; a huge `context` on `/api/genie` inflates Anthropic token cost; an unbounded reminders array hits Postgres in one upsert.

Steps: Hono `bodyLimit` middleware - 64KB default, 8KB on `/api/genie`; zod caps: `reminders.length <= 500`, `context` serialized length <= 4KB (reject with 413/400); document the limits in CONTRACT-adjacent API docs. Tests for each limit boundary.

Acceptance criteria:
- [ ] Oversized bodies rejected before JSON parsing where possible, with 413.
- [ ] Genie context cap enforced and tested; cost cannot be inflated past it.

---

## B5. Redis failure falls back to Postgres rate limiting

Priority P1 | Effort S | Executor: agent

Context: `lib/rate-limiter.ts` uses the Postgres RPC only when `REDIS_URL` is unset; a configured-but-down Redis rejects, bubbling up as 502 for every Genie call.

Steps: wrap the Redis branch in try/catch; on failure log once per interval and fall through to the existing `increment_genie_usage` RPC path; set `maxRetriesPerRequest: 1` and a short `connectTimeout` on the ioredis client so failure is fast; add a test with a mock Redis that throws.

Acceptance criteria:
- [ ] Redis outage degrades to Postgres quota checks; `/api/genie` keeps serving.
- [ ] Failure logged with request id, no unhandled rejection.

---

## B6. Require a valid JWT on /api/genie

Priority P1 | Effort S | Depends: F1 | Executor: agent

Context: `api/genie.ts:52-72` maps missing/invalid JWT to `userId="anonymous"` and relies on the free-tier flag to deny - security by side effect.

Steps: verify the JWT via `client.auth.getUser()`; 401 when absent/invalid before entitlement logic; delete the anonymous branch; update tests (anonymous now expects 401, not 403).

Acceptance criteria:
- [ ] Request without a valid JWT returns 401 and never reaches quota or Anthropic code.

---

## B7. Await entitlement grants before webhook responses

Priority P1 | Effort S | Executor: agent

Context: the Zalo Pay handler responds 200, then processes the grant in a detached promise (`api/webhook-payment.ts:206-218`); a deploy or crash drops a paid grant and Zalo never retries.

Steps: await `processPaymentConfirmation` before responding (webhook senders tolerate a few seconds); on failure return 500 so the provider retries; apply the same to the App Store and RevenueCat handlers; pair with B8 so retries stay idempotent.

Acceptance criteria:
- [ ] No fire-and-forget promise remains in any payment webhook path.
- [ ] Grant failure -> non-2xx response (provider retry) -> replay ledger prevents double effects.

---

## B8. Replay ledger for payment webhooks

Priority P2 | Effort M | Depends: S2, S7 | Executor: agent

Context: no processed-transaction record; upsert semantics limit damage but replays are undetectable.

Steps: migration for `processed_webhook_events (provider, external_id, processed_at, payload_hash)` with a unique (provider, external_id); record Apple `transactionId`, Zalo `orderId` (parsed from `data`), RevenueCat `event.id`; skip duplicates with 200; expose a count metric (B13). Tests: same event twice -> one grant.

Acceptance criteria:
- [ ] Each provider path checks and records the ledger inside the same transaction-ish flow (check, process, insert; unique violation treated as duplicate).

---

## B9. Entitlement source-of-truth reconciliation

Priority P2 | Effort M | Depends: B8 | Executor: agent

Context: three writers (App Store direct, Zalo Pay, RevenueCat) upsert `user_entitlements` with no precedence.

Steps: decide precedence (recommended: RevenueCat is authoritative for Apple/Google IAP since the client uses its SDK; Zalo Pay direct is authoritative for Zalo; direct App Store JWS handler becomes a fallback log-only unless RevenueCat is disabled). Add a `source` column; a writer only overwrites rows from a lower-precedence source or itself; log conflicts. Document in DEPLOYMENT.md.

Acceptance criteria:
- [ ] Concurrent conflicting webhooks converge to the documented winner; conflict logged.

---

## B10. Validate env at boot; remove insecure dev fallbacks (wave 1)

Priority P1 | Effort S | Executor: agent

Context: missing production env silently degrades to `"dummy-service-key"` (`lib/supabase.ts`), `"fallback-secret-for-dev"` (`lib/invite.ts:4`), unset CRON_SECRET, etc. Misconfigured prod runs insecurely instead of crashing.

Steps: `lib/env.ts` with a zod schema: required in production - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (or LM_STUDIO_URL), CRON_SECRET, JWT_SECRET, REVENUECAT_WEBHOOK_SECRET (after S2), ZALO_PAY_KEY2 (or explicit dev flag per S7); optional in dev with loud warnings. Parse once at `index.ts` startup, crash on failure with a readable list. Replace all scattered `process.env.X || "fallback"` reads with the parsed object.

Acceptance criteria:
- [ ] `NODE_ENV=production` boot with a missing required var exits non-zero listing the var.
- [ ] `git grep -n "fallback-secret\|dummy-service-key\|dummy-anon-key" services/genie-api` is empty.

Verify: `NODE_ENV=production node --import tsx services/genie-api/index.ts` (expect clean failure without env)

---

## B11. Real build step and pruned runtime image

Priority P1 | Effort M | Executor: agent

Context: the Dockerfile copies the whole monorepo (all workspaces, devDependencies, source) into the runtime image and runs `tsx` against TS source; no image HEALTHCHECK.

Steps: add `build` (tsc to dist) and `start` (node dist/index.js) scripts; multi-stage Dockerfile: build with pnpm, then `pnpm deploy --filter @cyberskill/genie-api --prod /out` for a pruned node_modules; final stage `node:22-slim` (align with I7) without the cairo/pango toolchain (the API does not render canvas); non-root user kept; add `HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1`.

Acceptance criteria:
- [ ] Final image contains no devDependencies, no other workspaces' source; size reduction recorded in handoff.
- [ ] Container starts compiled JS; compose healthcheck still green.

Verify: `docker compose build api && docker image ls | grep genie`

---

## B12. Graceful shutdown

Priority P2 | Effort S | Executor: agent

Steps: on SIGTERM/SIGINT - stop accepting connections (`server.close()`), await in-flight requests with a 10s deadline, `redis.quit()`, then exit 0. Log the sequence. Pairs with B7 (no detached writes left to lose).

Acceptance criteria:
- [ ] `docker compose stop api` exits cleanly within the grace period, no killed in-flight requests in logs.

---

## B13. Structured logging, request ids, error tracking, readiness

Priority P1 | Effort M | Executor: agent

Context: one structured log line exists (genie); everything else is ad-hoc console with no correlation; no metrics or error tracker; `/health` checks nothing.

Steps: pino + hono middleware assigning `requestId` (uuid) to context and response header; replace console.* in handlers; Sentry (or GlitchTip) init with DSN from env, wired into `app.onError`; add `/ready` checking Supabase (select 1) and Redis ping, used by compose healthcheck; count key events (genie calls, ZNS sends, webhook grants) as log-derived metrics for now.

Acceptance criteria:
- [ ] Every request logs one structured line with requestId, route, status, duration.
- [ ] Thrown errors reach the tracker with requestId; client sees only the id.

---

## B14. Rate-limit B2B key guessing and public poll inserts

Priority P2 | Effort M | Executor: agent

Context: B2B `requireApiKey` allows unlimited online guessing; `decision_boards/options/votes` are public read+insert (spam vector).

Steps: per-IP sliding-window limiter (Redis) on B2B auth failures (e.g. 10/min then 429 + backoff); for polls, front the Supabase-direct inserts with an API route enforcing per-IP caps and board size limits, or add Postgres policies bounding rows per board and a captcha-lite token from the app. Tests for the limiter.

Acceptance criteria:
- [ ] 20 bad B2B keys from one IP inside a minute -> 429 before DB lookup.
- [ ] Poll spam bounded (documented cap enforced server-side).

---

## B15. Timeout and validation on the LM Studio branch

Priority P2 | Effort S | Executor: agent

Context: `api/genie.ts:149-185` fetches `LM_STUDIO_URL` with no timeout and no response validation, and skips the tool-safety design.

Steps: AbortController with 30s timeout; zod-validate the OpenAI-compatible response shape; on invalid, 502 with logged detail; comment that the env var must stay operator-controlled (SSRF note); keep tool-calling disabled on this branch explicitly.

Acceptance criteria:
- [ ] Hung local endpoint times out at 30s with a clean 502; malformed response cannot crash the handler.
