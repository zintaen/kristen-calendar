# Collaborative Decision Boards (FR-LUNAR-026)

This document covers the development setup, testing, and deployment guidelines for the Supabase Realtime Polling feature introduced in FR-LUNAR-026.

## 1. Architecture Overview
- **Database**: Supabase PostgreSQL.
- **Frontend**: Next.js (React) deployed via `apps/web`.
- **Communication**: Supabase Realtime over WebSockets (handled by `@supabase/supabase-js`).
- **Data Model**: 
  - `decision_boards`: Represents a single voting session.
  - `decision_options`: The dates/options available to vote on.
  - `decision_votes`: The individual votes cast by family members.

## 2. Local Development Guide

### Step 2.1: Supabase Local Migration
To test the polling feature locally, you must apply the new schema migration to your local Supabase instance.
Assuming you have the Supabase CLI installed, run:
```bash
cd services/genie-api
supabase db reset
# Or if you are applying manually:
supabase db push
```

### Step 2.2: Environment Variables
Inside `apps/web/.env.local`, ensure you have your Supabase URL and Anon Key set up. If you are using local Supabase, it usually looks like this:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(If testing against a staging Supabase instance, use your staging credentials).*

### Step 2.3: Running the Application
Start the Next.js development server:
```bash
cd apps/web
pnpm dev
```
Navigate to `http://localhost:3000/good-day-picker`. Select a task and click **"Chia sẻ Bình chọn (Top 5)"**. You will be redirected to the poll page where you can input your name and vote. Open the link in an incognito window to see the realtime updates in action.

## 3. Deployment Guidelines

### Step 3.1: Production Database Migration
Before deploying the frontend code to production, the database schema must be updated.
- **If using CI/CD (GitHub Actions)**: Ensure your pipeline runs `supabase db push` against the production environment.
- **If applying manually**:
  1. Go to the Supabase Dashboard.
  2. Open the SQL Editor.
  3. Copy the contents of `services/genie-api/supabase/migrations/0024_collaborative_boards.sql`.
  4. Run the query.

### Step 3.2: Verify Row Level Security (RLS)
The migration includes RLS policies that allow public `INSERT` and `SELECT` for anonymous voting. Ensure these policies are applied correctly so users don't encounter permission errors.

### Step 3.3: Build & Deploy Frontend
The Next.js application has been updated to use query parameters (`/polls?id=xyz`) instead of dynamic path segments (`/polls/[id]`) so that it is fully compatible with Next.js static exports (`output: export`).
Deploy the `apps/web` bundle as usual via Vercel or your Docker container infrastructure:
```bash
cd apps/web
pnpm build
```

## 4. Manual Verification Checklist
- [ ] Database migration `0024_collaborative_boards.sql` applied successfully.
- [ ] Environment variables injected into the CI/CD pipeline or deployment platform.
- [ ] Good Day Picker renders the "Chia sẻ Bình chọn" button.
- [ ] Poll creation successfully redirects to `/polls?id=...`.
- [ ] Voting correctly updates the count instantly across multiple browser windows via Supabase Realtime.
