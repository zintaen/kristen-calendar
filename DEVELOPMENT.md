# Hướng dẫn Phát triển (Development Guide)

Dự án **Genie Âm Lịch** sử dụng kiến trúc Monorepo với `pnpm`. Dưới đây là hướng dẫn chi tiết từng bước để thiết lập môi trường phát triển trên máy local.

## Yêu cầu hệ thống
- **Node.js**: >= 20.x
- **pnpm**: >= 9.x (Sử dụng `npm i -g pnpm` để cài đặt)
- **Redis** (Bắt buộc cho Rate Limiter của Genie API)
- **Supabase CLI** (Tùy chọn, nếu muốn test local database)
- **Docker** (Dành cho việc mô phỏng môi trường production)

## Cài đặt thư viện
Tại thư mục gốc của dự án, chạy lệnh:
```bash
pnpm install
```

## Khởi động môi trường phát triển (Local)

Dự án gồm nhiều module, bạn có thể chạy song song bằng cách mở nhiều terminal hoặc chạy các script của pnpm.

### 1. Genie API (Backend)
Backend sử dụng Hono.js và tương tác với Supabase. Cần đảm bảo Redis đang chạy (có thể dùng docker: `docker run -p 6379:6379 -d redis`).
```bash
cd services/genie-api
pnpm run dev
```
Mặc định API sẽ chạy tại `http://localhost:4000` (hoặc 3000 tùy port).

Lưu ý các biến môi trường cần thiết (`.env` tại `services/genie-api`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `REDIS_URL` (ví dụ: `redis://localhost:6379`)
- `SENTRY_DSN` (Tùy chọn)

### 2. Next.js Web App (Frontend)
Frontend chính được xây dựng bằng Next.js (App Router).
```bash
cd apps/web
pnpm run dev
```
Mặc định ứng dụng Web sẽ chạy tại `http://localhost:3000`.

Lưu ý biến môi trường (`.env` tại `apps/web`):
- `NEXT_PUBLIC_SENTRY_DSN` (Tùy chọn)

### 3. Zalo Mini App (Zalo)
Nếu bạn muốn chỉnh sửa hoặc xem thử Zalo Mini App:
```bash
cd zalo
pnpm run dev
```
Bạn sẽ cần sử dụng **Zalo Mini App Studio** để xem trước ứng dụng thay vì trình duyệt thông thường để có trải nghiệm chính xác nhất.

## Chạy Unit Test
Dự án có hệ thống Test tự động bao phủ hầu hết các logic tính toán âm dương, API và UI Component.
```bash
# Chạy tất cả test trong monorepo
pnpm test

# Hoặc chỉ chạy test cho phần tính toán Lõi
pnpm test:core
```

## Các lệnh hữu ích khác
- `pnpm build`: Build tất cả các packages chuẩn bị cho production.
- `pnpm typecheck`: Kiểm tra lỗi TypeScript trên toàn bộ monorepo.
