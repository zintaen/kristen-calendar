---
id: FR-LUNAR-008
title: "Festival + ritual content database - 13 dip am lich (y nghia, mam cung, checklist, bien the vung mien), nhan tham khao phong tuc dan gian, link tu nhac"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P1
milestone: P1 · slice 3
slice: 3
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-006, FR-LUNAR-015]
depends_on: [FR-LUNAR-001]
blocks: [FR-LUNAR-015, FR-LUNAR-016]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-D01, FR-D02)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#7 (bang noi dung 13 dip)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#10 (FestivalContent data model)"
source_decisions:
  - DEC-LUNAR-080 (toan bo FestivalContent la du lieu tinh bien tap mot lan, khong AI, khong network; AI Genie (FR-015) chi dung no lam context prompting, khong thay the no)
  - DEC-LUNAR-081 (moi FestivalContent PHAI gan nhan "tham khao theo phong tuc dan gian" de tranh khang dinh tam linh tuyet doi, theo Caveats PRD)
  - DEC-LUNAR-082 (dip co ngay am co dinh (vi du 15/1, 10/1, 23/12) duoc encode lunarDay + lunarMonth; dip khong co dinh (Thanh Minh, giong ca nhan) duoc encode voi lunarDay = null va logic tinh rieng)
  - DEC-LUNAR-083 (bien the vung mien Bac/Trung/Nam duoc model la mang RegionVariant[], khong phan nhanh thanh 3 ban ghi rieng, de giu mot ID duy nhat cho moi dip)
  - DEC-LUNAR-084 (linkedContentId tren Reminder tro den FestivalContent.id; khi hien thi nhac, app lay content bang lookup O(1) tu map<id, FestivalContent>)
