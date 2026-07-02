# Kristen Calendar / Genie Âm Lịch - Deployment Guide

This guide outlines the steps required to deploy the Genie Âm Lịch web application, API backend, and Supabase database to a production environment.

## 🏗 Infrastructure Overview

The production deployment consists of three main components:
1.  **Supabase (Database & Auth)**: Hosted on Supabase Cloud.
2.  **API Backend (Node.js)**: Hosted on a platform like Vercel, Render, or a VPS (Docker).
3.  **Web Frontend (Next.js)**: Hosted on Vercel.

---

## Step 1: Deploy Supabase (Database & Auth)

We will link your local Supabase project to a production Supabase Cloud project and run the migrations.

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Login to CLI**:
    ```bash
    npx supabase login
    ```
3.  **Link the Project**:
    ```bash
    cd services/genie-api
    npx supabase link --project-ref <your-production-project-ref>
    ```
    *(You can find your project ref in the Supabase Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`)*
4.  **Push Migrations to Production**:
    ```bash
    npx supabase db push
    ```
    This command will apply all schema migrations (tables, RLS policies, etc.) to your production database.
5.  **Configure Auth Providers**: In the Supabase Dashboard, go to **Authentication > Providers**. Enable any required providers (e.g., Email, Google). Ensure the redirect URLs are correctly configured for your production domain.

---

## Step 2: Deploy the API Backend

The API handles the LLM proxying (Anthropic) and any heavy background tasks.

### Option A: Deploying via Docker (VPS / Railway / Render)

You can use the provided Dockerfile or run `docker-compose` on a VPS.

1.  Provision a Linux server (Ubuntu/Debian) or use a PaaS like Render.
2.  Set the following environment variables in your production host:
    *   `SUPABASE_URL`: Your production Supabase URL.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your production Service Role key.
    *   `ANTHROPIC_API_KEY`: Your Anthropic API Key.
    *   `REDIS_URL`: A production Redis connection string (e.g., Upstash).
3.  Run the API via Docker:
    ```bash
    docker build -t genie-api ./services/genie-api
    docker run -p 3000:3000 --env-file .env.prod genie-api
    ```

### Option B: Deploying to Vercel (If refactored to serverless)

If the Express app is wrapped for Serverless, you can deploy the `services/genie-api` folder directly to Vercel. Be sure to configure the Environment Variables in the Vercel Dashboard.

---

## Step 3: Deploy the Web Frontend

The Next.js frontend is best deployed on Vercel.

1.  **Push your code to GitHub**.
2.  **Import to Vercel**: Create a new project in Vercel and select the GitHub repository.
3.  **Set the Framework Preset**: Next.js.
4.  **Set the Root Directory**: `apps/web`.
5.  **Configure Environment Variables**:
    *   `NEXT_PUBLIC_SUPABASE_URL`: Your production Supabase URL.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your production Supabase Anon Key.
    *   `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (for Calendar sync).
6.  **Deploy**: Click Deploy. Vercel will automatically run `pnpm install` and `pnpm build`.

---

## Step 4: Final Configuration & Post-Deployment

### 1. Seed Production Data

Once the API and Database are live, you need to seed the initial master account for production. 
Update your `.env` locally with the production `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:

```bash
cd services/genie-api
node --env-file=../../.env.prod --import tsx scripts/seed-master.ts
```

### 2. Configure Google Identity Services (OAuth)

If you are using Google Calendar Sync on the Web:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Edit your Web Application OAuth Client ID.
4. Add your production Vercel domain to **Authorized JavaScript origins**.

### 3. Native App Deployment (App Store / Google Play)

1.  Update the `capacitor.config.ts` if needed (e.g., changing the app name or package ID).
2.  Build the production web assets:
    ```bash
    cd apps/web
    pnpm run build
    npx cap sync
    ```
3.  Open the IDEs (`npx cap open ios` / `npx cap open android`).
4.  Follow the standard Apple and Google guidelines for signing, generating bundles/APKs, and submitting to the respective stores.
