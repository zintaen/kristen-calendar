# PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam ("Genie Âm Lịch" của CyberSkill)

> Tài liệu nền tảng kết hợp **Product Requirements Document (PRD)** + **Software Requirements Specification (SRS)**. Soạn cho Stephen Cheng (founder CyberSkill, TP. Hồ Chí Minh). Mục tiêu: đủ chi tiết kỹ thuật để bóc tách trực tiếp thành các feature-request / task. Thuật ngữ kỹ thuật, tên thư viện, API và code giữ nguyên tiếng Anh.

---

## TL;DR (kết luận cốt lõi — 3 ý)

- **Kiến trúc nên chọn:** xây một **TypeScript core library dùng chung** (`@cyberskill/amlich-core`) tính âm lịch **on-device** theo thuật toán Hồ Ngọc Đức (múi giờ Việt Nam UTC+7, kinh tuyến 105°E), import vào cả 3 client — **Web (Next.js/React), iOS (Capacitor bọc web app), và Zalo Mini App (zmp-ui/zmp-sdk)** — cộng một **serverless backend mỏng** chỉ để gọi Claude API và ZNS. Cách này cho phép viết logic âm lịch một lần, tái dùng 100%, và tối ưu chi phí cho một sản phẩm khởi đầu là cá nhân.
- **Phạm vi 2 giai đoạn:** MVP cá nhân (cho vợ) tập trung tuyệt đối vào *nhắc Rằm / Mùng Một / đám giỗ* bằng **local notifications** + giao diện tím + lịch tháng âm-dương; bản thương mại sau này mới bật **ZNS (Zalo Notification Service), AI Genie (Claude API), xem ngày tốt (Hoàng đạo/Hắc đạo), widget iOS, family sharing, shareable cards**.
- **Rủi ro kỹ thuật phải xử lý ngay từ đầu:** (1) tháng nhuận và các năm âm lịch VN khác Trung Quốc (1985 lệch 1 tháng; 2007, 2030, 2053 lệch 1 ngày) — bắt buộc kiểm thử đối chiếu lịch Hồ Ngọc Đức; (2) iOS chỉ cho **tối đa 64 local notifications đang chờ** mỗi app nên phải có chiến lược "rolling reschedule"; (3) **PDPL (Luật Bảo vệ Dữ liệu Cá nhân) có hiệu lực 01/01/2026** nên ngay cả bản cá nhân cũng phải thiết kế privacy-first.

---

## Key Findings (những phát hiện then chốt định hình tài liệu)

1. **Thuật toán âm lịch là tài sản lõi và đã có lời giải canonical.** Thuật toán Hồ Ngọc Đức (dựa trên công thức thiên văn Jean Meeus, *Astronomical Algorithms* 1998) là chuẩn vàng cho âm lịch Việt Nam. Có thể tự cài đặt với độ chính xác cao cho khoảng năm ~1200–2199. Toàn bộ hằng số đã được xác nhận (xem mục Lunar Algorithm Spec). Không cần gọi API runtime — chỉ cần ~300 dòng TypeScript.

2. **Khác biệt VN/TQ là do múi giờ, và nó có thật.** Âm lịch Việt Nam tính theo **kinh tuyến 105°E (UTC+7)**, Trung Quốc theo **120°E (UTC+8)**. Khi điểm Sóc (New Moon) hoặc Trung khí rơi gần nửa đêm, một giờ chênh lệch có thể đẩy ngày lệch đi 1 ngày, hoặc đặt tháng nhuận khác nhau. Ví dụ kinh điển: **1985** Tết Việt Nam sớm hơn Trung Quốc **một tháng**. Trong thế kỷ 21, theo trang chính thức của Hồ Ngọc Đức, có **đúng 3 năm** Tết hai nước lệch nhau 1 ngày: **2007 (17/2 vs 18/2), 2030 (02/2 vs 03/2), 2053 (18/2 vs 19/2)**. → Yêu cầu validation phải kiểm tra đúng các năm này.

3. **Zalo Mini App là kênh phân phối mạnh nhất ở Việt Nam cho bản thương mại.** Zalo đạt **gần 80 triệu người dùng và khoảng 2,1 tỷ tin nhắn/ngày tính đến cuối 2025** (Vietcetera, 01/2026). Mini App chạy bằng React + `zmp-ui` (component) + `zmp-sdk/apis` (getUserInfo, getPhoneNumber, getLocation, Storage, Camera...). **Hạn chế quan trọng:** Mini App **không** tự gửi push notification kiểu app native — muốn nhắc qua Zalo phải dùng **ZNS** qua **Zalo Official Account (OA)**.

4. **ZNS có quy tắc nghiêm ngặt nhưng rẻ.** Giá **≈200 VND/tin gửi thành công** (VietGuys: *"The price for sending a successful ZNS message is approximately 200 VND, with no limits on the frequency of monthly content sent"*), chỉ tính phí khi gửi thành công. Ràng buộc: phải dùng **template được Zalo duyệt trước** (tối đa ~400 ký tự), phải có **ít nhất 1 tham số cá nhân hóa** (tên, ngày…), **cấm nội dung quảng cáo thuần túy**, chỉ gửi cho người đã có quan hệ giao dịch và cung cấp số điện thoại, chỉ gửi **trong khung 06:00–22:00**, và **không quá 7 ngày trước/sau sự kiện**. → Hợp với nhắc "ngày mai là Rằm", không hợp marketing.

5. **iOS notification có giới hạn cứng.** iOS **chỉ giữ tối đa 64 local notifications đang chờ (pending)** mỗi app; theo tài liệu Apple (và Apple Developer Forums thread 811171): *"the system keeps the soonest-firing 64 notifications... and discards the rest."* Vì sự kiện âm lịch lặp lại không map cố định sang dương lịch, không thể đặt sẵn vô hạn. → Phải dùng **rolling window**: mỗi lần mở app, `removeAllPendingNotificationRequests()` rồi đặt lại 64 (hoặc ít hơn) sự kiện gần nhất.

