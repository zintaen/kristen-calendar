# Deployment guide - Genie Am Lich (kristen-calendar)

Step-by-step production deploy for DevOps. Target: a single Linux server running Docker Compose behind
Caddy (automatic HTTPS), with Supabase Cloud as the managed database. Local development is in
[DEVELOPMENT.md](DEVELOPMENT.md).

## Production architecture

```
                Internet (443/80)
                       |
                   [ Caddy ]  <- auto TLS for your domain
                   /        \
        /api/*, /health      everything else
              |                    |
          [ api ]              [ genie-web ]      [ redis ]
      Hono, port 3000       Next.js standalone     rate limits,
      (Genie, ZNS, sync)     port 3000             ZNS idempotency
              |
        Supabase Cloud (Postgres + Auth + RLS)   <- managed, external
```

Only Caddy is exposed to the internet. `api`, `genie-web`, and `redis` stay on the internal Docker
network. The Zalo Mini App is shipped separately (Zalo Studio), not on this server.

## Prerequisites

1. A Linux server (2 vCPU / 2+ GB RAM is enough to start) with a public IP.
2. A domain name you control, e.g. `os.your-domain.com`.
3. A Supabase Cloud project (https://supabase.com).
4. An Anthropic API key.
5. (Later) a registered Zalo Official Account for ZNS - not required for first deploy.

## Step 1 - Provision the server

Install Docker Engine + the Compose plugin (Ubuntu example):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in so docker runs without sudo
docker compose version          # confirm the plugin is present
```

Open ports 80 and 443 in the firewall/security group. No other inbound ports are needed.

## Step 2 - Set up Supabase Cloud

1. Create a project. Note the Project URL (`https://xxxx.supabase.co`), the `anon` key, and the
   `service_role` key (Project Settings -> API).
2. Link and push the database schema from your machine (migrations live in `services/genie-api`):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all migrations (family sharing + RLS, consent log, entitlements, ZNS send log, etc.) to
the cloud database. Re-run `supabase db push` whenever new migrations land.

## Step 3 - Point DNS at the server

Create an A record for your domain pointing at the server's public IP. Caddy needs this resolvable
before it can issue a certificate.

```
os.your-domain.com   A   <server-public-ip>
```

## Step 4 - Configure the environment

On the server:

```bash
git clone <repo-url> kristen-calendar
cd kristen-calendar
cp .env.example .env
```

Edit `.env` with production values:

```env
# Reverse proxy
DOMAIN=os.your-domain.com
ACME_EMAIL=you@your-domain.com

# Supabase Cloud
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Public (baked into the web bundle at build time - origin only, no /api suffix)
NEXT_PUBLIC_API_URL=https://os.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# ZNS (fill when the Zalo OA is live)
ZNS_TEMPLATE_ID=
CRON_SECRET=<long random string>

# Payments (TASK-020). Leave blank until you sell subscriptions; both webhooks fail closed when unset.
ZALO_PAY_KEY2=<Zalo Pay key2>
APPLE_BUNDLE_ID=world.cyberskill.genieamlich
APPLE_APP_APPLE_ID=<numeric App Store app id>
APP_STORE_ENVIRONMENT=Sandbox            # switch to Production at launch
APP_STORE_ONLINE_CHECKS=false
# APP_STORE_PRODUCT_TIERS={"com.cyberskill.genie.premium.monthly":"premium"}
```

Important: `NEXT_PUBLIC_*` values are compiled into the browser bundle at BUILD time, so you must
rebuild the web image after changing them (Step 6 does this).

## Step 5 - Deploy

Two prerequisites before the first build:

- Lockfile: the API image installs with `pnpm install --frozen-lockfile`, so `pnpm-lock.yaml`
  must already match `package.json`. After any dependency change (for example the App Store
  verification library added for TASK-020), run `pnpm install` once at the repo root and commit the
  updated `pnpm-lock.yaml`, or the Docker build fails with a frozen-lockfile mismatch.
- Apple root certificate (only if you accept App Store payments): download Apple Root CA - G3 to
  `services/genie-api/certs/apple/` on the host (see that folder's README). The compose file mounts
  that directory read-only into the api container. Without it the App Store webhook fails closed.

```bash
docker compose up -d --build
```

This builds the API and web images, starts Caddy, api, genie-web, and redis. Caddy requests a
Let's Encrypt certificate for `DOMAIN` on first start (DNS from Step 3 must already resolve).

## Step 6 - Verify

```bash
docker compose ps                       # all services healthy
curl -I https://os.your-domain.com/     # 200, valid TLS
curl https://os.your-domain.com/health  # OK (proxied to the api)
docker compose logs -f caddy            # watch certificate issuance if TLS is slow
```

Open the domain in a browser: today's lunar date, the consent sheet, and the Genie button should work.

## Secrets and rotation

- `.env` (and any `services/genie-api/.env`) are gitignored. Never commit real secrets.
- ACTION REQUIRED from the earlier setup: a real `SUPABASE_SERVICE_ROLE_KEY` was once committed in
  `.env.docker` and pushed. That file is now emptied, but the key remains in git history. Rotate it:
  Supabase dashboard -> Project Settings -> API -> roll the service_role key, update `.env`, then
  `git rm --cached .env.docker && git commit -m "chore: stop tracking .env.docker"` (it is gitignored now).
- Rotate the Anthropic key too if it was ever committed.

## Updating (redeploy)

```bash
git pull
supabase db push          # if there are new migrations
docker compose up -d --build
```

Compose recreates only changed services. To roll back, `git checkout <previous-tag>` then
`docker compose up -d --build` again.

## Operations

- Logs: `docker compose logs -f api` (or `genie-web`, `caddy`, `redis`).
- Restart one service: `docker compose restart api`.
- Redis data persists in the `redis_data` volume; Caddy certs in `caddy_data` - do not delete these
  volumes casually.
- Backups: the source of truth is Supabase Cloud - enable Point-in-Time Recovery / scheduled backups
  in the Supabase dashboard. The containers here are stateless apart from the two named volumes above.
- Health: both api and genie-web expose Docker healthchecks; `docker compose ps` shows status.

## Zalo Mini App + ZNS (separate track)

The Zalo client is built and submitted through Zalo Studio, not this server:

```bash
cd zalo && pnpm build       # then deploy via pnpm deploy:zalo / Zalo Studio
```

ZNS reminders (TASK-017) run from the `api` service on a schedule. They need a registered Zalo OA, an
approved ZNS template (set `ZNS_TEMPLATE_ID`), and `CRON_SECRET`. Start via a ZNS distributor
(for example VietGuys) to shorten OA onboarding, per the founder decision.

## Scaling later

This single-host setup is sized for the first users. When you outgrow it: put the web behind a CDN,
move Redis to a managed instance, and run multiple `api` replicas behind Caddy. Supabase Cloud scales
independently. None of that changes the app code.