language: typescript 5.x
service: packages/content/
new_files:
  - packages/content/src/festivals.ts
  - packages/content/src/index.ts
  - packages/content/src/types.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: packages/content/**
  - file_write: packages/content/src/**
  - bash: cd packages/content && pnpm test
disallowed_tools:
  - "goi network de lay noi dung festival (vi pham DEC-LUNAR-080 / NFR-Offline)"
  - "dung AI de sinh noi dung festival tu dong (vi pham DEC-LUNAR-080 - phai bien tap tay)"
effort_hours: 7
sub_tasks:
  - "1.0h: types.ts - dinh nghia FestivalContent, RegionVariant, LunarDateSpec, ContentId"
  - "2.5h: festivals.ts - encode day du 13 ban ghi cho 13 dip (du lieu thuoc long, kiem tra doi chieu PRD §7)"
  - "0.5h: index.ts - export getFestivalById, getFestivalByLunarDate, getAllFestivals, buildFestivalDateSet"
  - "1.0h: unit tests - 13 dip hien dien, nhan tham khao, offerings khong rong, link logic dung"
  - "1.0h: ham buildFestivalDateSet(year) tra Set<string> ngay duong YYYY-MM-DD cho nam cu the (dung voi FR-007)"
  - "1.0h: kiem tra bien the vung mien Bac/Trung/Nam trong du lieu (Toan Ngo co 3 bien the)"
risk_if_skipped: "FR-LUNAR-015 (AI Genie) su dung FestivalContent lam context cho Claude prompt; khong co data tinh thi Genie khong co kien thuc nen ve phong tuc. FR-LUNAR-016 (Zalo Mini App) can FestivalContent de hien thi trang chi tiet tu nhac ZNS."
---

## §1 - Description (BCP-14 normative)

Module nay PHẢI cung cấp cơ sở dữ liệu nội dung tĩnh cho 13 dịp âm lịch Việt Nam, đã được biên tập, sẵn sàng dùng offline trong toàn bộ codebase.

1. PHẢI encode đầy đủ 13 bản ghi `FestivalContent` cho 13 dịp sau đây theo đúng dữ liệu bảng PRD §7 (FR-D01): Mùng Một hàng tháng, Rằm hàng tháng, Giao thừa, Mùng 1 Tết, Ông Công Ông Táo, Rằm tháng Giêng, Vía Thần Tài, Tết Thanh Minh, Giỗ Tổ Hùng Vương, Tết Đoan Ngọ, Vu Lan/Rằm tháng Bảy, Tết Trung Thu, đám giỗ cá nhân (DEC-LUNAR-080).
2. PHẢI gắn nhãn "tham khảo theo phong tục dân gian" lên mỗi bản ghi `FestivalContent` bằng field `disclaimer: string` với giá trị chuẩn, không được bỏ sót bất kỳ bản ghi nào (DEC-LUNAR-081, PRD §7 lưu ý nội dung).
3. PHẢI encode đúng `lunarDay` và `lunarMonth` cho từng dịp có ngày âm cố định; với Tết Thanh Minh (khoảng tháng 3 ÂL nhưng không cố định ngày chính xác) và đám giỗ cá nhân (do người dùng nhập), PHẢI để `lunarDay: null` và ghi rõ logic tính riêng trong field `dateNote` (DEC-LUNAR-082).
4. PHẢI encode biến thể vùng miền Bắc/Trung/Nam cho các dịp có sự khác biệt (ít nhất Tết Đoan Ngọ 5/5 ÂL có 3 biến thể) dưới dạng mảng `regionVariants: RegionVariant[]` gắn trong cùng bản ghi, không tách thành bản ghi riêng (DEC-LUNAR-083).
5. PHẢI cung cấp hàm `getFestivalById(id: ContentId): FestivalContent | undefined` tra theo ID.
6. PHẢI cung cấp hàm `getFestivalByLunarDate(lunarDay: number, lunarMonth: number): FestivalContent[]` để tìm các dịp trùng với ngày âm đã cho; trả mảng rỗng nếu không có dịp nào.
7. PHẢI cung cấp hàm `getAllFestivals(): FestivalContent[]` trả toàn bộ 13 bản ghi.
8. PHẢI cung cấp hàm `buildFestivalDateSet(year: number): Set<string>` nhận năm dương lịch, tính ngày dương tương ứng cho mọi dịp có ngày âm cố định trong năm đó bằng `convertLunar2Solar` từ `amlich-core`, trả `Set<string>` dạng "YYYY-MM-DD" để FR-LUNAR-007 dùng tô chấm lịch (DEC-LUNAR-084).
9. PHẢI đảm bảo mỗi bản ghi có `offerings: string[]` không rỗng - ít nhất 3 lễ vật gợi ý theo PRD §7.
10. PHẢI đảm bảo mỗi bản ghi có `checklist: string[]` không rỗng - ít nhất 2 việc cần làm trước/trong ngày.
11. PHẢI giữ nguyên tên dịp, tên lễ vật, tên vùng miền bằng tiếng Việt chuẩn dấu, không latinh hóa trong field dữ liệu (chỉ code và type names dùng ASCII).
12. PHẢI đảm bảo Mùng Một hàng tháng có `lunarDay: 1` và `lunarMonth: null` (lặp mỗi tháng); Rằm hàng tháng có `lunarDay: 15` và `lunarMonth: null` - phân biệt với Rằm tháng Giêng (15/1 ÂL) là bản ghi riêng.
13. KHÔNG ĐƯỢC gọi network để lấy hoặc cập nhật nội dung festival (DEC-LUNAR-080, NFR-Offline); toàn bộ data phải nằm trong source file biên dịch cùng app.
14. NÊN có field `meaning: string` mô tả ý nghĩa tối thiểu 1 câu đầy đủ cho mỗi dịp, lấy từ PRD §7 cột "Ý nghĩa".
15. NÊN cung cấp field `celebrationTime: string | null` mô tả giờ cúng lý tưởng khi PRD §7 có ghi (Mùng Một/Ông Công Ông Táo: trước 12h trưa; Đoan Ngọ: giờ Ngọ 11-13h).

---

## §2 - Why this design (rationale for humans)

**Tại sao dữ liệu tĩnh, không AI (DEC-LUNAR-080)?** Mâm cúng và ý nghĩa dịp lễ là kiến thức ổn định, biên tập một lần dùng mãi. Dùng AI runtime để sinh mỗi lần thêm độ trễ, tốn tiền và tạo rủi ro sinh sai thông tin. AI Genie (FR-LUNAR-015) dùng chính data này làm context để trả lời câu hỏi linh hoạt - hai vai trò bổ sung nhau.

**Tại sao bắt buộc nhãn "tham khảo phong tục dân gian" (DEC-LUNAR-081)?** PRD §7 ghi rõ phải gắn nhãn này và "tránh khẳng định tâm linh tuyệt đối". Đây vừa là yêu cầu sản phẩm vừa là quản lý rủi ro: người dùng ở Bắc/Trung/Nam cúng khác nhau, không có "một mâm cúng đúng duy nhất".

**Tại sao `lunarDay: null` cho Thanh Minh và đám giỗ (DEC-LUNAR-082)?** Thanh Minh rơi vào khoảng tháng 3 ÂL nhưng ngày chính xác tính từ tiết khí (thanh minh tiết), không phải ngày âm cố định. Đám giỗ là ngày mất của người thân, do người dùng nhập qua Reminder. Ép cả hai vào `lunarDay: number` sẽ sai về ngữ nghĩa và gây bug khi dùng `getFestivalByLunarDate`.

**Tại sao biến thể vùng miền là mảng trong cùng bản ghi (DEC-LUNAR-083)?** Nếu tách thành 3 bản ghi Đoan Ngọ Bắc/Trung/Nam, `getFestivalByLunarDate(5, 5)` trả 3 kết quả, UI phải chọn hiển thị cái nào. Gộp vào một bản ghi với `regionVariants[]` cho phép UI hiển thị cả 3 biến thể trong một màn hình chi tiết, và `linkedContentId` trong Reminder chỉ cần trỏ đến một ID duy nhất.

**Tại sao `buildFestivalDateSet` cần gọi `convertLunar2Solar` (DEC-LUNAR-084)?** Ngày dương của Rằm tháng Giêng năm 2025 là 12/02/2025, năm 2026 là khác. Không thể hardcode. Hàm này là cầu nối giữa data tĩnh (ngày âm cố định) và lưới lịch động (FR-LUNAR-007 cần `Set<string>` ngày dương).

**Tại sao cần `checklist` riêng ngoài `offerings`?** Offerings là danh sách lễ vật (danh từ), checklist là việc cần làm (động từ, ví dụ "Mua hoa cúc vàng trước 1 ngày", "Thả cá chép sống ra sông"). Phân biệt hai trường giúp FR-LUNAR-015 (AI Genie) có thể trích dẫn checklist khi người dùng hỏi "Cần chuẩn bị gì?" và offerings khi hỏi "Cúng gì?".

**Tại sao phụ thuộc FR-LUNAR-001?** `buildFestivalDateSet` gọi `convertLunar2Solar` từ `amlich-core`. Mọi tính toán ngày dương phải qua engine lõi đã được kiểm tra; không được hardcode ngày dương.

---

## §3 - API contract

```typescript
// packages/content/src/types.ts
// LUU Y: FestivalContent phai khop hop dong public trong CONTRACT.md (P2/P3 surface cua
// @cyberskill/genie-content). Cac truong nhu lunarDay/lunarMonth nam TRUC TIEP tren interface,
// KHONG boc trong LunarDateSpec. regionVariants la optional va chi co region + note.
// Cac kieu phu tro (LunarDateSpec, RegionVariant mo rong) chi dung noi bo de encode
// FESTIVALS array va KHONG duoc re-export thanh public API.

export type ContentId =
  | "mung-mot"
  | "ram"
  | "giao-thua"
  | "mung-mot-tet"
  | "ong-cong-ong-tao"
  | "ram-thang-gieng"
  | "via-than-tai"
  | "thanh-minh"
  | "gio-to-hung-vuong"
  | "doan-ngo"
  | "vu-lan"
  | "trung-thu"
  | "dam-gio-ca-nhan";

// === Public exported interface (PHAI khop CONTRACT.md) ===
export interface FestivalContent {
  readonly id: string;
  readonly name: string;
  readonly lunarDay: number | null;    // null = khong co ngay am co dinh (Thanh Minh, dam gio) hoac lap lai moi thang (Rằm, Mung Mot)
  readonly lunarMonth: number | null;  // null = lap lai moi thang
  readonly meaning: string;
  readonly offerings: readonly string[];
  readonly checklist: readonly string[];
  readonly regionVariants?: readonly { readonly region: "BAC" | "TRUNG" | "NAM"; readonly note: string }[];
  readonly disclaimer: string;         // bat buoc: "tham khao theo phong tuc dan gian"
}

// === Kieu noi bo de encode FESTIVALS array (khong export) ===
// InternalFestivalRecord mo rong FestivalContent voi cac truong tien ich bien tap.
// FESTIVALS array duoc cast sang `readonly FestivalContent[]` khi export.
interface _InternalRecord extends FestivalContent {
  readonly celebrationTime?: string | null; // ghi chu gio cung ly tuong (khong co trong public contract)
  readonly dateNote?: string | null;        // ghi chu logic tinh ngay khi lunarDay = null
}
```

```typescript
// packages/content/src/festivals.ts
// LUU Y HOP DONG: FESTIVALS phai co kieu `readonly FestivalContent[]` de khop CONTRACT.md.
// Du lieu duoc encode theo cau truc phang (lunarDay/lunarMonth truc tiep tren ban ghi),
// KHONG boc trong lunarDateSpec. Thanh Minh va dam gio co lunarDay: null.
// Mung Mot (lunarDay:1, lunarMonth:null) va Ram (lunarDay:15, lunarMonth:null) = lap moi thang.
// regionVariants theo hop dong: chi co `region` va `note` (khong co `offerings` rieng trong contract).
// Cac truong tien ich nhu celebrationTime va dateNote duoc giu trong noi bo record nhung khong
// xuat hien trong public FestivalContent contract; implementation co the mo rong qua cast noi bo.
import { convertLunar2Solar } from "@cyberskill/amlich-core";
import type { FestivalContent, ContentId } from "./types";

export const FESTIVALS: readonly FestivalContent[] = [
  {
    id: "mung-mot",
    name: "Mùng Một",
    lunarDay: 1,
    lunarMonth: null,    // lap lai vao ngay 1 am lich moi thang
    meaning: "Ngày đầu tháng âm lịch, cúng cầu an cho gia đình và thờ gia tiên, thần linh.",
    offerings: [
      "Hương",
      "Hoa (hoa cúc, hoa ly, hoặc hoa theo mùa)",
      "Trái cây ngũ quả",
      "Trà",
      "Bánh kẹo",
      "Đồ chay hoặc mặn tùy theo phong tục từng nhà"
    ],
    checklist: [
      "Chuẩn bị mâm cúng trước 12h trưa",
      "Thắp hương bàn thờ gia tiên",
      "Dọn dẹp bàn thờ sạch sẽ trước khi cúng"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ram",
    name: "Rằm",
    lunarDay: 15,
    lunarMonth: null,    // lap lai vao ngay 15 am lich moi thang
    meaning: "Ngày trăng tròn, lễ Phật và cúng gia tiên, cầu bình an cho gia đình.",
    offerings: [
      "Hương",
      "Hoa",
      "Ngũ quả",
      "Trà",
      "Đồ chay hoặc mặn"
    ],
    checklist: [
      "Thắp hương và cúng lễ trong ngày Rằm",
      "Có thể đi chùa lễ Phật nếu muốn"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "giao-thua",
    name: "Giao thừa",
    lunarDay: 30,
    lunarMonth: 12,     // dem 30 thang Chap (hoac dem 29 neu thang Chap khong du 30 ngay)
    meaning: "Thời khắc tiễn đưa năm cũ và đón chào năm mới, cúng lễ trời đất và gia tiên.",
    offerings: [
      "Gà luộc",
      "Xôi",
      "Bánh chưng (Bắc) hoặc bánh tét (Nam)",
      "Ngũ quả",
      "Hương đăng",
      "Mâm cúng trong nhà và ngoài trời (sân hoặc ban công)"
    ],
    checklist: [
      "Chuẩn bị hai mâm cúng: một trong nhà cho gia tiên, một ngoài trời cho trời đất",
      "Đúng 12h đêm thắp hương đón giao thừa",
      "Mở cửa đón không khí mới vào nhà"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "mung-mot-tet",
    name: "Mùng 1 Tết (Tết Nguyên Đán)",
    lunarDay: 1,
    lunarMonth: 1,
    meaning: "Tết Nguyên Đán, ngày lễ lớn nhất trong năm của người Việt, cúng tổ tiên và cầu may mắn năm mới.",
    offerings: [
      "Xôi",
      "Gà luộc",
      "Bánh chưng (Bắc) hoặc bánh tét (Nam)",
      "Hoa quả",
      "Mâm cao cỗ đầy theo điều kiện gia đình",
      "Cành mai (Nam) hoặc cành đào (Bắc)"
    ],
    checklist: [
      "Cúng gia tiên từ sáng sớm Mùng 1",
      "Mặc trang phục đẹp, tránh mặc đồ tối màu",
      "Chúc Tết ông bà cha mẹ và nhận lì xì",
      "Tránh quét nhà vào Mùng 1 (sợ quét hết may mắn)"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ong-cong-ong-tao",
    name: "Ông Công Ông Táo",
    lunarDay: 23,
    lunarMonth: 12,
    meaning: "Lễ tiễn Táo Quân về trời báo cáo với Ngọc Hoàng về việc làm của gia đình trong năm qua.",
    offerings: [
      "Cá chép sống (thả ra ao hồ, sông sau khi cúng) hoặc cá chép vàng mã",
      "Mũ áo Táo Quân (vàng mã)",
      "Mâm cỗ mặn hoặc chay",
      "Vàng mã",
      "Hương, hoa, trà"
    ],
    checklist: [
      "Cúng trước 12h trưa ngày 23 tháng Chạp",
      "Mua cá chép sống để thả nếu có điều kiện",
      "Đốt vàng mã mũ áo Táo Quân sau khi cúng xong",
      "Thả cá chép ra ao/sông sau lễ"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ram-thang-gieng",
    name: "Rằm tháng Giêng (Tết Nguyên Tiêu)",
    lunarDay: 15,
    lunarMonth: 1,
    meaning: "\"Lễ quanh năm không bằng Rằm tháng Giêng\" - ngày Thượng nguyên, lễ Phật và cúng gia tiên lớn đầu năm.",
    offerings: [
      "Mâm cỗ chay hoặc mặn dâng Phật và gia tiên",
      "Ngũ quả",
      "Hương, hoa, đèn nến",
      "Xôi, chè"
    ],
    checklist: [
      "Đi chùa lễ Phật cầu an đầu năm",
      "Cúng gia tiên tại nhà",
      "Dọn dẹp bàn thờ và thay hoa mới"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "via-than-tai",
    name: "Vía Thần Tài",
    lunarDay: 10,
    lunarMonth: 1,
    meaning: "Ngày vía Thần Tài, đặc biệt quan trọng với người kinh doanh, cầu tài lộc và thuận lợi trong buôn bán.",
    offerings: [
      "Hoa (hoa cúc vàng hoặc hoa hồng đỏ)",
      "Trái cây",
      "Bộ tam sên (trứng luộc, miếng thịt luộc, tôm/cua luộc)",
      "Vàng mã",
      "Nhang đèn"
    ],
    checklist: [
      "Mua vàng (nhẫn, dây chuyền vàng nhỏ) vào buổi sáng sớm để cầu may",
      "Cúng Thần Tài tại nhà hoặc cửa hàng trước giờ mở cửa",
      "Trang trí bàn thờ Thần Tài sạch sẽ, tươm tất"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "thanh-minh",
    name: "Tết Thanh Minh",
    lunarDay: null,      // khong co ngay am co dinh; tinh tu tiet khi Thanh Minh (~4-6/4 duong lich)
    lunarMonth: null,    // CONTRACT: lunarDay:null => getFestivalByLunarDate se bo qua ban ghi nay
    meaning: "Tết tảo mộ, dịp con cháu thăm viếng, dọn dẹp mộ phần tổ tiên và tưởng nhớ nguồn cội.",
    offerings: [
      "Mâm cúng tại mộ tổ tiên: xôi, gà, hoa quả, hương đèn",
      "Vàng mã",
      "Hoa tươi"
    ],
    checklist: [
      "Đi tảo mộ, dọn dẹp cỏ dại và sửa sang mộ phần",
      "Thắp hương tại mộ và mời tổ tiên về hưởng lễ",
      "Cả gia đình quây quần, nhớ về tổ tiên"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; ngày chính xác tính theo tiết khí Thanh Minh, không phải ngày âm cố định."
  },
  {
    id: "gio-to-hung-vuong",
    name: "Giỗ Tổ Hùng Vương",
    lunarDay: 10,
    lunarMonth: 3,
    meaning: "Quốc lễ tưởng nhớ các vua Hùng - tổ tiên của người Việt Nam, ngày nghỉ lễ quốc gia.",
    offerings: [
      "Bánh chưng",
      "Bánh giầy",
      "Hương, hoa, ngũ quả"
    ],
    checklist: [
      "Thắp hương tưởng nhớ vua Hùng tại bàn thờ gia tiên",
      "Có thể tham gia lễ hội tại địa phương nếu có tổ chức"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "doan-ngo",
    name: "Tết Đoan Ngọ",
    lunarDay: 5,
    lunarMonth: 5,
    meaning: "\"Tết giết sâu bọ\", dịp trừ tà, giải nhiệt giữa mùa hè và giao mùa, tục ăn cơm rượu nếp để diệt sâu bọ trong người.",
    offerings: [
      "Cơm rượu nếp",
      "Bánh tro/bánh ú (phổ biến miền Trung và Nam)",
      "Mận, vải thiều (theo mùa)",
      "Hương, hoa, ngũ quả"
    ],
    checklist: [
      "Ăn cơm rượu nếp vào giờ Ngọ (11-13h) theo tục truyền",
      "Cúng gia tiên và thần linh trong ngày",
      "Hái lá thuốc sáng sớm (tục một số vùng)"
    ],
    // regionVariants theo hop dong chi co region + note (khong co offerings rieng).
    // Thong tin offerings theo vung duoc dua vao phan note de giu nghia.
    regionVariants: [
      {
        region: "BAC",
        note: "Miền Bắc ăn cơm rượu nếp, mận, vải thiều; cúng đơn giản."
      },
      {
        region: "TRUNG",
        note: "Miền Trung có chè kê đặc trưng và bánh ú lá tre bên cạnh cơm rượu."
      },
      {
        region: "NAM",
        note: "Miền Nam ăn chè trôi nước và bánh xèo bên cạnh cơm rượu nếp."
      }
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "vu-lan",
    name: "Vu Lan / Rằm tháng Bảy",
    lunarDay: 15,
    lunarMonth: 7,
    meaning: "Lễ Vu Lan báo hiếu và Xá tội vong nhân (cúng cô hồn) - được coi là \"mâm cúng lớn nhất năm\" trong nhiều gia đình Việt.",
    offerings: [
      "Mâm cúng gia tiên: xôi, gà, hoa quả, hương đèn",
      "Mâm cúng chúng sinh/cô hồn: cháo loãng, gạo muối, bỏng ngô, khoai luộc, bánh kẹo, tiền vàng mã",
      "Phóng sinh (chim, cá) nếu có điều kiện",
      "Cơm chay"
    ],
    checklist: [
      "Cúng gia tiên trước (mâm mặn hoặc chay)",
      "Cúng cô hồn/chúng sinh ngoài sân hoặc vỉa hè sau khi cúng gia tiên",
      "Đi chùa lễ Phật cầu siêu và báo hiếu cha mẹ",
      "Cài hoa hồng lên ngực (hồng đỏ = cha mẹ còn sống; hồng trắng = đã mất)"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "trung-thu",
    name: "Tết Trung Thu",
    lunarDay: 15,
    lunarMonth: 8,
    meaning: "Tết đoàn viên và Tết thiếu nhi, ngày trăng tròn tháng 8, gia đình sum họp phá cỗ dưới trăng.",
    offerings: [
      "Bánh Trung Thu (bánh nướng, bánh dẻo)",
      "Mâm ngũ quả",
      "Cúng trăng ngoài trời"
    ],
    checklist: [
      "Chuẩn bị bánh Trung Thu và hoa quả để phá cỗ",
      "Tổ chức cho trẻ em rước đèn lồng tối 14 hoặc 15 tháng 8",
      "Gia đình sum họp phá cỗ dưới trăng"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "dam-gio-ca-nhan",
    name: "Đám giỗ cá nhân",
    lunarDay: null,      // do nguoi dung nhap qua Reminder; khong co ngay am co dinh
    lunarMonth: null,
    meaning: "Ngày giỗ tưởng nhớ người thân đã mất trong gia đình, tổ chức mâm cỗ theo phong tục từng nhà.",
    offerings: [
      "Mâm cỗ gia đình theo phong tục (mặn hoặc chay theo sở thích người mất và gia đình)",
      "Món ăn yêu thích của người mất (nếu nhớ và có thể làm)",
      "Hương, hoa, hoa quả",
      "Vàng mã"
    ],
    checklist: [
      "Chuẩn bị mâm cỗ đúng ngày giỗ (ngày mất tính theo âm lịch)",
      "Mời họ hàng thân thiết đến giỗ nếu điều kiện cho phép",
      "Thắp hương tưởng nhớ người đã mất"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  }
] as const;
```

```typescript
// packages/content/src/index.ts
// PUBLIC API - phai khop CONTRACT.md chinh xac:
//   FESTIVALS: readonly FestivalContent[]
//   getFestivalByLunarDate(lunarDay, lunarMonth): readonly FestivalContent[]
//   buildFestivalDateSet(year): Set<string>
// getAllFestivals() la tien ich noi bo, khong co trong CONTRACT.
import { convertLunar2Solar } from "@cyberskill/amlich-core";
import { FESTIVALS } from "./festivals";
import type { FestivalContent, ContentId } from "./types";

export { FESTIVALS };
// Xuat FestivalContent va ContentId theo hop dong. LunarDateSpec va RegionVariant la kieu noi bo,
// khong export sang consumer (consumer chi thay FestivalContent phang).
export type { FestivalContent, ContentId } from "./types";

const FESTIVAL_MAP: Map<string, FestivalContent> =
  new Map(FESTIVALS.map(f => [f.id, f]));

export function getFestivalById(id: ContentId): FestivalContent | undefined {
  return FESTIVAL_MAP.get(id);
}

// CONTRACT signature: getFestivalByLunarDate(lunarDay: number, lunarMonth: number): readonly FestivalContent[]
// Lua chon cac dip co lunarDay khop va (lunarMonth khop HOAC lunarMonth:null = lap moi thang).
// Sap xep ket qua: specific (lunarMonth != null) len truoc, generic (lunarMonth = null) xuong sau.
export function getFestivalByLunarDate(
  lunarDay: number,
  lunarMonth: number
): readonly FestivalContent[] {
  const results = FESTIVALS.filter(f => {
    if (f.lunarDay === null) return false;       // Thanh Minh, dam gio - khong match
    if (f.lunarDay !== lunarDay) return false;
    if (f.lunarMonth === null) return true;       // Mung Mot, Ram - match moi thang
    return f.lunarMonth === lunarMonth;
  });
  return results.slice().sort((a, b) => {
    const aSpec = a.lunarMonth !== null ? 0 : 1;
    const bSpec = b.lunarMonth !== null ? 0 : 1;
    return aSpec - bSpec;
  });
}

export function getAllFestivals(): readonly FestivalContent[] {
  return FESTIVALS;
}

/**
 * Tinh ngay duong lich cho moi dip co ngay am co dinh trong nam cu the.
 * Tra Set<"YYYY-MM-DD"> de FR-LUNAR-007 (buildMonthGrid) dung to cham lich.
 * CONTRACT: buildFestivalDateSet(year: number): Set<string>
 */