6. **Web push trên iOS rất hạn chế.** Web Push chỉ hoạt động từ **iOS 16.4+** và **chỉ khi PWA được "Add to Home Screen"** (không chạy trong tab Safari), không có silent push, không background sync. → Web app KHÔNG đủ tin cậy làm kênh nhắc chính trên iPhone; đây là lý do nên có Capacitor app native cho iOS.

7. **Claude API đủ rẻ cho tính năng Genie.** **Claude Haiku 4.5** giá **$1,00 / 1M input token và $5,00 / 1M output token** (Anthropic), giảm tới 90% với prompt caching và 50% với batch. Với khối lượng cá nhân/gia đình, chi phí AI gần như không đáng kể; phải gọi qua **serverless proxy** để giấu API key.

8. **PDPL đã có hiệu lực.** **Luật Bảo vệ Dữ liệu Cá nhân (Law No. 91/2025/QH15)** thông qua 26/6/2025, **hiệu lực 01/01/2026** (Tilleke & Gibbins; EY Vietnam); Nghị định 356/2025/NĐ-CP (ban hành 31/12/2025) hướng dẫn thi hành và thay thế Decree 13/2023. Mức phạt: chuyển dữ liệu xuyên biên giới sai phạt tới **5% doanh thu năm trước**; mua bán dữ liệu trái phép tới **10× khoản lợi bất chính**; vi phạm khác **trần 3 tỷ VND**. Doanh nghiệp nhỏ/startup có **ân hạn 5 năm** cho DPIA và DPO. **Xử lý dữ liệu cho mục đích cá nhân/gia đình được miễn trừ** — nên bản MVP cá nhân gần như nằm ngoài phạm vi, nhưng bản thương mại thì không.

9. **APCA Lc ≥ 75 là khả thi với tông tím nhưng cần kỷ luật.** Lc 75 là ngưỡng tối thiểu cho body text (≈18px/400), Lc 90 là mức ưu tiên. Tím đậm trên nền kem/trắng dễ đạt; tím nhạt trên trắng thì khó — phải kiểm bằng công cụ APCA (`apca-w3`).

---

## Details

### 1. Product Vision & Goals

**Tầm nhìn:** Một ứng dụng "trợ lý âm lịch" đẹp, ấm áp, tông tím, giúp người Việt — khởi đầu là vợ của founder — **không bao giờ quên** những ngày âm lịch quan trọng (Rằm, Mùng Một, đám giỗ, lễ tết), và hiểu được *ý nghĩa* cũng như *cách chuẩn bị* cho mỗi dịp. Mở rộng thành sản phẩm thương mại qua kênh Zalo Mini App + iOS App Store.

**Mục tiêu sản phẩm:**
- **G1 (MVP):** Nhắc chính xác, đáng tin cậy Rằm/Mùng Một/đám giỗ với lead-time tùy chỉnh (nhắc trước 1 ngày để kịp sắm lễ).
- **G2:** Tính âm lịch on-device, offline, chính xác tuyệt đối theo giờ Việt Nam.
- **G3:** Trải nghiệm cá nhân hóa cho một nữ diễn viên yêu màu tím (giao diện tím, tính năng nghề nghiệp).
- **G4 (thương mại):** Phân phối qua Zalo Mini App + iOS; kiếm tiền qua premium/AI; tuân thủ PDPL.

**Slogan kết nối thương hiệu:** kế thừa tinh thần CyberSkill *"Hiện Thực Hoá Ý Chí / Turn Your Will Into Real"* — biến ý niệm "nhớ ngày giỗ ông bà" thành hành động được hỗ trợ bởi công nghệ.

---

### 2. Target Users / Personas

**Persona 1 — "Chị Linh", người dùng chính (vợ founder).**
- Nữ diễn viên (diễn viên), bận lịch quay, hay quên ngày âm.
- Yêu màu tím; thẩm mỹ cao; thích thứ đẹp, dễ chia sẻ lên mạng xã hội.
- Cần: nhắc Rằm/Mùng Một để cúng; nhớ đám giỗ hai bên nội ngoại; xem ngày tốt để ký hợp đồng/khai máy/ra mắt phim; gợi ý mâm cúng.
- Thiết bị chính: iPhone. Dùng Zalo hằng ngày.

**Persona 2 — "Cô Hoa", người dùng thương mại tương lai (nội trợ/người lớn tuổi giữ việc hương khói).**
- 35–60 tuổi, là người "tay hòm chìa khóa" việc cúng giỗ trong nhà.
- Cần: nhắc toàn bộ ngày giỗ của dòng họ; chia sẻ nhắc cho con cháu (family sharing); hướng dẫn mâm cúng, văn khấn.
- Kênh tiếp cận: **Zalo Mini App** (không cần cài app từ store) + ZNS.

**Persona 3 — "Anh Tuấn", người kinh doanh.**
- Cần xem ngày tốt khai trương, ngày Hoàng đạo, giờ Hoàng đạo, hợp tuổi.

---

### 3. User Stories / Use Cases (rút gọn, làm cơ sở cho FR)

- US-1: *Là Chị Linh, tôi muốn được nhắc trước 1 ngày khi sắp đến Rằm để kịp mua hoa quả sắm lễ.*
- US-2: *Là Chị Linh, tôi muốn nhập ngày giỗ của bà nội theo ngày âm một lần, và app tự nhắc đúng vào ngày dương tương ứng mỗi năm.*
- US-3: *Là Chị Linh, tôi muốn hỏi Genie "Rằm tháng Bảy cúng gì?" và nhận được gợi ý mâm cúng + ý nghĩa.*
- US-4: *Là Chị Linh, tôi muốn xem ngày nào trong tháng tới là ngày Hoàng đạo để chọn ngày ký hợp đồng phim.*
- US-5: *Là Cô Hoa, tôi muốn cả gia đình cùng nhận nhắc một ngày giỗ chung.*
- US-6: *Là Anh Tuấn, tôi muốn xem can-chi, trực, giờ Hoàng đạo của hôm nay ngay trên màn hình chính / widget.*
- US-7: *Là Chị Linh, tôi muốn một tấm thiệp đẹp tông tím ghi "Hôm nay Rằm tháng Giêng" để chia sẻ lên Instagram.*

