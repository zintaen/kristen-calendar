---
id: FR-LUNAR-008
title: "Festival + ritual content database - 13 lunar occasions (meaning, offerings, checklist, regional variants), folk-custom reference label, link from reminders"
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
  - DEC-LUNAR-080 (all FestivalContent is static, edited-once data, no AI, no network; the AI Genie (FR-015) uses it only as context for prompting, does not replace it)
  - DEC-LUNAR-081 (every FestivalContent MUST carry a "reference by folk custom" label to avoid absolute spiritual claims, per the PRD Caveats)
  - DEC-LUNAR-082 (occasions with a fixed lunar date (for example 15/1, 10/1, 23/12) are encoded with lunarDay + lunarMonth; occasions without a fixed date (Thanh Minh, personal gio) are encoded with lunarDay = null and separate computation logic)
  - DEC-LUNAR-083 (North/Central/South regional variants are modeled as a RegionVariant[] array, not split into 3 separate records, to keep a single ID per occasion)
  - DEC-LUNAR-084 (linkedContentId on a Reminder points to FestivalContent.id; when showing a reminder, the app fetches the content by an O(1) lookup from map<id, FestivalContent>)
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
  - "calling the network to get festival content (violates DEC-LUNAR-080 / NFR-Offline)"
  - "using AI to generate festival content automatically (violates DEC-LUNAR-080 - must be edited by hand)"
effort_hours: 7
sub_tasks:
  - "1.0h: types.ts - define FestivalContent, RegionVariant, LunarDateSpec, ContentId"
  - "2.5h: festivals.ts - encode all 13 records for 13 occasions (memorized data, cross-checked against PRD §7)"
  - "0.5h: index.ts - export getFestivalById, getFestivalByLunarDate, getAllFestivals, buildFestivalDateSet"
  - "1.0h: unit tests - 13 occasions present, reference label, offerings not empty, link logic correct"
  - "1.0h: the buildFestivalDateSet(year) function returns a Set<string> of YYYY-MM-DD solar dates for a specific year (used with FR-007)"
  - "1.0h: check North/Central/South regional variants in the data (Doan Ngo has 3 variants)"
risk_if_skipped: "FR-LUNAR-015 (AI Genie) uses FestivalContent as context for the Claude prompt; without the static data, the Genie has no grounding knowledge of customs. FR-LUNAR-016 (Zalo Mini App) needs FestivalContent to show the detail page from a ZNS reminder."
---

## §1 - Description (BCP-14 normative)

This module **MUST** provide the static content database for 13 Vietnamese lunar occasions, edited and ready to use offline throughout the codebase.

