---
fr_id: FR-LUNAR-013
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 6.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; Swift XCTest fixtures from PRD §6.2 + App Group isolation + stale-cache fallback applied)
---

## §1 - Verdict summary

FR-LUNAR-013 đặc tả native Swift/SwiftUI WidgetKit target và cơ chế chia sẻ dữ liệu qua App Group với web layer TypeScript. Phạm vi: 14 điều khoản BCP-14 trong §1 (native target bắt buộc, App Group UserDefaults, DayInfoCache Codable, widget-cache-writer.ts, LunarCalcSwift re-implement với hằng số PRD §6.2, 12 entries theo canh giờ, 3 kích cỡ systemSmall/Medium/Large, cấm network, cấm write state, Watch COULD, XCTest fixtures, getSnapshot < 1s); 8 lý do thiết kế trong §2; 5 contract Swift + 1 contract TypeScript trong §3; 14 AC trong §4; 5 nhóm XCTest trong §5; bảng 13 hàng failure trong §10. FR map tới PRD FR-F01, FR-F02 (COULD), PRD §9 (iOS native target note), và NFR-Offline.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Chưa xác định cơ chế truyền dữ liệu từ Capacitor sang WidgetKit

Capacitor bridge không chạy trong widget extension process; nếu không có App Group thì widget không có dữ liệu. Resolved: DEC-LUNAR-131 chọn App Group UserDefaults; §1 #2/#3/#4/#5 định nghĩa toàn bộ luồng ghi-đọc; `DayInfoCache.swift` với `load()`; `widget-cache-writer.ts` dùng AppGroupStoragePlugin.

### ISS-002 - Swift re-implement có thể dùng sai hằng số epoch (3 epoch dễ nhầm)

PRD §6.2 cảnh báo "CỰC KỲ QUAN TRỌNG - đừng nhầm 3 epoch". Resolved: DEC-LUNAR-132 và §1 #6 quy định rõ 4 hằng số cụ thể (2415021.076998695, 2415020.75933, 29.53058868, 2415021 int); `LunarCalcSwift` struct có static constants; XCTest AC #2/#3/#4/#5 dùng fixtures PRD §6.6 để bắt lỗi epoch.

### ISS-003 - Widget timeline chỉ có 1 entry/ngày, giờ Hoàng đạo không cập nhật theo giờ

Nếu timeline chỉ có 1 entry cho ngày hôm nay, widget hiển thị cùng một "canh giờ hiện tại" từ sáng đến tối. Resolved: §1 #7 yêu cầu 12 entries, mỗi entry đại diện 1 canh giờ 2h; §3 `LunarEntry.date` là đầu canh giờ; XCTest AC #7 kiểm tra đúng 12 entries.

### ISS-004 - Không có fallback khi cache stale (người dùng chưa mở app > 24 giờ)

Nếu widget chỉ đọc cache và cache nil/stale, widget sẽ blank. Resolved: §1 #6 yêu cầu `LunarCalcSwift` làm fallback; §1 #14 `getSnapshot` phải sử dụng cache-or-compute; §6 skeleton mô tả fast-path fallback logic; AC #8 `getSnapshot < 1s`.

### ISS-005 - Chưa có bảo đảm widget không gọi network hoặc ghi state

WidgetKit có thể tương thự gọi URLSession. Cần ràng buộc rõ ràng trong spec. Resolved: §1 #10 cấm `URLSession` explicit; §1 #11 cấm write `UserDefaults.standard.set`; DEC-LUNAR-134 giải thích lý do; AC #9 và AC #10 kiểm tra.

### ISS-006 - XCTest fixture chưa có trong §5

FR này viết Swift nhưng nếu §5 không có XCTest cụ thể thì không có "Test: T" có nghĩa. Resolved: §5 có 4 nhóm XCTest với fixture PRD §6.6: Tết 2025, Tết 2023, 1985 leap, 2007 VN offset, round-trip constants check, DayInfoCache isStale, timeline count, snapshot measure.

### ISS-007 - Watch complication (FR-F02) chưa được phân tách rõ là COULD hay phải build ngay

PRD FR-F02 ghi "tùy chọn" nhưng chưa rõ trong spec FR-013. Resolved: DEC-LUNAR-133 xác nhận COULD; §1 #12 định nghĩa COULD với watchOS 9+ WidgetKit; §11 mô tả cách tái sử dụng LunarCalcSwift khi quyết định build; cấu trúc bundle ghi rõ chỉ `LunarWidgetSmall()` trước.