---

### 4. Functional Requirements (đánh số để bóc thành task)

**Nhóm A — Lõi âm lịch (Core lunar)**
- **FR-A01:** Hệ thống PHẢI chuyển đổi ngày dương ↔ âm on-device cho mọi ngày trong khoảng 1900–2199, theo giờ Việt Nam (UTC+7, kinh tuyến 105°E).
- **FR-A02:** PHẢI xác định đúng tháng nhuận (tháng nhuận) và đánh dấu "N" / "nhuận".
- **FR-A03:** PHẢI tính can-chi của ngày, tháng, năm (Giáp Tý… Quý Hợi) và con giáp năm theo zodiac **Việt Nam** (Mèo thay Thỏ, Trâu thay Sửu/Bò).
- **FR-A04:** PHẢI tính 24 tiết khí và 12 Trung khí (để xác định tháng 11 chứa Đông chí).
- **FR-A05:** PHẢI hiển thị lịch tháng dạng grid: mỗi ô có ngày dương (lớn) + ngày âm (nhỏ góc) + can-chi + đánh dấu tiết khí + ngày lễ.
- **FR-A06:** PHẢI hoạt động hoàn toàn offline (không gọi network để tính ngày).

**Nhóm B — Nhắc nhở (Reminders) — trái tim của app**
- **FR-B01:** Người dùng PHẢI tạo được nhắc Rằm (15 ÂL) và Mùng Một (1 ÂL) hằng tháng, bật/tắt riêng.
- **FR-B02:** Người dùng PHẢI nhập đám giỗ bằng **ngày âm** (ngày + tháng âm, có cờ tháng nhuận tùy chọn), nhập **một lần**, app tự tính ngày dương tái diễn mỗi năm.
- **FR-B03:** Người dùng PHẢI tạo nhắc âm lịch tùy biến bất kỳ (ví dụ "ngày vía Thần Tài mùng 10 tháng Giêng").
- **FR-B04:** Mỗi nhắc PHẢI có **lead-time** tùy chỉnh: đúng ngày / trước 1 ngày / trước 3 ngày / trước 1 tuần; và **giờ nhắc** cụ thể.
- **FR-B05:** Hệ thống PHẢI lên lịch local notification trước, dùng chiến lược **rolling window** không vượt 64 pending trên iOS (xem Notification Architecture).
- **FR-B06:** PHẢI xử lý đúng múi giờ và DST (Việt Nam không có DST nhưng phải khóa tính toán về Asia/Ho_Chi_Minh để an toàn khi người dùng đi nước ngoài).
- **FR-B07:** Người dùng PHẢI xem được danh sách các nhắc sắp tới (cả ngày dương tương ứng).
- **FR-B08:** (Thương mại) Hệ thống PHẢI gửi được nhắc qua **ZNS** cho người dùng Zalo đã đồng ý.

**Nhóm C — AI Genie (Claude)**
- **FR-C01:** Genie PHẢI trả lời câu hỏi về phong tục/nghi lễ Việt (cúng gì, ý nghĩa, kiêng kỵ).
- **FR-C02:** Genie PHẢI gợi ý **mâm cúng / mâm cỗ** theo từng dịp + checklist lễ vật.
- **FR-C03:** Genie PHẢI giải thích ý nghĩa của từng ngày âm lịch quan trọng.
- **FR-C04:** Genie PHẢI sinh **lời nhắc cá nhân hóa** (ví dụ giọng ấm áp nhắc "Mai là giỗ bà, nhớ mua hoa cúc vàng nhé").
- **FR-C05 (tùy chọn):** Genie có thể đọc nhắc bằng giọng nói (TTS).
- **FR-C06:** Mọi lời gọi Claude PHẢI qua **serverless proxy**; KHÔNG nhúng API key vào client.

**Nhóm D — Gợi ý nghi lễ / mâm cúng (nội dung tĩnh, không cần AI)**
- **FR-D01:** App PHẢI có cơ sở dữ liệu nội dung cho các dịp chính (xem bảng dưới): tên, ngày âm, ý nghĩa, mâm cúng gợi ý, checklist.
- **FR-D02:** Mỗi nhắc PHẢI link tới trang nội dung tương ứng.

**Nhóm E — Cá nhân hóa cho diễn viên & xem ngày tốt**
- **FR-E01:** App PHẢI có "Good-day picker" (xem ngày tốt): cho một loại việc (ký hợp đồng, khai máy/khởi quay, ra mắt/premiere, khai trương), liệt kê ngày Hoàng đạo trong khoảng thời gian.
- **FR-E02:** PHẢI hiển thị ngày Hoàng đạo/Hắc đạo, Trực (12 Trực), Nhị thập bát tú (28 sao), can-chi ngày.
- **FR-E03:** PHẢI hiển thị giờ Hoàng đạo/giờ Hắc đạo trong ngày (6 giờ Hoàng đạo / 6 giờ Hắc đạo theo 12 canh giờ).
- **FR-E04 (tùy chọn):** Tích hợp lịch quay/lịch làm việc (EventKit / nhập tay) để gợi ý ngày.

**Nhóm F — Sáng tạo / mở rộng**
- **FR-F01:** Widget màn hình chính iOS (WidgetKit) hiển thị ngày âm hôm nay + can-chi + giờ Hoàng đạo.
- **FR-F02:** Apple Watch complication hiển thị ngày âm.
- **FR-F03:** Shareable cards (tông tím, export ảnh) để chia sẻ mạng xã hội.
- **FR-F04:** Family sharing — nhiều thành viên cùng nhận chung một nhắc giỗ.
- **FR-F05:** Thông báo cá nhân hóa (chọn tông giọng, emoji, ảnh).

---

### 5. Non-Functional Requirements (NFR)

