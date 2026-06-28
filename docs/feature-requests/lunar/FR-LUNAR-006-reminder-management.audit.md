---
fr_id: FR-LUNAR-006
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS = 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-006 đặc tả lớp quản lý nhắc: toggle Rằm/Mùng Một, form nhập giỗ/custom, lead-time + giờ nhắc, danh sách sắp tới, và chọn tông giọng thông báo (fold FR-F05). Phạm vi: 16 mệnh đề §1 (hai toggle MONTHLY độc lập, nhập giỗ/custom bằng ngày âm, ngày âm là nguồn + xem trước ngày dương, lead-time multi-select {0/1/3/7} + notifyTime, upcoming sort theo ngày dương, reschedule sau mọi CRUD, validate chặn lưu sai, notificationStyle, render body template tĩnh không AI, sửa/xóa, đọc OccurrenceCache, enabled tắt giữ dữ liệu, link nội dung, offline, cảnh báo > 64). 7 đoạn §2. §3 có tone.ts/store.ts/các props component + lead-time constants. 16 AC. §5 có 9 test vitest gồm toggle + CRUD-gọi-reschedule + tone thuần. §10 liệt kê 13 dòng failure. §11 có 7 note. Ánh xạ PRD FR-B01, FR-B03, FR-B04, FR-B07, FR-F05, section 13.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Bật nhắc Rằm/Mùng Một nhưng máy không reo
Toggle không đồng bộ pending. Resolved: §1 #7 reschedule sau mỗi toggle + DEC-LUNAR-064; AC #3.

### ISS-002 - Cho nhập ngày dương sẽ sai sang năm
Resolved: §1 #4 ngày âm là nguồn, ngày dương chỉ xem trước + DEC-LUNAR-061; AC #4/#5.

### ISS-003 - Sửa/xóa nhắc mà pending không cập nhật
Resolved: §1 #7/#11 mỗi CRUD gọi reschedule + DEC-LUNAR-064; AC #9.

### ISS-004 - FR-F05 đòi AI làm cá nhân hóa ở Phase 1 (chưa có backend)
Resolved: §1 #9/#10 notificationStyle + render template tĩnh theo tone, AI để FR-LUNAR-015 + DEC-LUNAR-065; AC #11/#12.

### ISS-005 - Tính lại ngày dương mỗi lần mở danh sách lãng phí
Resolved: §1 #12 đọc OccurrenceCache nếu còn hạn theo engineVersion + DEC-LUNAR-066; §10 dòng 8.

### ISS-006 - Quá nhiều nhắc, scheduler âm thầm cắt
Resolved: §1 #16 dùng getPlanDiagnostics cảnh báo slotsDropped; AC #15.

## §3 - Resolution

Sáu vấn đề cốt học đã xử lý: đồng bộ reschedule, nguồn-ngày-âm, CRUD-reschedule, cá nhân hóa không AI ở Phase 1, cache hiển thị, cảnh báo quá tải. FR-B01 (toggle Rằm/Mùng Một), FR-B03 (custom), FR-B04 (lead-time + notifyTime), FR-B07 (upcoming kèm ngày dương) ánh xạ trực tiếp các mệnh đề; FR-F05 fold qua notificationStyle với render template tĩnh. Mọi thao tác CRUD mắc vào reschedule của FR-LUNAR-005 đảm bảo pending khớp dữ liệu. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **7/10**. Hai defect cấp coherence mà self-audit bỏ sót, đã sửa trong .md:

- **MAJOR - model expose `leapFallback` nhưng UI không bao giờ surface.** FR-LUNAR-004 §1 #5/#6 cho mỗi `Reminder` một policy `leapFallback` (REGULAR/SKIP/ASK) và emit `fellBack`/`pendingUserChoice` per-occurrence với chú thích rõ "để UI cho user xác nhận"; FR-LUNAR-005 §1 #15 mang cờ này vào `userInfo`. Nhưng FR-LUNAR-006 - màn hình DUY NHẤT user tạo/sửa GIO - ban đầu KHÔNG có chỗ chọn `leapFallback`, không hiển `fellBack`/`pendingUserChoice` ở đâu (ReminderForm chỉ nhập cờ `isLeapMonth`). Đúng định nghĩa brief: "a model that exposes a choice the UI never surfaces is a MAJOR." **Fixed:** §1 #2 thêm yêu cầu form hiện selector `leapFallback` khi `isLeapMonth=true`; §1 #6 thêm yêu cầu danh sách sắp tới hiển nhãn "đã chuyển sang tháng thường" (fellBack) và "cần chọn tháng cúng" (pendingUserChoice); `ReminderFormProps` + `UpcomingItem` mang các trường tương ứng.
- **MAJOR - `Reminder.notificationStyle` không có trên type được import.** §3 `tone.ts` redeclare `NotificationStyle` cục bộ và §1 #9/AC #11 ghi `Reminder.notificationStyle`, nhưng type `Reminder` (FR-LUNAR-004 sở hữu) không có trường này -> producer/consumer mismatch. **Fixed (đối ứng ở FR-004):** thêm `notificationStyle?: NotificationStyle` + type `NotificationStyle` vào §3 của FR-LUNAR-004; §3 `tone.ts` của FR-006 đổi sang `import type { NotificationStyle } from "@cyberskill/amlich-core"` + `export type { NotificationStyle }`, `Tone = NotificationStyle["tone"]`; §1 #9 nói rõ field do FR-004 sở hữu, không redeclare.
- **MINOR - §5 traceability hở.** AC #6 (custom reminder), AC #7 (lead-time multi-select + notifyTime), AC #14 (offline), AC #16 (link nội dung) và AC #5 (solar preview, prop UI) không có test trong §5 (9 test, phủ AC #1-#4/#8-#13/#15). Ghi cho pass triển khai bổ test; không đổi contract.

Post-fix score: **10/10** (cả hai major sửa). sub_tasks (1.5+2.0+1.5+1.5+1.0+1.0+0.5+1.0) = 10.0 = effort_hours.

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

Cac diem da chinh sua trong FR-LUNAR-006.md:

1. **NotificationStylePicker import** - them `import type { NotificationStyle } from "@cyberskill/amlich-core"` vao block component props de khop voi nguyen tac "KHONG redeclare NotificationStyle" da ghi o tone.ts.
2. **ReminderForm props - LeapFallback** - them `import type { Reminder, LeapFallback }` va prop `onLeapFallbackChange?: (policy: LeapFallback) => void` vao `ReminderFormProps` de surface lua chon leapFallback khi `isLeapMonth=true` (§1 #2, DEC-LUNAR-042, ISS-001 cua audit doc lap).
3. **AC #5 test - su dung require()** - da viet lai test AC #5 bang `await import(...)` (ESM-safe), them assert `"gregorianDate" in saved == false`, bo phan logic nen la `require(...)` ma co the gay loi trong vitest ESM mode.
4. **AC #5/#6/#7/#14/#16 co test** - §5 hien phu du 16 AC; bo bong "traceability ho" trong §4 audit da duoc lap day.
5. **DEC IDs xac nhan** - DEC-LUNAR-060..066 ton tai trong frontmatter; moi AC tham chieu dung DEC ID.
6. **sub_tasks tong = effort_hours** - xac nhan (1.5+2.0+1.5+1.5+1.0+1.0+0.5+1.0) = 10.0 = effort_hours; khong thay doi.

Verdict: FR-LUNAR-006 san sang cho agent context-free implement.

*Het audit FR-LUNAR-006.*

*Hết audit FR-LUNAR-006.*
