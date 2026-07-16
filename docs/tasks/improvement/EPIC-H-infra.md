# EPIC H - infra and CI/CD (I1-I9)

Report section 8. I1 and I4 run in wave 4; the rest wave 5. Review item Z5 is covered by I1.

---

## I1. CI runs tests and typecheck for all workspaces

Priority P1 | Effort S | Executor: agent

Context: `ci.yml` runs only `pnpm --filter @cyberskill/amlich-core test`. content, ui, web, genie-api (including all webhook security tests), and zalo never run in CI; builds are never exercised except via docker.

Steps: change the test job to `pnpm -r typecheck && pnpm -r test && pnpm -r build`; keep the amlich-core P0 gate as a separately named step so its failure is unmistakable; add the Playwright workflow a `test:e2e` script in apps/web (`playwright test`) and make it a required check; cache Playwright browsers.

Acceptance criteria:
- [ ] A deliberately broken test in any workspace fails CI (spot-check by inspection of the matrix/steps).
- [ ] CI wall time recorded in the handoff; if over ~10 min, note parallelization options (matrix per workspace).

Verify: green run on a branch touching every workspace.

---

## I2. Caddy hardening: security headers, rate limiting, healthcheck

Priority P1 | Effort M | Executor: agent

Context: the Caddyfile has zero security headers and no rate limiting; the caddy service is the only container without a compose healthcheck.

Steps:
1. Header block on the site: `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` (camera=(), microphone=(), geolocation=()), and the CSP defined in W9 (`frame-ancestors 'none'` replaces X-Frame-Options). `-Server` to drop the banner.
2. Rate limiting: build a Caddy image with the `caddy-ratelimit` module (xcaddy build stage in a small Dockerfile under deploy/) - zones: `/api/genie` 10 r/min per IP, `/api/*` 60 r/min per IP, webhooks excluded. If the plugin build is unacceptable operationally, fall back to Hono middleware limits (extend B14) and record the decision.
3. Compose: healthcheck for caddy (`wget -q --spider http://localhost:80` via an internal health path or `caddy validate` style check), and `restart: always`.

Acceptance criteria:
- [ ] securityheaders.com (or curl -I) shows all five headers on the deployed domain; CSP violation-free per W9's sweep.
- [ ] Hammering `/api/genie` from one IP returns 429 within the configured budget.

Verify: `docker compose config -q && curl -sI https://$DOMAIN | grep -Ei "strict-transport|content-type-options|referrer|permissions|content-security"`

---

## I3. Compose resource limits and image pinning

Priority P2 | Effort S | Executor: agent

Steps: add `mem_limit`/`cpus` (or deploy.resources) per service - suggested start: caddy 128M/0.25, api 512M/1.0, genie-web 512M/1.0, redis 256M/0.5; pin `caddy:2-alpine` and `redis:7-alpine` to digests; add `logging: {driver: json-file, options: {max-size: "10m", max-file: "3"}}` so logs cannot fill the disk.

Acceptance criteria:
- [ ] `docker compose config` shows limits, pinned digests, and log rotation on all four services; stack boots and passes healthchecks under the limits.

---

## I4. Add a working lint gate

Priority P1 | Effort S | Depends: I1 | Executor: agent

Context: the CI step `pnpm run lint --if-present` always skips - no root lint script exists. ESLint config sits unused.

Steps: add root script `"lint": "eslint . --max-warnings 0"` (or per-package scripts + `pnpm -r lint`); fix or explicitly disable the violations that surface (expect no-explicit-any warnings in zalo home page - Z4 fixes those, coordinate order); replace the `--if-present ||` echo with a hard step; plan-note for ESLint 9 flat config migration (do not do it in this task).

Acceptance criteria:
- [ ] CI fails when a lint error is introduced (proof: the step no longer has the fallback echo).
- [ ] `pnpm lint` green at HEAD.

---

## I5. Dependabot, dependency audit, CodeQL, gitleaks

Priority P1 | Effort S | Depends: S1 | Executor: agent+human

