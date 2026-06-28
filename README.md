# Genie Âm Lịch (kristen-calendar)

Ứng dụng nhắc âm lịch Việt Nam tông tím của CyberSkill. Tính ngày on-device theo thuật toán Hồ Ngọc Đức (giờ Việt Nam UTC+7, kinh tuyến 105°E), chạy Web/PWA + iOS (Capacitor) + Zalo Mini App, backend serverless cho AI Genie và ZNS.

Trạng thái: spec đầy đủ + P0 runway. Chưa build logic.

## Bắt đầu từ đâu

- `docs/AGENT-GUIDE.md` - hướng dẫn cho agent/developer, invariant của core, quy ước viết. (`AGENTS.md` ở gốc repo dành cho CyberOS BRAIN/memory protocol.)
- `docs/BUILD-RUNBOOK.md` - thứ tự build từng slice.
- `docs/feature-requests/BACKLOG.md` - backlog + founder decisions còn mở.
- `docs/feature-requests/lunar/README.md` - 20 feature request, build order, PRD traceability.
- `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md` - audit độc lập.

## Lệnh

```bash
pnpm install
pnpm --filter @cyberskill/amlich-core test   # golden harness (P0 gate)
```

## Layout

`packages/amlich-core` (lõi âm lịch, đã scaffold) · `packages/content` · `packages/ui` · `apps/web` · `zalo` · `services/genie-api` (placeholder, scaffold theo slice).