- **NFR-Accuracy:** Kết quả chuyển đổi âm lịch PHẢI khớp 100% với lịch Hồ Ngọc Đức cho dải 1900–2199, gồm các năm edge-case 1985, 2007, 2030, 2053. Có bộ unit test cố định (xem fixtures).
- **NFR-Offline:** Tính ngày và xem lịch PHẢI hoạt động không cần mạng. Chỉ AI Genie và ZNS cần mạng.
- **NFR-Performance:** Chuyển đổi 1 ngày < 5ms; render lịch tháng < 100ms. (Các thư viện thuần JS đạt >270.000 chuyển đổi/giây.)
- **NFR-Privacy/PDPL:** Mặc định lưu dữ liệu **on-device**; nếu đồng bộ cloud phải có consent rõ ràng, granular. Đám giỗ (gắn người đã mất, tên họ) là dữ liệu nhạy cảm về văn hóa → tối thiểu hóa, không bán, không chuyển xuyên biên giới khi chưa có DPIA. Có privacy policy tiếng Việt. (Bản cá nhân/gia đình thuần túy được miễn trừ PDPL, nhưng thiết kế sẵn để bản thương mại tuân thủ.)
- **NFR-Accessibility:** Văn bản body đạt **APCA Lc ≥ 75** (ưu tiên Lc 90 cho đoạn văn dài); hỗ trợ Dynamic Type; nhãn rõ ràng.
- **NFR-Localization:** Tiếng Việt là ngôn ngữ chính (Vietnamese-first), dấu tiếng Việt chuẩn; kiến trúc i18n sẵn sàng cho tiếng Anh sau này.
- **NFR-Security:** API key (Claude, ZNS/OA token) chỉ nằm ở server; HTTPS; token OA tự refresh (ZNS access token cần refresh định kỳ).

---

### 6. Lunar-Calendar Technical Specification (chi tiết toán học & cài đặt)

**6.1 Nguyên tắc (theo Hồ Ngọc Đức, dựa Meeus + Explanatory Supplement to the Astronomical Almanac):**
1. Ngày đầu tháng âm = ngày chứa điểm **Sóc (New Moon)**.
2. Năm thường 12 tháng âm; năm nhuận 13 tháng.
3. **Đông chí (Winter Solstice) luôn rơi vào tháng 11 âm.**
4. Năm nhuận: tháng đầu tiên (sau tháng 11) **không chứa Trung khí (Principal Term)** là tháng nhuận, mang tên tháng trước nó + "nhuận".
5. Mọi tính toán dựa **kinh tuyến 105°E**, `timeZone = 7.0`.

**6.2 Hằng số đã xác nhận (CỰC KỲ QUAN TRỌNG — đừng nhầm lẫn 3 epoch):**
- Synodic month (tuần trăng trung bình, dùng để index k): **`29.530588853`** ngày.
- Epoch index-k (mean new moon 1/1/1900 dạng JD): **`2415021.076998695`** — dùng trong `convertSolar2Lunar`, `getLeapMonthOffset`.
- Meeus mean-new-moon epoch (bên trong hàm `NewMoon`): **`2415020.75933`**.
- Hệ số synodic per-k bên trong `NewMoon` (Meeus): **`29.53058868`**.
- `getLunarMonth11` dùng số nguyên **`2415021`** (đúng thiết kế của Đức, không phải bản thập phân).
- J2000 epoch trong `SunLongitude`: **`2451545.0`**, chia **`36525`**.
- `dr = PI/180`; `T = k/1236.85` (Julian centuries từ 1900).

**6.3 Các hàm lõi (TypeScript, port từ canonical):**
- `jdFromDate(dd,mm,yy)` → Julian Day Number (xử lý chuyển Julian/Gregorian tại JD 2299161).
- `NewMoon(k)` → JD điểm Sóc thứ k (đa thức Meeus với `T, T2, T3`, chuỗi hiệu chỉnh `C1`, và `deltat`).
- `SunLongitude(jdn)` → kinh độ mặt trời (radian).
- `getSunLongitude(dayNumber, tz) = INT(SunLongitude(dayNumber - 0.5 - tz/24) / PI * 6)` → trả 0–11 (xác định Trung khí).
- `getNewMoonDay(k, tz) = INT(NewMoon(k) + 0.5 + tz/24)`.
- `getLunarMonth11(yy, tz)` → ngày bắt đầu tháng 11 âm chứa Đông chí.
- `getLeapMonthOffset(a11, tz)` → vị trí tháng nhuận.
- `convertSolar2Lunar(dd,mm,yy,tz)` và `convertLunar2Solar(...)`.

**6.4 Tại sao VN khác TQ:** vì rule 5 dùng 105°E thay vì 120°E. Khi Sóc/Trung khí rơi gần nửa đêm, chênh 1 giờ giữa Hà Nội và Bắc Kinh đẩy ngày sang ngày khác → tháng 11 (chứa Đông chí) khác nhau → toàn bộ chuỗi tháng và tháng nhuận lệch. Năm 1984 Đông chí rơi 21/12 giờ Hà Nội nhưng 22/12 giờ Bắc Kinh → Tết 1985 VN sớm hơn TQ một tháng.

**6.5 Thư viện khuyến nghị:**
- **Tự port thuật toán Hồ Ngọc Đức sang TypeScript** làm `@cyberskill/amlich-core` (khuyến nghị mạnh — chỉ ~300 dòng, kiểm soát hoàn toàn, đúng VN). Tham chiếu: `vanng822/amlich` (Node), `vanng822/camlich` (Python/C — có đầy đủ hằng số Meeus), `baolanlequang/VietnameseLunar-ios` (Swift, MIT), `nhatanh2996/LunarCalendar4J` (Java).
- **Cross-check khi phát triển:** `6tail/lunar-typescript` & `lunar-javascript` (rất giàu tính năng: can-chi, Trực, 28 sao, Hoàng đạo/Hắc đạo, thần sát — nhưng tính theo chuẩn **Trung Quốc 120°E**, nên CHỈ dùng để đối chiếu các giá trị không phụ thuộc múi giờ như can-chi/Trực, KHÔNG dùng để xác định ngày Sóc/tháng nhuận VN). Lưu ý có gói npm `min98/...` "Vietnamese Lunar Calendar Library - TypeScript" license *free cho cá nhân/phi thương mại* — cẩn trọng license khi thương mại hóa.
- **Nguồn đối chiếu accuracy (vàng):** trình tính chính thức Hồ Ngọc Đức (informatik.uni-leipzig.de/~duc/amlich, mirror xemamlich.uhm.vn, honguyenviet.com); Hong Kong Observatory conversion table (lưu ý HKO theo 120°E, dùng cho cross-check TQ).

