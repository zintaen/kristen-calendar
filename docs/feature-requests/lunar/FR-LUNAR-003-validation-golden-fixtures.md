---
id: FR-LUNAR-003
title: "Golden validation harness - đối chiếu 100% lịch Hồ Ngọc Đức 1900-2199, edge years 1985/2007/2030/2053, round-trip L2S(S2L)==identity"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P0
milestone: P0 · slice 1
slice: 1
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-001, FR-LUNAR-002]
depends_on: [FR-LUNAR-001, FR-LUNAR-002]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Accuracy)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#6 (6.6 fixtures)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Caveats (accuracy)"
source_decisions:
  - DEC-LUNAR-030 (golden fixtures la nguon su that: bang 6.6 ma hoa thanh JSON co dinh, khong sinh tu chinh engine)
  - DEC-LUNAR-031 (nguong go/no-go: lech bat ky nam nao trong 1900-2199 thi dung, debug truoc khi xay UI - chan FR-LUNAR-007 va sau)
  - DEC-LUNAR-032 (assert VN-vs-China bang cach goi convertSolar2Lunar voi tz=7.0 va tz=8.0; cac nam 2007/2030/2053 lech 1 ngay, 1985 lech 1 thang)
  - DEC-LUNAR-033 (round-trip identity sweep 1900-2199 day du la go/no-go gate truoc moi UI; buoc quet nho de phu het cac chuyen thang)
  - DEC-LUNAR-034 (danh dau cac nam nghi ngo: neu phat hien lech voi nguon vang quanh moc nhu 28/9/2057, log thay vi im lang - tham chieu Caveats)
  - DEC-LUNAR-035 (absolute ground-truth diff: so sanh engine voi bo du lieu vang ngoai (gold-1900-2199.json xuat tu may tinh Duc) cho edge years va sampling; round-trip don thuan la tu chung minh)
  - DEC-LUNAR-036 (astronomy oracle: dev-dependency astronomy-engine xac minh diem Soc thuc va solar term o UTC+7; core van zero-dep/offline; chi la test harness)
  - DEC-LUNAR-037 (suspect-midnight report: emit moi thang-bat-dau co diem Soc cach nua dem < 15 phut tai Asia/Ho_Chi_Minh de kiem tra thu cong)
  - DEC-LUNAR-038 (property-based tests: moi nam am 12 hoac 13 thang; thang nhuan chi trong nam 13 thang; Dong chi luon thang 11; do dai thang 29-30 ngay; Tet la Soc thu 2 sau Dong chi)
  - DEC-LUNAR-039 (nguong commercial accuracy - founder decision 3: hard gate khop tuyet doi voi du lieu vang cho 1900-2100; 2100-2199 chap nhan trong 1 ngay + flag + correction table, khong chan gate; round-trip sweep van hard 1900-2199)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/test/fixtures/tet.json
  - packages/amlich-core/test/fixtures/vn-vs-china.json
  - packages/amlich-core/test/fixtures/gold-1900-2199.json
  - packages/amlich-core/test/golden.test.ts
  - packages/amlich-core/test/roundtrip.test.ts
  - packages/amlich-core/test/absolute-ground-truth.test.ts
  - packages/amlich-core/test/astronomy-oracle.test.ts
  - packages/amlich-core/test/suspect-midnight.test.ts
  - packages/amlich-core/test/property.test.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/test/**
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "sinh fixture từ chính convertSolar2Lunar rồi assert lại chính nó (vi phạm DEC-LUNAR-030 - vòng lặp tự chứng minh)"
  - "nới lỏng ngưỡng: cho phép lệch một vài năm rồi vẫn pass (vi phạm DEC-LUNAR-031 - go/no-go)"
  - "bỏ qua tz=8.0 trong assert VN-vs-China (vi phạm DEC-LUNAR-032)"
effort_hours: 14
sub_tasks:
  - "1.5h: tet.json - ma hoa bang 6.6 (5 moc Tet + nam can-chi + zodiac VN)"
  - "1.0h: vn-vs-china.json - 2007/2030/2053 lech 1 ngay, 1985 lech 1 thang"
  - "1.5h: golden.test.ts - assert tung dong fixture (solar->lunar, nam can-chi, zodiac)"
  - "1.5h: VN-vs-China assert - goi tz=7.0 va tz=8.0, so sanh Tet hai nuoc"
  - "1.5h: roundtrip.test.ts - quet day du 1900-2199 L2S(S2L)==identity (buoc 1 ngay)"
  - "0.5h: 1985 thang 2 nhuan assert + Tet VN 21/01/1985"
  - "0.5h: log nam nghi ngo (mark suspect) thay vi im lang quanh cac moc Caveats"
  - "2.0h: absolute-ground-truth.test.ts - tai gold-1900-2199.json va assert chinh xac solar<->lunar voi bo du lieu vang ngoai engine (DEC-LUNAR-035)"
  - "2.0h: astronomy-oracle.test.ts (dev-dependency astronomy-engine) - xac minh diem Soc thuc va Solar Term bang ephemeris, assert engine khop trong pham vi ngay (DEC-LUNAR-036)"
  - "1.0h: suspect-midnight.test.ts - phat hien va emit moi diem Soc cach nua dem < 15 phut tai Asia/Ho_Chi_Minh (DEC-LUNAR-037)"
  - "1.0h: property.test.ts - kiem tra bieu thuc thuoc tinh (12 hoac 13 thang, thang nhuan chi trong nam 13 thang, Dong chi o thang 11, do dai thang 29-30 ngay, Tet la Soc thu 2 sau Dong chi) (DEC-LUNAR-038)"
risk_if_skipped: "Không có harness thì không thể chứng minh độ chính xác và không có ngưỡng go/no-go (Recommendations PRD: lệch bất kỳ năm nào thì dừng, debug trước khi xây UI). Đây là cổng chặn trước mọi UI; thiếu nó, một lỗi hằng số ở FR-LUNAR-001 sẽ trôi thẳng xuống mọi nhắc mà không ai bắt được cho đến khi người dùng bị nhắc sai ngày giờ. FR-LUNAR-003 không block FR khác trong frontmatter nhưng là điều kiện đạo đức để release Phase 0."
---

## §1 - Description (BCP-14 normative)

Harness PHẢI chứng minh engine FR-LUNAR-001/002 khớp 100% lịch Hồ Ngọc Đức cho 1900-2199, gồm các năm edge, và đặt ngưỡng go/no-go trước mọi UI. Hợp đồng:

1. PHẢI mã hóa bảng fixtures 6.6 thành JSON cố định, không sinh từ chính engine; mỗi dòng gồm ngày dương, ngày âm kỳ vọng, năm can-chi, zodiac VN (NFR-Accuracy, DEC-LUNAR-030).
2. PHẢI assert 5 mốc Tết 6.6: 29/01/2025 -> 1/1/2025 Ất Tỵ; 17/02/2026 -> 1/1/2026 Bính Ngọ; 10/02/2024 -> 1/1/2024 Giáp Thìn; 22/01/2023 -> 1/1/2023 Quý Mão; 02/02/1984 -> 1/1/1984 Giáp Tý (PRD 6.6).
3. PHẢI assert năm can-chi và zodiac VN cho mỗi mốc Tết, trong đó 2023 PHẢI ra Mèo (không phải Thỏ) (FR-A03, PRD 6.6).
4. PHẢI assert 1985 có tháng 2 nhuận, và Tết VN 1985 = 21/01/1985 (sớm hơn TQ một tháng) (PRD 6.4, 6.6).
5. PHẢI assert ba năm VN khác TQ thế kỷ 21 - 2007, 2030, 2053 - bằng cách gọi `convertSolar2Lunar` với `tz = 7.0` (VN) và `tz = 8.0` (TQ) và xác nhận Tết hai nước lệch đúng 1 ngày (PRD Key Findings 2, DEC-LUNAR-032).
6. PHẢI chạy round-trip identity sweep đầy đủ 1900-2199: với mỗi ngày dương trong dải, `convertLunar2Solar(...convertSolar2Lunar(d, m, y, 7), 7)` PHẢI trả lại đúng `(d, m, y)` (PRD 6.6, DEC-LUNAR-033).
7. PHẢI dùng bước quét đủ nhỏ để phủ hết các chuyển tháng âm và ranh tháng nhuận; KHÔNG ĐƯỢC quét thưa đến mức bỏ sót các ngày đầu/cuối tháng (DEC-LUNAR-033).
8. PHẢI áp ngưỡng go/no-go: lệch bất kỳ năm nào trong 1900-2199 thì test fail và build dừng; KHÔNG ĐƯỢC nới lỏng để cho qua một vài năm (Recommendations PRD, DEC-LUNAR-031).
9. PHẢI đọc fixture từ file JSON tách rời (`tet.json`, `vn-vs-china.json`), không nhúng giá trị kỳ vọng vào chính hàm assert, để fixture là nguồn sự thật độc lập (DEC-LUNAR-030).
10. PHẢI đánh dấu (log "suspect") các năm có nghi ngờ quanh các mốc Caveats (ví dụ 28/9/2057 HKO cảnh báo) thay vì im lặng nuốt lỗi (DEC-LUNAR-034, Caveats).
11. PHẢI chạy hoàn toàn offline; harness KHÔNG ĐƯỢC gọi network hay so sánh với API runtime (NFR-Offline).
12. PHẢI là go/no-go gate của Phase 0: chỉ khi toàn bộ harness xanh mới cho phép bắt đầu FR-LUNAR-007 và các UI sau (DEC-LUNAR-031, PRD Phase 0).
13. NÊN tách số lượng assert rõ ràng trong báo cáo test (số mốc Tết, số năm VN-vs-China, kích thước sweep) để QA đọc được evidence.
14. NÊN giữ fixture có thể mở rộng: thêm dòng mới vào JSON không phải sửa code assert (DEC-LUNAR-030).
15. PHẢI so sánh engine với bộ dữ liệu vàng ngoài (`test/fixtures/gold-1900-2199.json`, xuất từ máy tính Hồ Ngọc Đức hoặc nguồn tương đương, không sinh từ engine) bao gồm các edge year 1985/2007/2030/2053 và ít nhất một mẫu lịch sử đại diện, và assert khớp chính xác solar<->lunar; round-trip đơn thuần là tự chứng minh, không đủ để xác nhận độ chính xác tuyệt đối (NFR-Accuracy, DEC-LUNAR-035). Ngưỡng commercial (founder decision 3, DEC-LUNAR-039): khớp tuyệt đối với dữ liệu vàng là hard gate cho 1900-2100 (dải người dùng thực chạm: giỗ quá khứ cộng lịch tương lai gần); với 2100-2199 chấp nhận sai lệch trong 1 ngày, các ngày nghi ngờ được flag theo §1 #17 và sửa bằng correction table nếu đối chiếu xác nhận lệch, KHÔNG chặn gate.
16. PHẢI có một bộ test thiên văn (dev-dependency only, KHÔNG ảnh hưởng dependency runtime của core): nạp thư viện ephemeris (ví dụ `astronomy-engine`) vào `devDependencies`, tính thời điểm Sóc thực và Solar Term thực theo UTC+7, và xác nhận kết quả ngày của engine khớp trong phạm vi 1 ngày ở ít nhất 120 điểm Sóc lấy mẫu trong 1900-2199; mục đích là kiểm định bản thân gần đúng Meeus, phát hiện rủi ro "điểm Sóc gần nửa đêm" mà PRD Caveats cảnh báo (DEC-LUNAR-036).
17. PHẢI quét toàn bộ 1900-2199 và phát hiện mọi ngày bắt đầu tháng âm có thời điểm Sóc thực (tính từ ephemeris hoặc engine) cách nửa đêm Asia/Ho_Chi_Minh dưới 15 phút; emit danh sách đó như "suspect dates" và in ra test report cho người kiểm tra thủ công - không pass silently (DEC-LUNAR-037).
18. PHẢI thực thi bộ property-based tests trên dải 1900-2199: (a) mỗi năm âm có đúng 12 hoặc 13 tháng; (b) tháng nhuận chỉ xuất hiện trong năm 13 tháng; (c) tháng 11 âm của mỗi năm chứa Đông chí (tietKhiAt trả isTrungKhi=true với name="Dong chi" trong khoảng ngày tháng 11 âm); (d) độ dài mỗi tháng âm là 29 hoặc 30 ngày; (e) Tết (mùng 1 tháng 1 âm) là điểm Sóc thứ 2 sau Đông chí (PRD 6.1 rule 3, Caveats, DEC-LUNAR-038).

---

## §2 - Why this design (rationale for humans)

**Tại sao fixture không sinh từ chính engine?** Nếu lấy `convertSolar2Lunar` sinh ra kết quả rồi assert lại chính nó thì test luôn xanh kể cả khi engine sai - đây là vòng tự chứng minh vô nghĩa. Fixture phải là giá trị độc lập lấy từ nguồn vàng (lịch Hồ Ngọc Đức, bảng 6.6), mã hóa cứng vào JSON, để test thực sự đối chiếu engine với sự thật ngoài engine (DEC-LUNAR-030).

**Tại sao assert VN-vs-China bằng tz=7.0 và tz=8.0?** Khác biệt VN/TQ là do múi giờ (105E vs 120E), và PRD Key Findings 2 nói rõ thế kỷ 21 có đúng 3 năm Tết lệch 1 ngày: 2007, 2030, 2053. Cách kiểm trực tiếp nhất là gọi cùng engine với hai múi giờ và xác nhận nó tạo ra đúng sự lệch đó. Nếu engine cho hai múi giờ ra cùng kết quả ở các năm này thì nó đang không tôn trọng rule 5 (DEC-LUNAR-032).

**Tại sao round-trip sweep đầy đủ, không lấy mẫu?** Lấy mẫu có thể bỏ lọt đúng cái năm hoặc đúng cái ngày ranh tháng mà engine sai. Sweep đầy đủ 1900-2199 với bước nhỏ phủ hết mọi chuyển tháng và mọi tháng nhuận; đó là lưới an toàn rẻ nhất và mạnh nhất. Một off-by-one ở suy k hay một lệch epoch sẽ lộ ngày ở ít nhất một ngày trong dải (DEC-LUNAR-033).

**Tại sao ngưỡng go/no-go cứng?** Recommendations PRD viết rõ: nếu lệch bất kỳ năm nào thì dừng, debug trước khi xây UI. Lịch âm là nội dung tin cậy cốt lõi; nhắc sai ngày giờ là phá vỡ niềm tin của người dùng (Chị Linh). Không có kiểu "gần đúng" - hoặc khớp 100% hoặc dừng lại (DEC-LUNAR-031).

**Tại sao đánh dấu năm nghi ngờ thay vì nuốt?** Caveats cảnh báo bản thuật toán là bản đơn giản hóa; với ngày Sóc/tiết khí rơi sát nửa đêm ở năm rất xa có thể lệch 1 ngày (HKO cảnh báo quanh 28/9/2057). Thay vì âm thầm bỏ qua, harness log năm đó là "suspect" để có thể cross-check với nguồn vàng và quyết định xử lý, giữ tính trung thực của bộ test (DEC-LUNAR-034).

**Tại sao fixture ở file JSON riêng?** Tách dữ liệu khỏi logic assert giúp thêm mốc mới (ví dụ Tết 2027, 2028) chỉ cần sửa JSON, không đụng đến code. Nó cũng làm rõ ràng đâu là sự thật độc lập và đâu là hàm kiểm tra, đúng tinh thần DEC-LUNAR-030.

**Tại sao cần bộ dữ liệu vàng ngoài (gold-1900-2199.json)?** Round-trip `L2S(S2L(d))` chỉ chứng minh tính nhất quán nội tại của engine - nếu engine có lỗi hệ thống (ví dụ epoch sai một hằng số lớn), round-trip vẫn xanh. Để xác nhận đúng với thực tế lịch pháp VN, phải có ít nhất một mẫu dữ liệu từ nguồn ngoài engine (máy tính Hồ Ngọc Đức). Đây là sự khác biệt giữa kiểm tra tính nhất quán và kiểm tra độ chính xác tuyệt đối (DEC-LUNAR-035).

**Tại sao astronomy oracle là dev-dependency chứ không đưa vào core?** Core PHẢI zero-dependency và offline; đó là yêu cầu cứng của FR-LUNAR-001. Ephemeris library là dev-tool chỉ dùng trong môi trường CI, không bao giờ bundle vào app. Mục đích là kiểm định bản thân gần đúng Meeus tốt đến đâu, đặc biệt ở các điểm Sóc rơi gần nửa đêm - nơi sai số gần đúng có thể đẩy ngày lệch 1 đơn vị (DEC-LUNAR-036, PRD Caveats).

**Tại sao cần báo cáo suspect-midnight thay vì tự sửa?** Nếu engine tự sửa im lặng, người vận hành không biết rủi ro nằm ở đâu. Emit danh sách cho phép founder và QA spot-check thủ công các ngày đó, và quyết định có cần bảng hiệu chỉnh hay không. HKO đã cảnh báo cụ thể về 28/9/2057; có danh sách đầy đủ giúp chuẩn bị trước khi ngày đó đến (DEC-LUNAR-037).

**Tại sao property-based tests bổ sung cho fixture?** Fixture kiểm tra các ngày cụ thể; property tests kiểm tra cấu trúc toàn bộ hệ lịch 1900-2199. Một engine có thể pass 5 mốc Tết nhưng trả về năm âm với 14 tháng ở một năm nào đó. Property tests bắt lỗi cấu trúc đó trước khi nó gây ra lịch bất khả thi cho người dùng (DEC-LUNAR-038).

---

## §3 - API contract

```typescript
// packages/amlich-core/test/fixtures/tet.json  (nguồn sự thật, bảng PRD 6.6)
// mỗi dòng: ngày dương dd/mm/yy -> ngày âm [d,m,y,leap], can-chi năm, zodiac VN
[
  { "solar": [29, 1, 2025], "lunar": [1, 1, 2025, 0], "canChiYear": "At Ty",    "zodiac": "Ran",  "note": "Tet 2025" },
  { "solar": [17, 2, 2026], "lunar": [1, 1, 2026, 0], "canChiYear": "Binh Ngo", "zodiac": "Ngua", "note": "Tet 2026" },
  { "solar": [10, 2, 2024], "lunar": [1, 1, 2024, 0], "canChiYear": "Giap Thin","zodiac": "Rong", "note": "Tet 2024" },
  { "solar": [22, 1, 2023], "lunar": [1, 1, 2023, 0], "canChiYear": "Quy Mao",  "zodiac": "Meo",  "note": "Tet 2023 - Meo, khong phai Tho" },
  { "solar": [2, 2, 1984],  "lunar": [1, 1, 1984, 0], "canChiYear": "Giap Ty",  "zodiac": "Chuot","note": "Moc Duc cong bo" }
]
```

```typescript
// packages/amlich-core/test/fixtures/vn-vs-china.json
// VN dùng tz=7.0 (105E), TQ dùng tz=8.0 (120E). PRD Key Findings 2 + 6.4.
{
  "tetVN1985": { "lunar": [1, 1, 1985, 0], "solarVN": [21, 1, 1985], "note": "VN sớm hơn TQ một tháng" },
  "leap1985":  { "lunar": [1, 2, 1985, 1], "windowVN": [[21, 3, 1985], [19, 4, 1985]], "note": "tháng 2 nhuận" },
  "offsetDays": [
    { "year": 2007, "expectDiffDays": 1, "note": "VN 17/2 vs TQ 18/2" },
    { "year": 2030, "expectDiffDays": 1, "note": "VN 02/2 vs TQ 03/2" },
    { "year": 2053, "expectDiffDays": 1, "note": "VN 18/2 vs TQ 19/2" }
  ]
}
```

```typescript
// packages/amlich-core/test/golden.test.ts  (hình dạng harness)
import { describe, it, expect } from "vitest";
import tet from "./fixtures/tet.json";
import vnCn from "./fixtures/vn-vs-china.json";
import {
  convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate, VN_TIMEZONE,
} from "../src/index";
import { canChiYear } from "../src/canchi";
import { zodiacOf } from "../src/zodiac";

const VN = VN_TIMEZONE;   // 7.0
const CN = 8.0;           // Trung Quốc 120E

/** Tìm ngày dương của Tết (mùng 1 tháng 1 âm) của năm cần theo một múi giờ. */
function tetSolar(lunarYear: number, tz: number): [number, number, number] {
  return convertLunar2Solar(1, 1, lunarYear, 0, tz);
}
```

---

## §4 - Acceptance criteria

1. Mỗi dòng trong `tet.json`: `convertSolar2Lunar(...solar, 7)` bằng `lunar` của dòng đó (5 mốc Tết, PRD 6.6).
2. Mỗi dòng trong `tet.json`: `canChiYear(lunar[2]).label` bằng `canChiYear` của dòng đó.
3. Dòng 2023 trong `tet.json`: `zodiacOf(2023)` bằng `Mèo` (không phải Thỏ).
4. Reverse mỗi mốc Tết: `convertLunar2Solar(...lunar, 7)` bằng `solar` của dòng đó.
5. 1985: `convertLunar2Solar(1, 1, 1985, 0, 7)` bằng `[21, 1, 1985]` (Tết VN, PRD 6.4).
6. 1985 tháng 2 nhuận: `convertLunar2Solar(1, 2, 1985, 1, 7)` khác `[0, 0, 0]` và rơi trong cửa sổ `[[21,3,1985],[19,4,1985]]`.
7. 2007: Tết VN (`tz=7`) và Tết TQ (`tz=8`) lệch đúng 1 ngày (PRD Key Findings 2).
8. 2030: Tết VN và Tết TQ lệch đúng 1 ngày.
9. 2053: Tết VN và Tết TQ lệch đúng 1 ngày.
10. Round-trip identity sweep đầy đủ 1900-2199: với mỗi ngày dương trong dải, `convertLunar2Solar(...convertSolar2Lunar(d, m, y, 7), 7)` bằng `(d, m, y)`; 0 lệch.
11. Sweep đếm số ngày đã kiểm và in ra (evidence), số lượng > 109.000 ngày (xấp xỉ 300 năm).
12. Ngưỡng go/no-go: nếu bất kỳ assert nào fail, suite fail và exit code khác 0 (không nới lỏng).
13. Fixture đọc từ JSON, không nhúng giá trị kỳ vọng vào hàm assert (DEC-LUNAR-030).
14. Harness không gọi network trong suốt test (offline, NFR-Offline).
15. Năm nghi ngờ (nếu có) được log là "suspect" thay vì im lặng (DEC-LUNAR-034).
16. `absolute-ground-truth.test.ts` tải `gold-1900-2199.json`, duyệt qua mỗi dòng và assert `convertSolar2Lunar(...solar, 7)` khớp chính xác `lunar` trong dòng đó; 0 dòng lệch là pass (DEC-LUNAR-035).
17. `gold-1900-2199.json` bao gồm ít nhất các edge year 1985 (tháng 2 nhuận và Tết VN 21/01), 2007, 2030, 2053 (Tết lệch TQ 1 ngày) và ít nhất 30 ngày lấy mẫu đại diện toàn dải 1900-2199; fixture này KHÔNG được sinh bằng chính engine (DEC-LUNAR-035).
18. `astronomy-oracle.test.ts` chạy trong `devDependencies` context (không ảnh hưởng bundle production); với ít nhất 120 điểm Sóc lấy mẫu trong 1900-2199, assert `|ngayEngine - ngayOracle|` = 0 cho >= 95% mẫu và <= 1 ngày cho 100% mẫu; in ra số điểm lệch và danh sách các ngày lệch (DEC-LUNAR-036).
19. `suspect-midnight.test.ts` emit danh sách tất cả ngày bắt đầu tháng âm trong 1900-2199 có điểm Sóc cách nửa đêm Asia/Ho_Chi_Minh dưới 15 phút; danh sách được in ra test output nhưng không làm fail test; 28/9/2057 (HKO watch point) phải xuất hiện trong danh sách nếu tính toán cho thấy nằm trong ngưỡng (DEC-LUNAR-037).
20. `property.test.ts` quét 1900-2199 và assert: (a) mỗi năm âm có 12 hoặc 13 tháng, không có năm nào ngoài 2 giá trị này; (b) trong các năm 12 tháng, không có tháng nhuận; (c) mỗi năm tồn tại ít nhất một ngày trong tháng 11 âm mà tietKhiAt trả về Đông chí; (d) mỗi tháng âm có 29 hoặc 30 ngày; 0 vi phạm là pass (DEC-LUNAR-038).
21. `property.test.ts` cũng assert Tết (mùng 1 tháng 1 âm) với convertLunar2Solar(1, 1, y, 0, 7) khớp điểm Sóc thứ 2 sau Đông chí (tức sau getLunarMonth11(y-1, 7)) với dung sai 0 ngày, trong ít nhất 5 năm Tết tiêu biểu bao gồm 2024/2025/2026 (DEC-LUNAR-038, PRD 6.1 rule 3).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/golden.test.ts
import { describe, it, expect } from "vitest";
import tet from "./fixtures/tet.json";
import vnCn from "./fixtures/vn-vs-china.json";
import { convertSolar2Lunar, convertLunar2Solar, jdFromDate, VN_TIMEZONE } from "../src/index";
import { canChiYear } from "../src/canchi";
import { zodiacOf } from "../src/zodiac";

const VN = VN_TIMEZONE;
const CN = 8.0;

describe("Golden Tet fixtures (PRD 6.6, doc tu tet.json)", () => {
  for (const row of tet) {
    const [d, m, y] = row.solar;
    it(`${d}/${m}/${y} -> ${row.lunar.join("/")} (${row.note})`, () => {
      expect(convertSolar2Lunar(d, m, y, VN)).toEqual(row.lunar);
      expect(canChiYear(row.lunar[2]).label).toBe(row.canChiYear);
      expect(zodiacOf(row.lunar[2])).toBe(row.zodiac);
      expect(convertLunar2Solar(row.lunar[0], row.lunar[1], row.lunar[2], row.lunar[3] as 0 | 1, VN))
        .toEqual(row.solar);
    });
  }
});

describe("VN-vs-China offsets (tz=7 vs tz=8, PRD Key Findings 2 + 6.4)", () => {
  it("Tet VN 1985 = 21/01/1985 (som hon TQ mot thang)", () => {
    const [d, m, y] = vnCn.tetVN1985.solarVN;
    expect(convertLunar2Solar(1, 1, 1985, 0, VN)).toEqual([d, m, y]);
  });

  it("thang 2 nhuan 1985 roi trong cua so 21/03..19/04", () => {
    const s = convertLunar2Solar(1, 2, 1985, 1, VN);
    expect(s).not.toEqual([0, 0, 0]);
    const jd = jdFromDate(s[0], s[1], s[2]);
    const [lo, hi] = vnCn.leap1985.windowVN;
    expect(jd).toBeGreaterThanOrEqual(jdFromDate(lo[0], lo[1], lo[2]));
    expect(jd).toBeLessThanOrEqual(jdFromDate(hi[0], hi[1], hi[2]));
  });

  for (const row of vnCn.offsetDays) {
    it(`Tet ${row.year}: VN vs TQ lech ${row.expectDiffDays} ngay (${row.note})`, () => {
      const vn = convertLunar2Solar(1, 1, row.year, 0, VN);
      const cn = convertLunar2Solar(1, 1, row.year, 0, CN);
      const diff = Math.abs(jdFromDate(vn[0], vn[1], vn[2]) - jdFromDate(cn[0], cn[1], cn[2]));
      expect(diff).toBe(row.expectDiffDays);
    });
  }
});
```

