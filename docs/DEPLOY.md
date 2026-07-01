# Deployment & Operations Guide (DEPLOY.md)

This document provides a comprehensive, step-by-step guide for deploying all three clients (Web/PWA, iOS native, Zalo Mini App) and the `genie-api` backend.

Since the application is built on a shared `amlich-core` engine and relies on a few external services (Claude, Zalo OA), there are several manual configuration steps you as the operator must perform.

---

## 1. Prerequisites & External Accounts

Before you can deploy any part of the application, you must manually set up the following external accounts and obtain their API keys:

1. **Anthropic / Claude API (Cho AI Genie)**
   - Create an account on the [Anthropic Console](https://console.anthropic.com/).
   - Generate an API key. This will be used by the `genie-api` proxy.
2. **Zalo Official Account (ZOA) & Zalo for Developers (Cho ZNS & Zalo App)**
   - Register a [Zalo Official Account](https://oa.zalo.me/).
   - Register a Zalo App on [Zalo for Developers](https://developers.zalo.me/) and link it to your OA.
   - Create ZNS Templates for your reminder types (e.g., "Ngày mai là Mùng Một").
   - Obtain the `ZALO_APP_ID`, `ZALO_APP_SECRET`, và `ZALO_OA_ACCESS_TOKEN`.
3. **Supabase (Cho Family Sharing & Cloud Sync)**
   - Create a project on [Supabase](https://supabase.com/).
   - Obtain the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Run the SQL scripts in `services/genie-api/db` to create the `users`, `reminders`, and `consent_logs` tables.
4. **Apple Developer Account (Cho iOS App & Widget)**
   - An active Apple Developer Program membership ($99/year) is required to publish to the App Store.

---

## 2. Backend Deployment (`services/genie-api`)

The backend is a serverless application that can be deployed to Vercel, Cloudflare Workers, or AWS Lambda. The easiest path is **Vercel**.

### Bước 1: Setup Environment Variables
Trong Vercel Project settings, thêm các biến môi trường sau:
```env
# AI Genie
ANTHROPIC_API_KEY=sk-ant-api03-...

# Zalo Integration
ZALO_APP_ID=your_zalo_app_id
ZALO_APP_SECRET=your_zalo_secret
ZALO_OA_TOKEN=your_oa_token

# Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Bước 2: Deploy
1. Kết nối repo GitHub với Vercel.
2. Cấu hình Vercel build cho thư mục `services/genie-api`.
3. Build Command: `pnpm build`
4. Deploy! Ghi lại `API_BASE_URL` của bạn (ví dụ: `https://api.genie-amlich.com`).

---

## 3. Web / PWA Deployment (`apps/web`)

The Next.js frontend is a static export (SSG) that can be hosted anywhere (Vercel, GitHub Pages, Netlify, Cloudflare Pages).

### Bước 1: Môi trường (Environment Variables)
Tạo file `.env.production` cho `apps/web`:
```env
NEXT_PUBLIC_API_URL=https://api.genie-amlich.com
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Bước 2: Build & Host
Nếu host trên Vercel:
1. Tạo một Vercel project trỏ tới `apps/web`.
2. Framework Preset: Next.js.
3. Chạy lệnh Build mặc định, hệ thống sẽ gọi lệnh export (hiện tại `next build` đã chạy xanh hoàn toàn với lệnh export tĩnh).
4. Bạn có PWA sẵn sàng ở production url.

---

## 4. Zalo Mini App Deployment (`zalo`)

Zalo Mini App phải được build thủ công hoặc qua CI và submit lên Zalo platform.

### Bước 1: Cài đặt zmp-cli
```bash
npm install -g zmp-cli
```

### Bước 2: Build & Upload
1. Mở terminal tại thư mục `zalo/`.
2. Chạy `zmp login` và scan QR code bằng app Zalo của bạn.
3. Chạy lệnh:
   ```bash
   pnpm build
   zmp deploy
   ```
4. Truy cập Zalo Mini App Console, vào phần "Quản lý phiên bản", chọn bản build vừa tải lên, quét mã QR để test trên máy, sau đó nhấn "Gửi duyệt" để review.

---

## 5. iOS App & Widget Deployment (`apps/web/ios`)

Đây là bước cần nhiều tương tác thủ công nhất với Xcode.

### Bước 1: Cập nhật App Group & Bundle ID
1. Mở `apps/web/ios/App/App.xcworkspace` bằng Xcode.
2. Trong tab **Signing & Capabilities**, cấu hình Team thành Apple Developer Account của bạn.
3. Cập nhật **Bundle Identifier** (ví dụ: `com.cyberskill.genie`).
4. Trong phần **App Groups**, đảm bảo bạn đã tạo App Group là `group.world.cyberskill.genie`. Group này bắt buộc phải trùng khớp với config của `LunarWidget` để Widget có thể đọc cache từ app chính.

### Bước 2: Build Capacitor
Mỗi khi bạn thay đổi code web, bạn cần sync sang iOS:
```bash
cd apps/web
pnpm build
pnpm exec cap sync ios
```

### Bước 3: Build & Submit lên App Store
1. Trên Xcode, chọn device là "Any iOS Device (arm64)".
2. Menu: `Product > Archive`.
3. Khi quá trình Archive kết thúc, cửa sổ Organizer sẽ mở ra. Nhấn **Distribute App** > **App Store Connect**.
4. Hoàn tất các thông tin Metadata (Ảnh chụp màn hình, mô tả) trên [App Store Connect](https://appstoreconnect.apple.com/) và Submit for Review.