**6.6 Validation dataset (unit-test fixtures):**

| Dương lịch | Âm lịch | Năm can-chi (zodiac VN) | Ghi chú |
|---|---|---|---|
| 29/01/2025 | 1/1/2025 | Ất Tỵ (Rắn) | Tết 2025 |
| 17/02/2026 | 1/1/2026 | Bính Ngọ (Ngựa) | Tết 2026 |
| 10/02/2024 | 1/1/2024 | Giáp Thìn (Rồng) | Tết 2024 |
| 22/01/2023 | 1/1/2023 | Quý Mão (Mèo) | Tết 2023 (Mèo, không phải Thỏ) |
| 02/02/1984 | 1/1/1984 | Giáp Tý | Mốc lịch sử Đức công bố |
| 21/03–19/04/1985 | tháng 2 **nhuận** | Ất Sửu | Năm nhuận; Tết VN 21/01/1985 (sớm hơn TQ 1 tháng) |

Các năm lệch VN/TQ thế kỷ 21 cần assert riêng: **2007, 2030, 2053**. Thêm test round-trip `L2S(S2L(d,m,y)) == (d,m,y)` quét 1900–2199.

---

### 7. Nội dung văn hóa: các dịp âm lịch & mâm cúng (cho FR-D01)

| Dịp | Ngày âm | Ý nghĩa | Mâm cúng / lễ vật gợi ý |
|---|---|---|---|
| **Mùng Một** (hàng tháng) | 1 ÂL | Đầu tháng cầu an | Hương, hoa, trái cây, trà, bánh kẹo; chay hoặc mặn tùy nhà; nên cúng trước 12h trưa |
| **Rằm** (hàng tháng) | 15 ÂL | Trăng tròn, lễ Phật, gia tiên | Hương, hoa, ngũ quả, trà, đồ chay/mặn |
| **Giao thừa** | đêm 30 (hoặc 29) tháng Chạp | Tiễn năm cũ, đón năm mới | Mâm trong nhà + ngoài trời: gà luộc, xôi, bánh chưng, ngũ quả, hương đăng |
| **Mùng 1 Tết** | 1/1 ÂL | Tết Nguyên Đán | Xôi, gà, bánh chưng, hoa quả, mâm cao cỗ đầy; cành mai/đào |
| **Ông Công Ông Táo** | 23 tháng Chạp | Táo quân về trời báo cáo | Cá chép (sống hoặc vàng mã), mũ áo Táo, mâm cỗ, vàng mã; cúng trước 12h trưa |
| **Rằm tháng Giêng (Tết Nguyên Tiêu)** | 15/1 ÂL | "Lễ quanh năm không bằng rằm tháng Giêng"; Thượng nguyên | Mâm cỗ chay/mặn dâng Phật & gia tiên; đi chùa cầu an |
| **Vía Thần Tài** | 10/1 ÂL | Cầu tài lộc (đặc biệt người kinh doanh) | Hoa, trái cây, bộ tam sên, vàng |
| **Tết Thanh Minh** | tháng 3 ÂL (≈3–10/3) | Tảo mộ, "uống nước nhớ nguồn" | Mâm cúng tại mộ tổ tiên |
| **Giỗ Tổ Hùng Vương** | 10/3 ÂL | Quốc lễ tưởng nhớ vua Hùng | Bánh chưng, bánh giầy, hương hoa |
| **Tết Đoan Ngọ** | 5/5 ÂL | "Tết giết sâu bọ", trừ tà, giao mùa | Cơm rượu nếp, bánh tro/bánh ú, mận, vải, hương hoa; cúng giờ Ngọ (11–13h). Miền khác nhau: chè kê (Trung), chè trôi nước/bánh xèo (Nam) |
| **Vu Lan / Rằm tháng Bảy** | 15/7 ÂL | Báo hiếu + Xá tội vong nhân (cúng cô hồn) — "mâm cúng lớn nhất năm" | Mâm gia tiên + mâm chúng sinh/cô hồn (cháo loãng, gạo muối, bỏng, khoai…), phóng sinh, cơm chay |
| **Tết Trung Thu** | 15/8 ÂL | Tết đoàn viên, thiếu nhi | Bánh trung thu, mâm ngũ quả, cúng trăng |
| **Đám giỗ cá nhân** | ngày mất ÂL | Tưởng nhớ người thân | Mâm cỗ gia đình theo phong tục từng nhà |

> **Lưu ý nội dung:** Nên đưa cả các biến thể vùng miền (Bắc/Trung/Nam) và **tránh khẳng định tâm linh tuyệt đối** — gắn nhãn "tham khảo theo phong tục dân gian". Đây là dữ liệu tĩnh, biên tập một lần, không cần AI; AI Genie chỉ để hỏi-đáp linh hoạt và cá nhân hóa.

---

### 8. Xem ngày tốt — Hoàng đạo / Hắc đạo / Trực / 28 sao (cho FR-E)

- **Ngày Hoàng đạo/Hắc đạo:** mỗi ngày ứng một trong 12 vị thần trực nhật; 6 thần thiện (Thanh Long, Minh Đường, Kim Quỹ, Bảo Quang, Ngọc Đường, Tư Mệnh) → Hoàng đạo (tốt); 6 thần ác (Bạch Hổ, Thiên Hình, Chu Tước, Thiên Lao, Nguyên Vũ, Câu Trận) → Hắc đạo (xấu). Xác định theo **can-chi ngày kết hợp tháng âm** (có bảng tra cố định theo địa chi ngày × tháng).
- **Giờ Hoàng đạo/Hắc đạo:** 12 canh giờ (mỗi giờ 2 tiếng theo 12 con giáp); 6 giờ Hoàng đạo / 6 giờ Hắc đạo, tra theo địa chi ngày.
- **12 Trực** (Kiến, Trừ, Mãn, Bình, Định, Chấp, Phá, Nguy, Thành, Thu, Khai, Bế): tra theo tiết khí + địa chi ngày; mỗi Trực hợp/kỵ loại việc.
- **Nhị thập bát tú (28 sao):** mỗi ngày một sao (Giác, Cang… Chẩn), tốt/xấu cho từng việc; tra tuần hoàn theo lịch.
- **Triển khai:** đây là dữ liệu **không phụ thuộc múi giờ** (dựa can-chi ngày + tiết khí) → có thể tận dụng `lunar-typescript` để đối chiếu, nhưng vẫn nên tự tính can-chi từ JDN để đồng nhất với core. Gắn nhãn "tham khảo phong thủy dân gian".