## §3 - Resolution

Sau 7 phát hiện và sửa: cơ chế App Group được xác định và contract đầy đủ, hằng số epoch được lock bằng constants + XCTest, timeline 12 entries cho giờ Hoàng đạo, stale-cache fallback rõ ràng, cấm network/write-state trong spec + test, §5 có XCTest đầy đủ với PRD §6.6 fixtures, và Watch là COULD rõ ràng. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27) - BLOCKER + 2 issues found + fixed

Bản self-audit ở trên đã bỏ sót một blocker và hai vấn đề. Reviewer độc lập phát hiện:

- **BLOCKER - Địa chi ngày lệch 8 so với core (cùng lỗi với FR-011).** §3 contract của `canChiNgayFromJDN` ghi `canChi index = (jdn + 9) % 60; diaChiIndex = canChiIndex % 12`. `(jdn + 9) % 12` lệch +8 so với `(jdn + 1) % 12` của FR-LUNAR-002 `canChiDay`. Widget hiển thị can-chi/giờ Hoàng đạo theo địa chi, nên widget sẽ lệch can-chi mà app/web hiển thị.
  - **Fix:** §3 contract comment + §1 #6 + §6 skeleton yêu cầu `diaChiIndex = (jdn + 1) % 12`; thêm §1 #16 + AC #15 + XCTest `testCanChi_MatchesCore_60DaySweep` (quét 60 ngày so với công thức core).
- **MAJOR - Fixture can-chi ngày sai.** §5 `testCanChiNgay_Tet2025` và AC #4 khẳng định ngày 29/01/2025 là "At Ty". Đó là can-chi NĂM (Ất Tỵ), không phải can-chi NGAY. Theo công thức core, can-chi ngày 29/01/2025 là **Mậu Tuất** ("Mau Tuat"). PRD 6.6 chỉ ghi "Ất Tỵ" ở cột năm.
  - **Fix:** AC #4 và test sửa thành "Mau Tuat" + assert `diaChiIndex == (jdn + 1) % 12`; §1 #13 làm rõ Ất Tỵ là can-chi năm.
- **MAJOR - tz không nhất quán + round-trip không khả thi.** Contract trộn quy ước: `convertSolar2Lunar`/`getNewMoonDay` bỏ tham số tz (phải dùng `TZ_VN` nội bộ) nhưng spec không nói rõ; và §1 #13 + test mang tên `testRoundTrip_L2S_S2L` trong khi contract tối thiểu KHÔNG có `convertLunar2Solar`.
  - **Fix:** thêm §1 #15 (mọi hàm phụ thuộc múi giờ dùng `TZ_VN = 7.0` nội bộ) + AC #16; chú thích `getSunLongitude`/`getNewMoonDay` dùng `TZ_VN`; đổi test thành `testConvertSolar2Lunar_Tet2025_Identity` (S2L trực tiếp) và sửa §1 #13.
  - **Score điều chỉnh (pre-fix, independent): 6/10.**

## §5 - Readiness pass (2026-06-28)

Pass thu hai do reviewer doc lap.

- **Can-chi/convert invariants khop CONTRACT.md.** `canChiNgayFromJDN` dung `canIndex = (jdn+9)%10` va `diaChiIndex = (jdn+1)%12` (khong dung `(jdn+9)%60%12`); duoc xac nhan trong §1 #6, §3 contract comment, §6 skeleton. `convertSolar2Lunar` dung TZ_VN = 7.0 noi bo nhat quan (§1 #15).
- **Fixture can-chi ngay dung.** AC #4 va `testCanChiNgay_Tet2025` khang dinh "Mau Tuat" (can-chi ngay 29/01/2025), khong phai "At Ty" (can-chi nam). AC #15 + `testCanChi_MatchesCore_60DaySweep` quet 60 ngay.
- **Traceability hoan chinh.** §1 #1-#16 co AC tuong ung (§4 co 16 AC). §1 #9 (purple theme colors) la SHOULD; khong co AC tren mau la chap nhan duoc doi voi visual SHOULD.
- **No missing function names.** Khong co tham chieu nao den `getTietKhiForDate` hay bat ky ten ham sai nao trong FR nay.

**Verdict: PASS. San sang thuc thi.**

*Het audit FR-LUNAR-013.*

*Hết audit FR-LUNAR-013.*
