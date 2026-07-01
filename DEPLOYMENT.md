# Hướng dẫn Triển khai (Deployment Guide)

Dự án **Genie Âm Lịch** được thiết kế để dễ dàng đóng gói và triển khai qua **Docker** và **Nginx**. Dưới đây là hướng dẫn từng bước để triển khai trên môi trường Production (VPS, AWS EC2, DigitalOcean, v.v.).

## Yêu cầu môi trường Production
- **Docker** và **Docker Compose**
- Môi trường Linux (Ubuntu 22.04+ được khuyên dùng)
- Đã thiết lập sẵn **Supabase** (SaaS hoặc Self-hosted)
- Domain đã trỏ về IP của Server (A record)

## Bước 1: Chuẩn bị biến môi trường
Tạo file `.env` tại thư mục gốc của dự án (trên server):

```env
# Backend API Keys
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=<your-claude-api-key>

# Infrastructure / Observability
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_DSN=<your-sentry-dsn>

# Zalo Pay / Webhooks (Optional for Phase 3)
ZALO_PAY_KEY2=<your-zalo-mac-key>
```

## Bước 2: Khởi động với Docker Compose
Dự án đã cấu hình sẵn `docker-compose.yml` tối ưu hóa bảo mật (Non-root user) và Healthchecks.

Tại thư mục gốc của dự án:
```bash
docker compose up --build -d
```
Lệnh này sẽ build và chạy 3 container:
1. `api`: Hono API server, chạy ở port `3000`.
2. `genie-web`: Next.js web app (Standalone server), expose port `8080`.
3. `redis`: Caching và Rate Limiting.

Kiểm tra trạng thái container:
```bash
docker compose ps
```
Đảm bảo cả 2 container đều có trạng thái `(healthy)`.

## Bước 3: Cấu hình Nginx (Reverse Proxy)
Cài đặt Nginx trên server để làm Reverse Proxy và cấu hình SSL/HTTPS.

Tạo file cấu hình Nginx (ví dụ `/etc/nginx/sites-available/genie-amlich`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend Next.js Web
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Bật file cấu hình và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/genie-amlich /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Bước 4: Cài đặt SSL với Certbot (Khuyên dùng)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Lưu ý về Bảo mật
- Tất cả các container trong dự án đều chạy dưới quyền `non-root` user (`node`).
- Chỉ có cổng 80/443 của Nginx được expose ra public internet, các cổng 8080 và 3000 của Docker chỉ listen trên `localhost` (hoặc thông qua Docker network).
- File `.env` chứa các API Key quan trọng, KHÔNG ĐƯỢC push lên public repository.
