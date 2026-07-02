# Kristen Calendar / Genie Âm Lịch - Development Guide

Welcome to the development guide for Genie Âm Lịch (Kristen Calendar). This document will help you set up the project locally and understand its structure.

## 🏗 Project Architecture

This project is structured as a Monorepo using `pnpm` workspaces:

*   **`apps/web`**: Next.js web application (React, TailwindCSS). Also serves as the base for the Capacitor mobile app (iOS/Android).
*   **`services/genie-api`**: Node.js/Express API server that handles chat interactions, AI logic (Anthropic/LM Studio proxy), and background workers.
*   **`packages/*`**: Shared packages:
    *   `@cyberskill/amlich-core`: Lunar math logic and on-device algorithms (Hồ Ngọc Đức algorithm).
    *   `@cyberskill/content`: Shared static content.
    *   `@cyberskill/ui`: Shared UI components.
*   **`zalo`**: Zalo Mini App integration (if applicable).

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js**: Version 20 or higher.
2.  **pnpm**: Version 9.0.0 (`npm install -g pnpm@9`).
3.  **Docker Desktop**: Required to run the local Supabase stack and Redis.
4.  **Supabase CLI**: Required to manage the local database (`npm install -g supabase`).

## 🛠 Step-by-Step Local Setup

### 1. Install Dependencies

At the root of the project, run:

```bash
pnpm install
```

### 2. Configure Environment Variables

You need to set up `.env` files for both the API service and the Web frontend.

#### API Backend (`services/genie-api`)

Create `.env` in `services/genie-api/.env` (or project root, depending on where Docker Compose is run):

```env
# URL for local Supabase Docker
SUPABASE_URL=http://host.docker.internal:54321

# Replace this with the 'service_role key' printed when starting local Supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Anthropic API Key (required for AI chat functionality)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# (Optional) LM Studio integration for local LLM testing
# LM_STUDIO_URL=http://host.docker.internal:1234/v1/chat/completions
```

#### Web Frontend (`apps/web`)

Create `.env.local` in `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Required for Google Calendar Sync on the Web
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Start Local Supabase (Database & Auth)

We use the Supabase CLI to run a full local Postgres + Auth stack via Docker.

```bash
cd services/genie-api
npx supabase start
```

*Note: When this command finishes, it will print your `API URL`, `anon key`, and `service_role key`. Update your `.env` and `.env.local` files with these values.*

### 4. Seed the Database (Master Account)

Run the seed script to create the master account (`kristen@master.com` / `1991`):

```bash
cd services/genie-api
# Ensure the .env file is loaded correctly by Node
node --env-file=../../.env --import tsx scripts/seed-master.ts
```

### 5. Start Development Servers

We use `docker-compose.dev.yml` to spin up Redis, the API, and the Web container simultaneously. 

From the root directory, run:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

You can view the logs for the API and Web app:

```bash
# View API logs
docker-compose -f docker-compose.dev.yml logs -f api

# View Web logs
docker-compose -f docker-compose.dev.yml logs -f web
```

### 6. Access the Application

*   **Web App**: Open `http://localhost:8080` in your browser.
*   **API**: Runs at `http://localhost:3000`.

To test the login, navigate to `http://localhost:8080/login` and log in with:
*   Username: `kristen`
*   Password: `1991`

---

## 📱 Mobile App Development (Capacitor)

The `apps/web` project is configured with Capacitor to generate native iOS and Android apps.

1.  Build the Next.js static export:
    ```bash
    cd apps/web
    pnpm run build
    ```
2.  Sync Capacitor to native IDEs:
    ```bash
    npx cap sync
    ```
3.  Open Android Studio or Xcode:
    ```bash
    npx cap open android
    npx cap open ios
    ```

## 🧠 Local AI Testing (LM Studio)

To avoid API costs during development, you can use LM Studio:
1. Download and run LM Studio.
2. Load a local model (e.g., Llama 3) and start the Local Server on port `1234`.
3. Ensure `LM_STUDIO_URL=http://host.docker.internal:1234/v1/chat/completions` is set in your `.env`.
4. Restart the API container (`docker-compose -f docker-compose.dev.yml restart api`).
5. Chat queries from Genie will now route to your local model!
