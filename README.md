# Genie Âm Lịch (kristen-calendar)

Ứng dụng nhắc âm lịch Việt Nam tông tím của CyberSkill. Nó tính ngày âm on-device theo thuật toán Hồ Ngọc Đức (giờ Việt Nam UTC+7, kinh tuyến 105°E), nhắc Rằm, Mùng Một, đám giỗ và lễ tết, giải thích ý nghĩa cùng cách chuẩn bị mỗi dịp, và chạy trên Web/PWA, iOS (qua Capacitor), và Zalo Mini App, với một backend serverless mỏng cho AI Genie (Claude) và ZNS. Đây là sản phẩm thương mại đầy đủ tính năng; người dùng đầu tiên và design partner là vợ founder.

Tài liệu này là điểm vào cho cả người mới lẫn agent. Đọc hết phần "Bắt đầu nhanh" và "Đọc theo thứ tự", rồi rẽ theo việc bạn cần làm.

## Trạng thái

Spec đầy đủ và đã audit, cộng P0 runway đã verify. Chưa viết logic thuật toán - đó là việc của giai đoạn implement.

- 20 feature request `FR-LUNAR-001..020` ở trạng thái `ready_to_implement`, mỗi cái một engineering-spec 11 mục kèm file audit 10/10. Tổng ước tính khoảng 209.5 engineering-hours.
- Một lượt audit độc lập (adversarial) đã chạy: tìm và fix 2 blocker cộng khoảng 13 code-level major. Xem `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md`.
- `packages/amlich-core` đã scaffold: hằng số PRD 6.2, kiểu dữ liệu, golden fixtures, và harness đã wired; các hàm thuật toán là STUB (ném lỗi "chua implement"). Chạy harness ra 1 test xanh (dữ liệu) trên tổng số đỏ - đúng trạng thái cổng go/no-go cần có.
- Tám founder decision đã chốt hết (xem `docs/feature-requests/BACKLOG.md`); không còn quyết định nào chặn ship.

## Bắt đầu nhanh

Yêu cầu: Node 20 trở lên và pnpm 9. iOS cần macOS với Xcode (chỉ khi tới slice native widget/watch).

```bash
pnpm install                 # cài dependency cho cả workspace
pnpm gate:p0                 # golden harness cho amlich-core (cổng P0); hien tai do vi stub chua implement
pnpm --filter @cyberskill/amlich-core typecheck   # phai sach
```

Khi P0 được implement, `pnpm gate:p0` phải xanh 100% trước khi xây bất kỳ UI nào.

## Đọc theo thứ tự

Tùy việc bạn cần, có hai lối đọc.

Nếu bạn là người mới muốn hiểu sản phẩm: đọc PRD/SRS gốc `docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (...).md`, rồi `docs/feature-requests/lunar/README.md` (catalog 20 FR cộng build order và PRD traceability), rồi `docs/feature-requests/BACKLOG.md` (phasing cộng founder decisions).

Nếu bạn là agent hoặc developer sắp build: đọc `docs/feature-requests/lunar/SHIP-READINESS.md` (handoff, đọc trước tiên), rồi `docs/AGENT-GUIDE.md` (invariant core cộng kỷ luật build), rồi `docs/feature-requests/lunar/CONTRACT.md` (hợp đồng API duy nhất), rồi `docs/BUILD-RUNBOOK.md` (thứ tự build từng slice). Khi implement một FR cụ thể, đọc file FR đó section 3 (API contract) và section 5 (Verification) trước.

## Kiến trúc

Một thư viện lõi TypeScript dùng chung, `@cyberskill/amlich-core` (zero-dependency, offline, đã unit-test), tính toàn bộ logic âm lịch một lần và được import vào cả ba client. Web/PWA viết bằng Next.js/React là nền cho cả PWA và Capacitor; iOS bọc chính web build đó bằng Capacitor, cộng widget và Watch complication viết native Swift trong `ios/App`; Zalo Mini App viết React cộng zmp-ui và zmp-sdk. Một backend serverless mỏng (`services/genie-api`) chỉ làm hai việc: proxy gọi Claude (AI Genie) và gửi ZNS qua Zalo Official Account. Dữ liệu mặc định lưu on-device; đồng bộ cloud (Supabase) là tùy chọn cho family sharing và phải có consent.

Lý do chọn kiến trúc này: logic âm lịch là tài sản lõi và là rủi ro kỹ thuật cao nhất, nên viết một lần và tái dùng 100%; ba client chia sẻ cùng một engine nên không lệch ngày giữa các nền tảng.

## Cấu trúc repo