1. **MUST** encode all 13 `FestivalContent` records for the following 13 occasions, exactly per the PRD §7 table data (FR-D01): monthly Mung Mot, monthly Ram, Giao thua, first day of Tet, Ong Cong Ong Tao, Ram of the first lunar month, Via Than Tai, Tet Thanh Minh, Gio To Hung Vuong, Tet Doan Ngo, Vu Lan/Ram of the seventh lunar month, Tet Trung Thu, and the personal death anniversary (DEC-LUNAR-080).
2. **MUST** attach the "reference by folk custom" label to each `FestivalContent` record via the field `disclaimer: string` with a standard value, missing none of them (DEC-LUNAR-081, PRD §7 content note).
3. **MUST** encode the correct `lunarDay` and `lunarMonth` for each occasion with a fixed lunar date; for Tet Thanh Minh (around the 3rd lunar month but not on a fixed exact day) and the personal death anniversary (entered by the user), it **MUST** leave `lunarDay: null` and note the separate computation logic in the `dateNote` field (DEC-LUNAR-082).
4. **MUST** encode North/Central/South regional variants for occasions that differ (at least Tet Doan Ngo 5/5 lunar has 3 variants) as a `regionVariants: RegionVariant[]` array attached in the same record, not split into separate records (DEC-LUNAR-083).
5. **MUST** provide the function `getFestivalById(id: ContentId): FestivalContent | undefined` to look up by ID.
6. **MUST** provide the function `getFestivalByLunarDate(lunarDay: number, lunarMonth: number): FestivalContent[]` to find occasions matching the given lunar date; returns an empty array if none.
7. **MUST** provide the function `getAllFestivals(): FestivalContent[]` returning all 13 records.
8. **MUST** provide the function `buildFestivalDateSet(year: number): Set<string>` that takes a solar year, computes the corresponding solar date for every occasion with a fixed lunar date in that year using `convertLunar2Solar` from `amlich-core`, and returns a `Set<string>` of "YYYY-MM-DD" for FR-LUNAR-007 to paint the calendar dots (DEC-LUNAR-084).
9. **MUST** ensure each record has a non-empty `offerings: string[]` - at least 3 suggested offerings per PRD §7.
10. **MUST** ensure each record has a non-empty `checklist: string[]` - at least 2 things to do before/on the day.
11. **MUST** keep the occasion names, offering names, and region names in standard Vietnamese with diacritics, not latinized in the data fields (only code and type names use ASCII).
12. **MUST** ensure monthly Mung Mot has `lunarDay: 1` and `lunarMonth: null` (recurs every month); monthly Ram has `lunarDay: 15` and `lunarMonth: null` - distinct from Ram of the first lunar month (15/1 lunar), which is its own record.
13. **MUST NOT** call the network to fetch or update festival content (DEC-LUNAR-080, NFR-Offline); all data must reside in the source file compiled with the app.
14. **SHOULD** have a `meaning: string` field describing the meaning in at least one full sentence per occasion, taken from the PRD §7 "Meaning" column.
15. **SHOULD** provide a `celebrationTime: string | null` field describing the ideal ritual time when PRD §7 notes it (Mung Mot/Ong Cong Ong Tao: before noon; Doan Ngo: the gio hour, 11-13h).

---

## §2 - Why this design (rationale for humans)

**Why static data, no AI (DEC-LUNAR-080)?** The offering trays and meanings of occasions are stable knowledge, edited once and used forever. Using runtime AI to generate them each time adds latency, costs money, and creates the risk of generating wrong information. The AI Genie (FR-LUNAR-015) uses this same data as context to answer flexible questions - the two roles complement each other.

**Why require the "reference by folk custom" label (DEC-LUNAR-081)?** PRD §7 states clearly that this label must be attached and that "absolute spiritual claims" must be avoided. This is both a product requirement and risk management: people in the North/Central/South observe differently, and there is no "single correct offering tray".

**Why `lunarDay: null` for Thanh Minh and the death anniversary (DEC-LUNAR-082)?** Thanh Minh falls around the 3rd lunar month but its exact day is computed from a solar term (the Thanh Minh term), not a fixed lunar date. The death anniversary is the passing date of a relative, entered by the user through a Reminder. Forcing both into `lunarDay: number` would be semantically wrong and cause bugs when using `getFestivalByLunarDate`.

**Why are regional variants an array in the same record (DEC-LUNAR-083)?** If Doan Ngo were split into 3 records for North/Central/South, `getFestivalByLunarDate(5, 5)` would return 3 results and the UI would have to choose which to show. Combining them into one record with `regionVariants[]` lets the UI show all 3 variants on one detail screen, and `linkedContentId` in a Reminder only needs to point to a single ID.

**Why does `buildFestivalDateSet` need to call `convertLunar2Solar` (DEC-LUNAR-084)?** The solar date of Ram of the first lunar month in 2025 is 12/02/2025, and 2026 is different. It cannot be hardcoded. This function is the bridge between the static data (fixed lunar date) and the dynamic calendar grid (FR-LUNAR-007 needs a `Set<string>` of solar dates).

**Why a separate `checklist` in addition to `offerings`?** Offerings is a list of offering items (nouns); the checklist is a list of things to do (verbs, for example "Buy yellow chrysanthemums a day ahead", "Release the live carp into the river"). Separating the two fields lets FR-LUNAR-015 (AI Genie) quote the checklist when the user asks "What do I need to prepare?" and the offerings when they ask "What do I offer?".