// LUU Y HOP DONG: convertLunar2Solar (FR-LUNAR-001) tra TUPLE [dd, mm, yy], KHONG phai object,
// va tham so nhuan la `0 | 1` (KHONG phai boolean false). Sentinel khi co nhuan khong khop la
// [0, 0, 0] - mot mang truthy, nen phai loc tuong minh `dd !== 0`, khong dua vao `if (solar)`.
// Su dung f.lunarDay / f.lunarMonth (truong phang tren FestivalContent), KHONG doc qua lunarDateSpec.
export function buildFestivalDateSet(year: number): Set<string> {
  const result = new Set<string>();
  for (const f of FESTIVALS) {
    if (f.lunarDay === null) continue; // Thanh Minh, dam gio - bo qua
    if (f.lunarMonth === null) {
      // Mung Mot (1) va Ram (15): xuat hien moi thang am lich
      for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
        const [dd, mm, yy] = convertLunar2Solar(f.lunarDay, lunarMonth, year, 0, 7.0);
        if (dd !== 0 && yy === year) {        // loc sentinel [0,0,0] + giu trong nam duong
          result.add(toDateKey(dd, mm, yy));
        }
      }
    } else {
      // Dip co ngay am va thang am co dinh
      const [dd, mm, yy] = convertLunar2Solar(f.lunarDay, f.lunarMonth, year, 0, 7.0);
      // Giao thua encode lunarDay:30 nhung thang Chap mot so nam chi co 29 ngay -> ngay 30 khong
      // ton tai. Neu engine tra sentinel [0,0,0] thi bo qua; UI/reminder se neo Giao thua vao
      // ngay cuoi thang Chap thuc te, khong phai viec cua buildFestivalDateSet.
      if (dd !== 0) result.add(toDateKey(dd, mm, yy));
    }
  }
  return result;
}