```
packages/amlich-core/   @cyberskill/amlich-core - loi am lich (Ho Ngoc Duc): convert, can-chi, tiet khi,
                        recurrence, day-quality. Zero-dependency, offline. FR-001/002/003/004/011.
packages/content/       @cyberskill/genie-content - noi dung 13 dip am lich (y nghia, mam cung, checklist). FR-008.
packages/ui/            @cyberskill/genie-ui - purple theme pack, cong tuong phan APCA, Be Vietnam Pro. FR-009.
apps/web/               genie-web - Next.js/React PWA + Capacitor iOS host; ios/App cho widget/watch native Swift.
                        FR-005 (notification), 006, 007, 010, 012, 013, 014, 015 (UI).
zalo/                   genie-zalo - Zalo Mini App (React + zmp-ui + zmp-sdk). FR-016.
services/genie-api/     @cyberskill/genie-api - serverless TS: Claude proxy, ZNS, sync, PDPL, billing.
                        FR-015, 017, 018, 019, 020.
docs/                   PRD/SRS goc, BUILD-RUNBOOK, AGENT-GUIDE, va docs/feature-requests/ (20 FR + audit + spine).
```

Hiện chỉ `packages/amlich-core` đã scaffold đầy đủ; các package khác mới có `package.json` placeholder và sẽ scaffold khi tới slice tương ứng.

## Cách build

Build theo phase và slice, đúng thứ tự topological trong `docs/feature-requests/lunar/README.md`. Không nhảy cóc dependency.

- P0 - core engine (FR-001..003), làm trước. Đây là rủi ro kỹ thuật cao nhất và là cổng go/no-go: amlich-core phải khớp 100% lịch Hồ Ngọc Đức cho dải năm thực dùng trước khi xây bất kỳ UI nào.
- P1 - MVP cá nhân (FR-004..010): nhắc Rằm/Mùng Một/đám giỗ cộng lịch tháng cộng nội dung dịp, chạy Web/PWA cộng Capacitor iOS, lưu on-device, không backend.
- P2 - trải nghiệm nâng cao (FR-011..015): xem ngày tốt (Hoàng đạo/Trực/28 sao), good-day picker, iOS widget cộng Watch, shareable cards, AI Genie.
- P3 - thương mại hóa (FR-016..020): Zalo Mini App, ZNS, family sharing cộng cloud sync, tuân thủ PDPL, freemium.

Vòng đời một FR: `ready_to_implement` thành `implementing` thành `done`. Một FR chỉ chuyển `done` sau khi qua gate (mọi §4 acceptance criteria pass, mọi §5 test xanh, typecheck sạch, không vi phạm quy tắc vàng). Không tự ý flip status. Operator (Stephen) chạy gate cuối và git commit trên máy thật.

Cổng accuracy của P0 (founder decision 3): khớp tuyệt đối với dữ liệu vàng là hard gate cho 1900-2100 (dải người dùng thực chạm: giỗ quá khứ cộng lịch tương lai gần); với 2100-2199 chấp nhận sai trong 1 ngày cộng flag ngày nghi ngờ cộng bảng correction nếu xác nhận lệch, không chặn gate. Round-trip sweep vẫn hard 1900-2199.

## Quy tắc vàng cho code amlich-core (vi phạm là defect)

Đây là các bất biến mà lượt audit độc lập đã bắt lỗi; một agent build phải tuân.

1. `CONTRACT.md` là hợp đồng API duy nhất. Mọi import phải khớp tên và chữ ký ở đó. Tên không tồn tại hay bị nhầm: `getTietKhi`, `getTietKhiForDate` - dùng `tietKhiAt` và `tietKhiStartDiaChi`.
2. `convertSolar2Lunar` và `convertLunar2Solar` trả về labeled tuple, không phải object. Luôn destructure (`const [d, m, y, leap] = ...`), không đọc `.year` hay `.month`. Sentinel invalid là `[0, 0, 0]`; kiểm bằng `isInvalidSolar()`, không kiểm `=== null`.
3. Can-chi ngày: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (FR-002 là owner). Day-quality lấy địa chi từ `canChiDay(jdn).chiIndex`, không suy từ `(jdn+9)%60 % 12` (lệch 8).
4. Ba epoch và hai synodic constant trong `constants.ts` là các đại lượng riêng (PRD 6.2), không gộp nhầm.
5. Core offline, zero-dependency, không gọi network để tính ngày. Mọi phép tính khóa về `Asia/Ho_Chi_Minh` kể cả khi thiết bị ở nước ngoài; dùng `todayInHCM()`.
6. Type `Reminder` do FR-004 sở hữu trong `@cyberskill/amlich-core`; mọi nơi khác import, không redeclare hay mirror.