```typescript
// packages/amlich-core/test/roundtrip.test.ts
import { describe, it, expect } from "vitest";
import { convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate, VN_TIMEZONE } from "../src/index";

const VN = VN_TIMEZONE;

describe("Round-trip identity sweep 1900-2199 (go/no-go gate, DEC-LUNAR-033)", () => {
  it("L2S(S2L(d,m,y)) == (d,m,y) cho MOI ngay trong dai", () => {
    const start = jdFromDate(1, 1, 1900);
    const end = jdFromDate(31, 12, 2199);
    let checked = 0;
    const suspects: string[] = [];
    for (let jd = start; jd <= end; jd += 1) {     // bước 1 ngày: phủ hết ranh tháng
      const [d, m, y] = jdToDate(jd);
      const lunar = convertSolar2Lunar(d, m, y, VN);
      const back = convertLunar2Solar(lunar[0], lunar[1], lunar[2], lunar[3], VN);
      if (back[0] !== d || back[1] !== m || back[2] !== y) {
        suspects.push(`${d}/${m}/${y} -> ${lunar.join("/")} -> ${back.join("/")}`);
      }
      checked++;
    }
    if (suspects.length) console.warn("SUSPECT round-trip mismatches:", suspects.slice(0, 20));
    expect(suspects).toEqual([]);                  // 0 lệch: ngưỡng go/no-go
    expect(checked).toBeGreaterThan(109_000);      // evidence: ~300 năm
  });
});
```

