---
fr_id: FR-LUNAR-020
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; DEC-LUNAR-200..205 range; server-side entitlement + rate-limit + webhook HMAC rules applied)
---

## §1 - Verdict summary

FR-LUNAR-020 đặc tả cơ chế freemium ba tier (Free/Premium/Family) và entitlement gating server-side cho "Genie Âm Lịch". Phạm vi: 13 mệnh đề normative ở §1 (TIER_FEATURES bất biến, gate server-side bắt buộc, cache 24h TTL re-validate, rate-limit Genie 0/50/100 per tháng, gate familySharing chỉ Family, webhook HMAC verification, không xây dựng payment UI, GET /api/entitlement đầy đủ, UpgradePrompt lợi ích cụ thể, lock icon thay vì ẩn UI, theo dõi tỷ lệ chuyển đổi, graceful downgrade 30 ngày, trial 7 ngày single-use). 6 đoạn §2 giải thích quyết định thiết kế. §3 có TypeScript đầy đủ - `Tier`, `EntitlementRecord`, `FeatureGate`, `TIER_FEATURES`, `EntitlementClient`, webhook payload types - và migration SQL 0019 với RLS. 15 AC kiểm tra được. §5 có 5 nhóm test: TIER_FEATURES bất biến, `isFeatureAllowed`, rate-limiter, webhook HMAC, EntitlementClient cache TTL. §8 có migration SQL, 4 JSON payload mẫu (Free, Family, 403, 429). §10 có 10 hàng failure. §11 có 7 ghi chú triển khai. Ánh xạ đến PRD #14 (Phase 3 monetization), #15 (Success Metrics - tỷ lệ chuyển đổi >= 3%).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Client-trusted entitlement: sửa localStorage là đủ để có Premium miễn phí
Đây là lỗ hổng bảo mật cơ bản cho bất kỳ freemium nào. Resolved: §1 #2 gate PHẢI ở server-side trong mọi handler; DEC-LUNAR-201; mẫu ở §6 gọi `getEntitlement(userId)` từ database trước mọi action; AC #7 kiểm tra chính xác kịch bản này; §5 test vượt quota ở server.

### ISS-002 - Không có định nghĩa bất biến cho tier - logic drift theo thời gian
Nếu mỗi file điều kiện tier theo cách riêng, thay đổi giá trị quota sẽ bị bỏ sót ở một số nơi. Resolved: §3 `TIER_FEATURES: Record<Tier, FeatureGate>` là nguồn sự thật duy nhất; §11 nhấn mạnh "KHÔNG ĐƯỢC hard-code tier check ở các chỗ khác nhau"; §5 test `TIER_FEATURES` trực tiếp; DEC-LUNAR-200 ghi rõ định nghĩa là bất biến.

### ISS-003 - Webhook thanh toán không có xác minh HMAC - bất kỳ ai cấp Premium miễn phí
Nếu webhook chỉ nhận POST mà không xác minh chữ ký, tấn công là tầm thường. Resolved: §1 #6 xác minh HMAC/JWT bắt buộc trước xử lý; §3 `AppStoreWebhookPayload.signedTransactionInfo` (JWS) và `ZaloPayWebhookPayload.mac` (HMAC-SHA256); §5 test webhook MAC sai -> HTTP 401; AC #8, #9, #10; disallowed_tools ghi rõ.

### ISS-004 - Rate-limit Genie không có cơ chế atomic: race condition ở ngưỡng quota
Nếu hai request đồng thời kiểm tra "đã dùng 49/50" cả hai sẽ được phép, thực sự dùng 51 calls. Resolved: §3 `checkAndIncrementGenieUsage()` dùng `INSERT ... ON CONFLICT DO UPDATE` atomic; §11 ghi nhận kỹ thuật này; §10 hàng "Race condition: 2 Genie call đồng thời" ghi phương án giải quyết.

### ISS-005 - EntitlementClient cache trong localStorage: người dùng có thể sửa để bypass
Cache trong localStorage có thể bị edit giống như bất kỳ client storage nào khác. Resolved: §3 `EntitlementClient` ghi rõ "cache trong memory (không phải localStorage)"; §11 giải thích lý do; AC #7 kiểm tra rằng sửa localStorage KHÔNG bypass server gate.

### ISS-006 - Không có graceful downgrade: người dùng mất Premium data ngay khi hết hạn
Hết hạn đột ngột mất sharedWith và lịch sử Genie tạo trải nghiệm tồi và có thể dẫn đến charge-back. Resolved: §1 #12 graceful downgrade 30 ngày giữ dữ liệu; §3 `gracePeriodEndsAt` trong `EntitlementResponse`; §6 `getEntitlement()` logic auto-downgrade với comment "giữ dữ liệu 30 ngày"; AC #14; §11 ghi nhận cron job thông báo trước.

## §3 - Resolution

Tất cả 6 mối lo ngại có học được xử lý: server-side gate với mẫu tường minh trong §6 (ISS-001), `TIER_FEATURES` là nguồn sự thật duy nhất (ISS-002), xác minh HMAC JWS + HMAC-SHA256 trước xử lý webhook (ISS-003), atomic increment ngăn race condition ở ngưỡng quota (ISS-004), cache trong memory không phải localStorage (ISS-005), graceful downgrade 30 ngày giữ dữ liệu (ISS-006). **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

Reviewer độc lập xác nhận trục bảo mật entitlement (BLOCKER-class checklist). Pre-fix độc lập: 9/10. Gate server-side: §6 mẫu `getEntitlement(userId)` đọc từ DB, `isFeatureAllowed(tier, ...)` trước mọi action; client KHÔNG quyết định tier (AC #7 kiểm tra sửa `localStorage.tier` vẫn 403). Webhook: xác minh JWS (App Store) + HMAC-SHA256 (Zalo Pay) TRƯỚC khi cấp entitlement; MAC sai -> 401 (AC #9/#10). Atomic quota: `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1` chống race ở ngưỡng. `user_entitlements` có RLS + `server_update_entitlement WITH CHECK (FALSE)`. Không có client-trusted gate -> KHÔNG có BLOCKER.

- NIT (không sửa) - migration của FR-020 là `0019_entitlements.sql`; do FR-017 và FR-018 đều tạo `0016_*`, chuỗi 0016-0019 cần được đánh lại nhất quán khi merge cả nhánh P3 (xem ghi chú trùng số ở audit FR-017/018). `genie_usage_monthly` được khai trong migration 0019 nhưng không liệt kê trong frontmatter `new_files` của FR-020 (chỉ ghi file .sql tổng) - cosmetic. Post-fix: 10/10.

## §4 - Readiness pass (2026-06-28)

Xác nhận ba trục bảo mật/thương mại:

1. Server-side entitlement: AC #7 ("sửa localStorage.tier vẫn 403") + §5 test `describe("rate-limiter")` + §6 mẫu `getEntitlement(userId)` từ DB truoc moi action - có.
2. Webhook verify HMAC: AC #8/#9/#10 (AppStore JWS + ZaloPayPay MAC) + §5 test `describe("webhook - xac minh HMAC")` - có.
3. Atomic quota: AC #2/#3 (rate-limit 429 sau 50/100 calls) + §5 test `describe("rate-limiter")` + §11 ghi rõ `INSERT ... ON CONFLICT DO UPDATE SET call_count = call_count + 1` - có.
4. Sửa nhỏ: sub_tasks "migration 0019" sửa thành "migration 0020_entitlements.sql" cho khớp tên file thực.

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours không thay đổi. Sẵn sàng handoff không cần context thêm.

*Hết audit FR-LUNAR-020.*
