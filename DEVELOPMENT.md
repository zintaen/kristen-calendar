# Development guide - Genie Am Lich (kristen-calendar)

Step-by-step setup for engineers. It covers the monorepo layout, two ways to run the stack locally
(Docker or native pnpm), the local database, tests, and troubleshooting. Production deploys are in
[DEPLOYMENT.md](DEPLOYMENT.md).

## Architecture

pnpm workspace monorepo:

- `apps/web` - Next.js 15 PWA (React 19, Tailwind). Also the Capacitor host for iOS/Android. Port 8080 in dev.
- `services/genie-api` - Hono (Node) API: Genie AI proxy, ZNS scheduler, consent, entitlement, sync. Port 3000.
- `packages/amlich-core` - lunar engine (Ho Ngoc Duc): solar<->lunar, can-chi, tiet khi, reminders. Zero-dependency.
- `packages/content` (`@cyberskill/genie-content`) - festival/ritual content.
- `packages/ui` (`@cyberskill/genie-ui`) - shared UI + purple theme + APCA.
- `zalo` - Zalo Mini App client (built and shipped with the zmp CLI, not part of Docker).

External services: Supabase (Postgres + Auth + RLS), Redis (rate limiting, ZNS idempotency),
Anthropic (Genie AI). In dev, Supabase runs locally via the Supabase CLI; Redis runs in Docker.

## Prerequisites

1. Docker Desktop (for the dev stack and the local Supabase database).
2. Node.js 20+ and pnpm 9 (`npm install -g pnpm@9`) - only needed for the native workflow and to run tests.
3. Supabase CLI (`npm install -g supabase`) - manages the local database and migrations.
4. An Anthropic API key (optional in dev - the Genie chat only needs it when you exercise the AI path).

## 1. Get the code and the env file

```bash
git clone <repo-url> kristen-calendar
cd kristen-calendar
cp .env.example .env
```

`.env` is gitignored. Fill it in the next steps. Never commit real secrets.

## 2. Start the local database (Supabase)

```bash
supabase start
```

This boots a local Postgres + Auth + Studio in Docker and prints an `API URL` (usually
`http://localhost:54321`), an `anon key`, and a `service_role key`. Copy those into `.env`:

```env
# Backend (reached from inside Docker via host.docker.internal)
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>

# Frontend (browser)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>

# API origin the browser calls (origin only, no /api suffix)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional - only needed to exercise the Genie AI path
ANTHROPIC_API_KEY=sk-ant-...
```

Apply the database schema (migrations live in `services/genie-api`):

```bash
supabase db reset      # first time, or to rebuild from migrations
```

## 3a. Run the stack with Docker (recommended)

One command brings up the API, the web app, and Redis with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

- Web: http://localhost:8080
- API: http://localhost:3000  (health: http://localhost:3000/health)
- Redis: localhost:6379

How it works: an `installer` service runs `pnpm install` once into a named volume, then `api` and
`genie-web` start in watch mode. Source is bind-mounted, so edits hot-reload. `node_modules` lives in
a Docker volume, so container (Linux) binaries never clash with your host (macOS) install.

Stop with Ctrl-C, or `docker compose -f docker-compose.dev.yml down`. To force a fresh install,
`docker compose -f docker-compose.dev.yml down -v` (drops the node_modules volume).

## 3b. Run the stack natively (no Docker for the app)

You still need Redis and Supabase. Start Redis with `docker run -p 6379:6379 redis:7-alpine` (or the
dev compose `redis` service), and `supabase start` as above. Then:

```bash
pnpm install
# terminal 1 - API
pnpm --filter @cyberskill/genie-api dev
# terminal 2 - web
pnpm --filter genie-web dev
```

Use `SUPABASE_URL=http://localhost:54321` (not host.docker.internal) when running the API natively.

## 4. Verify

- Open http://localhost:8080 - you should see today's lunar date. A first-visit consent sheet appears; accept it.
- `curl http://localhost:3000/health` returns `OK`.
- The purple Genie button (bottom right) opens the AI chat (needs `ANTHROPIC_API_KEY` to answer).

## 5. Tests, typecheck, lint

Run from the repo root (native pnpm, not inside the dev containers):

```bash
pnpm -r typecheck          # all packages
pnpm -r test               # unit + integration (vitest)
pnpm gate:p0               # lunar engine accuracy gate only

# End-to-end (Playwright), from apps/web
cd apps/web
npx playwright install     # first time only
npx playwright test        # boots its own dev server on :8080
```

E2E specs stub Supabase auth and the Genie API, so they need no external services.

## 6. Database migrations

Migrations live under `services/genie-api` and are applied with the Supabase CLI:

```bash
supabase migration new <name>   # create a migration
supabase db reset               # rebuild local DB from all migrations
supabase db push                # push to a linked remote project (see DEPLOYMENT.md)
```

## 7. Zalo Mini App

The Zalo client is not dockerized (Zalo Studio handles packaging). Develop it separately:

```bash
cd zalo
pnpm dev            # local preview
pnpm build          # production build
# deploy: pnpm deploy:zalo (from repo root) - requires a registered Zalo OA
```

## Troubleshooting

- Port already in use (3000 / 8080 / 6379 / 54321): stop the other process or change the host port
  mapping in `docker-compose.dev.yml`.
- Switched between Docker dev and native dev and imports break: the two use different platform binaries.
  Run `pnpm install` again for native, or `docker compose -f docker-compose.dev.yml down -v && up` for Docker.
- Genie chat returns an error: check `ANTHROPIC_API_KEY` in `.env` and that the API container is healthy
  (`docker compose -f docker-compose.dev.yml logs api`).
- Lunar date looks off by a day: the app locks all lunar math to Asia/Ho_Chi_Minh (DEC-LUNAR-043); if you
  see a shift, it is a bug - report it. Tests re-run the core under several timezones to catch this.

## Document map

- [DEPLOYMENT.md](DEPLOYMENT.md) - production Docker deploy (Caddy + Supabase Cloud), DevOps runbook.
- `docs/tasks/lunar/` - the 26 feature specs, the API CONTRACT, and SHIP-READINESS.
- `docs/AUDIT-REWORK-2026-07-03.md` - the audit and fixes applied to the free-model build.
- `AGENTS.md` (repo root) - CyberOS memory protocol for AI agents, not a build guide.
