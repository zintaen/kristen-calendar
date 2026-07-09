# EPIC A - security blockers (S1-S7)

All P0. Nothing in this repo should be publicly reachable until this epic is done. Report section 1.

---

## S1. Rotate leaked keys and scrub git history

Priority P0 | Effort M | Depends: none | Executor: agent+human

Context: commit `e3aacf0` committed a real `SUPABASE_SERVICE_ROLE_KEY` (prefix `sb_secret_N7UND0...`) in `.env.docker`; commit `6d0fffa` committed earlier JWT-style keys. History is pushed to origin. A service_role key bypasses RLS entirely. The root `.env` also holds live values that were exposed during earlier sessions.

Human must do (in this order):
1. Supabase dashboard: rotate service_role and anon keys; update the server `.env` and GitHub secrets.
2. Anthropic console: revoke and reissue `ANTHROPIC_API_KEY`.
3. Regenerate `CRON_SECRET` and `JWT_SECRET` (long random strings) and update the server `.env`.
4. After the agent prepares the scrub (below): run it, force-push, and re-clone all working copies. If the GitHub repo ever had other collaborators or forks, treat the old keys as permanently burned regardless of the scrub.

Agent must do:
1. Write `docs/improvement/handoff/S1-scrub-runbook.md` containing the exact `git filter-repo` invocation to strip `.env.docker` from all history (and verify with `git log --all -p -- .env.docker` afterward), the force-push commands, and the re-clone checklist.
2. Confirm `.gitignore` blocks every env variant except examples (it does today; assert in the runbook).
3. Remove the now-dead `.env.docker` tombstone file from the tree in the same change (its warning text moves to DEPLOYMENT.md, see D5).

Acceptance criteria:
- [ ] New keys active; old Supabase service_role key returns 401 against the project (human confirms in handoff).
- [ ] `git log --all -p -- .env.docker` on the rewritten repo shows no secret material.
- [ ] `.env.docker` deleted from HEAD; DEPLOYMENT.md documents the incident and rotation date.

Verify:
```bash
git log --all --oneline -- .env.docker   # empty after scrub
git grep -I "sb_secret_" $(git rev-list --all) | head   # empty after scrub
```

Reviewer notes: check the rotation actually happened (test the old key fails) before accepting the scrub as meaningful. Schedule I5 (secret scanning) immediately after.

---

## S2. Authenticate the RevenueCat webhook

Priority P0 | Effort S | Depends: none | Executor: agent

Context: `services/genie-api/api/monetization/revenuecat.ts` grants and revokes entitlements with the service-role client and performs no authentication at all. Anyone who finds the URL can grant themselves premium or expire another user's plan.

Steps:
1. Add `REVENUECAT_WEBHOOK_SECRET` to `.env.example`, `docker-compose.yml` env block, and the boot-time env schema (B10; if B10 is not yet merged, validate locally in the handler and fail closed when unset in production).
2. In the handler, read the `Authorization` header and compare against the secret with `crypto.timingSafeEqual` (guard for length mismatch first; reuse the `safeEqualHex` pattern from `api/webhook-payment.ts`). Return 401 on any mismatch or when the secret is unset.
3. Dedupe on `event.id`: keep a processed-event check (Redis SETNX with TTL, falling back to a `processed_webhook_events` table; the table also serves B8). Skip already-seen events with 200.
4. Extend `test/monetization/revenuecat.test.ts`: no header -> 401; wrong secret -> 401; correct secret -> processed; duplicate event.id -> skipped; secret unset in production mode -> 500 and no grant.

Acceptance criteria:
- [ ] Unauthenticated POST returns 401 and writes nothing.
- [ ] Secret unset + NODE_ENV=production -> handler refuses (500), never grants.
- [ ] Duplicate `event.id` does not reprocess.
- [ ] All new tests green.

Verify:
```bash
pnpm --filter @cyberskill/genie-api test -- revenuecat
```

Reviewer notes: confirm the same secret is configured in the RevenueCat dashboard webhook settings (human step, record in handoff).

---

## S3. Remove the client-side master-account backdoor

Priority P0 | Effort S | Depends: none | Executor: agent+human

Context: `apps/web/app/login/page.tsx` lines 43-48 map username `kristen` + password `1991` to `kristen@master.com` / `1991_master_kristen`; `services/genie-api/scripts/seed-master.ts` commits the same plaintext password. The web app is a static export, so the mapping ships in readable JS.

Agent steps:
1. Delete the username/password mapping from `login/page.tsx`; the form submits exactly what the user typed.
2. Rework `scripts/seed-master.ts` to read email and password from env vars (`SEED_USER_EMAIL`, `SEED_USER_PASSWORD`), refuse to run when `NODE_ENV=production`, and document usage in DEVELOPMENT.md.
3. Update `apps/web/tests/auth.spec.ts` to log in with env-injected test credentials (fall back to stubbed Supabase routes as it does today; the stub already intercepts the token endpoint, so no real account is needed).
4. Grep the repo for `kristen@master.com` and `1991_master` and remove every occurrence outside historical docs.

Human steps: rotate the `kristen@master.com` password in Supabase (or delete the account and re-seed via the new script).

Acceptance criteria:
- [ ] `git grep -i "master_kristen"` returns nothing in HEAD.
- [ ] Login page submits credentials verbatim; Playwright auth spec passes.
- [ ] Seed script refuses in production and takes credentials from env only.

Verify:
```bash
git grep -in "master_kristen\|kristen@master" -- . ':!docs/PRODUCTION-READINESS-REVIEW-2026-07-06.md' ':!docs/improvement'
pnpm --filter genie-web exec playwright test tests/auth.spec.ts
```

