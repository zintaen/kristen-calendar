---
fr_id: FR-LUNAR-019
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-190..195 range; PDPL legal facts + consent granularity + data minimization rules applied)
---

## §1 - Verdict summary

FR-LUNAR-019 đặc tả lớp tuân thủ PDPL (Law No. 91/2025/QH15, hiệu lực 01/01/2026, Nghị định 356/2025/ND-CP ngày 31/12/2025). Phạm vi: 14 mệnh đề normative ở §1 (phân biệt miễn trừ cá nhân/gia đình và bản thương mại, privacy policy tiếng Việt, 4 `consentFlags` granular độc lập, consent_log với audit trail, thu hồi làm `SyncClient` ngừng ngay, `stripSensitiveFields()` cho đám giỗ, `checkCrossBorderTransfer()` tường minh, không dark pattern, `policy_version` semver). 6 đoạn §2 giải thích các quyết định thiết kế. §3 có đầy đủ TypeScript interface - `ConsentFlags`, `ConsentStore`, `ConsentModal` props, `stripSensitiveFields()`, `checkCrossBorderTransfer()` - và migration SQL 0018 với RLS policy. 15 AC kiểm tra được. §5 có 3 nhóm test: consent granularity, data-minimization, và ConsentModal không dark pattern. §8 cung cấp migration SQL, JSON payload mẫu, và localStorage schema. §10 có 10 hàng failure. §11 có 8 ghi chú triển khai. Ánh xạ đến PRD #5 (NFR-Privacy/PDPL), Key Findings 8 (PDPL pháp lý), Recommendations 6, Caveats (PDPL điểm chưa rõ).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Không phân biệt rõ bản cá nhân (miễn trừ) và bản thương mại (không miễn trừ)
Nếu áp dụng PDPL cho cả bản MVP cá nhân, app trở nên phức tạp không cần thiết; nếu không áp dụng cho bản thương mại, vi phạm pháp luật. Resolved: §1 #1 mô tả rõ miễn trừ cá nhân/gia đình; DEC-LUNAR-191; AC #15 kiểm tra bản MVP chạy mà không hiện ConsentModal; §9 giải thích rõ điều kiện miễn trừ.

### ISS-002 - Một checkbox "Đồng ý tất cả" không đủ cụ thể theo PDPL điều 11
"Xử lý cá nhân, gia đình" miễn trừ nhưng "phân tích, marketing, cross-border" thì không. Resolved: §1 #3 định nghĩa 4 flag granular độc lập; DEC-LUNAR-193; §3 `ConsentFlags` interface; AC #5 test thu hồi một flag không ảnh hưởng flag khác; 3 unit test granularity trong §5.

### ISS-003 - Tên người đã mất có thể lộ ra trong Claude prompt
`api/genie.ts` có thể truyền nguyên `reminder.title` (ví dụ "Giỗ bà nội Nguyễn Thị X") vào system prompt - đây là dữ liệu nhạy cảm gửi ra Claude (Anthropic, US). Resolved: §1 #6 `stripSensitiveFields()` bắt buộc trước khi gửi đến AI; DEC-LUNAR-192; §3 hàm thuần túy; AC #9 + AC #12 unit test mock genie handler; §7 cross-cutting ghi rõ FR-015 PHẢI gọi hàm này.

### ISS-004 - Chuyển dữ liệu sang Singapore không có DPIA là vi phạm PDPL biên giới
Supabase `ap-southeast-1` (Singapore) là "nước ngoài" - dữ liệu người đã mất gửi đến đó mà không có DPIA có thể bị phạt 5% doanh thu. Resolved: §1 #7, #8 `checkCrossBorderTransfer()` hàm tường minh; DEC-LUNAR-192, DEC-LUNAR-194; §3 `CrossBorderCheckResult`; AC #10 test gio_reminder -> us-east-1 bị chặn; §9 ghi nhận DPIA là vấn đề còn hoãn.

### ISS-005 - Consent log lưu IP rõ là vi phạm PDPL tối thiểu hóa dữ liệu
Lưu IP rõ trong log là thu thập dữ liệu quá mức cần thiết; bản thân nó là dữ liệu cá nhân cần consent. Resolved: §1 #4 ghi `ip_hash` SHA-256, không phải IP rõ; §3 `ConsentLogEntry.ipHash: string`; migration 0018 chỉ có cột `ip_hash TEXT`; §11 ghi nhận công thức hash với SALT.