**Why depend on FR-LUNAR-001?** `buildFestivalDateSet` calls `convertLunar2Solar` from `amlich-core`. All solar-date computation must go through the verified core engine; the solar date must not be hardcoded.

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

1. `getAllFestivals()` returns exactly 13 records, each with an `id` of type `ContentId`.
2. Each of the 13 records has a non-empty `disclaimer` containing the string "tham khao theo phong tuc dan gian" (case-insensitive) (DEC-LUNAR-081).
3. Each record has `offerings.length >= 3` and `checklist.length >= 2`.
4. `getFestivalById("mung-mot")` returns the Mung Mot record with `lunarDay === 1` and `lunarMonth === null`.
5. `getFestivalById("ram")` returns the Ram record with `lunarDay === 15` and `lunarMonth === null`.
6. `getFestivalByLunarDate(15, 1)` returns BOTH the Ram of the first lunar month record (id = "ram-thang-gieng") AND the monthly Ram record (id = "ram") - because both match day 15 (ram has `lunarMonth: null` matching every month); the result **MUST** be sorted specific-first, so `results[0].id === "ram-thang-gieng"` (see §6, §11). This is correct behavior, parallel to AC #7; the UI shows the specific record more prominently.
7. `getFestivalByLunarDate(1, 1)` returns the first-day-of-Tet record (id = "mung-mot-tet") and the monthly Mung Mot record (id = "mung-mot") - both, because day 1 of month 1 matches both rules.
8. `getFestivalByLunarDate(15, 7)` returns the Vu Lan record (id = "vu-lan").
9. The Tet Doan Ngo record (id = "doan-ngo") has `regionVariants.length === 3` with the 3 regions BAC, TRUNG, NAM.
10. The Tet Thanh Minh record (id = "thanh-minh") and the personal death anniversary record (id = "dam-gio-ca-nhan") have `lunarDay === null`.
11. `getFestivalByLunarDate(5, 5)` returns the Tet Doan Ngo record; `getFestivalByLunarDate(10, 3)` returns the Gio To Hung Vuong record.
12. `buildFestivalDateSet(2025)` returns a Set containing "2025-02-12" (Ram of the first lunar month 15/1 lunar 2025) and "2025-01-29" (first day of Tet 1/1 lunar 2025).
13. `buildFestivalDateSet(2025)` contains at least 24 entries (12 Mung Mot + 12 monthly Ram) plus the fixed occasions.
14. No network request in any function of the content module (checked with mock fetch in the test).
15. `getFestivalById("dam-gio-ca-nhan")` returns the record with `lunarDay === null` and `lunarMonth === null`, confirming this is an occasion whose date the user enters via a Reminder.

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

The API contract in §3 is a full skeleton. The trickiest point: `getFestivalByLunarDate` must match monthly Ram (lunarMonth: null) for EVERY month, but when `lunarMonth` is present in the input, both the monthly Ram record and the Ram of the first lunar month record are returned when querying (15, 1) - the UI layer must know to prioritize showing "Ram of the first lunar month" because it is more specific.

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

Upstream: `FR-LUNAR-001` provides `convertLunar2Solar` used in `buildFestivalDateSet`; no other dependency because the data is static.

Downstream: `FR-LUNAR-015` (AI Genie) imports `FestivalContent` to feed into the Claude system prompt as grounding knowledge of customs; `FR-LUNAR-016` (Zalo Mini App) imports the same package to show the occasion detail page from a ZNS reminder.

Cross-cutting: `FR-LUNAR-007` uses `buildFestivalDateSet` to create the `Set<string>` for painting festival dots on the calendar grid; `FR-LUNAR-006` (reminder management) uses `FestivalContent.id` as the `linkedContentId` value in a Reminder.

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

