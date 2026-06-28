# SHIP-READINESS - handoff cho agent implement (đọc trước tiên)

Tài liệu này dành cho agent (hoặc developer) sẽ ship các feature request của module LUNAR. Nó giả định bạn KHÔNG có ngữ cảnh hội thoại đã tạo ra corpus này. Đọc file này, rồi `docs/AGENT-GUIDE.md`, rồi `CONTRACT.md`, là đủ để bắt đầu. (`AGENTS.md` ở gốc repo là CyberOS memory protocol, không phải hướng dẫn build.)

## Trạng thái

20 FR `FR-LUNAR-001..020` ở `ready_to_implement`, audit 10/10, đã qua một lượt audit độc lập (`INDEPENDENT-AUDIT-2026-06-27.md`) và một lượt hardening cho handoff (căn chỉnh hợp đồng API + traceability + tự đủ). Tổng ~209.5 engineering-hours. `packages/amlich-core` đã scaffold và verify chạy (golden harness đỏ đúng kế hoạch, chờ implement). Chưa có logic thuật toán nào được viết; đó là việc của bạn.

## Quy tắc vàng (vi phạm là defect)

1. `CONTRACT.md` là hợp đồng API DUY NHẤT cho `@cyberskill/amlich-core` và `@cyberskill/genie-content`. Mọi import phải khớp tên + chữ ký ở đó. Đừng phát minh tên (ví dụ `getTietKhi`, `getTietKhiForDate` KHÔNG tồn tại; dùng `tietKhiAt` / `tietKhiStartDiaChi`).
2. `convertSolar2Lunar` / `convertLunar2Solar` trả LABELED TUPLE. Luôn destructure (`const [d, m, y, leap] = ...`), KHÔNG đọc `.year` / `.month`. Sentinel invalid là `[0, 0, 0]`; kiểm bằng `isInvalidSolar()`, KHÔNG `=== null`.
3. Can-chi ngày: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (FR-002 là owner). Day-quality (FR-011/013) lấy địa chi từ `canChiDay(jdn).chiIndex`, KHÔNG suy từ `(jdn+9)%60 % 12`.
4. Ba epoch và hai synodic constant trong `constants.ts` là các đại lượng riêng (PRD 6.2). Core offline, zero-dependency. Mọi phép tính khóa `Asia/Ho_Chi_Minh` (tz=7), kể cả khi thiết bị ở nước ngoài; dùng `todayInHCM()`.
5. Reminder type do FR-004 sở hữu trong `@cyberskill/amlich-core`; mọi nơi khác import, KHÔNG redeclare/mirror.

## Thứ tự ship

Theo `docs/BUILD-RUNBOOK.md` (thứ tự slice) và `README.md` mục Build order (topological). Một FR chỉ chuyển `done` khi qua gate; KHÔNG tự ý flip status. Operator (Stephen) chạy gate cuối và git commit trên máy thật.

## Định nghĩa "done" cho mỗi FR

1. Mọi §4 Acceptance Criteria pass.
2. Mọi §5 test xanh; `pnpm --filter <package> typecheck` sạch.
3. Không vi phạm quy tắc vàng ở trên; import khớp `CONTRACT.md`.
4. Với P0 (FR-003): gate accuracy thương mại xanh (xem mục dưới).

## P0 là cổng - làm trước, không nhảy cóc

FR-001/002/003 (`packages/amlich-core`) là rủi ro kỹ thuật cao nhất và là tài sản lõi. Implement theo runbook (jd, astro, leap, convert, canchi, tietkhi) tới khi `pnpm gate:p0` xanh 100%.

Gate accuracy thương mại (FR-003, theo yêu cầu founder verify độ chính xác ở mức thương mại) gồm bốn lớp ngoài round-trip:

1. Round-trip 1900-2199 (`golden-sweep.test.ts`), mismatches = 0.
2. Đối chiếu nguồn vàng tuyệt đối (`gold-1900-2199.json` lấy từ trình tính Hồ Ngọc Đức chính thức cho các năm edge + mẫu) - khớp tuyệt đối, không chỉ round-trip.
3. Đối chiếu thiên văn bằng `astronomy-engine` (dev-dependency, core vẫn zero-dep): so ngày gán với điểm Sóc/tiết khí thật, bắt rủi ro lệch 1 ngày khi Sóc sát nửa đêm.
4. Báo cáo ngày-nghi-ngờ (Sóc trong ~15 phút quanh nửa đêm VN) để soi tay; mốc HKO ~28/9/2057 là điểm cần theo dõi. Property tests: 12/13 tháng/năm, tháng nhuận chỉ ở năm 13 tháng, Đông chí ở tháng 11, độ dài tháng 29/30.

Ngưỡng commercial (founder decision 3): hard gate khớp tuyệt đối với dữ liệu vàng cho 1900-2100 (dải người dùng thực chạm); với 2100-2199 chấp nhận trong 1 ngày cộng flag cộng correction table, không chặn gate; round-trip vẫn hard 1900-2199. Nếu lớp đối chiếu phát hiện một năm sai trong 1900-2100: KHÔNG viết lại thuật toán cho phức tạp; thêm một bảng hiệu chỉnh nhỏ hardcode cho đúng ngày đó (giữ core offline/zero-dep). Lệch bất kỳ năm nào trong 1900-2100 -> dừng, debug, CHƯA xây UI.

## Founder decisions - đã chốt (xem BACKLOG)

Tất cả đã chốt 2026-06-28; không còn quyết định chặn ship. Tóm tắt: go thương mại đầy đủ; tự port amlich-core; accuracy hard gate 1900-2100 (flag + correction 2100-2199); Capacitor cho v1 (widget/watch native Swift); ZNS khởi đầu qua distributor; Genie dùng Claude Haiku 4.5; PDPL privacy-first + tham vấn pháp lý; ZNS hỗ trợ MONTHLY.


## Đừng làm

- Đừng chạy `ship-feature-requests` quá cổng gate, đừng flip status `done` khi test chưa xanh.
- Đừng đọc `.year`/`.month` trên kết quả convert; đừng redeclare core types; đừng import tên không có trong `CONTRACT.md`.
- Đừng để core gọi network hay phụ thuộc TZ thiết bị.
- Đừng git commit từ sandbox - để operator làm trên máy.

## Bản đồ tài liệu

- `docs/AGENT-GUIDE.md` - invariant core, kỷ luật build, quy ước viết. (`AGENTS.md` gốc repo dành cho CyberOS BRAIN/memory protocol.)
- `CONTRACT.md` (cùng thư mục) - hợp đồng API amlich-core + content (authority).
- `docs/BUILD-RUNBOOK.md` - thứ tự build từng slice + lệnh gate.
- `README.md` (cùng thư mục) - catalog 20 FR, build order, PRD traceability.
- `INDEPENDENT-AUDIT-2026-06-27.md` - defect đã fix + open items.
- `BACKLOG.md` (thư mục cha) - founder decisions, phasing.
- `manifest.json` - trạng thái máy đọc.
