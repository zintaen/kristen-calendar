---
fr_id: FR-LUNAR-012
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS minimum; offline + EventKit opt-out + clamp rules applied)
---

## §1 - Verdict summary

FR-LUNAR-012 đặc tả màn hình "good-day picker" là UI thuần trên `getDayQuality`/`getMonthDayQualities` từ FR-011. Phạm vi: 12 điều khoản BCP-14 trong §1 (3 khu vực UI, 4 loại việc, clamp 90 ngày, filter Hoàng đạo, hiển thị 5 trường + top giờ Hoàng, disclaimer cố định, offline, EventKit là COULD); 6 lý do thiết kế trong §2; 5 kiểu TypeScript và 3 hàm public trong §3; 12 AC trong §4; 5 nhóm test trong §5; bảng 11 hàng failure trong §10. FR map tới PRD FR-E01, FR-E04 (COULD), PRD §13 (đặc thù diễn viên), và NFR-Offline.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Khoảng ngày không giới hạn có thể gây hiệu năng kém và danh sách không thể dùng

Nếu người dùng chọn 1 năm (365 ngày), có thể 180+ kết quả Hoàng đạo. Resolved: DEC-LUNAR-124 giới hạn 90 ngày; §1 #3 clamp + thông báo; AC #3 test clamp; §11 note edge case tháng 12->1.

### ISS-002 - EventKit là SHOULD trong PRD nhưng nếu build bắt buộc thì delay ship

FR-E04 trong PRD ghi "tùy chọn". Nếu implement là SHOULD thì tạo áp lực test native Calendar trên iOS trước khi có tính năng cơ bản. Resolved: DEC-LUNAR-122 giảm xuống COULD; §1 #11 lazy permission + flow chính không bị ảnh hưởng; AC #9 test opt-out case; §11 platform check.

### ISS-003 - Chưa có cơ chế đảm bảo disclaimer hiển thị (khác với disclaimer trong DayQuality)

DayQuality có `disclaimer` field nhưng UI có thể không render nó. Resolved: §1 #6 bắt buộc banner disclaimer cố định; AC #6 DOM query test; §11 yêu cầu copy-paste chính xác.

### ISS-004 - Không rõ cách xử lý khoảng ngày qua ranh giới năm mới

Khoảng 15/12/2025 - 15/02/2026 cần gọi `getMonthDayQualities` cho 3 tháng khác nhau qua 2 năm. Resolved: §6 skeleton ghi rõ loop qua tháng tăng dần với xử lý năm; §11 note edge case tháng 12->1.

### ISS-005 - Màn hình có thể gọi network nếu làm sai

FR-010 (app shell) có lớp data-fetching; nếu developer copy pattern thì có thể vô tình thêm network call. Resolved: §1 #7 tường minh cấm network; AC #8 mock fetch; DEC-LUNAR-120 xác nhận "dữ liệu từ amlich-core, không gọi network".

### ISS-006 - "Loại việc" chưa được định nghĩa cụ thể là gì

PRD §13 nói đặc thù diễn viên nhưng không liệt kê 4 giá trị cuối. Resolved: §1 #2 liệt kê 4 giá trị cụ thể từ PRD §13 + Persona 1 (Chú Linh) + Persona 3 (Anh Tuấn); §3 `WorkType` union type với 4 giá trị; `WORK_TYPE_OPTIONS` với label tiếng Việt.

## §3 - Resolution

Sau 6 phát hiện và sửa: khoảng 90 ngày có clamp + test, EventKit giảm xuống COULD với lazy permission, disclaimer có AC DOM test, multi-year boundary được xử lý trong skeleton, network call bị cấm + test, 4 loại việc được định nghĩa cụ thể. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

Reviewer độc lập xác nhận FR-012 đúng là UI thuần trên FR-011 (DEC-LUNAR-120), clamp 90 ngày, EventKit COULD không block - không có blocker. Một MINOR đã sửa: §3 `good-day.ts` tham chiếu `DayQuality`/`GioInfo` mà không import; đã thêm `import type { DayQuality, GioInfo }` và `import { getMonthDayQualities }` từ `@cyberskill/amlich-core` để contract compile và làm rõ FR-012 tiêu thụ FR-011 (không tự tính). **Score độc lập (pre-fix): 8.5/10.**

## §5 - Readiness pass (2026-06-28)

Pass thu hai do reviewer doc lap.

- **Import khop CONTRACT.md.** §3 `good-day.ts` import `DayQuality`, `GioInfo` (type), va `getMonthDayQualities` dung ten chinh xac tu `@cyberskill/amlich-core`. FR-012 khong tu tinh phong thuy (DEC-LUNAR-120).
- **AC #13 them moi.** §1 #8 (PHAI khong tu dong tao Reminder) truoc day thieu AC tuong ung. Da them AC #13 va 2 test trong §5 xac nhan `filterGoodDays` va `computeGoodDays` khong goi createReminder hay EventKit write (DEC-LUNAR-123).
- **Traceability hoan chinh.** Moi MUST clause §1 #1-#8 co AC trong §4 va test trong §5.

**Verdict: PASS. San sang thuc thi.**

*Het audit FR-LUNAR-012.*

*Hết audit FR-LUNAR-012.*
