# AGENT-GUIDE - hướng dẫn build dự án Genie Âm Lịch (kristen-calendar)

> Lưu ý quan trọng: file `AGENTS.md` ở gốc repo được DÀNH cho CyberOS Layer-1 Memory Protocol (kích hoạt BRAIN / `.cyberos-memory/`) - đó là file Stephen thả vào để bật bộ nhớ, không phải hướng dẫn build. File NÀY (`docs/AGENT-GUIDE.md`) là hướng dẫn build riêng của dự án. Một agent làm việc ở repo này theo CẢ HAI: `AGENTS.md` cho giao thức bộ nhớ, `docs/AGENT-GUIDE.md` cho invariant core, kỷ luật build, và quy ước viết.

Hướng dẫn cho coding agent và developer làm việc trong repo này. Đọc hết trước khi sửa code.

## Sản phẩm

Genie Âm Lịch của CyberSkill: ứng dụng nhắc âm lịch Việt Nam tông tím, tính ngày on-device theo thuật toán Hồ Ngọc Đức (giờ Việt Nam UTC+7, kinh tuyến 105°E). Chạy trên Web/PWA, iOS qua Capacitor, và Zalo Mini App, cộng một serverless backend mỏng cho AI Genie (Claude) và ZNS. Khởi đầu là sản phẩm cá nhân cho vợ founder, mở rộng thành thương mại.

## Source of truth

Toàn bộ spec nằm ở `docs/feature-requests/`: 20 feature request `FR-LUNAR-001..020` (mỗi cái một engineering-spec 11 mục kèm sibling `*.audit.md`), một `lunar/README.md` (index + build order + PRD traceability), `lunar/manifest.json` (máy đọc), `lunar/INDEPENDENT-AUDIT-2026-06-27.md` (audit độc lập), và `BACKLOG.md`. PRD/SRS gốc ở `docs/PRD + SRS — ...md`. Khi implement một FR, đọc spec đó section 3 (API contract) và section 5 (Verification) trước.

## Monorepo layout

```
packages/amlich-core/   # FR-001/002/003/004 - TS, zero-dependency, offline, unit-tested. LOI CUA SAN PHAM.
packages/content/       # FR-008 - FestivalContent tinh (13 dip)
packages/ui/            # FR-009 - purple theme pack, APCA gate, Be Vietnam Pro
apps/web/               # FR-010 shell, 006/007/012/014/015 UI - Next.js/React PWA + Capacitor (ios/App: 005 notif, 013 widget Swift)
zalo/                   # FR-016 - Zalo Mini App (React + zmp-ui + zmp-sdk)
services/genie-api/     # FR-015 Claude proxy, 017 ZNS, 018 sync, 019 PDPL, 020 billing - serverless TS
```

Chỉ `packages/amlich-core/` đã được scaffold (constants + types + golden fixtures + harness, các hàm thuật toán là STUB). Các package khác hiện chỉ có `package.json` placeholder; scaffold chúng khi tới slice tương ứng.

## Lệnh

```bash
pnpm install
pnpm --filter @cyberskill/amlich-core test      # golden harness (P0 gate)
pnpm --filter @cyberskill/amlich-core typecheck
pnpm -r build
```

## Kỷ luật build (đọc kỹ)

1. Làm theo `docs/BUILD-RUNBOOK.md`: build theo slice, đúng thứ tự topological trong `lunar/README.md`.
2. P0 trước mọi thứ. Implement `amlich-core` (001/002/003) cho tới khi golden harness xanh 100% trên dải 1900-2199 gồm các năm edge 1985/2007/2030/2053. Đây là ngưỡng go/no-go: lệch bất kỳ năm nào thì dừng, debug, chưa xây UI. Rủi ro kỹ thuật cao nhất nằm ở đây.
3. Một FR chỉ chuyển sang `done` sau khi qua gate (test xanh + typecheck + review). Không tự ý flip status. Operator (Stephen) chạy gate cuối và git commit trên máy thật.

## Invariant của amlich-core (lỗi hay gặp, đã được independent audit bắt)

- `convertSolar2Lunar` / `convertLunar2Solar` trả về LABELED TUPLE (`[d, m, y, leap]` / `[d, m, y]`), KHÔNG phải object. Mọi consumer PHẢI destructure tuple, KHÔNG đọc `.year` / `.month` (ra undefined -> Invalid Date).
- convertLunar2Solar trả sentinel `[0, 0, 0]` khi invalid; kiểm bằng `isInvalidSolar()`, KHÔNG kiểm `=== null`.
- Can-chi ngày: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (FR-002 là owner). Day-quality (FR-011/013) PHẢI lấy địa chi từ `canChiDay(jdn).chiIndex`, KHÔNG suy từ `(jdn+9)%60 % 12` (lệch +8).
- Ba epoch và hai synodic constant trong `constants.ts` là các đại lượng riêng, KHÔNG gộp nhầm (PRD 6.2).
- Core KHÔNG gọi network để tính ngày (NFR-Offline). Mọi phép tính khóa về `Asia/Ho_Chi_Minh` / tz=7 kể cả khi thiết bị ở nước ngoài; dùng `todayInHCM()` thay vì ngày local của thiết bị/server.

## Quy ước viết (theo chuẩn của Stephen)

Prose tiếng Việt có dấu; thuật ngữ kỹ thuật, API, code giữ tiếng Anh. Chỉ dùng ký tự bàn phím chuẩn trong prose: straight quotes (" và '), hyphen (-) cho mọi dấu gạch, ba dấu chấm (...) cho ellipsis. Không emit em dash, en dash, curly quote. Không emoji. Giữ format tối thiểu.

## Liên kết

- Build order + PRD traceability: `docs/feature-requests/lunar/README.md`
- Backlog + founder decisions (đã chốt): `docs/feature-requests/BACKLOG.md`
- Audit độc lập (defect đã fix + open items): `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md`
- Runbook build từng slice: `docs/BUILD-RUNBOOK.md`