## Founder decisions (đã chốt 2026-06-28)

Go thương mại đầy đủ; tự port amlich-core; accuracy hard gate 1900-2100 (flag cộng correction 2100-2199); Capacitor cho v1 (widget và watch vẫn native Swift); ZNS khởi đầu qua distributor; Genie dùng Claude Haiku 4.5; PDPL privacy-first cộng tham vấn pháp lý; ZNS hỗ trợ MONTHLY. Chi tiết và lý do ở `docs/feature-requests/BACKLOG.md`.

## Quy ước

Đặt tên package: lõi tái dùng được không có tiền tố (`@cyberskill/amlich-core`); package sản phẩm có tiền tố genie (`@cyberskill/genie-content`, `@cyberskill/genie-ui`, `@cyberskill/genie-api`); app dùng tên trần (`genie-web`, `genie-zalo`).

Hai file hướng dẫn agent, hai mục đích khác nhau: `AGENTS.md` ở gốc repo được dành cho CyberOS Layer-1 Memory Protocol (kích hoạt BRAIN ở `.cyberos-memory/`); `docs/AGENT-GUIDE.md` là hướng dẫn build riêng của dự án. Một agent ở repo này theo cả hai - AGENTS.md cho giao thức bộ nhớ, AGENT-GUIDE cho invariant build.

Quy ước viết tài liệu: prose tiếng Việt có dấu đầy đủ; thuật ngữ kỹ thuật, API, và code giữ tiếng Anh; chỉ dùng ký tự bàn phím chuẩn trong prose (straight quotes, hyphen cho dấu gạch, ba dấu chấm cho ellipsis); không em dash, en dash, hay curly quote.

## Bản đồ tài liệu

- `docs/PRD + SRS — ...md` - tài liệu nền tảng (product + software requirements), nguồn của mọi FR.
- `docs/feature-requests/lunar/README.md` - catalog 20 FR, build order topological, dependency edges, PRD traceability.
- `docs/feature-requests/lunar/SHIP-READINESS.md` - handoff cho agent implement; đọc trước tiên khi build.
- `docs/feature-requests/lunar/CONTRACT.md` - hợp đồng API amlich-core và content (authority cho mọi import).
- `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md` - defect đã fix cộng open items.
- `docs/feature-requests/lunar/manifest.json` - trạng thái máy đọc của 20 FR.
- `docs/feature-requests/BACKLOG.md` - phasing, headline metrics, founder decisions.
- `docs/AGENT-GUIDE.md` - invariant core, kỷ luật build, quy ước viết.
- `docs/BUILD-RUNBOOK.md` - thứ tự build từng slice cộng lệnh gate.
- `docs/DEPLOYMENT.md` - Hướng dẫn deployment, các yêu cầu tài khoản bên ngoài (Claude, Zalo), cấu hình môi trường và RevenueCat (In-app purchase).
- `docs/DEVELOPMENT.md` - Hướng dẫn setup và phát triển local.
- `AGENTS.md` (gốc repo, do Stephen đặt) - CyberOS BRAIN/memory protocol.

## Thuật ngữ (cho người mới)

Âm lịch: lịch theo chu kỳ mặt trăng. Dương lịch: lịch theo mặt trời (lịch thường ngày). Rằm: ngày 15 âm (trăng tròn). Mùng Một: ngày 1 âm (đầu tháng). Đám giỗ: ngày tưởng nhớ người đã mất, tính theo ngày âm. Tháng nhuận: tháng âm lặp lại trong năm 13 tháng. Can-chi: hệ đếm 60 (10 Can cộng 12 Chi), ví dụ Giáp Tý. Tiết khí: 24 mốc thời tiết trong năm; Đông chí luôn rơi vào tháng 11 âm. Hoàng đạo / Hắc đạo: ngày tốt / xấu theo phong tục. Trực và Nhị thập bát tú (28 sao): các yếu tố xem ngày dân gian. Tết, Vu Lan, Đoan Ngọ, Trung Thu: các dịp lễ âm lịch.

Thuật toán Hồ Ngọc Đức: cách tính âm lịch Việt Nam chuẩn, dựa công thức thiên văn Jean Meeus. PWA: Progressive Web App. Capacitor: bọc web app thành app native. Zalo Mini App: app chạy trong Zalo. ZNS (Zalo Notification Service): kênh gửi thông báo qua Zalo Official Account (OA). PDPL: Luật Bảo vệ Dữ liệu Cá nhân Việt Nam.