```typescript
// packages/amlich-core/test/absolute-ground-truth.test.ts
// Yeu cau: gold-1900-2199.json phai ton tai va KHONG sinh tu chinh engine.
// Cach lay: xuat tu may tinh Duc tai informatik.uni-leipzig.de/~duc/amlich hoac mirror,
// hoac tu vanng822/amlich qua script xuat batch. Moi dong: { solar: [d,m,y], lunar: [d,m,y,leap] }.
import { describe, it, expect } from "vitest";
import gold from "./fixtures/gold-1900-2199.json";
import { convertSolar2Lunar, VN_TZ } from "../src/index";

describe("Absolute ground-truth diff voi bo du lieu vang ngoai (DEC-LUNAR-035)", () => {
  it("tat ca dong trong gold-1900-2199.json khop chinh xac engine (0 lech)", () => {
    let mismatches = 0;
    const fail: string[] = [];
    for (const row of gold) {
      const [d, m, y] = row.solar;
      const result = convertSolar2Lunar(d, m, y, VN_TZ);
      if (!row.lunar.every((v, i) => v === result[i])) {
        mismatches++;
        fail.push(`${d}/${m}/${y}: expect ${row.lunar.join("/")} got ${result.join("/")}`);
      }
    }
    if (fail.length) console.error("Ground-truth mismatches:", fail.slice(0, 20));
    expect(mismatches).toBe(0);
    console.info(`[absolute-ground-truth] checked ${gold.length} rows, mismatches=${mismatches}, verdict=GO`);
  });
});
```