Context: no dependency updates, no vulnerability scanning, no secret scanning - and S1 proves the secret-leak class is real here.

Agent steps: add `.github/dependabot.yml` (npm weekly, grouped minor/patch, plus github-actions ecosystem); CI steps: `pnpm audit --prod --audit-level high` (non-blocking warn at first, blocking after a triage pass), `gitleaks/gitleaks-action` on push and PR; add `.github/workflows/codeql.yml` for javascript-typescript; add a `.gitleaks.toml` allowlisting the documented example placeholders.

Human steps: enable GitHub secret scanning + push protection in repo settings (Settings > Code security), review the first dependabot batch.

Acceptance criteria:
- [ ] A test commit containing a fake `sb_secret_...` string is blocked/flagged by gitleaks in CI.
- [ ] Dependabot opens grouped PRs; CodeQL completes green.

---

## I6. Push images to GHCR; minimal CD with rollback

Priority P2 | Effort M | Depends: I1 | Executor: agent+human

Context: CI builds images and discards them; deployment is manual `git pull && docker compose up -d --build` on the VPS.

Agent steps: extend the docker job - on push to main and on tags, build and push `ghcr.io/<owner>/genie-web` and `genie-api` tagged with the git SHA and `latest`; add `docker-compose.prod.yml` variant consuming the images instead of building; add a `deploy.yml` workflow (manual `workflow_dispatch` + on release) that SSHes to the VPS (secrets: host, user, key) and runs `docker compose pull && docker compose up -d`, then curls `/health` and the web root, rolling back to the previous SHA tag on failure; document rollback (`IMAGE_TAG=<old-sha> docker compose up -d`).

Human steps: create the GHCR permissions and SSH deploy secrets; run the first supervised deploy.

Acceptance criteria:
- [ ] A tagged release deploys without shelling into the server manually; failed health rolls back automatically; both paths exercised once.

---

## I7. Align Node and Vite versions

Priority P2 | Effort S | Executor: agent

Context: CI tests Node 20, Dockerfiles run node:24, engines say >=20; zalo floats `vite ^5.4.0` while the root pins 5.4.11.

Steps: choose Node 22 LTS everywhere - engines `>=22`, CI `node-version: 22`, both Dockerfiles `node:22-slim`; pin zalo vite to 5.4.11; `pnpm install` to settle the lockfile; note in DEVELOPMENT.md.

Acceptance criteria:
- [ ] One Node major across engines, CI, and images; lockfile consistent; stack builds and tests green.

---

## I8. Backup and restore runbook

Priority P2 | Effort M | Executor: agent+human

Context: redis AOF volume and Caddy cert volume have no backup; Supabase PITR settings unverified; no restore drill documented.

Agent steps: write `docs/OPS-RUNBOOK.md` covering - nightly `redis_data` snapshot (`docker run --rm -v` tar to a dated file, rotate 7), caddy_data backup (certs re-issue automatically, so document that restore = re-issue, backup optional), Supabase: verify plan-level PITR/backup retention and document the restore console path, `.env` server file backup into the team password manager (never git), quarterly restore drill checklist.

Human steps: confirm Supabase plan retention, store the env backup, run the first drill.

Acceptance criteria:
- [ ] Runbook exists; one full restore drill executed and dated in the doc.

---

## I9. Uptime checks and alerting

Priority P1 | Effort S | Executor: agent+human

Context: nothing pages anyone when the site or API dies.

Agent steps: document and template the checks - external uptime monitor (e.g. UptimeRobot/Better Stack free tier) on `https://$DOMAIN/` and `https://$DOMAIN/health` at 1-5 min intervals; alert routing to email/Telegram/Zalo; add `/health` semantics note (B13's `/ready` is the deeper check); optional: a scheduled GitHub Action curling both URLs as a fallback monitor.

Human steps: create the monitor account, wire notification channels, test an intentional downtime alert.

Acceptance criteria:
- [ ] Downtime test alert received on the chosen channel within the check interval; monitor config documented in OPS-RUNBOOK.
