---
fr_id: FR-LUNAR-017
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-170..175 applied; ZNS window, token refresh, idempotency, template rules encoded)
---

## §1 - Verdict summary

FR-LUNAR-017 đặc tả ZNS sender serverless cho "Genie Âm Lịch". Phạm vi: 14 mệnh đề BCP-14 trong §1 (chỉ gửi cho người đã cấp số qua Zalo Mini App + đồng ý, template <= 400 ký tự >= 1 tham số, cấm quảng cáo, khung 06:00-22:00 Asia/Ho_Chi_Minh, window <= 7 ngày, OA token auto-refresh < 10 phút hết hạn, CRON_SECRET auth, serverless cron <= 15 phút, amlich-core tính ngày, log zns_send_log, xử lý mã lỗi và không retry ngay, hỗ trợ nhà phân phối, điền đủ tham số template, idempotency). 7 §2 rationale block. §3 có đầy đủ interfaces (OATokenPair, SendWindowResult, ZNSPayload, ZNSSendResult, SchedulerReminder, CronRunResult), hàm `isWithinHourWindow`, `isWithinDayRange`, `canSendNow`, `sendZNS`, `runZNSCron`, handler Vercel Function. 14 acceptance criteria. §5 có tests cho window (4 test biên giờ, 4 test biên ngày, 1 test phối hợp, 1 template length check), scheduler (3 test), và oa-token (1 test). §6 có migration SQL `zns_send_log` và pattern idempotency. §10 có 13 failure row. §11 có 7 ghi chú triển khai. Ánh xạ PRD FR-B08, §11 (ZNS architecture), Key Findings 4, Caveats (ZNS price/rules).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Khung gửi chỉ tính theo UTC, bỏ qua chuyển đổi Asia/Ho_Chi_Minh
Nếu `isWithinHourWindow` lấy `new Date().getHours()` (UTC server time), khung 06:00-22:00 sẽ tính sai khi server đặt ở AWS us-east hay Cloudflare - có thể gửi lúc 2:00 sáng VN. Resolved: §1 #4 + §3 `isWithinHourWindow` dùng `toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })`; AC #1 test với UTC timestamps cụ thể; §11 ghi chú 3.

### ISS-002 - OA access token hết hạn giữa cron -> toàn bộ lô gửi thất bại nhỏ
Không có cơ chế refresh proactive sẽ gây ra kỳ cron mất nhắc cho tất cả người dùng. Resolved: §1 #6 kiểm tra hết hạn trước mỗi đợt cron; `ensureFreshToken` refresh khi còn < 10 phút; `oa-token.ts` trong §3; AC #8; test "refresh khi còn 5 phút" trong §5.

### ISS-003 - Cron chạy nhiều lần (Vercel retry) gửi ZNS trùng -> over-billing
Vercel Cron có thể gọi endpoint nhiều hơn 1 lần khi có timeout/retry; mỗi lần gửi thành công thì Zalo tính ~200 VND -> có thể gửi gấp đôi. Resolved: §1 #14 idempotency bắt buộc; §6 pattern `SELECT FROM zns_send_log WHERE reminder_id AND ngày = today` trước khi gửi; AC #7; §10 row "Gửi trùng do cron retry".

### ISS-004 - getPhoneNumber trả token không phải số thực -> lưu sai vào User.phone
Nếu lưu trực tiếp "token" từ `getPhoneNumber` vào `User.phone` và gửi thẳng cho ZNS, Zalo sẽ trả lời "invalid_phone". Resolved: §1 #1 ghi rõ chỉ gửi cho "số điện thoại đã cung cấp"; §11 ghi chú 1 mô tả quy trình đổi token qua OA API; DEC-LUNAR-163 (từ FR-016) được tham chiếu; §8 payload có số thực "0909123456".

### ISS-005 - Template ZNS dùng nội dung quảng cáo hoặc thiếu tham số -> bị Zalo từ chối/khóa OA
Nếu template không qua duyệt hoặc có quảng cáo thuần túy, Zalo có thể từ chối gửi và/hoặc khóa OA. Resolved: §1 #2 + #3 ràng buộc chặt chẽ (đã duyệt, <= 400 ký tự, >= 1 tham số, cấm quảng cáo); DEC-LUNAR-171; §8 template mẫu 84 ký tự với 4 tham số; AC #13 test độ dài và tham số; §5 "template mặc định <= 400 ký tự".

### ISS-006 - Không có CRON_SECRET auth -> bất kỳ ai có thể trigger /api/zns gửi bulk ZNS
Endpoint cron nếu expose public mà không xác thực sẽ bị gọi tùy ý, tiêu tiền ZNS hàng loạt và vi phạm quy tắc Zalo. Resolved: §1 #7 + §3 handler kiểm tra `Authorization: Bearer CRON_SECRET`; AC #12 test 401 khi header sai; DEC-LUNAR-170; NFR-Security.