---

### 9. System Architecture

```
            ┌──────────────────────────────────────────┐
            │   @cyberskill/amlich-core (TypeScript)    │
            │  - convertSolar2Lunar / Lunar2Solar       │
            │  - canChi, tietKhi, hoangDao, truc, 28 sao│
            │  - festival rules + recurrence engine     │
            │  - 100% offline, no deps, unit-tested     │
            └──────────────────────────────────────────┘
              ▲                ▲                    ▲
   ┌──────────┴───┐   ┌────────┴────────┐   ┌───────┴──────────┐
   │ Web (Next.js │   │ iOS (Capacitor  │   │ Zalo Mini App    │
   │ /React) PWA  │   │ bọc web build)  │   │ (React+zmp-ui/   │
   │              │   │ + WidgetKit/    │   │  zmp-sdk)        │
   │              │   │  Watch (native) │   │                  │
   └──────┬───────┘   └────────┬────────┘   └───────┬──────────┘
          │                    │                    │
          └─────────────┬──────┴──────────┬─────────┘
                        ▼                  ▼
          ┌───────────────────┐  ┌────────────────────┐
          │ Serverless backend│  │ Local storage /     │
          │ (Vercel/Cloud fn) │  │ sync (Supabase opt) │
          │ - Claude proxy    │  └────────────────────┘
          │ - ZNS send (OA)   │
          │ - push (APNs opt) │
          └───────────────────┘
```

**Khuyến nghị stack (có lý giải):**
- **Core:** TypeScript thuần, zero-dependency → tái dùng tuyệt đối trên cả 3 client.
- **Web:** Next.js/React + Tailwind. Là nền cho cả PWA và Capacitor.
- **iOS:** **Capacitor** bọc chính web build đó (`@capacitor/local-notifications` cho nhắc, `@capacitor/push-notifications` nếu cần remote). Lý do: tối đa code-sharing với web, đội ngũ web HCMC dễ tuyển; Capacitor đủ tốt cho app "đọc & nhập dữ liệu" như cái này. **Widget iOS (WidgetKit) và Watch complication phải viết native Swift** trong một thư mục `ios/App` (Capacitor cho phép thêm native target) vì WidgetKit chỉ hỗ trợ SwiftUI. *Nếu sau này cần animation/native UI cao cấp, cân nhắc React Native + Expo* — nhưng cho MVP, Capacitor thắng về tốc độ và chi phí.
- **Zalo Mini App:** React + `zmp-ui` + `zmp-sdk/apis`, import cùng `amlich-core`. Lưu nhắc bằng zmp Storage (giới hạn dung lượng nhỏ → chỉ lưu settings + danh sách nhắc, tính ngày on-the-fly).
- **Backend:** serverless (Vercel Functions/Cloudflare Workers) — chỉ làm 2 việc: proxy Claude và gửi ZNS qua OA. Stateless, rẻ.
- **Sync (tùy chọn, thương mại):** Supabase/Postgres cho family sharing + đồng bộ đa thiết bị; bật RLS, tuân PDPL.

---

### 10. Data Model (mô hình dữ liệu)

```
User { id, displayName, locale="vi-VN", timezone="Asia/Ho_Chi_Minh",
       theme="purple", phone? (cho ZNS), consentFlags{} }

Reminder {
  id, userId, type: ENUM(RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL),
  title,
  lunarDay, lunarMonth, lunarYear?,        // year null nếu lặp hằng năm
  isLeapMonth: bool,                        // cho đám giỗ rơi tháng nhuận
  recurrence: ENUM(MONTHLY | ANNUAL | ONCE),
  leadTimes: [int days],                    // [0,1] = đúng ngày + trước 1 ngày
  notifyTime: "07:00",
  channels: [LOCAL, ZNS, PUSH],
  linkedContentId?,                         // tới trang nghi lễ
  sharedWith: [userId],                     // family sharing
  enabled: bool
}

OccurrenceCache {                           // cache ngày dương đã tính sẵn
  reminderId, gregorianDate, lunarLabel, computedAt
}

FestivalContent {                           // dữ liệu tĩnh biên tập
  id, name, lunarDay, lunarMonth, meaning,
  offerings: [string], checklist: [string], region?: ENUM
}

DayInfo (computed, không lưu) {
  solarDate, lunarDate, canChiDay/Month/Year, zodiac,
  tietKhi?, truc, sao28, isHoangDao, gioHoangDao: [ranges]
}
```

**Quy tắc tái diễn đám giỗ (then chốt):** lưu **ngày âm + tháng âm** (không lưu ngày dương). Mỗi lần lên lịch, với mỗi năm dương sắp tới, gọi `convertLunar2Solar(lunarDay, lunarMonth, targetLunarYear, isLeap)` để ra ngày dương. **Xử lý edge case:** nếu năm đó tháng âm đã nhập là tháng nhuận nhưng năm hiện tại không có tháng nhuận đó (hoặc ngược lại), áp quy tắc fallback (ví dụ giỗ tháng nhuận → cúng vào tháng thường tương ứng) và cho người dùng chọn.

---

### 11. Notification Architecture

