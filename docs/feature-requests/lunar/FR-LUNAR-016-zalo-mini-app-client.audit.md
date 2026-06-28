---
fr_id: FR-LUNAR-016
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS > 6 minimum; DEC-LUNAR-160..165 applied; consent + storage + push-limitation rules encoded)
---

## §1 - Verdict summary

FR-LUNAR-016 đặc tả Zalo Mini App client cho "Genie Âm Lịch". Phạm vi: 15 mệnh đề BCP-14 trong §1 (khởi tạo zmp-sdk, import amlich-core offline, zmp Storage chỉ lưu settings và reminders, Home + CalendarGrid + CRUD Reminder, ConsentSheet trước getUserInfo và getPhoneNumber, ZNS-only push, purple theme, Settings xóa dữ liệu, cache occurrence trong bộ nhớ). 6 §2 rationale block. §3 có đầy đủ types (`ZaloReminder`, `ZaloSettings`, `StorageData`, `UpcomingOccurrence`), storage.ts, zalo-auth.ts, day-computer.ts, reminder-service.ts và phần trích app-config.json. 14 acceptance criteria kiểm tra được. §5 có 5 test case bao phủ round-trip Storage, tính ngày âm fixtures, fallback tháng nhuận, consent guard và phone token. §10 liệt kê 14 failure row. §11 có 7 ghi chú triển khai. Ánh xạ PRD §9 (Zalo client), §14 (Phase 3), Key Findings 3 (Zalo reach ~80 triệu người dùng), và NFR-Privacy/PDPL.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Mini App gọi getUserInfo ngầm khi khởi động, vi phạm PDPL
Nếu gọi `getUserInfo` trong `useEffect` khởi động mà không có consent, ứng dụng thu thập dữ liệu cá nhân trước khi người dùng đồng ý - vi phạm PDPL hiệu lực 01/01/2026 và chính sách Zalo. Resolved: §1 #7 bắt buộc ConsentSheet trước gọi API; DEC-LUNAR-163; AC #5; test "consent guard" trong §5.

### ISS-002 - getPhoneNumber trả về token, không phải số thực - nguy cơ lưu nhầm
Nhiều developer nhầm tưởng `getPhoneNumber` trả số điện thoại thực và lưu thẳng vào Storage để gửi ZNS; thực tế cần đổi token qua OA API phía server. Resolved: §1 #8 ghi rõ chỉ lưu token; §6 ghi chú "điểm khó nhất"; DEC-LUNAR-163; §8 payload có `"phone": "zalo_phone_token_xyz"`; §11 ghi chú 2.

### ISS-003 - Mini App tự gửi push notification, vi phạm giới hạn nền tảng Zalo
Không có API push native trong Zalo Mini App; nếu thiết kế cho phép channels: ["LOCAL"] sẽ không có hiệu lực và nhầm lẫn người dùng. Resolved: §1 #13 KHÔNG ĐƯỢC tự gửi push; DEC-LUNAR-162; type `ReminderChannel = "ZNS"` chỉ (không có "LOCAL"); AC #12 xác nhận không có network call âm lịch; §10 row "redirect đến FR-017".

### ISS-004 - zmp Storage bị over-write với OccurrenceCache đầy đủ, vượt giới hạn
Nếu lưu tất cả `OccurrenceCache` cho nhiều năm vào zmp Storage, dung lượng nhanh vượt giới hạn ~1 MB. Resolved: §1 #3 + DEC-LUNAR-161 chỉ lưu Settings + Reminder[]; §4 AC #7 xác nhận Storage không có cache; `day-computer.ts` tính on-the-fly; §10 row "Người dùng >50 Reminder" xử lý riêng.

### ISS-005 - amlich-core có thể không build được trong webpack của zmp do ESM/CJS conflict
Zalo Mini App dùng webpack; `@cyberskill/amlich-core` nếu chỉ export ESM sẽ không import được trong bundle Zalo. Resolved: §11 ghi chú 3 ("kiểm tra exports field trong package.json của core để chắc là CJS bundle được export"); AC #13 xác nhận `zmp build` không có warning; DEC-LUNAR-164.