Resolved:
- Regional variant model: `regionVariants[]` in the same record (DEC-LUNAR-083); the contract has only `region` and `note` in `regionVariants`, with region-specific offering information merged into `note`.
- Thanh Minh: `lunarDay: null` and `lunarMonth: null` on the flat `FestivalContent` (CONTRACT); the solar-term logic note lives in a code comment / implementation, not a public field (DEC-LUNAR-082).
- Death anniversary: a template record with `lunarDay: null`, `lunarMonth: null`; the individual Reminder carries the actual date (DEC-LUNAR-082).

Still deferred:
- English version of the content: NFR-Localization requires an i18n architecture ready for English; deferred per PRD §14 Phase 2 (currently Vietnamese-first). When needed, add `name_en`, `meaning_en`, `offerings_en` to `FestivalContent`.
- Ceremonial prayer text (van khan): PRD §7 does not put it in scope but users may ask. Deferred to FR-LUNAR-015 (AI Genie) to answer flexibly.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Missing records (< 13 festivals) | Unit test `getAllFestivals().length` | Content incomplete | Add the missing records to festivals.ts |
| Disclaimer left empty or missing | Unit test on all disclaimers | Violates DEC-LUNAR-081, legal risk | Add the disclaimer for the missing records |
| offerings or checklist empty | Unit test length >= 3/2 | Detail page shows empty | Add the edited content |
| getFestivalByLunarDate(15,1) sorted wrong (ram before ram-thang-gieng) | Unit test AC #6 (`results[0].id`) | UI highlights the generic occasion instead of the specific one | Sort specific-first (lunarMonth != null first) in the function |
| buildFestivalDateSet returns the wrong solar date | Unit test with 2025 fixture | Wrong dots on the FR-007 grid | Debug convertLunar2Solar with tz = 7.0 |
| lunarMonth:null for Mung Mot/Ram mishandled in buildFestivalDateSet | Unit test AC #13 (>= 24 entries) | Grid missing monthly dots | Check the 1..12 loop in buildFestivalDateSet |
| doan-ngo missing 1 of the 3 regionVariants | Unit test regionVariants.length === 3 | UI shows only 2 regions | Add the missing variant |
| convertLunar2Solar returns sentinel [0,0,0] (leap mismatch / day 30 of a 29-day 12th month) | Test boundary years + Giao thua | "0-0-0" garbage key in the Set if only `if (solar)` (the array [0,0,0] is truthy) | Filter `dd !== 0` (destructure the tuple), do NOT rely on `if (solar)` |
| Network request in the content module | Jest fetch spy | Violates NFR-Offline | Remove any fetch; the data must be static |
| Personal death anniversary shown as a specific occasion (with the wrong lunar date) | Unit test lunarDay === null | Reminder logic bug | Ensure dam-gio is not queried by getFestivalByLunarDate |

---

## §11 - Implementation notes

- When `buildFestivalDateSet` calls `convertLunar2Solar` for monthly Ram/Mung Mot, it must destructure the tuple `[dd, mm, yy]` (do NOT read `.year` - the function returns an array, not an object) and check `yy === year` before adding to the Set - some conversions at the end of the 12th lunar month can return a different solar year. The leap flag is passed as `0` (type `0 | 1`), not `false`.
- `getFestivalByLunarDate` can return both "monthly Mung Mot" and "first day of Tet" when querying (1, 1) - this is correct, not a bug. The UI must show both, with the specific record (lunarMonth having a value) shown more prominently.
- The occasion names and offering names in `FestivalContent` stay in Vietnamese with diacritics because this is content data, not a code identifier - it must not be latinized like ContentId.
- `dam-gio-ca-nhan` is a template record providing default offerings and checklist; when the user enters a specific death anniversary, the Reminder has `linkedContentId = "dam-gio-ca-nhan"` and the UI adds the deceased's name to the detail screen.
- The `packages/content` package must be zero-dependency except for `@cyberskill/amlich-core`; do not import any React, Next.js, or framework - it is a pure TypeScript library usable even on the Zalo Mini App (FR-016).
- When i18n is needed, instead of inserting `name_en` into FestivalContent (which causes a type error), create a `FestivalContentI18n` extended type and keep backward compatibility.

*End of FR-LUNAR-008.*
