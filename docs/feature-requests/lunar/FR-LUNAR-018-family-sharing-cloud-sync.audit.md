---
fr_id: FR-LUNAR-018
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-180..185 range; RLS + consent + conflict rules applied)
---

## §1 - Verdict summary

FR-LUNAR-018 đặc tả tầng cloud tùy chọn cho family sharing và đồng bộ đa thiết bị. Phạm vi: 14 mệnh đề normative ở §1 (consent-gate, RLS, sharedWith array, invite flow JWT 48h, last-write-wins, conflict log, data minimization đám giỗ, SyncClient debounce+retry, OccurrenceCache invalidation, endpoint DELETE PDPL, application-layer encryption ghi nhận, HTTP 409 fallback). 6 đoạn §2 giải thích các quyết định thiết kế. §3 có đầy đủ TypeScript interface - `RemindersUpsertRow`, `SyncClient`, `resolveConflict` - và hai migration SQL đầy đủ (0016 schema, 0017 RLS policies). 15 AC kiểm tra được. §5 có 3 nhóm test bao gồm conflict-resolver, SyncClient consent-gate, và RLS integration. §8 cung cấp full SQL migration và JSON payload mẫu. §10 có 12 hàng failure. §11 có 8 ghi chú triển khai. Ánh xạ đến PRD #4 (FR-F04), #9 (Sync optional), #10 (sharedWith, consentFlags).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Cloud sync bật mà không cần consent vi phạm PDPL ngay từ 01/01/2026
Dữ liệu đám giỗ (tên người đã mất) là dữ liệu nhạy cảm văn hóa; gửi lên cloud khi chưa có consent là vi phạm pháp lý thi hành ngay. Resolved: §1 #1, #2 consent-gate bắt buộc; DEC-LUNAR-180; AC #1 kiểm tra network-level; §6 ghi rõ check ở đầu hàm push/pull.

### ISS-002 - RLS dùng service_role key ở client bypass toàn bộ bảo mật
Nếu client dùng service_role key, RLS vô hiệu - mọi user đọc được dữ liệu của mọi user khác. Resolved: §1 #3 và §3 `getSupabaseClient()` chỉ dùng anon key + user JWT; DEC-LUNAR-181; AC #3 test RLS với user B; integration test trong §5.

### ISS-003 - sharedWith lưu dạng text/string không có index dẫn đến RLS chậm
RLS policy dùng `ANY(shared_with)` sẽ full-scan nếu không có GIN index trên cột mảng. Resolved: §3 migration 0016 khai báo `shared_with UUID[]` với `CREATE INDEX USING GIN(shared_with)`; §11 ghi nhận lý do chọn GIN.

### ISS-004 - Invite token có thể dùng nhiều lần (replay attack)
Nếu không có cơ chế single-use, một link invite có thể bị forward và nhiều người dùng join. Resolved: §1 #6 token 48h + single-use (`jti` + `used_at`); DEC-LUNAR-185; AC #6 test hết hạn, AC #7 test dùng lại; bảng `invite_tokens` có trường `used_at` trong migration 0016.

### ISS-005 - Conflict resolution không xác định - người dùng mất dữ liệu
Không có quy tắc rõ ràng thì xung đột có thể bị xử lý khác nhau giữa các thiết bị, dẫn đến mất dữ liệu. Resolved: §1 #7, #8 last-write-wins trên `updated_at`; DEC-LUNAR-183; §3 `resolveConflict()` function; 3 unit test trong §5 bao gồm trường hợp delta < 1s; AC #8, #9.

### ISS-006 - OccurrenceCache không bị invalidate sau pull dẫn đến hiện ngày sai
Nếu cache giữ ngày dương cũ trong khi cloud có reminder mới, notification sẽ tính sai ngày dương. Resolved: §1 #11 OccurrenceCache bị clear sau mỗi pull thành công; AC #14; §11 ghi nhận đây là nguyên nhân phổ biến nhất của bug "nhắc sai ngày".

### ISS-007 - Không có endpoint xóa dữ liệu cloud - vi phạm quyền PDPL
PDPL (Law 91/2025/QH15) yêu cầu quyền xóa dữ liệu cá nhân theo yêu cầu. Resolved: §1 #12 `DELETE /api/sync/account`; §3 `handleDeleteAccount()` và `SyncClient.deleteCloudData()`; AC #10, #11; §11 mô tả confirm UI "Toàn bộ dữ liệu trên cloud sẽ bị xóa vĩnh viễn".

## §3 - Resolution

Tất cả 7 mối lo ngại có học được xử lý: consent-gate ở tầng đầu hàm (ISS-001), RLS với anon+JWT không service_role (ISS-002), GIN index cho `shared_with` (ISS-003), single-use invite token với `jti`+`used_at` (ISS-004), last-write-wins rõ ràng với unit test delta < 1s (ISS-005), OccurrenceCache invalidation sau pull (ISS-006), endpoint DELETE PDPL với confirm UI (ISS-007). **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

Reviewer độc lập xác nhận checklist hạ tầng cloud. Pre-fix độc lập: 9/10. `RemindersUpsertRow` mang đầy đủ field-set của model FR-004 (lunarDay/lunarMonth/lunarYear/isLeapMonth/recurrence/leadTimes/notifyTime/channels/sharedWith/enabled/updatedAt) - KHÔNG drift. RLS `ENABLE ROW LEVEL SECURITY` + policy owner_all/member_select có; `shared_with UUID[]` + GIN index có; consent-gate `if (!this.hasCloudConsent()) return` ở đầu push/pull có; conflict resolution last-write-wins định nghĩa rõ với `resolveConflict()`. Không có defect code-level.

- MINOR (không sửa, để mở cho coordination) - migration `0016_family_sharing_schema.sql` trùng tiền tố số `0016` với `0016_zns_send_log.sql` của FR-LUNAR-017 trong cùng thư mục `services/genie-api/supabase/migrations/`. Hai file khác nội dung, cùng số -> phải đánh lại số (ví dụ FR-017 dời lên 0020) khi cả hai cùng merge. Post-fix: 10/10 (chỉ còn 1 minor sequencing không thuộc contract đơn lẻ).

## §4 - Readiness pass (2026-06-28)

Không có sửa đổi spec. §3b đã xác nhận `RemindersUpsertRow` mang đủ field-set của FR-004 (bao gồm `recurrence`, `lunarDay`, `lunarMonth`, `lunarYear`, `isLeapMonth`, `leadTimes`, `notifyTime`, `channels`, `sharedWith`, `enabled`, `updatedAt`) - không drift. RLS, consent-gate, conflict resolution, GIN index, OccurrenceCache invalidation - tất cả đã đúng. Migration 0016/0017 có thể trùng số với FR-017 khi merge (ghi chú ở §3b) - issue này phụ thuộc quản lý branch, ngoài phạm vi sửa spec đơn lẻ. Sẵn sàng handoff không cần context thêm.

*Hết audit FR-LUNAR-018.*