**Local (iOS qua Capacitor / WidgetKit nền):**
- Dùng `UNUserNotificationCenter`. **Giới hạn 64 pending** → chiến lược **rolling reschedule**: mỗi khi app mở (và qua `BGAppRefreshTask` nền khi được phép), gọi `removeAllPendingNotificationRequests()`, tính 64 lần xuất hiện gần nhất từ tất cả Reminder đang bật, rồi `add()`. Mỗi notification mang `userInfo` (reminderId) để deep-link.
- Lên lịch xa ~6–12 tháng tới (đủ trong 64 slot cho người dùng cá nhân; nếu vượt, ưu tiên theo thời gian gần nhất).
- Lead-time = tạo nhiều notification cho cùng sự kiện (đúng ngày + trước 1 ngày…), tính vào ngân sách 64.

**Web push:** chỉ khả dụng iOS 16.4+ khi đã "Add to Home Screen"; Android/desktop dùng Push API + Service Worker bình thường. → Coi web push là **bổ trợ**, không phải kênh chính trên iPhone.

**ZNS (thương mại, kênh Zalo):**
- Luồng: cron serverless quét Reminder có `ZNS` → với mỗi sự kiện trong khung cho phép (≤7 ngày trước/sau, 06:00–22:00) → gọi ZNS API qua OA token (tự refresh) với **template đã duyệt** có tham số (tên người dùng, tên dịp, ngày).
- Template mẫu (đăng ký với Zalo): *"Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!"* — có ≥1 tham số, không quảng cáo.
- Có thể dùng nhà phân phối (VietGuys, Infobip, 8x8) để đơn giản hóa onboarding OA/ZCA, hoặc tích hợp trực tiếp qua Zalo OA Open API.

---

### 12. AI Feature Architecture (Genie)

- **Model:** mặc định **Claude Haiku 4.5** ($1/$5 per 1M tokens) cho hỏi-đáp phong tục & sinh lời nhắc; nâng lên Sonnet cho câu hỏi phức tạp nếu cần. Dùng **prompt caching** cho system prompt (kiến thức nền về phong tục Việt) → giảm tới 90% chi phí input.
- **Proxy:** client → serverless `/api/genie` → Claude API (giấu key, rate-limit, log tối thiểu theo PDPL). KHÔNG gửi dữ liệu định danh người đã mất ra ngoài trừ khi cần và có consent.
- **Prompt design:** system prompt định hình persona "Genie" (gắn mascot "Golden Genie" của CyberSkill — nhưng có thể reskin tông tím cho sản phẩm này), giọng ấm áp, tiếng Việt chuẩn dấu, kiến thức về Rằm/giỗ/lễ tết, luôn kèm câu nhắc "tham khảo theo phong tục". Truyền context: ngày âm hôm nay, dịp sắp tới, tên nhắc.
- **Chi phí ước tính:** với một gia đình hỏi vài chục câu/tháng, chi phí < vài nghìn VND/tháng — không đáng kể; rủi ro chính là lạm dụng → đặt rate-limit per user.
- **Voice (FR-C05):** dùng TTS tiếng Việt (Web Speech API trên web; AVSpeechSynthesizer trên iOS) đọc lời nhắc do Claude sinh.

---

### 13. UI/UX Guidance (tông tím + diễn viên + Vietnamese-first)