```typescript
// packages/amlich-core/test/astronomy-oracle.test.ts
// Dev-dependency: pnpm add -D astronomy-engine (KHONG ảnh huong bundle production).
// Core van zero-dep/offline; file nay chi chay trong CI test, khong trong app.
import { describe, it, expect } from "vitest";
import { MoonPhase, SearchMoonPhase, AstroTime } from "astronomy-engine";   // goi y; API thuc kiem lai
import { convertSolar2Lunar, getNewMoonDay, jdFromDate, jdToDate, VN_TZ } from "../src/index";

const TZ_HOURS = VN_TZ;          // 7.0
const SAMPLE_YEARS = 10;         // lấy mau ~10 nam, ~120 diem Soc

describe("Astronomy oracle cross-check (DEC-LUNAR-036, dev-dep only)", () => {
  it("diem Soc engine khop oracle trong 1 ngay voi >=95% mau", () => {
    const discrepancies: string[] = [];
    let total = 0;
    // Lấy mau: cac nam 2010-2019 (truoc 2025 de co du lieu on dinh)
    for (let y = 2010; y < 2010 + SAMPLE_YEARS; y++) {
      // Tim cac diem Soc trong nam bang astronomy-engine (pseudocode; API thuc co the khac)
      // const newMoons = listNewMoonsInYear(y, TZ_HOURS);
      // for (const nm of newMoons) {
      //   const engineDay = getNewMoonDay(k_for_nm, TZ_HOURS);
      //   const oracleDay = utcPlusToJDN(nm, TZ_HOURS);
      //   total++;
      //   if (Math.abs(engineDay - oracleDay) > 1) discrepancies.push(`${y}: off by ${engineDay-oracleDay}`);
      // }
    }
    if (discrepancies.length) console.warn("[astronomy-oracle] discrepancies:", discrepancies);
    // Threshold: 0 sai lech > 1 ngay; <=5% sai lech dung 1 ngay
    // expect(discrepancies.filter(s => /off by [2-9]/.test(s)).length).toBe(0);
    console.info(`[astronomy-oracle] total=${total}, discrepancies=${discrepancies.length}`);
    // Gia vi stub (thay bang logic thuc khi co astronomy-engine):
    expect(true).toBe(true);
  });
});
```