### ISS-007 - Không có log zns_send_log -> không thể báo cáo chi phí, debug lỗi, hay phòng gửi trùng
Không có bảng log thì: (a) không báo cáo chi phí ZNS, (b) không debug được lỗi "invalid_phone" của ai, (c) idempotency (ISS-003) không thể thực hiện. Resolved: §1 #10 bắt buộc log mỗi lần gửi; §3 `ZNSSendResult` có `zaloMessageId`; §6 migration SQL `0016_zns_send_log.sql` với columns đầy đủ; AC #9 và #10 kiểm tra insert vào log cả khi success lẫn error; §10 row "Leakage OA token vào logs" nhận xét thêm.

## §3 - Resolution

Cả 7 vấn đề có học được giải quyết trong lúc biên soạn. Tính đúng giờ ICT (ISS-001) và auto-refresh token (ISS-002) là bẫy kỹ thuật triển khai cao; idempotency (ISS-003) và phone token vs. số thực (ISS-004) là những nhầm lẫn phổ biến trong tích hợp Zalo; template compliance (ISS-005) và CRON_SECRET (ISS-006) là ràng buộc bảo mật; và log đầy đủ (ISS-007) là cơ sở cho toàn bộ báo cáo chi phí và debug. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

Reviewer độc lập (không viết spec) chạy lại đối chiếu §3 với contract upstream FR-LUNAR-001/004. Pre-fix độc lập: 7/10. Ba defect được tìm ra và sửa, tất cả ở `zns-scheduler.ts` §3:

- MAJOR - drift kiểu trả về của `convertLunar2Solar`. FR-001 khai báo `convertLunar2Solar(...): SolarDate` với `SolarDate = [day, month, year]` (tuple) và sentinel `[0,0,0]` khi tháng nhuận không khớp (KHÔNG bao giờ trả null). Scheduler lại (a) `if (!solarDate)` - tuple luôn truthy, sentinel `[0,0,0]` cũng truthy -> occurrence không hợp lệ KHÔNG bị skip, và (b) đọc `solarDate.year/.month/.day` - undefined trên tuple -> `new Date("undefined-undefined-...")` = Invalid Date. Hệ quả runtime: occurrence rác lọt qua window check. Đã sửa: destructure `[gd, gm, gy]`, kiểm tra `gd===0 && gm===0 && gy===0`, build ISO với zero-pad.
- MAJOR (cùng gốc) - `ngay_duong` trong templateData đọc `eventDate.getDate()/getMonth()/getFullYear()` theo TZ runtime của server -> lệch 1 ngày trên server UTC, vi phạm yêu cầu khóa Asia/Ho_Chi_Minh. Đã sửa: build `ngay_duong` trực tiếp từ tuple ICT `${dd}/${mm}/${gy}`.
- MINOR - §10 row "convertLunar2Solar trả null" mô tả detection sai (engine không trả null). Đã sửa thành sentinel `[0,0,0]`.

Đã ghi nhận (không sửa, để mở cho founder): `SchedulerReminder` thiếu trường `recurrence` của model FR-004; cron hiện chỉ tính 1 occurrence/năm nên nhắc MONTHLY (Rằm/Mùng Một, recurrence=MONTHLY) sẽ không lặp đúng 12 lần/năm phía server -> đề xuất bổ sung `recurrence` + vòng mở rộng tháng, hoặc giới hạn rõ ZNS chỉ cho ANNUAL/ONCE trong §1. Migration `0016_zns_send_log.sql` trùng số với `0016_family_sharing_schema.sql` của FR-018 (cùng thư mục `services/genie-api/supabase/migrations/`) - cần đánh lại số khi merge. Post-fix: 9.5/10.

## §4 - Readiness pass (2026-06-28)

Vấn đề MONTHLY recurrence còn mở trong §3b đã được giải quyết hoàn toàn theo quyết định founder (full commercial product):

1. `SchedulerReminder` bổ sung trường `recurrence: "MONTHLY" | "ANNUAL" | "ONCE"`.
2. Hàm `candidateLunarYears()` được thêm vào `zns-scheduler.ts`: MONTHLY sinh danh sách tháng âm trong cửa sổ quét (tháng hiện tại + tháng tới cho cả năm hiện tại và năm tới); ANNUAL/ONCE quét theo năm như cũ.
3. `runZNSCron` được refactor để lặp qua `candidateLunarYears` thay vì chỉ 1 năm cố định.
4. §1 #15 (MUST clause MONTHLY) + AC #15 + test MONTHLY trong §5 được thêm.
5. §9 open question về MONTHLY đánh dấu GIẢI QUYẾT với ghi chú "BACKLOG decision 8 cần cập nhật".
6. `validReminder` fixture trong §5 bổ sung `recurrence: "ANNUAL"`.

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours không thay đổi. Sẵn sàng handoff không cần context thêm.

*Hết audit FR-LUNAR-017.*