- **Chủ đề tím (cho Chị Linh):** xây một **"purple style pack"** như một **sub-brand / theme mở rộng** của CyberSkill design system, không thay thế brand gốc (Umber #45210E, Ochre #F4BA17). Cách làm: giữ nguyên design tokens cấu trúc (spacing, typography scale, component) của design-system CyberSkill, **override token màu** thành palette tím (ví dụ primary tím đậm cho text/nút, accent tím-hồng, nền kem ấm để hài hòa với DNA "warm earth" của CyberSkill).
- **Typography:** dùng **Be Vietnam Pro** (typeface của CyberSkill, hỗ trợ dấu tiếng Việt tốt) — vừa giữ nhất quán thương hiệu vừa đẹp cho tiếng Việt.
- **Tương phản:** mọi cặp màu chữ/nền phải đạt **APCA Lc ≥ 75** (ưu tiên Lc 90 cho đoạn dài). Vì tím dễ rơi vào vùng tương phản trung bình, **kiểm bằng `apca-w3`**: tím đậm trên nền kem/trắng OK; **tránh** tím nhạt trên trắng cho body text. Vẫn chạy song song WCAG 2.x AA (4.5:1) cho tuân thủ pháp lý.
- **Đặc thù diễn viên:** good-day picker đặt nổi bật cho việc ký hợp đồng/khởi quay/ra mắt; shareable cards tông tím sang trọng dễ đăng Instagram; có thể thêm "ngày đẹp tháng này" dạng card đẹp.
- **Vietnamese-first:** toàn bộ UI tiếng Việt chuẩn dấu; ngày hiển thị song song dương + âm + can-chi; cách diễn đạt thân thiện, ấm.
- **Lịch tháng:** mỗi ô ngày dương lớn + ngày âm nhỏ góc + chấm màu cho ngày có nhắc/lễ; chạm vào ngày → chi tiết (can-chi, Trực, sao, giờ Hoàng đạo).

---

### 14. Phased Roadmap

**Phase 0 — Core (2–3 tuần):** Build & test `@cyberskill/amlich-core` (chuyển đổi, can-chi, tháng nhuận) với bộ fixtures 1900–2199 + edge years. *Đây là rủi ro kỹ thuật cao nhất → làm trước, test kỹ.*

**Phase 1 — MVP cá nhân (cho vợ) (4–6 tuần):**
- Web/PWA + Capacitor iOS; theme tím; Be Vietnam Pro.
- FR-A05 lịch tháng; FR-B01..B07 nhắc Rằm/Mùng Một/đám giỗ/custom + local notifications (rolling 64); FR-D nội dung dịp tĩnh.
- Lưu on-device. Không cần backend, không AI, không ZNS.
- **Tiêu chí "vợ thấy hữu ích":** dùng đều trong ≥1 chu kỳ Rằm/Mùng Một, không bỏ lỡ nhắc nào.

**Phase 2 — Trải nghiệm nâng cao (cá nhân) (3–4 tuần):**
- FR-F01 Widget iOS; FR-E2/E3 can-chi + giờ Hoàng đạo; FR-F03 shareable cards; FR-C AI Genie (Claude proxy).

**Phase 3 — Thương mại hóa (6–10 tuần):**
- Zalo Mini App client; OA + **ZNS**; family sharing (FR-F04); sync cloud (Supabase); **tuân thủ PDPL** (consent, privacy policy, DPIA nếu cần); FR-E1 good-day picker đầy đủ; FR-F02 Watch.
- Mô hình kiếm tiền: freemium (nhắc cơ bản free; AI Genie/good-day nâng cao/family premium).

---

### 15. Success Metrics

- **MVP (cá nhân):** vợ dùng đều ≥8 tuần; 0 nhắc bị bỏ lỡ; "có thấy hữu ích không?" = có → tín hiệu go thương mại.
- **Thương mại:** D1/D7/D30 retention; tỷ lệ bật nhắc/người; số đám giỗ nhập trung bình; tỷ lệ mở app từ notification; ZNS delivery rate; tỷ lệ dùng Genie; chuyển đổi premium; cài đặt qua Zalo Mini App.

---

## Recommendations (các bước hành động + ngưỡng quyết định)

**Giai đoạn ngay (tuần này):**
1. **Khởi tạo `@cyberskill/amlich-core`** — port thuật toán Hồ Ngọc Đức sang TypeScript với đúng các hằng số ở mục 6.2, viết test suite dùng fixtures mục 6.6. Đây là việc rủi ro nhất, làm trước. **Ngưỡng pass:** khớp 100% lịch Hồ Ngọc Đức 1900–2199 gồm 1985/2007/2030/2053; nếu lệch bất kỳ năm nào → dừng, debug trước khi xây UI.
2. **Dựng web/PWA + Capacitor iOS skeleton** với theme tím + Be Vietnam Pro, import core.

**Giai đoạn MVP (4–6 tuần tới):**
3. Hoàn thiện FR-B (nhắc + rolling 64 notifications) + lịch tháng + nội dung dịp tĩnh. **Giao cho vợ dùng thật.**
4. **Ngưỡng quyết định go/no-go thương mại:** nếu sau ~8 tuần vợ dùng đều và nói "hữu ích" → tiến Phase 3. Nếu không → tinh chỉnh UX, đừng vội đầu tư ZNS/AI.

**Khi quyết thương mại hóa:**
5. Đăng ký **Zalo OA + ZCA**, soạn & nộp **ZNS template** sớm (duyệt mất thời gian). Cân nhắc đi qua distributor (VietGuys/Infobip) để rút ngắn onboarding.
6. **Tuân thủ PDPL trước khi thu thập dữ liệu người dùng ngoài gia đình:** privacy policy tiếng Việt, consent granular, lưu tối thiểu, không chuyển xuyên biên giới chưa đánh giá. Startup được ân hạn 5 năm cho DPIA/DPO nhưng **các nghĩa vụ consent áp dụng ngay**.
7. **Bật AI Genie với Claude Haiku 4.5 qua serverless proxy** + prompt caching + rate-limit. **Ngưỡng nâng model:** chỉ chuyển sang Sonnet nếu chất lượng trả lời phong tục của Haiku không đạt khi đánh giá thực tế.

**Ngưỡng kỹ thuật cần theo dõi:**
- Nếu Capacitor không đạt yêu cầu hiệu năng/animation → cân nhắc React Native + Expo (nhưng giữ nguyên `amlich-core` TypeScript).
- Nếu số nhắc của một user > ~50 → rà soát chiến lược 64-pending, ưu tiên theo thời gian.

---

## Caveats (giới hạn & rủi ro cần lưu ý)

- **Độ chính xác thuật toán:** bản thuật toán Hồ Ngọc Đức công bố là **bản đơn giản hóa** so với trình tính online độ chính xác cao; tin cậy cho ~1200–2199. Với ngày Sóc/tiết khí rơi sát nửa đêm (vài phút), có thể lệch 1 ngày ở các năm rất xa — **bắt buộc cross-check** với nguồn vàng và đánh dấu các năm nghi ngờ. Hong Kong Observatory cũng cảnh báo discrepancy quanh các mốc như 28/9/2057.
- **Nguồn nội dung văn hóa:** mâm cúng và xem ngày tốt khác nhau theo vùng miền và có yếu tố tín ngưỡng; nhiều nguồn là blog/thương mại. Nên **biên tập có chọn lọc, gắn nhãn "tham khảo phong tục dân gian"**, tránh khẳng định tuyệt đối — đặc biệt với Hoàng đạo/Hắc đạo/28 sao.
- **lunar-typescript/javascript theo chuẩn TQ (120°E):** chỉ dùng đối chiếu các giá trị độc lập múi giờ (can-chi, Trực); KHÔNG dùng để chốt ngày âm/tháng nhuận VN.
- **Giá ZNS & quy tắc có thể thay đổi:** ~200 VND/tin là mức tham khảo từ distributor; quy tắc template/khung giờ do Zalo quản lý và cập nhật — xác nhận lại khi triển khai.
- **iOS background:** lên lịch nền trên iOS bị hạn chế; rolling reschedule phụ thuộc người dùng mở app hoặc `BGAppRefreshTask` (không đảm bảo thời điểm). Với người dùng hiếm mở app + nhiều nhắc, có rủi ro trượt slot — cần test thực tế.
- **Web push trên iPhone:** chỉ chạy khi PWA đã Add to Home Screen (iOS 16.4+), reach thấp hơn native ~10–15× — đừng phụ thuộc làm kênh nhắc chính.
- **PDPL còn điểm chưa rõ:** quan hệ giữa PDPL và Data Law/Decree 165, định nghĩa dữ liệu nhạy cảm... vẫn đang được làm rõ qua nghị định; nên tham vấn pháp lý trước khi thương mại hóa rộng.
- **License thư viện:** kiểm license trước khi thương mại (nhiều thư viện MIT OK; một số gói âm lịch ghi "free for personal/non-commercial").
- **Giá Claude API:** mức $1/$5 cho Haiku 4.5 là tại thời điểm nghiên cứu; xác nhận lại trên trang Anthropic khi tích hợp.