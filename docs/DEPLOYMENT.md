# Hướng dẫn Triển khai (Deployment Guide)

Dự án **Genie Âm Lịch** được thiết kế để triển khai dễ dàng qua **Docker** và **Nginx** cho hệ thống web/API tự host, đồng thời hỗ trợ native deploy cho Zalo Mini App, Vercel và iOS App.

Tùy vào nhu cầu, bạn có thể chọn Phương án 1 (Self-hosted Docker) hoặc Phương án 2 (Serverless/Managed Services).

---

## 1. Yêu cầu Tiên quyết & Tài khoản Bên ngoài

Trước khi triển khai, bạn cần thiết lập và lấy các API key sau:

1. **Anthropic / Claude API (Cho AI Genie)**
   - Đăng ký tại [Anthropic Console](https://console.anthropic.com/).
2. **Zalo Official Account (ZOA) & Zalo for Developers**
   - Đăng ký [Zalo Official Account](https://oa.zalo.me/).
   - Đăng ký Zalo App trên [Zalo for Developers](https://developers.zalo.me/) và liên kết với OA.
   - Lấy `ZALO_APP_ID`, `ZALO_APP_SECRET`, và `ZALO_OA_ACCESS_TOKEN`.
3. **Supabase (Cho Family Sharing & Cloud Sync)**
   - Lấy `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Apple Developer Account (Tùy chọn)**
   - Cần thiết nếu bạn muốn triển khai ứng dụng iOS và Native Widget ($99/năm).

---

## 2. Phương án 1: Triển khai Self-hosted (Docker & Nginx)

Được khuyến nghị cho production nếu bạn có VPS (Ubuntu, AWS EC2, DigitalOcean).

### Bước 1: Biến môi trường
Tạo file `.env` tại thư mục gốc:
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

### Bước 2: Khởi động Docker Compose
Dự án được cấu hình Non-root user và Healthchecks:
```bash
docker compose --env-file .env up --build -d
```
Container `api` sẽ chạy ở port `3000`, `genie-web` ở `8080`, và `redis`.

### Bước 3: Cấu hình Nginx
Tạo file `/etc/nginx/sites-available/genie-amlich`:
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
Kích hoạt: `sudo ln -s /etc/nginx/sites-available/genie-amlich /etc/nginx/sites-enabled/ && sudo systemctl restart nginx`

### Bước 4: SSL (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 3. Phương án 2: Triển khai Serverless (Vercel)

Nếu bạn không muốn tự quản lý VPS, có thể host Web và API trên Vercel.

### 3.1 Backend API (`services/genie-api`)
1. Kết nối repo với Vercel, chọn thư mục gốc là `services/genie-api`.
2. Khai báo các biến môi trường: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ZALO_APP_ID`, v.v.
3. Chạy lệnh Build mặc định `pnpm build`.
4. Ghi lại `API_BASE_URL` sau khi deploy thành công.

### 3.2 Frontend Web (`apps/web`)
1. Tạo một project Vercel thứ hai trỏ tới `apps/web`.
2. Khai báo biến: `NEXT_PUBLIC_API_URL` (từ bước 3.1), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Build & Deploy. Hệ thống xuất ra trang tĩnh SSG hoàn chỉnh để phục vụ như một PWA.

---

## 4. Triển khai Zalo Mini App (`zalo`)

1. Cài đặt Zalo Mini App CLI: `npm install -g zmp-cli`.
2. Mở terminal tại `zalo/`.
3. Chạy `zmp login` và scan QR code.
4. Build và upload:
   ```bash
   pnpm build
   zmp deploy
   ```
5. Vào Zalo Mini App Console, quét mã QR và "Gửi duyệt".

---

## 5. Triển khai iOS App & Widget (`apps/web/ios`)

1. Cập nhật App Group & Bundle ID trong `apps/web/ios/App/App.xcworkspace`. Group bắt buộc là `group.world.cyberskill.genie`.
2. Mỗi lần đổi web code, đồng bộ sang iOS:
   ```bash
   cd apps/web
   pnpm build
   pnpm exec cap sync ios
   ```
3. Mở Xcode, chọn "Any iOS Device (arm64)", chọn `Product > Archive`.
4. Upload lên App Store Connect và Submit.

---

## 6. Triển khai In-App Purchase (RevenueCat)

Để tính năng thanh toán hoạt động thật trên production:

1. **Tạo tài khoản & Project trên RevenueCat**:
   - Truy cập [RevenueCat](https://www.revenuecat.com/) và đăng ký tài khoản. Tạo 2 App (App Store và Play Store).
   - Lấy Public app-specific API keys (`appl_...` và `goog_...`).

2. **Cấu hình trên Store**:
   - Tạo Auto-Renewable Subscription trên App Store Connect / Google Play Console.
   - Cấp quyền truy cập cho RevenueCat thông qua App-Specific Shared Secret.

3. **Tạo Offerings trong RevenueCat**:
   - **Entitlements**: Tạo entitlement `premium`.
   - **Products & Offerings**: Tạo offering `default` và đính kèm các Product IDs.

4. **Thay mã Key vào Code**:
   - Mở file `apps/web/lib/monetization/IAPService.ts` và thay bằng Key thật của bạn trong hàm `Purchases.configure`.