---

## S4. Timing-safe cron auth; stop trusting request-body reminders

Priority P0 | Effort M | Depends: none | Executor: agent (pair with S5)

Context: `api/zns.ts:15` and `api/proactive-zns.ts:13` compare `CRON_SECRET` with `!==` (timing side channel). `api/zns.ts:19-32` also reads the reminder list, including phone numbers and template data, from the request body, so a secret holder can send arbitrary ZNS messages through the OA (smishing plus quota burn).

Steps:
1. Add a shared `verifyCronAuth(c)` helper in `lib/` using `crypto.timingSafeEqual` over equal-length buffers (hash both sides with SHA-256 first to normalize length), failing closed when `CRON_SECRET` is unset. Use it in both cron routes.
2. Remove the body-supplied `reminders` path in `api/zns.ts`. The handler queries Supabase (service client) for reminders with the ZNS channel enabled and consent granted (align with PD2), then calls the scheduler. Keep a `dryRun: true` body flag for testing that logs the plan without sending.
3. Add tests: wrong secret 401, missing secret 500 in production, body reminders ignored, dry run sends nothing.

Acceptance criteria:
- [ ] No `!==` comparison against `CRON_SECRET` anywhere.
- [ ] POST with attacker-supplied `reminders` in the body cannot cause a send.
- [ ] Reminder selection comes from the database and respects channel + consent flags.

Verify:
```bash
git grep -n "CRON_SECRET" services/genie-api | grep -v timingSafe
pnpm --filter @cyberskill/genie-api test -- zns
```

---

## S5. Wire ZNS idempotency and a database backstop

Priority P0 | Effort M | Depends: S4 | Executor: agent

Context: `api/zns.ts:34` calls `runZNSCron(reminders)` without an `alreadySentChecker`, so the default `async () => false` runs in production and every rerun resends every message (real cost, OA quota, user annoyance). The checker logic exists and is unit-tested; it is simply not wired. `zns_send_log` also lacks a unique constraint, so concurrent runs race check-then-insert.

Steps:
1. Implement a real checker backed by `zns_send_log` (keyed on reminder id + phone + send window/date) and pass it in `api/zns.ts`; write the log row after each successful send.
2. New migration: unique index on `zns_send_log (reminder_id, phone, sent_window)` (add the window/date column if absent; reconcile the schema drift the review flagged between migration 0018 and the columns `lib/proactive-zns.ts` writes - `tracking_id`, `user_id`, `phone_redacted`, `event`, `metadata`).
3. Treat a unique-violation on insert as "already sent" (skip, do not error).
4. Test: invoking the cron handler twice with the same window produces exactly one send per reminder.

Acceptance criteria:
- [ ] Double invocation sends once (test proves it at the HTTP-handler level, not only the lib level).
- [ ] Unique constraint exists in a committed migration; schema matches every column the code writes.

Verify:
```bash
pnpm --filter @cyberskill/genie-api test -- zns
grep -rn "UNIQUE" services/genie-api/supabase/migrations | grep -i zns
```

---

## S6. Enforce server-side identity on sync push

Priority P0 | Effort S | Depends: none | Executor: agent

Context: `api/sync.ts:45-57` upserts rows whose `user_id` comes from the client body (`lib/rls-helpers.ts:21`); only the RLS policy stops cross-user writes. One migration mistake or a service-role refactor turns this into cross-user data writes.

Steps:
1. In `handlePush`, resolve the caller via `client.auth.getUser()`; 401 when invalid.
2. Overwrite every row's `userId` with the authenticated id, or reject the request (400) if any row carries a different id - pick reject, it surfaces client bugs.
3. Apply the same identity resolution to `handlePull`, `handleShare`, `handleInvite`, `handleInviteAccept`, `handleDeleteAccount` where they currently trust body fields.
4. Tests (see also Q3): push with mismatched userId -> 400; valid push -> rows land under the JWT subject.

Acceptance criteria:
- [ ] No handler in `api/sync.ts` writes a client-supplied user id.
- [ ] Mismatch test green; RLS remains enabled (defense in depth, not the only defense).

Verify:
```bash
pnpm --filter @cyberskill/genie-api test -- sync
git grep -n "r.userId\|body.userId" services/genie-api/api services/genie-api/lib
```

---

## S7. Fail closed on the Zalo Pay webhook outside production

Priority P0 | Effort S | Depends: none | Executor: agent

Context: `api/webhook-payment.ts:190-195` falls back to the literal HMAC key `"dummy_key"` whenever `NODE_ENV !== "production"`. A staging box or a container with NODE_ENV unset accepts forged payment callbacks signed with a key printed in the source.

Steps:
1. Invert the gate: the handler always requires `ZALO_PAY_KEY2`; the dummy key is allowed only when `ALLOW_DUMMY_WEBHOOK_KEY=true` AND `NODE_ENV=development`.
2. Log a loud one-line warning at boot when the dummy path is enabled.
3. Tests: NODE_ENV unset + no key -> 500 and no grant; staging + no key -> 500; dev + flag -> dummy accepted.

Acceptance criteria:
- [ ] The string `dummy_key` can never verify a webhook unless both env conditions hold.
- [ ] Fail-closed tests green alongside the existing MAC regression tests.

Verify:
```bash
pnpm --filter @cyberskill/genie-api test -- entitlement
```

Reviewer notes: after S2, S7, and B8 land, run one end-to-end sandbox payment on each rail and file the results in the handoff.