### ISS-006 - Purple theme bị "nuốt" bởi CSS specificity của zmp-ui
zmp-ui inject CSS với độ ưu tiên cao; nếu override bằng class thông thường, màu tím sẽ bị ghi đè bởi màu mặc định. Resolved: §1 #11 + DEC-LUNAR-165 override qua CSS variables; §11 ghi chú 4 (nhúng vào `zalo/src/styles/theme.css` và kiểm tra specificity); AC #8 kiểm tra visual không còn màu xanh mặc định.

## §3 - Resolution

Cả 6 vấn đề có học được giải quyết trong lúc biên soạn. Consent trước getUserInfo/getPhoneNumber (ISS-001) là việc quan trọng nhất cho cả PDPL lẫn chính sách Zalo; token vs. số điện thoại (ISS-002) và giới hạn push (ISS-003) là những bẫy có thể mất nhiều giờ debug nếu không ghi rõ ngay từ đầu. Storage over-write (ISS-004), ESM conflict (ISS-005) và CSS specificity (ISS-006) là các vấn đề triển khai cụ thể cần được pin trước khi code. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

Reviewer độc lập đối chiếu §3/§5 với contract upstream FR-LUNAR-001/004. Pre-fix độc lập: 8/10. Hai defect được sửa:

- MAJOR - `todayLunar()` đọc `now.getDate()/getMonth()/getFullYear()` theo TZ thiết bị rồi truyền vào engine với `tz=7.0`. Khi người dùng ở nước ngoài, ngày civil của thiết bị khác ngày Việt Nam -> ngày âm "hôm nay" sai, vi phạm §1 #12 và AC #14 (lịch phải khóa Asia/Ho_Chi_Minh). Đã sửa: import `todayInHCM()` từ amlich-core (FR-004) và derive ngày HCM trước khi gọi `convertSolar2Lunar`.
- MAJOR (test) - test §5 đọc `lunar.lunarDay/.lunarMonth/.lunarYear` trên kết quả `todayLunar()`, nhưng `LunarDate` của FR-001 là tuple `[day, month, year, leap]` (không phải object) -> test không compile/chạy. Đã sửa: destructure tuple `const [lunarDay, lunarMonth, lunarYear] = todayLunar()`.
- MINOR - §10 row "convertLunar2Solar trả về null" sửa thành sentinel `[0,0,0]` (engine không trả null).

Đã ghi nhận (không sửa): `ZaloReminder` thiếu `recurrence` và `sharedWith` của model FR-004 - chấp nhận được cho client tính on-the-fly nhưng nên mang `recurrence` để phân biệt MONTHLY/ANNUAL khi sinh occurrence; AC #14 không có test backing (chỉ mô tả). Post-fix: 9/10.

## §4 - Readiness pass (2026-06-28)

Đã áp dụng 3 sửa đổi theo task harden:

1. Import `canChi` (không tồn tại) sửa thành `canChiDay` (đúng tên trong CONTRACT.md).
2. `todayInHCM()` trả TUPLE `SolarDate` - sửa từ `const { dd, mm, yy } = todayInHCM()` thành `const [dd, mm, yy] = todayInHCM()`.
3. `ZaloReminder` bổ sung trường `recurrence: "MONTHLY" | "ANNUAL" | "ONCE"` - cần thiết để `getUpcomingOccurrences` phân biệt Rằm/Mùng Một (MONTHLY) và đám giỗ (ANNUAL); tất cả fixtures trong §5 và §8 cập nhật tương ứng.

Không có thay đổi frontmatter ids/depends_on/blocks/DEC-ids/effort_hours. Sẵn sàng handoff không cần context thêm.

*Hết audit FR-LUNAR-016.*
