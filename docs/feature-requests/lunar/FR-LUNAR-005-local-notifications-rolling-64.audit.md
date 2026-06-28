---
fr_id: FR-LUNAR-005
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-005 đặc tả local notification scheduler theo chiến lược rolling-64 trên iOS. Phạm vi: 16 mệnh đề §1 (removeAll + reschedule 64 gần nhất, đọc Occurrence từ FR-LUNAR-004 không tự tính ngày, app-open là trigger chính và BGAppRefreshTask best-effort, lead-time đếm slot, userInfo deep-link, horizon 6-12 tháng + slotsDropped, fairness giữa reminder, id deterministic idempotent, requestPermissions, tách planner/adapter, web push auxiliary, khóa +07:00, bỏ occurrence quá khứ, getPlanDiagnostics). 7 đoạn §2. §3 có planner/adapter/scheduler/deeplink + BGRefresh.swift. 14 AC. §5 có 9 test vitest gồm 100-reminder-budget + thứ tự cancel-trước-schedule. §10 liệt kê 14 dòng failure. §11 có 7 note. Ánh xạ PRD FR-B05, section 11, Key Findings 5/6, Caveats iOS background.

## §2 - Findings (all resolved during authoring)

### ISS-001 - iOS âm thầm vứt notification vượt 64
Hệ thống chỉ giữ 64 pending sớm nhất. Resolved: §1 #1 removeAll + reschedule 64 gần nhất + DEC-LUNAR-050; AC #1/#2.

### ISS-002 - Coi BGAppRefreshTask là kênh đảm bảo sẽ trượt nhắc
iOS không hứa chạy nền đúng giờ. Resolved: §1 #3 app-open là trigger chính, BG best-effort + DEC-LUNAR-051; §10 dòng 3.

### ISS-003 - Lead-time làm vượt ngân sách âm thầm
Resolved: §1 #4 mỗi (occurrence x leadTime) ăn một slot, đếm ở mức notification + DEC-LUNAR-052; AC #4.

### ISS-004 - User chạm notification mở nhầm màn hình
Resolved: §1 #5 userInfo mang reminderId + occurrenceDate -> deep-link + DEC-LUNAR-053; AC #5.

### ISS-005 - Một reminder nuốt hết 64 slot
Resolved: §1 #7 fairness pass lấy occurrence gần nhất mỗi reminder trước; AC #8.

### ISS-006 - Scheduler không test được vì cần thiết bị
Resolved: §1 #10 tách planner thuần tính toán + adapter mỏng + DEC-LUNAR-056; §5 9 test chạy trong Node.

### ISS-007 - Web push bị tưởng nhầm là kênh chính trên iPhone
Web Push iOS chỉ 16.4+ A2HS, reach thấp. Resolved: §1 #11 coi web push auxiliary + DEC-LUNAR-055; AC #13.

## §3 - Resolution

Bảy vấn đề cốt học đã xử lý: trần 64, trigger reschedule, đếm lead-time, deep-link, fairness, khả năng test, vai trò web push. Thuật toán rolling-64 ghi chính xác: removeAllPendingNotificationRequests rồi schedule 64 occurrence gần nhất trong 6-12 tháng, lead-time tính vào ngân sách, userInfo mang reminderId. Planner thuần tính toán tách khỏi adapter Capacitor nên CI assert được giới hạn. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

---

## §4 - Independent adversarial audit (2026-06-27, reviewer did NOT author)

Pre-fix independent score: **9/10**. Toán rolling-64 đúng ở các điểm brief yêu cầu kiểm: ngân sách CẮT tổng notification ở 64 (không phải 64 x leadTimes), `slotsDropped = max(0, total-64)` với `total` đếm SAU fan-out lead-time nên `scheduled + slotsDropped = total` nhất quán (AC #12), và plan giữ gần nhất trước (AC #1/#2). iOS-drop-beyond-64 được tránh đúng.

- **MAJOR (latent) - phủ horizon phụ thuộc `count` không được spec.** Skeleton dùng `count: enoughFor(horizon, r)` (helper chưa định nghĩa). Nếu `count` truyền cho `nextOccurrences` của một reminder nhỏ hơn số occurrence trong horizon, planner âm thầm thiếu các notification gần tương lai của reminder đó và phá vỡ bảo đảm "64 gần nhất" - nhưng không AC nào bắt. **Fixed:** §1 #6 thêm điều kiện normative: `count` mỗi reminder PHẢI đủ phủ `horizonMonths` (MONTHLY `>= ceil(horizonMonths)+1`) trước khi cắt 64; biến rủi ro im lặng thành điều kiện đúng đắn.
- **MINOR (accepted) - fairness vs "64 gần nhất tuyệt đối".** §1 #7 lấy 1 occurrence/reminder trước rồi mới fill toàn cục, nên khi #reminder > 64, tập giữ lại KHÔNG còn là 64 fireAtLocal nhỏ nhất tuyệt đối (đánh đổi có chủ ý để không reminder nào bị bỏ quên). AC #2 vẫn đúng vì nó assert thứ tự TRONG tập đã giữ, không phải tiêu chí chọn. Ghi nhận, không sửa - đúng thiết kế §1 #7.
- **MINOR - §5 traceability hở.** AC #8 (fairness/remindersCovered), AC #12 (diagnostics chính xác), AC #13 (web push auxiliary), AC #14 (fellBack mang cờ) không có test tương ứng trong §5 (chỉ 8 test, phủ AC #1-#7/#9-#11). Ghi cho pass triển khai bổ test; không đổi contract.

Post-fix score: **10/10** (latent major fixed).

---

---

## §5 - Contract-alignment readiness pass (2026-06-28)

Cac diem da chinh sua trong FR-LUNAR-005.md:

1. **Import getPlanDiagnostics** - them `getPlanDiagnostics` vao import block cua §5 test (truoc day test AC #12 goi ham nay ma khong import -> compile error).
2. **AC #8/#12/#13/#14 co test** - §5 hien co day du 14 test, phu toan bo 14 AC. Bo bong "tra cability ho" trong §4 audit da duoc lap day.
3. **CONTRACT alignment** - FR-005 import `Reminder, Occurrence` tu `@cyberskill/amlich-core` dung ten; `planSchedule` nhan `Reminder[]` va `nowUtcMs: number` (ms UTC, khac voi `todayInHCM(now?: Date)` - dung thiet ke vi scheduler dung ms de so sanh voi ISO string fireAtLocal).
4. **DEC IDs xac nhan** - DEC-LUNAR-050..056 ton tai trong frontmatter; moi AC tham chieu dung DEC ID.

Verdict: FR-LUNAR-005 san sang cho agent context-free implement.

*Het audit FR-LUNAR-005.*

*Hết audit FR-LUNAR-005.*