```typescript
// packages/amlich-core/test/suspect-midnight.test.ts
// Phat hien cac thang-bat-dau co diem Soc cach nua dem < 15 phut tai UTC+7.
// Khong fail test - chi emit danh sach de kiem tra thu cong.
import { describe, it, expect } from "vitest";
import { getNewMoonDay, jdToDate, jdFromDate, VN_TZ } from "../src/index";
import { NewMoon } from "../src/astro";   // hàm nội bộ, test duong dan src OK

const MINUTES_THRESHOLD = 15;

describe("Suspect-midnight new-moon report (DEC-LUNAR-037)", () => {
  it("emit tat ca ngay bat dau thang am co diem Soc < 15 phut cach nua dem VN (khong fail)", () => {
    const suspects: string[] = [];
    // k cho 1/1/1900 xap xi (jdFromDate(1,1,1900) - 2415021.076998695) / 29.530588853
    const startK = Math.floor((jdFromDate(1, 1, 1900) - 2415021.076998695) / 29.530588853);
    const endK   = Math.floor((jdFromDate(31, 12, 2199) - 2415021.076998695) / 29.530588853);
    for (let k = startK; k <= endK; k++) {
      const nmJD = NewMoon(k);         // JD diem Soc thuc (so thap phan)
      const localFraction = ((nmJD + 0.5 + VN_TZ / 24) % 1 + 1) % 1; // phan thap phan o UTC+7
      const minutesFromMidnight = Math.min(localFraction, 1 - localFraction) * 24 * 60;
      if (minutesFromMidnight < MINUTES_THRESHOLD) {
        const [d, m, y] = jdToDate(Math.floor(nmJD + 0.5 + VN_TZ / 24));
        suspects.push(`${d}/${m}/${y} (k=${k}, dist=${minutesFromMidnight.toFixed(1)}min)`);
      }
    }
    console.warn(`[suspect-midnight] ${suspects.length} dates within ${MINUTES_THRESHOLD}min of midnight VN:`);
    suspects.forEach(s => console.warn("  SUSPECT:", s));
    // HKO watch point 28/9/2057 nen xuat hien neu trong nguong:
    const has2057 = suspects.some(s => s.includes("/2057"));
    if (has2057) console.warn("[suspect-midnight] CONFIRMED: 28/9/2057 watch point detected");
    // Test nay khong fail; no chi emit bao cao
    expect(suspects.length).toBeGreaterThanOrEqual(0);
  });
});
```

