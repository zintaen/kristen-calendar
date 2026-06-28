---
fr_id: FR-LUNAR-004
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-004 đặc tả data model `Reminder`/`User`/`OccurrenceCache` cộng recurrence engine sinh ngày dương từ ngày âm. Phạm vi: 16 mệnh đề §1 (lưu âm không lưu dương, recurrence MONTHLY/ANNUAL/ONCE, type RAM/MUNG_MOT/GIO/CUSTOM/FESTIVAL, gọi convertLunar2Solar mỗi năm, fallback tháng nhuận REGULAR/SKIP/ASK, clamp ngày tháng thiếu, khóa Asia/Ho_Chi_Minh, lead-time fan-out, OccurrenceCache invalidate theo engineVersion, validate/normalize, zero-dependency). 8 đoạn §2. §3 có type Reminder/User/Occurrence/OccurrenceCache đầy đủ, chữ ký nextOccurrences/mergeAndSort/todayInHCM. 17 AC. §5 có 12 test vitest gồm mốc 1985 tháng 2 nhuận + khóa TZ. §10 liệt kê 15 dòng failure. §11 có 7 note. Ánh xạ PRD FR-B02, FR-B06, section 10 (Data Model + recurrence rule), section 11.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Lưu ngày dương sẽ sai sang năm
Đám giỗ là ngày âm cố định, ngày dương đổi mỗi năm. Resolved: §1 #1 lưu lunarDay/lunarMonth/isLeapMonth + DEC-LUNAR-040; AC #1.

### ISS-002 - Nội suy 354/384 ngày sẽ trôi dần
Khoảng cách hai ngày giỗ theo dương không cố định. Resolved: §1 #4 gọi convertLunar2Solar mỗi targetLunarYear + DEC-LUNAR-041; AC #2; §10 dòng 2.

### ISS-003 - Giỗ rơi tháng nhuận không có câu trả lời
Năm không có tháng nhuận đã nhập thì cúng ngày nào. Resolved: §1 #5/#6 fallback REGULAR/SKIP/ASK + fellBack + DEC-LUNAR-042; AC #5/#6/#7.

### ISS-004 - Ngày 30 trong tháng âm 29 ngày biến mất
Resolved: §1 #7 clamp về ngày cuối tháng + dayClamped; AC #9; §10 dòng 6.

### ISS-005 - Derive theo giờ thiết bị sai khi ở nước ngoài
Persona diễn viên đi quay xa. Resolved: §1 #8 khóa tz=7.0 qua tz.ts + DEC-LUNAR-043; AC #12; test set process.env.TZ.

### ISS-006 - Cache có thể phục vụ ngày sai sau khi core đổi
Resolved: §1 #11 OccurrenceCache mang engineVersion + isCacheStale + DEC-LUNAR-044; AC #13.

### ISS-007 - Lead-time chưa rõ thành bao nhiêu thông báo
Resolved: §1 #9/#10 mỗi (occurrence x leadTime) thành một Occurrence có fireAtLocal cho FR-LUNAR-005 cắt 64; AC #10/#16.

## §3 - Resolution

Bảy vấn đề cốt học đã xử lý: lưu-âm-derive-dương, tính-lại-mỗi-năm, fallback tháng nhuận, clamp ngày, khóa timezone, cache invalidation, lead-time fan-out. Type Reminder ở §3 đồng bộ với PRD section 10 từng trường; recurrence engine gọi đúng các hàm FR-LUNAR-001. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **8/10**. Bốn defect mà self-audit bỏ sót, đã sửa trong .md:

