# Hướng dẫn Phát triển (Development Guide)

Dự án **Genie Âm Lịch** sử dụng kiến trúc Monorepo với `pnpm`. Dưới đây là hướng dẫn chi tiết từng bước để thiết lập môi trường phát triển trên máy local.

## Yêu cầu hệ thống
- **Node.js**: >= 20.x
- **pnpm**: >= 9.x (Sử dụng `npm i -g pnpm` để cài đặt)
- **Redis** (Bắt buộc cho Rate Limiter của Genie API)
- **Supabase CLI** (Tùy chọn, nếu muốn test local database)
- **Docker** (Khuyên dùng để phát triển đồng nhất)

## Cài đặt thư viện
Tại thư mục gốc của dự án, chạy lệnh:
```bash
pnpm install
```

## Database & Backend Cục bộ (Supabase)
Dự án sử dụng Supabase cho backend Database và Auth. Để thiết lập cục bộ:
```bash
supabase start   # Khởi động local Supabase (DB, Auth, Storage, Edge Functions)
supabase status  # Xem URL và Key cục bộ
supabase stop    # Dừng local Supabase
```
*Ghi chú: Đảm bảo điền URL và anon key từ output của `supabase status` vào các file `.env` tương ứng.*

## Khởi động môi trường phát triển (Local)

Có 2 cách để khởi động ứng dụng cho quá trình phát triển:

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
Dự án hỗ trợ container hóa để đồng nhất môi trường.
1. Khởi tạo file `.env.docker` tại thư mục gốc bằng cách sao chép từ cấu hình mẫu, đảm bảo điền đủ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
2. Khởi chạy toàn bộ hệ thống bằng Docker:
```bash
docker-compose -f docker-compose.dev.yml --env-file .env.docker up --build
```
Ứng dụng Web sẽ có mặt tại `http://localhost:8080`. API tại `http://localhost:3000`.

### Cách 2: Chạy trực tiếp qua pnpm (Native)
Nếu bạn muốn chạy từng tiến trình độc lập, sử dụng `pnpm --filter`.
```bash
# 1. Chạy Genie API (Backend) - http://localhost:3000
pnpm --filter genie-api dev

# 2. Chạy Next.js Web App - http://localhost:3000
pnpm --filter web dev

# 3. Chạy Zalo Mini App
pnpm --filter zalo dev
```
*(Đối với ứng dụng Zalo, bạn nên sử dụng **Zalo Mini App Studio** để xem trước thay vì trình duyệt thông thường).*

## Chạy Unit Test
Dự án có hệ thống Test tự động bao phủ hầu hết các logic tính toán âm dương, API và UI Component.
Lõi tính toán `amlich-core` (P0) phải luôn pass 100% test case (đặc biệt dải năm 1900-2199).
```bash
# Chạy tất cả test trong monorepo
pnpm test

# Hoặc chỉ chạy test cho phần tính toán Lõi
pnpm --filter @cyberskill/amlich-core test
```

## Các lệnh kiểm tra khác
- `pnpm build`: Build tất cả các packages chuẩn bị cho production.
- `pnpm typecheck` hoặc `pnpm --filter @cyberskill/amlich-core typecheck`: Kiểm tra lỗi TypeScript trên toàn bộ monorepo hoặc từng package cụ thể.
