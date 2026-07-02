# Deployment Guide

The **Genie Am Lich** project is designed for easy deployment via **Docker** and **Nginx** for a self-hosted web/API system, while also supporting native deployment for the Zalo Mini App, Vercel, and the iOS App.

Depending on your needs, you can choose Option 1 (Self-hosted Docker) or Option 2 (Serverless/Managed Services).

---

## 1. Prerequisites & External Accounts

Before deploying, you need to set up and obtain the following API keys:

1. **Anthropic / Claude API (for AI Genie)**
   - Register at [Anthropic Console](https://console.anthropic.com/).
2. **Zalo Official Account (ZOA) & Zalo for Developers**
   - Register a [Zalo Official Account](https://oa.zalo.me/).
   - Register a Zalo App on [Zalo for Developers](https://developers.zalo.me/) and link it to the OA.
   - Obtain `ZALO_APP_ID`, `ZALO_APP_SECRET`, and `ZALO_OA_ACCESS_TOKEN`.
3. **Supabase (for Family Sharing & Cloud Sync)**
   - Obtain `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Apple Developer Account (optional)**
   - Required if you want to deploy the iOS application and the Native Widget ($99/year).

---

## 2. Option 1: Self-hosted Deployment (Docker & Nginx)

Recommended for production if you have a VPS (Ubuntu, AWS EC2, DigitalOcean).

### Step 1: Environment variables
Create a `.env` file at the project root:
```env
# Backend API Keys
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=<your-claude-api-key>

# Infrastructure / Frontend
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
REDIS_URL=redis://redis:6379
```

### Step 2: Start Docker Compose
The project is configured with a Non-root user and Healthchecks:
```bash
docker compose --env-file .env up --build -d
```
The `api` container will run on port `3000`, `genie-web` on `8080`, and `redis`.

### Step 3: Configure Nginx
Create the file `/etc/nginx/sites-available/genie-amlich`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable: `sudo ln -s /etc/nginx/sites-available/genie-amlich /etc/nginx/sites-enabled/ && sudo systemctl restart nginx`

### Step 4: SSL (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 3. Option 2: Serverless Deployment (Vercel)

If you do not want to manage a VPS yourself, you can host the Web and API on Vercel.

### 3.1 Backend API (`services/genie-api`)
1. Connect the repo to Vercel, and set the root directory to `services/genie-api`.
2. Declare the environment variables: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ZALO_APP_ID`, etc.
3. Run the default build command `pnpm build`.
4. Record the `API_BASE_URL` after a successful deployment.

### 3.2 Frontend Web (`apps/web`)
1. Create a second Vercel project pointing to `apps/web`.
2. Declare the variables: `NEXT_PUBLIC_API_URL` (from step 3.1), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Build & Deploy. The system outputs a complete static SSG site to serve as a PWA.

---

## 4. Deploying the Zalo Mini App (`zalo`)

1. Install the Zalo Mini App CLI: `npm install -g zmp-cli`.
2. Open a terminal at `zalo/`.
3. Run `zmp login` and scan the QR code.
4. Build and upload:
   ```bash
   pnpm build
   zmp deploy
   ```
5. Go to the Zalo Mini App Console, scan the QR code, and click "Submit for review".

---

## 5. Deploying the iOS App & Widget (`apps/web/ios`)

1. Update the App Group & Bundle ID in `apps/web/ios/App/App.xcworkspace`. The Group must be `group.world.cyberskill.genie`.
2. Each time you change the web code, sync it to iOS:
   ```bash
   cd apps/web
   pnpm build
   pnpm exec cap sync ios
   ```
3. Open Xcode, select "Any iOS Device (arm64)", then choose `Product > Archive`.
4. Upload to App Store Connect and Submit.

---

## 6. Deploying In-App Purchase (RevenueCat)

For the payment feature to work for real in production:

1. **Create an account & Project on RevenueCat**:
   - Go to [RevenueCat](https://www.revenuecat.com/) and register an account. Create 2 Apps (App Store and Play Store).
   - Obtain the public app-specific API keys (`appl_...` and `goog_...`).

2. **Configure on the Store**:
   - Create an Auto-Renewable Subscription on App Store Connect / Google Play Console.
   - Grant access to RevenueCat through the App-Specific Shared Secret.

3. **Create Offerings in RevenueCat**:
   - **Entitlements**: Create a `premium` entitlement.
   - **Products & Offerings**: Create a `default` offering and attach the Product IDs.

4. **Insert the Keys into the Code**:
   - Open the file `apps/web/lib/monetization/IAPService.ts` and replace with your real Key in the `Purchases.configure` function.