- **MAJOR - chữ ký `nextOccurrences` lệch nội bộ.** §1 #4 và sub_task khai báo `nextOccurrences(reminder, fromYear, count)` (3 tham số positional) nhưng §3, §5, §6 đều dùng `nextOccurrences(r, opt: RecurrenceOptions)` (object form). Mệnh đề §1 normative mâu thuẫn với contract thật. **Fixed:** §1 #4 + sub_task chuyển sang `nextOccurrences(reminder, opt)` object form, khớp §3/§5/§6 và brief audit.
- **MAJOR - `notificationStyle` field không có trên type Reminder mà FR-LUNAR-006 tiêu thụ.** FR-LUNAR-006 (§1 #9, §3 tone.ts, AC #11, payload, DEC-LUNAR-065) ghi `Reminder.notificationStyle`, nhưng type `Reminder` ở §3 (FR-004 sở hữu) và bản mirror ở FR-LUNAR-010 đều KHÔNG có trường này -> mismatch cấp biên dịch giữa producer (004) và consumer (006), đúng loại defert "gọi field/method chưa khai báo" mà tiền lệ CLICK bắt. **Fixed:** thêm `notificationStyle?: NotificationStyle` + type `NotificationStyle {tone, emoji, imageId?}` vào §3 của FR-004 (owner); FR-LUNAR-006 đổi `tone.ts` thành `import type { NotificationStyle } from "@cyberskill/amlich-core"` thay vì redeclare.
- **MAJOR - `count` vs lead-time mơ hồ + vòng lặp vô hạn ở ONCE+SKIP.** §3 nói `count` = "so occurrence muon (truoc khi nhan lead-time)" nhưng skeleton lặp `while (out.length < occurrenceBudget)` trong khi `out` đã fan-out theo leadTimes; chưa pin được `occurrenceBudget`. Đồng thời nhánh `resolved.skip` của `recurrence="ONCE"` (năm cố định) tăng `lunarYear` mãi mà `targetYear` không đổi và `lunarOccCount` không tiến -> treo. **Fixed:** §1 #4 pin `tổng Occurrence = count * leadTimes.length`; skeleton đếm `lunarOccCount` (chỉ tăng khi sinh occurrence), thêm `MAX_SKIP_SCAN` guard và `if (ONCE) break` trong nhánh skip; thêm comment rằng REGULAR fallback đặt `isLeap=false` nên `convertLunar2Solar` không trả sentinel `[0,0,0]`.
- **MINOR - §5 test fellBack dùng assert yếu.** Test "leap-month giỗ falls back" assert `lunarLabel.toContain("16/2")`, khớp cả nhãn nhuận lẫn nhãn thường nên không phân biệt được REGULAR fallback đã bỏ "(nhuan)". Ghi nhận làm note triển khai (siết thành `not.toContain("(nhuan)")` khi implement); không đổi contract.

**Cross-FR note (không sửa trong 3 FR mục tiêu):** FR-LUNAR-010 §3 redeclare một bản `Reminder` mirror cho storage layer; nó cũng thiếu `notificationStyle`. Runtime an toàn vì `JSON.parse(...) as Reminder` round-trip mọi field optional, nhưng hai bản type 004/010 là duplicate dễ drift - khuyến nghị FR-010 import `Reminder` từ amlich-core thay vì giữ bản sao (ghi cho pass triển khai shell).

Post-fix score: **10/10** (code-level majors fixed).

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

Tat ca cac diem sau da chinh sua trong FR-LUNAR-004.md:

1. **todayInHCM signature** - da sua tu `todayInHCM(nowUtcMs?: number): {dd,mm,yy}` thanh `todayInHCM(now?: Date): SolarDate` (CONTRACT chinh xac). Sub_task tuong ung da cap nhat.
2. **Occurrence la readonly** - 8 truong da them `readonly`; `gregorianDate` la `string` (khong phai SolarDate tuple) - da ghi chu ro.
3. **RecurrenceOptions.engineVersion REQUIRED** - da xac nhan khong co dau `?`; them comment "REQUIRED - CONTRACT".
4. **nextOccurrences / mergeAndSort return type** - da sua sang `readonly Occurrence[]` cho ca signature va skeleton.
5. **ReminderChannel** - doi ten type tu `Channel` thanh `ReminderChannel` cho khop CONTRACT.
6. **Reminder.lunarYear** - doi tu `lunarYear?: number` sang `lunarYear: number | null` (CONTRACT).
7. **Reminder.sharedWith** - doi tu `sharedWith: string[]` sang `sharedWith?: readonly string[]` (CONTRACT).
8. **Reminder readonly fields** - them `readonly` cho toan bo cac truong Reminder.
9. **§5 test AC #12** - sua `todayInHCM(fixedNoon)` (number) thanh `todayInHCM(fixedNow)` (Date); destructure theo tuple `result[0]/[1]/[2]` thay vi `{dd,mm,yy}`.
10. **§5 import** - them `type SolarDate` vao import cho test type-check.

Verdict: FR-LUNAR-004 san sang cho agent context-free implement.

*Het audit FR-LUNAR-004.*

*Hết audit FR-LUNAR-004.*