function toDateKey(d: number, m: number, y: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
```

---

## §4 - Acceptance criteria

1. `getAllFestivals()` trả đúng 13 bản ghi, mỗi bản ghi có `id` thuộc kiểu `ContentId`.
2. Mỗi trong 13 bản ghi có `disclaimer` không rỗng chứa chuỗi "tham khảo theo phong tục dân gian" (không phân biệt chữ hoa/thường) (DEC-LUNAR-081).
3. Mỗi bản ghi có `offerings.length >= 3` và `checklist.length >= 2`.
4. `getFestivalById("mung-mot")` trả bản ghi Mùng Một với `lunarDay === 1` và `lunarMonth === null`.
5. `getFestivalById("ram")` trả bản ghi Rằm với `lunarDay === 15` và `lunarMonth === null`.
6. `getFestivalByLunarDate(15, 1)` trả CẢ bản ghi Rằm tháng Giêng (id = "ram-thang-gieng") LẪN bản ghi Rằm hàng tháng (id = "ram") - vì cả hai khớp ngày 15 (ram có `lunarMonth: null` khớp mọi tháng); kết quả PHẢI được sắp xếp specific-first nên `results[0].id === "ram-thang-gieng"` (xem §6, §11). Đây là hành vi đúng, song song với AC #7; UI hiển thị bản ghi specific nổi bật hơn.
7. `getFestivalByLunarDate(1, 1)` trả bản ghi Mùng 1 Tết (id = "mung-mot-tet") và bản ghi Mùng Một hàng tháng (id = "mung-mot") - cả hai vì ngày 1 tháng 1 khớp cả hai rule.
8. `getFestivalByLunarDate(15, 7)` trả bản ghi Vu Lan (id = "vu-lan").
9. Bản ghi Tết Đoan Ngọ (id = "doan-ngo") có `regionVariants.length === 3` với 3 region BAC, TRUNG, NAM.
10. Bản ghi Tết Thanh Minh (id = "thanh-minh") và Đám giỗ cá nhân (id = "dam-gio-ca-nhan") có `lunarDay === null`.
11. `getFestivalByLunarDate(5, 5)` trả bản ghi Tết Đoan Ngọ; `getFestivalByLunarDate(10, 3)` trả bản ghi Giỗ Tổ Hùng Vương.
12. `buildFestivalDateSet(2025)` trả Set chứa "2025-02-12" (Rằm tháng Giêng 15/1 AL 2025) và "2025-01-29" (Mùng 1 Tết 1/1 AL 2025).
13. `buildFestivalDateSet(2025)` chứa ít nhất 24 entry (12 Mùng Một + 12 Rằm hàng tháng) cộng các dịp cố định.
14. Không có network request trong bất kỳ hàm nào của module content (kiểm bằng mock fetch trong test).
15. `getFestivalById("dam-gio-ca-nhan")` trả bản ghi với `lunarDay === null` và `lunarMonth === null`, xác nhận đây là dịp do người dùng nhập ngày qua Reminder.

---

## §5 - Verification

```typescript
// packages/content/src/__tests__/festivals.test.ts
import {
  getAllFestivals, getFestivalById, getFestivalByLunarDate, buildFestivalDateSet
} from "../index";

describe("Content database", () => {
  test("Co dung 13 ban ghi festival", () => {
    expect(getAllFestivals().length).toBe(13);
  });

  test("Moi ban ghi co disclaimer chua 'tham khao theo phong tuc dan gian'", () => {
    getAllFestivals().forEach(f => {
      expect(f.disclaimer.toLowerCase()).toContain("tham khao theo phong tuc dan gian");
    });
  });

  test("Moi ban ghi co offerings >= 3 va checklist >= 2", () => {
    getAllFestivals().forEach(f => {
      expect(f.offerings.length).toBeGreaterThanOrEqual(3);
      expect(f.checklist.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("getFestivalById('mung-mot'): lunarDay=1, lunarMonth=null", () => {
    const f = getFestivalById("mung-mot");
    expect(f).toBeTruthy();
    // CONTRACT: truong phang tren FestivalContent, KHONG doc qua lunarDateSpec
    expect(f!.lunarDay).toBe(1);
    expect(f!.lunarMonth).toBeNull();
  });

  test("getFestivalByLunarDate(15, 1): tra ca ram-thang-gieng VA ram, specific len truoc", () => {
    const results = getFestivalByLunarDate(15, 1);
    const ids = results.map(r => r.id);
    // ram (lunarMonth:null, lunarDay:15) khop moi thang nen khop (15,1); ram-thang-gieng (15/1) cung khop.
    // Ca hai deu tra ve - song song voi AC #7. Sort specific-first nen phan tu dau la ram-thang-gieng.
    expect(ids).toContain("ram-thang-gieng");
    expect(ids).toContain("ram");
    expect(results[0].id).toBe("ram-thang-gieng");
  });

  test("getFestivalByLunarDate(1, 1): tra ca mung-mot va mung-mot-tet", () => {
    const results = getFestivalByLunarDate(1, 1);
    const ids = results.map(r => r.id);
    expect(ids).toContain("mung-mot");
    expect(ids).toContain("mung-mot-tet");
  });

  test("doan-ngo co 3 regionVariants (BAC, TRUNG, NAM)", () => {
    const f = getFestivalById("doan-ngo");
    expect(f!.regionVariants.length).toBe(3);
    const regions = f!.regionVariants.map(r => r.region);
    expect(regions).toContain("BAC");
    expect(regions).toContain("TRUNG");
    expect(regions).toContain("NAM");
  });

  test("thanh-minh va dam-gio-ca-nhan co lunarDay = null (truong phang)", () => {
    // CONTRACT: doc f.lunarDay truc tiep, KHONG qua lunarDateSpec
    expect(getFestivalById("thanh-minh")!.lunarDay).toBeNull();
    expect(getFestivalById("dam-gio-ca-nhan")!.lunarDay).toBeNull();
  });

  test("buildFestivalDateSet(2025) chua ngay Ram thang Gieng 2025 = 12/02/2025", () => {
    const set = buildFestivalDateSet(2025);
    expect(set.has("2025-02-12")).toBe(true);
  });

  test("buildFestivalDateSet(2025) chua Mung 1 Tet 2025 = 29/01/2025", () => {
    const set = buildFestivalDateSet(2025);
    expect(set.has("2025-01-29")).toBe(true);
  });

  test("Khong co network request trong moi ham content", () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    getAllFestivals();
    getFestivalById("mung-mot");
    getFestivalByLunarDate(15, 1);
    buildFestivalDateSet(2025);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
```

---

## §6 - Implementation skeleton

API contract ở §3 là skeleton đầy đủ. Điểm tricky nhất: `getFestivalByLunarDate` phải match Rằm hàng tháng (lunarMonth: null) cho MỌI tháng, nhưng khi `lunarMonth` đã có trong input, cả bản ghi Rằm hàng tháng lẫn Rằm tháng Giêng đều trả về khi query (15, 1) - UI layer phải biết ưu tiên hiển thị "Rằm tháng Giêng" vì nó specific hơn.

```typescript
// Rule giai quyet ambiguity trong getFestivalByLunarDate:
// Sap xep ket qua: specific (lunarMonth != null) len truoc, generic (lunarMonth = null) xuong sau.
// Dung truong phang f.lunarDay / f.lunarMonth (CONTRACT), KHONG doc qua f.lunarDateSpec.
// Return type la `readonly FestivalContent[]` theo CONTRACT.
export function getFestivalByLunarDate(lunarDay: number, lunarMonth: number): readonly FestivalContent[] {
  const results = FESTIVALS.filter(f => {
    if (f.lunarDay === null) return false;
    if (f.lunarDay !== lunarDay) return false;
    if (f.lunarMonth === null) return true;
    return f.lunarMonth === lunarMonth;
  });
  return results.slice().sort((a, b) => {
    const aSpec = a.lunarMonth !== null ? 0 : 1;
    const bSpec = b.lunarMonth !== null ? 0 : 1;
    return aSpec - bSpec;
  });
}
```

---

## §7 - Dependencies

Upstream: `FR-LUNAR-001` cung cấp `convertLunar2Solar` dùng trong `buildFestivalDateSet`; không có dependency khác vì data là tĩnh.

Downstream: `FR-LUNAR-015` (AI Genie) import `FestivalContent` để đưa vào system prompt Claude làm kiến thức nền phong tục; `FR-LUNAR-016` (Zalo Mini App) import cùng package để hiển thị trang chi tiết dịp từ nhắc ZNS.

Cross-cutting: `FR-LUNAR-007` dùng `buildFestivalDateSet` để tạo `Set<string>` tô chấm festival trên lưới lịch; `FR-LUNAR-006` (reminder management) dùng `FestivalContent.id` làm giá trị `linkedContentId` trong Reminder.

---

## §8 - Example payloads

```json
{
  "id": "vu-lan",
  "name": "Vu Lan / Rằm tháng Bảy",
  "lunarDay": 15,
  "lunarMonth": 7,
  "meaning": "Lễ Vu Lan báo hiếu và Xá tội vong nhân (cúng cô hồn) - được coi là \"mâm cúng lớn nhất năm\" trong nhiều gia đình Việt.",
  "offerings": [
    "Mâm cúng gia tiên: xôi, gà, hoa quả, hương đèn",
    "Mâm cúng chúng sinh/cô hồn: cháo loãng, gạo muối, bỏng ngô, khoai luộc, bánh kẹo, tiền vàng mã",
    "Phóng sinh (chim, cá) nếu có điều kiện",
    "Cơm chay"
  ],
  "checklist": [
    "Cúng gia tiên trước (mâm mặn hoặc chay)",
    "Cúng cô hồn/chúng sinh ngoài sân hoặc vỉa hè sau khi cúng gia tiên",
    "Đi chùa lễ Phật cầu siêu và báo hiếu cha mẹ",
    "Cài hoa hồng lên ngực (hồng đỏ = cha mẹ còn sống; hồng trắng = đã mất)"
  ],
  "celebrationTime": null,
  "regionVariants": [],
  "disclaimer": "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
}
```

```json
{
  "comment": "buildFestivalDateSet(2025) - mot so gia tri trong Set",
  "dates_sample": [
    "2025-01-29",
    "2025-02-12",
    "2025-02-27",
    "2025-01-10",
    "2025-01-22"
  ]
}
```

---

## §9 - Open questions

Đã giải quyết:
- Mô hình biến thể vùng miền: `regionVariants[]` trong cùng bản ghi (DEC-LUNAR-083); contract chỉ có `region` và `note` trong `regionVariants`, thông tin offerings theo vùng được gộp vào `note`.
- Thanh Minh: `lunarDay: null` và `lunarMonth: null` trên `FestivalContent` phẳng (CONTRACT); ghi chú logic tiết khí nằm trong code comment / implementation, không phải field public (DEC-LUNAR-082).
- Đám giỗ: bản ghi template với `lunarDay: null`, `lunarMonth: null`; Reminder riêng mang ngày thực tế (DEC-LUNAR-082).

Còn deferred:
- Bản tiếng Anh của nội dung: NFR-Localization yêu cầu kiến trúc i18n sẵn sàng cho tiếng Anh; deferred theo PRD §14 Phase 2 (hiện tại Vietnamese-first). Khi cần, thêm `name_en`, `meaning_en`, `offerings_en` vào `FestivalContent`.
- Nội dung văn khấn (bai van khan): PRD §7 không đưa vào scope nhưng người dùng có thể hỏi. Deferred sang FR-LUNAR-015 (AI Genie) trả lời linh hoạt.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Thieu ban ghi (< 13 festival) | Unit test `getAllFestivals().length` | Noi dung khong day du | Them ban ghi con thieu vao festivals.ts |
| Disclaimer bi bo rong hoac thieu | Unit test tat ca disclaimer | Vi pham DEC-LUNAR-081, rui ro phap ly | Them disclaimer cho ban ghi thieu |
| offerings hoac checklist rong | Unit test length >= 3/2 | Trang chi tiet hien thi trong rong | Bo sung noi dung bien tap |
| getFestivalByLunarDate(15,1) sap xep sai (ram dung truoc ram-thang-gieng) | Unit test AC #6 (`results[0].id`) | UI lam noi bat dip generic thay vi specific | Sort specific-first (lunarMonth != null len truoc) trong ham |
| buildFestivalDateSet tra sai ngay duong | Unit test voi fixture 2025 | To cham sai tren grid FR-007 | Debug convertLunar2Solar voi tz = 7.0 |
| lunarMonth:null cho Mung Mot/Ram bi xu ly sai trong buildFestivalDateSet | Unit test AC #13 (>= 24 entries) | Grid thieu cham thang | Kiem tra vong lap 1..12 trong buildFestivalDateSet |
| doan-ngo thieu 1 trong 3 regionVariants | Unit test regionVariants.length === 3 | UI chi hien thi 2 vung mien | Bo sung bien the con thieu |
| convertLunar2Solar tra sentinel [0,0,0] (nhuan khong khop / ngay 30 thang Chap 29 ngay) | Test boundary years + Giao thua | "0-0-0" key rac trong Set neu chi `if (solar)` (mang [0,0,0] la truthy) | Loc `dd !== 0` (destructure tuple), KHONG dua vao `if (solar)` |
| Network request trong content module | Jest fetch spy | Vi pham NFR-Offline | Xoa bat ky fetch nao; data phai static |
| Dam gio ca nhan hien thi nhu dip cu the (voi ngay am sai) | Unit test lunarDay === null | Bug logic reminder | Dam bao dam-gio khong duoc query boi getFestivalByLunarDate |

---

## §11 - Implementation notes

- Khi `buildFestivalDateSet` goi `convertLunar2Solar` cho Rằm/Mùng Một hàng tháng, phai destructure tuple `[dd, mm, yy]` (KHONG doc `.year` - ham tra mang, khong tra object) va kiem tra `yy === year` truoc khi add vao Set - mot so lan chuyển doi cuoi thang 12 am lich co the tra nam duong lich khac. Cờ nhuận truyen `0` (kieu `0 | 1`), khong phai `false`.
- `getFestivalByLunarDate` co the tra ca "Mùng Một hàng tháng" lẫn "Mùng 1 Tết" khi query (1, 1) - day la dung, khong phai bug. UI phai hien thi ca hai, voi ban ghi specific (lunarMonth co gia tri) hien thi noi bat hon.
- Ten dip va ten le vat trong `FestivalContent` giu nguyen tieng Viet co dau vi day la du lieu noi dung, khong phai code identifier - khong duoc latinh hoa nhu ContentId.
- `dam-gio-ca-nhan` la ban ghi template cung cap offerings va checklist mac dinh; khi nguoi dung nhap mot dam gio cu the, Reminder co `linkedContentId = "dam-gio-ca-nhan"` va UI them ten nguoi mat vao man hinh chi tiet.
- Package `packages/content` phai zero-dependency ngoai `@cyberskill/amlich-core`; khong import bat ky React, Next.js, hay framework nao - la pure TypeScript library dung duoc tren ca Zalo Mini App (FR-016).
- Khi can i18n, thay vi chen `name_en` vao FestivalContent (gay loi type), nen tao `FestivalContentI18n` extend type va giu backward compatibility.

*Hết FR-LUNAR-008.*
