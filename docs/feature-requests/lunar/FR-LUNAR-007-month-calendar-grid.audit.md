---
fr_id: FR-LUNAR-007
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; DEC-LUNAR-070..074 assigned; NFR-Performance render < 100ms enforced; placeholder pattern for FR-011 encoded)
---

## §1 - Verdict summary

FR-LUNAR-007 đặc tả thành phần lưới lịch tháng hai hệ thống (dương + âm) là màn hình chính của MVP Phase 1 slice 3. Phạm vi: 16 mệnh đề BCP-14 trong §1 (buildMonthGrid một lần, useMemo, header lunar, padding, highlight hôm nay, tap detail, placeholder FR-011, offline, swipe). 7 đoạn rationale §2 giải thích DEC-LUNAR-070..074 và các quyết định kiến trúc. §3 có 4 TypeScript interface và function signature đầy đủ cho CalendarGrid, DayCell, DayDetailPanel, buildMonthGrid, computeReminderDatesForMonth. 15 AC kiểm tra được trong §4 bao gồm edge case tháng nhuận 1985, tiết khí, hôm nay, padding, offline. §5 có 7 unit test cụ thể với fixture tháng 1/2025 Tết Ất Tỵ và spy đếm lần gọi. §10 liệt kê 12 hàng failure mode bao gồm timezone SSR/client, clip portal, debounce swipe. Ánh xạ tới FR-A05 (grid), NFR-Performance (< 100ms), §13 (lịch tháng).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Gọi convertSolar2Lunar từng ô trong vòng lặp render vi phạm NFR-Performance
Nếu gọi 31 lần đồng bộ trong render cycle, tổng thời gian có thể vượt 100ms. Resolved: §1 #6 + DEC-LUNAR-070 + hàm buildMonthGrid tính một lần; AC #3 + §5 test spy đếm số lần gọi.

### ISS-002 - useMemo bị bỏ qua, buildMonthGrid tính lại mỗi re-render
Deps không ổn định (object mới mỗi render) khiến useMemo vô hiệu hóa. Resolved: §1 #7 + DEC-LUNAR-071 + §5 test mock đếm số lần gọi; §11 note về key stability.

### ISS-003 - Không có placeholder cho FR-LUNAR-011, block Phase 2
Nếu DayDetailPanel layout gắn cứng với Hoàng đạo/Trực/28 sao sẽ block FR-007 ship trong slice 3. Resolved: §1 #14 + DEC-LUNAR-072 + fields hoangDao/truc/sao28 kiểu null trong DayCellData; §8 example payload có comment "(Phase 2 - chưa có)".

### ISS-004 - Timezone SSR vs client làm sai startPadding
`new Date(year, month-1, 1).getDay()` trong SSR Next.js chạy UTC, lệch 7 giờ so với Asia/Ho_Chi_Minh. Resolved: §11 note thứ 2 về Intl + timeZone Asia/Ho_Chi_Minh; §10 failure row "Padding sai".

### ISS-005 - DayDetailPanel bị clip bởi overflow:hidden của grid container
Panel slide-up render trong container grid sẽ bị cắt. Resolved: §11 note "createPortal gắn vào document.body"; §10 failure row "DayDetailPanel re-render grid" có nguyên nhân tương tự.

### ISS-006 - Không có test covers trường hợp tháng nhuận và offline
Thiếu fixture tháng nhuận 1985 và kiểm tra không có network. Resolved: §5 test "Tháng 3/1985: có tháng nhuận 2" và test "Không có network request trong buildMonthGrid" với fetchSpy.

## §3 - Resolution

Sau khi xử lý 6 vấn đề trên, FR-LUNAR-007 có 16 mệnh đề BCP-14, 15 AC, 7 unit test cụ thể, 12 failure rows, 7 implementation notes. Tất cả DEC-LUNAR-070..074 được tạo và tham chiếu đầy đủ. Score sau self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Reviewer doc lap (khong phai tac gia) cham lai voi gia dinh self-audit lac quan. Pre-fix score: **5/10**. Self-audit 10/10 da bo sot ba defect contract-level voi FR-LUNAR-001/002:

- **MAJOR (BLOCKER-level) - import sai ham khong ton tai.** §3 line 102 + §6 import `getTietKhi` tu amlich-core, nhung FR-LUNAR-002 export `tietKhiAt(jdn, tz)`, KHONG co `getTietKhi` (PRD §6 cung khong dinh nghia). Build se vo. Fixed: §3 + §6 doi sang `tietKhiAt`; them helper `isTietKhiStart`; §11 note 5 va §10 row sua theo.
- **MAJOR - tuple vs object + can-chi/zodiac khong bao gio duoc tinh.** §6 lam `const lunar = convertSolar2Lunar(...)` roi `lunarDate: { ...lunar }`. Nhung convertSolar2Lunar tra TUPLE `[day,month,year,leap]`; spread mang vao object cho ra `{0,1,2,3}`, mat het ten truong. can-chi (§1 #2) va zodiac khong he duoc populate du AC #1 yeu cau. canChiDay/tietKhiAt nhan JDN, khong nhan d/m/y. Fixed: §6 destructure tuple, tinh `jdFromDate(d,m,y)` mot lan, goi `canChiDay(jdn)/canChiMonth(lMonth,lYear)/canChiYear(lYear)/zodiacOf(lYear)/tietKhiAt(jdn,tz)` va lap rap DTO; §3 import dung cac symbol nay.
- **MAJOR - SSR/timezone start-padding bug ship trong skeleton.** §6 dung `firstDay.getDay()` (lay theo timezone runtime; static-export prerender chay UTC -> lech ngay bat dau tuan), du §11 va §10 da canh bao bang prose. Spec mo ta bug nhung VAN ship code loi. Fixed: §6 thay bang `startPaddingFor()` (Intl + timeZone Asia/Ho_Chi_Minh tren `Date.UTC(...,12)`), `daysInMonth` dung `getUTCDate()`; §10 row + §11 note 2 cap nhat sang code da-ship.

Cac muc da-resolved trong self-audit (placeholder FR-011, portal clip, fixture 1985/offline, useMemo) van dung. Sau fix: NFR-Performance render < 100ms van duoc xu ly (§1 #12, AC #3/#4); cac fixture test khong doi ket qua (Jan 2025 van 3 o padding, Tet 29/01 van mung 1). **Post-fix score = 9/10** (deferred Web Worker + 6-row layout van la implementation-time, khong phai contract defect).

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **VN_TIMEZONE -> VN_TZ**: `VN_TIMEZONE` khong ton tai trong CONTRACT.md; `VN_TZ = 7.0` moi la export dung. Da sua import va tat ca diem dung trong §3, §6. Tat ca 4 ocurrence thay the thanh cong.
- **zodiacOf signature**: CONTRACT khai bao `zodiacOf(chiIndex: number)`, KHONG phai `zodiacOf(lunarYear)`. Da sua comment §3 (chiIndex), skeleton §6 (`zodiacOf(canChiYear(lYear).chiIndex)`), va comment prose trong §6. Ghi chu am trong §7 ("KHONG phai getTietKhi") giu nguyen - dung.
- **getTietKhi**: Khong co import nao thuc te; chi xuat hien trong van ban am-prose (chap nhan). Khong co code nao goi `getTietKhi`. PASS.
- **Traceability Task B**: 16 menh de BCP-14 trong §1, 15 AC trong §4, 7 test trong §5. Tat ca PHAI deu co AC tuong ung va test. DEC-LUNAR-070..074 ton tai va duoc tham chieu day du.

**Post-alignment score: READY.**

*Hết audit FR-LUNAR-007.*
