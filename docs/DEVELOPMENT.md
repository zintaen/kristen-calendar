# Development Guide

The **Genie Am Lich** project uses a Monorepo architecture with `pnpm`. Below is a detailed step-by-step guide to set up the development environment on your local machine.

## System requirements

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x (use `npm i -g pnpm` to install)
- **Redis** (required for the Genie API rate limiter)
- **Supabase CLI** (optional, if you want to test the local database)
- **Docker** (recommended for consistent development)

## Installing dependencies

At the project root, run:

```bash
pnpm install
```

## Local Database & Backend (Supabase)

The project uses Supabase for the Database and Auth backend. To set it up locally:

```bash
cd services/genie-api
npx supabase start   # Start local Supabase (DB, Auth, Storage, Edge Functions)
npx supabase status  # View the local URL and Key
npx supabase stop    # Stop local Supabase
```

*Note: Make sure to fill the URL and anon key from the `supabase status` output into the corresponding `.env` files.*

## Starting the development environment (Local)

There are 2 ways to start the application for development:

### Option 1: Using Docker Compose (recommended)

The project supports containerization to keep the environment consistent.

1. Create a `.env.docker` file at the project root by copying from the sample configuration, making sure to fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
2. Start the entire system with Docker:

```bash
docker-compose -f docker-compose.dev.yml --env-file .env.docker up --build
```

The web application will be available at `http://localhost:8080`. The API at `http://localhost:3000`.

### Option 2: Running directly via pnpm (Native)

If you want to run each process independently, use `pnpm --filter`.

```bash
# 1. Run Genie API (Backend) - http://localhost:3000
pnpm --filter genie-api dev

# 2. Run the Next.js Web App - http://localhost:3000
pnpm --filter web dev

# 3. Run the Zalo Mini App
pnpm --filter zalo dev
```

*(For the Zalo application, you should use the **Zalo Mini App Studio** to preview it instead of a regular browser.)*

## Running Unit Tests

The project has an automated test system that covers most of the lunar-solar computation logic, the API, and the UI Components.
The `amlich-core` computation core (P0) must always pass 100% of the test cases (especially the 1900-2199 year range).

```bash
# Run all tests in the monorepo
pnpm test

# Or run only the tests for the Core computation
pnpm --filter @cyberskill/amlich-core test
```

## Other check commands

- `pnpm build`: Build all packages in preparation for production.
- `pnpm typecheck` or `pnpm --filter @cyberskill/amlich-core typecheck`: Check for TypeScript errors across the entire monorepo or a specific package.