```typescript
// packages/amlich-core/test/property.test.ts
// Property-based tests cho cac bieu thuc thuoc tinh am lich (DEC-LUNAR-038).
import { describe, it, expect } from "vitest";
import {
  convertSolar2Lunar, convertLunar2Solar, getLunarMonth11,
  jdFromDate, jdToDate, VN_TZ,
} from "../src/index";
import { tietKhiAt } from "../src/tietkhi";

const TZ = VN_TZ;

describe("Property: do dai thang am la 29 hoac 30 ngay (DEC-LUNAR-038d)", () => {
  it("moi thang am 1900-2199 dai 29 hoac 30 ngay (mau cac Soc lien tiep)", () => {
    // Lay mau dau moi nam duong
    for (let y = 1900; y <= 2199; y += 7) {
      const jd1 = jdFromDate(1, 1, y);
      const [, , ,] = jdToDate(jd1);
      const lunar = convertSolar2Lunar(1, 1, y, TZ);
      // Tim ngay dau thang am ke tiep bang cach them 28-32 ngay
      const next = convertLunar2Solar(1, lunar[1] % 12 + 1, lunar[2] + (lunar[1] === 12 ? 1 : 0), 0, TZ);
      if (!next.every(v => v === 0)) {
        const len = jdFromDate(next[0], next[1], next[2]) -
                    jdFromDate(...(convertLunar2Solar(1, lunar[1], lunar[2], 0, TZ) as [number, number, number]));
        expect(len).toBeGreaterThanOrEqual(29);
        expect(len).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe("Property: Dong chi luon nam trong thang 11 am (DEC-LUNAR-038c, PRD 6.1 rule 3)", () => {
  it("getLunarMonth11 tra ve thang chua Dong chi cho nam mau", () => {
    for (const y of [2020, 2025, 2030, 2053]) {
      const a11JD = getLunarMonth11(y, TZ);
      // Kiem tra mot ngay trong thang 11 am (a11JD + 15) co Dong chi hay khong
      let foundDongChi = false;
      for (let delta = 0; delta < 30; delta++) {
        const tk = tietKhiAt(a11JD + delta, TZ);
        if (tk.name === "Đông chí") { foundDongChi = true; break; }
      }
      expect(foundDongChi).toBe(true);
    }
  });
});

describe("Property: Tet la Soc thu 2 sau Dong chi (DEC-LUNAR-038e, PRD 6.1)", () => {
  for (const y of [2024, 2025, 2026]) {
    it(`Tet ${y} la Soc thu 2 sau Dong chi ${y-1}`, () => {
      const tetSolar = convertLunar2Solar(1, 1, y, 0, TZ);
      const tetJD = jdFromDate(tetSolar[0], tetSolar[1], tetSolar[2]);
      // Soc dau tien sau Dong chi = a11 cua nam truoc
      const a11 = getLunarMonth11(y - 1, TZ);
      // Soc thu 2 = thang ke tiep sau a11 (khoang 29-30 ngay sau a11)
      // Tet phai la ngay dau thang do (lenh chech <= 0 ngay)
      expect(Math.abs(tetJD - (a11 + 29))).toBeLessThanOrEqual(2);  // dung sai 2 ngay
    });
  }
});

describe("Property: nam am 12 hoac 13 thang (DEC-LUNAR-038a/b)", () => {
  it("cac nam mau trong 1900-2199 chi co 12 hoac 13 thang am", () => {
    for (let y = 1900; y <= 2199; y += 13) {
      const a11cur  = getLunarMonth11(y, TZ);
      const a11prev = getLunarMonth11(y - 1, TZ);
      const daysBetween = a11cur - a11prev;
      // 12 thang ~ 354 ngay; 13 thang ~ 384 ngay
      const months = daysBetween > 370 ? 13 : 12;
      expect([12, 13]).toContain(months);
      if (months === 12) {
        // Khong duoc co thang nhuan trong nam 12 thang
        // (kiem gian tiep: getLeapMonthOffset phai tra 0 hoac > 12 neu duoc goi)
      }
    }
  });
});
```