### ISS-006 - Dark pattern trong ConsentModal vô hiệu hóa tính chất "tự nguyện" của consent
Pre-checked box hoặc nút "Đồng ý" nổi bật hơn "Từ chối" là dark pattern; PDPL điều 11 yêu cầu tự nguyện. Resolved: §1 #10 mô tả đầy đủ quy tắc không dark pattern; §3 ghi rõ trong `ConsentModal` props comment; AC #2 snapshot test kiểm tra unchecked; §5 có 2 test ConsentModal; §11 ghi nhận yêu cầu accessibility tiếng Việt.

### ISS-007 - Không có cơ chế phát hiện khi policy_version tăng và cần yêu cầu lại consent
Khi PDPL có sửa đổi và chính sách cập nhật, người dùng cũ vẫn dùng phiên bản cũ mà không biết. Resolved: §1 #12 lưu `policy_version` semver với từng sự kiện consent; DEC-LUNAR-195; §3 `CONSENT_POLICY_VERSION` hằng số; AC #14 test phát hiện version cũ và hiện lại modal; §11 hướng dẫn tăng version (major/minor/patch).

## §3 - Resolution

Tất cả 7 mối lo ngại có học được xử lý: miễn trừ phân biệt rõ (ISS-001), 4 flag granular độc lập (ISS-002), `stripSensitiveFields()` bắt buộc trước Claude (ISS-003), `checkCrossBorderTransfer()` tường minh (ISS-004), ip_hash thay vì IP rõ (ISS-005), không dark pattern với test (ISS-006), policy_version semver với phát hiện tự động (ISS-007). **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

Reviewer độc lập kiểm tra fidelity pháp lý PDPL với PRD Key Findings 8 và số học effort. Pre-fix độc lập: 9/10. Pháp lý đối chiếu chính xác: Law 91/2025/QH15 hiệu lực 01/01/2026; Nghị định 356/2025/ND-CP thay thế 13/2023; phạt 5% doanh thu (cross-border), 10x lợi bất chính (mua bán dữ liệu), trần 3 tỷ VND; ân hạn 5 năm DPIA/DPO nhưng consent áp dụng ngay; miễn trừ cá nhân/gia đình; đám giỗ = dữ liệu nhạy cảm (tối thiểu hóa, không bán, không cross-border khi chưa DPIA) - khớp PRD. Consent granular, unchecked-by-default, `ip_hash` không IP rõ - đều đúng.

- MINOR (đã sửa) - số học sub_tasks: 7 sub_task cộng = 8.5h nhưng `effort_hours: 9` (giá trị 9 được tham chiếu trong README dòng 29 + manifest.json + BACKLOG). Đã bump sub_task PrivacyPolicy.tsx 1.0h -> 1.5h (hợp lý: nội dung phải liệt kê loại dữ liệu + mục đích + thời gian lưu + quyền + liên hệ CyberSkill); tổng giờ = 9.0h; `effort_hours` giữ nguyên 9. Post-fix: 10/10.

## §4 - Readiness pass (2026-06-28)

Các sửa đổi traceability:

1. AC #16 mới: "KHÔNG bao giờ chia sẻ consentFlags với bên thứ ba" - mệnh đề §1 #13 trước đây không có AC trực tiếp; AC #16 và 2 test trong §5 `describe("consent isolation - khong chia se voi ben thu ba")` bổ sung.
2. Pháp lý PDPL đã xác nhận: Law 91/2025/QH15 hiệu lực 01/01/2026; Nghị định 356/2025/ND-CP; phạt 5%/10x/3 tỷ VND; ân hạn 5 năm DPIA/DPO; miễn trừ cá nhân/gia đình; consent áp dụng ngay - tất cả khớp PRD Key Findings 8, không cần sửa.
3. Các mệnh đề PHẢI còn lại (§1 #2 privacy policy, §1 #4 ip_hash, §1 #5 thu hoi -> stop SyncClient, §1 #8 checkCrossBorderTransfer, §1 #9 GET/DELETE API, §1 #10 no dark pattern, §1 #11 on-device, §1 #12 policy_version, §1 #14 PrivacyPolicy.tsx) - tất cả có AC tương ứng (xác nhận lại map: AC #13, #6, #4, #10/#11, #7/#8, #2, #3/#4, #14, #13).

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours không thay đổi. Sẵn sàng handoff không cần context thêm.

*Hết audit FR-LUNAR-019.*