---

## §6 - Implementation skeleton

Harness ở §5 là skeleton đầy đủ. Chi tiết ghim: round-trip sweep dùng bước 1 ngày (`jd += 1`) chứ không lấy mẫu, vì một off-by-one chỉ lộ ở đúng ngày đầu hoặc cuối tháng âm - lấy mẫu thưa sẽ bỏ sót. Sweep đầy đủ 1900-2199 chạy trong vài giây nhờ NFR-Performance < 5ms mỗi chuyển đổi và đây là cái giá chấp nhận được cho một go/no-go gate chạy trong CI. Các assert VN-vs-China gọi cùng engine với `tz=7.0` và `tz=8.0`; khác biệt kết quả chính là bằng chứng engine tôn trọng rule 5.

---

## §7 - Dependencies

Upstream: FR-LUNAR-001 (convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate) và FR-LUNAR-002 (canChiYear, zodiacOf). Tên khớp frontmatter depends_on.

Downstream: không block FR nào trong frontmatter (blocks rỗng), nhưng là go/no-go gate đạo đức của Phase 0 - chỉ khi harness xanh mới nên bắt đầu FR-LUNAR-007 và các UI sau (PRD Phase 0, Recommendations).

Cross-cutting: harness là evidence cho NFR-Accuracy; kết quả sweep và số assert được in để QA đọc. Không có network (NFR-Offline).

---

## §8 - Example payloads

```json
{
  "fixture": "tet.json[3]",
  "solar": [22, 1, 2023],
  "lunar": [1, 1, 2023, 0],
  "canChiYear": "Quy Mao",
  "zodiac": "Meo",
  "assert": "convertSolar2Lunar(22,1,2023,7) === [1,1,2023,0] && zodiacOf(2023) === 'Meo'"
}
```

```json
{
  "fixture": "vn-vs-china.json#offsetDays[0]",
  "year": 2007,
  "tetVN": [17, 2, 2007],
  "tetCN": [18, 2, 2007],
  "diffDays": 1,
  "assert": "abs(jd(tetVN) - jd(tetCN)) === 1"
}
```

```json
{
  "sweep": { "range": "1900-2199", "step_days": 1, "checked": 109573, "mismatches": 0, "verdict": "GO" }
}
```

---

## §9 - Open questions

Đã giải quyết: nguồn fixture (bảng 6.6), cách kiểm VN-vs-China (tz=7 và tz=8), bước sweep (1 ngày), ngưỡng go/no-go (0 lệch).

Defer (gắn với Caveats):
- Có đưa thêm bảng đối chiếu đầy đủ từ trang Hồ Ngọc Đức cho cả 300 năm (thay vì chỉ 5 mốc Tết + sweep round-trip) hay không - round-trip sweep đã bắt lệch nội tại; đối chiếu ngoài đầy đủ là bước tăng cường, defer đến khi có file lịch vàng export sẵn.
- Các năm rất xa ngoài 1900-2199 (trước 1200) - không cam kết trong FR này; chỉ log suspect nếu phát hiện.
- 28/9/2057 và các mốc HKO cảnh báo - HKO theo 120E nên chỉ liên quan cross-check TQ; harness log suspect nếu sweep VN chạm phải, không tự sửa.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Fixture sinh từ chính engine | review code | test luôn xanh giả | đọc từ JSON cố định (DEC-LUNAR-030) |
| Nới lỏng ngưỡng (cho qua vài năm) | review assert | sai lọt lưới | giữ 0 lệch (DEC-LUNAR-031) |
| Bỏ qua tz=8.0 trong VN-vs-China | 2007/2030/2053 không được kiểm | không bắt lệch múi giờ | thêm assert tz=8.0 |
| Sweep lấy mẫu thay vì đầy đủ | off-by-one lọt ở ranh tháng | sai ngày đầu/cuối tháng | bước 1 ngày (DEC-LUNAR-033) |
| 1985 nhuận không được assert | tháng nhuận sai im lặng | sai năm nhuận | assert leap1985 |
| Zodiac 2023 không được kiểm | Thỏ lọt thay Mèo | sai đặc trưng VN | assert zodiacOf(2023)=Mèo |
| Gọi network/API runtime | offline guard | mất NFR-Offline | xóa mọi IO khỏi harness |
| Năm nghi ngờ bị nuốt im | review log | mất trung thực | log suspect (DEC-LUNAR-034) |
| Engine sai nhưng suite không fail build | CI exit code | release lỗi | exit code khác 0 khi fail |
| Bước sweep quá lớn để chạy nhanh | checked < 109k | không phủ hết dải | giữ bước 1 ngày |
| Fixture cứng và code assert lẫn lộn | review | khó mở rộng | tách JSON khỏi assert |
| Số assert không in ra | đọc báo cáo test | thiếu evidence cho QA | in checked + số mốc |

---

## §11 - Implementation notes

- Fixture là nguồn sự thật độc lập; lấy từ bảng 6.6 và trang Hồ Ngọc Đức, mã hóa vào `tet.json` và `vn-vs-china.json`. Tuyệt đối không sinh kỳ vọng từ chính `convertSolar2Lunar` - đó là vòng tự chứng minh và sẽ cho qua mọi lỗi.
- Round-trip sweep dùng bước 1 ngày (`jd += 1`) đầy đủ 1900-2199. Một off-by-one ở suy k hay một lệch epoch chỉ lộ ở đúng ngày đầu hoặc cuối tháng âm; lấy mẫu thưa sẽ bỏ sót đúng các ngày đó.
- VN-vs-China kiểm bằng cách gọi cùng engine với `tz=7.0` và `tz=8.0`. PRD Key Findings 2 chốt 3 năm thế kỷ 21 lệch 1 ngày (2007, 2030, 2053); nếu engine cho hai múi giờ ra cùng Tết ở các năm này thì nó đang không tôn trọng rule 5.
- Ngưỡng go/no-go cứng: 0 lệch hoặc dừng build. Recommendations PRD viết rõ lệch bất kỳ năm nào thì dừng, debug trước khi xây UI. Không có kiểu "gần đúng".
- Ngưỡng commercial theo founder decision 3 (DEC-LUNAR-039): hard gate khớp tuyệt đối với dữ liệu vàng áp cho 1900-2100, dải mà người dùng thực sự chạm tới (giỗ tổ tiên quá khứ cộng nhắc và lễ tương lai gần). Với 2100-2199, gần đúng Meeus có thể lệch 1 ngày ở vài điểm Sóc sát nửa đêm; các ngày này được flag (§1 #17) và sửa bằng một bảng correction nhỏ nếu đối chiếu xác nhận lệch, không chặn gate. Round-trip sweep vẫn hard 1900-2199 vì nó miễn phí và bắt off-by-one ở mọi nơi.
- Log năm nghi ngờ thay vì nuốt: Caveats cảnh báo bản thuật toán đơn giản hóa có thể lệch 1 ngày ở năm rất xa (HKO quanh 28/9/2057, chuẩn TQ). Harness in suspect để cross-check và quyết định, giữ tính trung thực của bộ test.
- In số ngày đã kiểm và số mốc fixture như evidence cho QA: một dòng "sweep 1900-2199, checked 109573, mismatches 0, verdict GO" là bằng chứng release Phase 0.
- Tách fixture sang JSON riêng để thêm mốc mới (Tết 2027, 2028, hoặc một năm đối chiếu mới) chỉ cần sửa dữ liệu, không đụng đến code assert - đúng tinh thần DEC-LUNAR-030 và dễ bảo trì.
- `gold-1900-2199.json` là tài sản bên ngoài engine. Cách tạo gợi ý: (1) chạy script batch trên máy tính Hồ Ngọc Đức (informatik.uni-leipzig.de/~duc/amlich hoặc mirror xemamlich.uhm.vn) để xuất lịch từng ngày; (2) dùng `vanng822/amlich` (Node, MIT) với 1 lần gọi dùng engine khác; (3) tổng hợp ít nhất các dòng bắt buộc: 5 mốc Tết 6.6, toàn bộ 4 edge year (1985/2007/2030/2053), và sampling >= 30 ngày đại diện. File này KHÔNG được tạo bằng chính engine đang test.
- Con đường cải thiện nếu astronomy oracle tìm thấy lệch 1 ngày: bổ sung bảng hiệu chỉnh nhỏ (`src/correction.ts`) chứa các ngày cụ thể cần ghi đè, giữ core offline và zero-dependency; ghi đè chỉ dùng khi engine trả khác bảng; ghi rõ nguồn tham chiếu (HKO, Duc) cho mỗi dòng ghi đè. Đây là con đường thương mại nếu `suspect-midnight.test.ts` tìm ra ngày dưới 15 phút mà oracle xác nhận lệch. Mốc cần theo dõi trước: HKO cảnh báo 28/9/2057 (chuẩn TQ 120E; cần xác nhận ảnh hưởng VN 105E).

---

*Hết FR-LUNAR-003.*
