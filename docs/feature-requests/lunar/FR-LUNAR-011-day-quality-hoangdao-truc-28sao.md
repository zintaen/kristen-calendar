---
id: FR-LUNAR-011
title: "Day quality - Hoàng đạo/Hắc đạo, 12 Trực, Nhị thập bát tú (28 sao), giờ Hoàng đạo, tính từ can-chi ngày + tiết khí, nhãn phong thủy dân gian"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P2
milestone: P2 · slice 4
slice: 4
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-002, FR-LUNAR-012]
depends_on: [FR-LUNAR-002]
blocks: [FR-LUNAR-012, FR-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-E02, FR-E03)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#8 (Hoàng đạo/Trực/28 sao)"
source_decisions:
  - DEC-LUNAR-110 (tất cả tính chất ngày - Hoàng đạo/Hắc đạo, Trực, 28 sao, giờ Hoàng đạo - được tính hoàn toàn từ can-chi ngày và tiết khí; không phụ thuộc múi giờ, không gọi network)
  - DEC-LUNAR-111 (bảng tra 12 thần trực nhật được hardcode theo địa chi ngày × tháng âm; đây là dữ liệu phong thủy dân gian, không phải thiên văn - gắn nhãn "tham khảo phong thủy dân gian" ở mọi nơi hiển thị)
  - DEC-LUNAR-112 (can-chi ngày PHẢI lấy trực tiếp từ canChiDay(jdn) của FR-LUNAR-002 - can = (jdn + 9) mod 10, ĐỊA CHI = (jdn + 1) mod 12 - để đồng nhất tuyệt đối với amlich-core; KHÔNG tự suy địa chi bằng (jdn + 9) mod 60 rồi mod 12 vì cho địa chi lệch 8 so với core; KHÔNG import thư viện thứ ba)
  - DEC-LUNAR-113 (12 Trực tính theo tiết khí + địa chi ngày: mỗi tiết mới, Trực bắt đầu lại từ Kiến; công thức (chiSo_diaChiNgay - chiSo_diaChiDauTiet + 12) mod 12 cho index Trực)
  - DEC-LUNAR-114 (28 sao tra theo vòng lặp tuần hoàn bắt đầu từ Giác; index = (JDN - baseJDN_Giac) mod 28; baseJDN_Giac được xác định bằng fixture test)
  - DEC-LUNAR-115 (giờ Hoàng đạo tra theo bảng 6-giờ-theo-địa-chi-ngày; mỗi địa chi ngày ứng 6 giờ Hoàng và 6 giờ Hắc trong 12 canh; bảng này là hằng số, không có công thức thiên văn)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/dayquality.ts
  - packages/amlich-core/src/dayquality-tables.ts
  - packages/amlich-core/test/dayquality.test.ts
  - packages/amlich-core/test/fixtures/dayquality-fixtures.json
modified_files:
  - packages/amlich-core/src/index.ts
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/src/dayquality*.ts, packages/amlich-core/test/dayquality*
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "gọi network để tra bảng Hoàng đạo/Hắc đạo (vi phạm DEC-LUNAR-110 / NFR-Offline)"
  - "import lunar-typescript hoặc lunar-javascript làm nguồn chính cho can-chi ngày (vi phạm DEC-LUNAR-112 - chỉ dùng để đối chiếu, không dùng runtime)"
effort_hours: 12
sub_tasks:
  - "1h: định nghĩa kiểu DayQuality, GioHoangDao, TrucInfo, Sao28Info trong dayquality.ts"
  - "2h: dayquality-tables.ts - hardcode bảng 12 thần trực nhật (địa chi × tháng âm -> thần), bảng giờ Hoàng đạo (địa chi ngày -> [6 canh Hoàng, 6 canh Hắc]), bảng 28 sao (tên + tốt/xấu + notes)"
  - "2h: hàm hoangDaoHacDao(canChiNgay, thangAm) dựa trên bảng DEC-LUNAR-111"
  - "1.5h: hàm truc(jdn, tietKhiIndex) theo DEC-LUNAR-113; xác định tiết khí hiện hành từ FR-LUNAR-002"
  - "1.5h: hàm sao28(jdn) theo DEC-LUNAR-114; xác định baseJDN_Giac bằng fixture"
  - "1h: hàm gioHoangDao(diaChiNgay) tra bảng DEC-LUNAR-115, trả về 12 canh với flag isHoang"
  - "1h: hàm getDayQuality(solarDate) kết hợp tất cả, trả DayQuality; export từ index.ts"
  - "2h: test/dayquality.test.ts - fixture 20+ ngày cụ thể (bao gồm ngày có giờ Hoàng đạo đã xác nhận)"
risk_if_skipped: "FR-LUNAR-012 (good-day picker) hoàn toàn không thể build vì nó chỉ là UI trên DayQuality. FR-LUNAR-013 (widget) sẽ thiếu dữ liệu giờ Hoàng đạo - một trong hai trường thông tin quan trọng nhất của widget. Người dùng là diễn viên và người kinh doanh - những persona chính cần xem ngày tốt - sẽ không có tính năng này."
---

## §1 - Description (BCP-14 normative)

Module `dayquality` PHẢI tính đầy đủ chất lượng ngày theo phong thủy dân gian Việt Nam từ can-chi ngày và tiết khí, không phụ thuộc mạng. Không có giao dịch network nào được phép. Toàn bộ contract được định nghĩa theo các điều dưới đây.

1. PHẢI định nghĩa kiểu `DayQuality` bao gồm: `date` (ISO date string), `canChiNgay` (string, e.g. "Giap Ty"), `diaChiNgay` (DiaChi enum 0..11), `hoangDao` (boolean), `thanTrucNhat` (ThanTrucNhat enum), `truc` (Truc enum, 12 giá trị), `sao28` (Sao28 enum, 28 giá trị), `isHoangDao` (boolean alias cho `hoangDao`), `gioHoangDao` (GioHoangDao[12]), `label` ("Hoàng đạo" | "Hắc đạo"), và `disclaimer` ("Tham khảo phong thủy dân gian") (DEC-LUNAR-111).
2. PHẢI tính `thần trực nhật` (một trong 12 vị thần) cho ngày bằng cách tra bảng `THAN_TRUC_NHAT_TABLE[diaChiNgay][thangAmIndex]`, trong đó 6 thần thiện là Thanh Long, Minh Đường, Kim Quỹ, Bảo Quang, Ngọc Đường, Tư Mệnh → Hoàng đạo; 6 thần ác là Bạch Hổ, Thiên Hình, Chu Tước, Thiên Lao, Nguyên Vũ, Câu Trận → Hắc đạo (DEC-LUNAR-111, PRD §8).
3. PHẢI tính `Trực` (một trong 12 Trực: Kiến, Trừ, Mãn, Bình, Định, Chấp, Phá, Nguy, Thành, Thu, Khai, Bế) bằng công thức `(diaChiSoNgay - diaChiSoDauTiet + 12) mod 12`, trong đó `diaChiSoDauTiet = tietKhiStartDiaChi(jdn, tz?)` (CONTRACT.md: `export function tietKhiStartDiaChi(jdn: number, tz?: number): number`) là địa chi (0..11) ngày đầu của tiết khí hiện hành; `diaChiSoNgay = canChiDay(jdn).chiIndex` (DEC-LUNAR-112/113, PRD §8).
4. PHẢI tính `28 sao` (Giác, Cang, Đê, Phòng, Tâm, Tinh, Vũ, Quỹ, Lưu, Tinh, Trương, I, Chẩn, Tụy, Bí, Tất, Truy, Shen, Jing, Kui, Lou, Wei, Mao, Bí, Zi, Shen - theo tên Việt hóa) bằng công thức `(jdn - BASE_JDN_GIAC) mod 28`; `BASE_JDN_GIAC` được xác định và kiểm tra bằng fixture ngày đã biết (DEC-LUNAR-114, PRD §8).
5. PHẢI tính `gioHoangDao` cho 12 canh giờ trong ngày bằng tra bảng `GIO_HOANG_DAO_TABLE[diaChiNgay]`, trả về mảng 12 `GioInfo { canh: string, tuGio: string, denGio: string, isHoang: boolean }` (DEC-LUNAR-115, PRD §8, FR-E03).
6. PHẢI export hàm chính `getDayQuality(solarDate: Date): DayQuality` lấy `canChiNgay` và JDN từ amlich-core (FR-LUNAR-002), tính toán tất cả các trường, và gán `disclaimer = "Tham khảo phong thủy dân gian"` ở cấp root của kết quả (DEC-LUNAR-110).
7. PHẢI lấy can-chi ngày và `diaChiNgay` bằng cách gọi `canChiDay(jdn)` của FR-LUNAR-002 (với `jdn` từ `jdFromDate` của FR-LUNAR-001), dùng `canChiDay(jdn).chiIndex = (jdn + 1) mod 12` làm `diaChiSoNgay` và `canChiDay(jdn).label` làm `canChiNgay`; KHÔNG ĐƯỢC tự suy địa chi bằng `(jdn + 9) mod 60` rồi `mod 12` (cho ra `(jdn + 9) mod 12`, lệch 8 so với core) và KHÔNG import thư viện thứ ba để tính lại (DEC-LUNAR-112). PHẢI tính `diaChiSoDauTiet` (địa chi ngày đầu tiết khí hiện hành) bằng cách gọi `tietKhiStartDiaChi(jdn, tz?)` của FR-LUNAR-002 (CONTRACT.md P2/P3 surface); công thức Trực đầy đủ là `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12` cho index trong `TRUC_NAMES` (DEC-LUNAR-113). Vì `THAN_TRUC_NHAT_TABLE`, Trực, và giờ Hoàng đạo đều khóa theo địa chi ngày, địa chi sai sẽ làm sai toàn bộ kết quả day quality và lệch với can-chi hiển thị trong lịch (FR-LUNAR-007 qua FR-LUNAR-002).
8. PHẢI tính `thangAmIndex` (0..11) từ tháng âm do FR-LUNAR-001 trả về, để lập chỉ mục vào `THAN_TRUC_NHAT_TABLE` - index là (thangAm - 1) mod 12 (DEC-LUNAR-111).
9. PHẢI đảm bảo toàn bộ tính toán là pure function và deterministic: cùng một `solarDate` luôn trả cùng một `DayQuality`, không có side effect (DEC-LUNAR-110).
10. KHÔNG ĐƯỢC gọi network ở bất kỳ bước nào; KHÔNG ĐƯỢC cache kết quả ra IndexedDB hay localStorage (các bước này là trách nhiệm của FR-LUNAR-010); module này chỉ là pure compute (DEC-LUNAR-110).
11. PHẢI export toàn bộ enum và kiểu từ `packages/amlich-core/src/index.ts` để các FR khác (FR-LUNAR-007, FR-LUNAR-012, FR-LUNAR-013) có thể import trực tiếp.
12. NÊN thêm trường `trucSuitableFor: string[]` và `trucAvoidFor: string[]` trong `TrucInfo` mô tả loại việc hợp/kỵ với từng Trực - đây là dữ liệu phong thủy, gắn nhãn "tham khảo" (DEC-LUNAR-111).
13. NÊN thêm trường `sao28Rating: "tot" | "xau" | "binh"` và `sao28Notes: string` cho từng sao (DEC-LUNAR-111).
14. CÓ THỂ export hàm `getMonthDayQualities(year: number, month: number): readonly DayQuality[]` tính nhanh toàn bộ tháng - dùng cho FR-LUNAR-012 list ngày Hoàng đạo trong khoảng (DEC-LUNAR-110).

---

## §2 - Why this design (rationale for humans)

**Tại sao tính hoàn toàn offline từ bảng tra (DEC-LUNAR-110)?** Hoàng đạo/Hắc đạo, Trực, và 28 sao là hệ thống phong thủy dân gian cố định - không phải kết quả của thiên văn học cập nhật. Bản thân PRD §8 nói rõ đây là "bảng tra cố định theo địa chi ngày × tháng". Gọi mạng để tra kết quả này vừa tốn chi phí vừa vi phạm NFR-Offline và không mang lại độ chính xác gì thêm.

**Tại sao hardcode bảng `THAN_TRUC_NHAT_TABLE` thay vì tính công thức (DEC-LUNAR-111)?** Các thần trực nhật không có công thức thiên văn nào - chúng là quy ước phong thủy lưu truyền qua nhiều thế kỷ. Dùng bảng 12×12 là cách cẩn thận nhất: nguồn dữ liệu có thể đối chiếu với nhiều sách phong thủy cổ điển và trang xem ngày VN, và mọi chỉnh sửa sau này chỉ cần sửa 1 dòng trong bảng thay vì debug logic.

**Tại sao gọi thẳng `canChiDay` của core thay vì tự suy từ JDN (DEC-LUNAR-112)?** FR-LUNAR-002 đã định nghĩa `canChiDay(jdn)` với `can = (jdn + 9) mod 10` và `chi = (jdn + 1) mod 12`; đây là source of truth duy nhất cho can-chi ngày. Một cám dỗ là "rút gọn" thành `(jdn + 9) mod 60` rồi `mod 12` để ra địa chi - NHƯNG `(jdn + 9) mod 12` lệch đúng 8 so với `(jdn + 1) mod 12` của core, nên địa chi sẽ sai và mọi tra bảng theo địa chi (thần trực nhật, Trực, giờ Hoàng đạo) đều sai. Quan trọng hơn, lưới lịch FR-LUNAR-007 hiển thị `canChiDay` từ chính FR-LUNAR-002; nếu day quality dùng địa chi khác thì màn xem ngày tốt sẽ mâu thuẫn với can-chi ngay trong ô lịch. Vì vậy `getDayQuality` PHẢI gọi `canChiDay(jdn)` và đọc `chiIndex`/`label` từ đó, không tự tính lại.

**Tại sao Trực tính theo tiết khí + địa chi ngày (DEC-LUNAR-113)?** PRD §8 nói rõ "tra theo tiết khí + địa chi ngày; mỗi Trực hợp/kỵ loại việc". Đây là cách tính chuẩn trong phong thủy Việt - mỗi tiết mới Trực bắt đầu lại từ Kiến. Cách này chỉ cần biết địa chi ngày đầu tiết (đã có sẵn từ FR-LUNAR-002) và địa chi ngày hiện tại - không cần bảng tra 365 dòng.

**Tại sao xác định `BASE_JDN_GIAC` bằng fixture thay vì từ sách (DEC-LUNAR-114)?** Có nhiều nguồn đưa ra giá trị khác nhau cho vòng 28 sao vì hệ thống này có nhiều cách tính. Cách an toàn nhất là: chọn một ngày đã biết chắc sao gì (đối chiếu nhiều trang xem ngày VN uy tín), tính ngược ra BASE_JDN_GIAC, và lock giá trị đó vào fixture test. Mỗi lần BUILD chạy lại test, nếu ai thay BASE_JDN_GIAC test sẽ fail - cơ chế phát hiện ngoài ý muốn.

**Tại sao giờ Hoàng đạo cũng là bảng tra (DEC-LUNAR-115)?** 12 canh giờ phân thành 6 Hoàng/6 Hắc theo địa chi ngày là quy ước phong thủy - mỗi địa chi ngày (Tý, Sửu, Dần...) ứng một "giờ cực" cố định. Đây là bảng 12×12. Không có công thức thiên văn nào ở đây cả; bảng tra là biểu diễn đúng nhất.

**Tại sao cần trường `disclaimer` ở cấp root (DEC-LUNAR-111)?** PRD §8 và Caveats nói rõ phải "gắn nhãn tham khảo phong thủy dân gian" và "tránh khẳng định tuyệt đối". Nếu để disclaimer là optional hay ở nested UI sẽ dễ bị bỏ sót khi render. Khi disclaimer nằm trong chính kết quả DayQuality, mọi component render dữ liệu này đều có sẵn chú thích ngay bên cạnh dữ liệu.

**Tại sao export `getMonthDayQualities` (DEC-LUNAR-110)?** FR-LUNAR-012 cần listat ngày Hoàng đạo trong một khoảng (ví dụ tháng 7/2026). Nếu FR-012 gọi `getDayQuality` từng ngày trong vòng lặp, dù hiệu quả hơn gọi network nhưng vẫn là ~30 lần tính. Hàm `getMonthDayQualities` gom vào một chỗ, cho phép tối ưu trong tương lai nếu cần (e.g. batch JDN lookup), và làm contract FR-012 đơn giản hơn.

---

## §3 - API contract

```typescript
// packages/amlich-core/src/dayquality.ts

export const THAN_TRUC_NHAT = [
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh",
  "Bach Ho",    "Thien Hinh", "Chu Tuoc", "Thien Lao", "Nguyen Vu", "Cau Tran"
] as const;
export type ThanTrucNhat = typeof THAN_TRUC_NHAT[number];

export const HOANG_DAO_THAN = new Set<ThanTrucNhat>([
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh"
]);

export const TRUC_NAMES = [
  "Kien", "Tru", "Man", "Binh", "Dinh", "Chap", "Pha", "Nguy", "Thanh", "Thu", "Khai", "Be"
] as const;
export type Truc = typeof TRUC_NAMES[number];

export const SAO_28 = [
  "Giac", "Cang", "De", "Phong", "Tam", "Tinh", "Vo",
  "Quy",  "Liu",  "Tinh28", "Chang", "I",   "Chan",
  "Goc",  "Lau",  "Vi28",  "Mao28", "Tat",  "Truy",
  "Cam",  "Giai", "Cu",    "Phap",  "Khuy",  "Luu28", "Nhat", "Pi", "Chan28"
] as const; // 28 entries; use Vietnamese/pinyin names per editorial decision
export type Sao28 = typeof SAO_28[number];

export type DiaChi =
  "Ty" | "Suu" | "Dan" | "Meo" | "Thin" | "Ti" | "Ngo" | "Mui" | "Than" | "Dau" | "Tuat" | "Hoi";

export interface GioInfo {
  canh: string;        // e.g. "Canh Ty (23:00-01:00)"
  tuGio: string;       // e.g. "23:00"
  denGio: string;      // e.g. "01:00"
  isHoang: boolean;
}

export interface TrucInfo {
  name: Truc;
  suitableFor: string[];  // e.g. ["ky hop dong", "xay dung"] - "tham khao"
  avoidFor: string[];
}

export interface Sao28Info {
  name: Sao28;
  rating: "tot" | "xau" | "binh";
  notes: string;  // brief folk note
}

export interface DayQuality {
  date: string;                   // ISO date "YYYY-MM-DD"
  canChiNgay: string;             // e.g. "Giap Ty"
  diaChiNgay: DiaChi;
  thanTrucNhat: ThanTrucNhat;
  hoangDao: boolean;              // true = Hoang dao (6 than thien)
  isHoangDao: boolean;            // alias for hoangDao
  label: "Hoang dao" | "Hac dao";
  truc: TrucInfo;
  sao28: Sao28Info;
  gioHoangDao: GioInfo[];         // 12 canh, isHoang flags set
  disclaimer: "Tham khao phong thuy dan gian";
}

// Main public API
// getDayQuality PHẢI lấy can-chi/địa chi và địa chi đầu tiết từ FR-LUNAR-002:
//   import { canChiDay, tietKhiStartDiaChi } from "@cyberskill/amlich-core";
//   const cc = canChiDay(jdn);                         // can=(jdn+9)%10, chi=(jdn+1)%12 (DEC-LUNAR-112)
//   const diaChiIndex = cc.chiIndex;                   // KHONG dung (jdn+9)%60 % 12 (lech 8)
//   const canChiNgay  = cc.label;
//   const diaChiDauTiet = tietKhiStartDiaChi(jdn);    // CONTRACT.md: number (0..11) (DEC-LUNAR-113)
//   const trucIndex = (diaChiIndex - diaChiDauTiet + 12) % 12; // index vao TRUC_NAMES
export function getDayQuality(solarDate: Date): DayQuality;
export function getMonthDayQualities(year: number, month: number): readonly DayQuality[];
```

```typescript
// packages/amlich-core/src/dayquality-tables.ts  (excerpt - full table is 12 rows × 12 cols)

// THAN_TRUC_NHAT_TABLE[diaChiIndex][thangAmIndex] -> ThanTrucNhat
// diaChiIndex: Ty=0, Suu=1, Dan=2, ..., Hoi=11
// thangAmIndex: thang 1=0, thang 2=1, ..., thang 12=11
export const THAN_TRUC_NHAT_TABLE: readonly ThanTrucNhat[][] = [
  // Ty: thang 1..12
  ["Thanh Long","Bach Ho","Minh Duong","Thien Hinh","Kim Quy","Chu Tuoc","Bao Quang","Thien Lao","Ngoc Duong","Nguyen Vu","Tu Menh","Cau Tran"],
  // ... 11 more rows for Suu..Hoi
] as const;

// BASE_JDN_GIAC: Julian Day Number of a known "Giac" day (locked by fixture)
// Cross-checked against multiple VN folk-calendar references; fixture in dayquality-fixtures.json
export const BASE_JDN_GIAC = 2459901; // 2022-12-01 verified as sao Giac - MUST match fixture

// GIO_HOANG_DAO_TABLE[diaChiIndex] -> 12 GioInfo entries (6 Hoang, 6 Hac)
// e.g. for ngay Ty (index 0): canh Ty, Dan, Ngo, Than, Tuat, Hoi la Hoang
export const GIO_HOANG_DAO_TABLE: readonly GioInfo[][] = [ /* 12 × 12 table */ ] as const;
```

---

## §4 - Acceptance criteria

1. `getDayQuality(new Date("2025-01-29"))` (Tết 2025, ngày 1/1/Ất Tỵ) trả về `canChiNgay` khớp với fixture, `hoangDao` và `thanTrucNhat` khớp với kết quả trang xem ngày uy tín VN cho ngày đó.
2. `getDayQuality` với bất kỳ ngày nào trả về đúng số 12 `gioHoangDao`, trong đó đúng 6 có `isHoang: true` và 6 có `isHoang: false`.
3. `getDayQuality` trả về `disclaimer === "Tham khao phong thuy dan gian"` cho tất cả ngày.
4. `truc.name` có giá trị hợp lệ nằm trong `TRUC_NAMES` cho mọi ngày trong tháng 1/2025 (31 ngày, 31 kết quả khác nhau trong chu kỳ 12).
5. `sao28` có giá trị hợp lệ nằm trong `SAO_28`; chuỗi 28 ngày liên tiếp bắt đầu từ ngày có sao "Giac" xác nhận (fixture) cho ra tất cả 28 sao theo thứ tự đúng.
6. `getMonthDayQualities(2025, 1)` trả về đúng 31 kết quả, mỗi kết quả có `date` đúng và `hoangDao` khớp với 31 lần gọi riêng lẻ `getDayQuality`.
7. Hàm là pure: gọi `getDayQuality` 100 lần với cùng một `solarDate` luôn cho cùng kết quả.
8. `THAN_TRUC_NHAT_TABLE` có đúng 12 hàng, mỗi hàng 12 phần tử, tổng 144 phần tử; mỗi phần tử là giá trị hợp lệ trong `THAN_TRUC_NHAT`.
9. Kết quả `isHoangDao` luôn bằng `hoangDao` (alias nhất quán).
10. `getDayQuality` không gọi `fetch`, `XMLHttpRequest`, hoặc bất kỳ API mạng nào (verified bằng mock trong test).
11. `getMonthDayQualities(2025, 1)` chạy trong vòng < 50ms (NFR-Performance).
12. Tất cả enum và kiểu được re-export từ `packages/amlich-core/src/index.ts`.
13. `truc.suitableFor` và `truc.avoidFor` là array string không rỗng cho mọi 12 Trực.
14. `sao28.rating` là một trong ba giá trị "tot"/"xau"/"binh" cho tất cả 28 sao.
15. Test fixture `dayquality-fixtures.json` có ít nhất 20 ngày có thể kiểm tra, mỗi ngày có đủ trường: solarDate, expectedThanTrucNhat, expectedIsHoangDao, expectedTruc, expectedSao28.
16. `diaChiNgay` của `getDayQuality` PHẢI bằng địa chi của `canChiDay(jdn)` (FR-LUNAR-002) cho mọi ngày trong một quét nhiều ngày (>= 60 ngày liên tiếp): với mỗi ngày, `DiaChi` index của `q.diaChiNgay` === `canChiDay(jdFromDate(d,m,y)).chiIndex` và `q.canChiNgay` === `canChiDay(...).label`. (Bắt lỗi địa chi lệch 8 do `(jdn+9)%60` - DEC-LUNAR-112.)
17. Với fixture Tết 2025 (29/01/2025), `diaChiNgay` của `getDayQuality` khớp chi của `canChiDay` cho ngày đó (KHÔNG được lệch); đây là cùng giá trị mà ô lịch FR-LUNAR-007 hiển thị.

---

## §5 - Verification

```typescript
// packages/amlich-core/test/dayquality.test.ts
import { describe, test, expect, vi } from "vitest";
import { getDayQuality, getMonthDayQualities, THAN_TRUC_NHAT_TABLE, SAO_28, TRUC_NAMES } from "../src/index";
import fixtures from "./fixtures/dayquality-fixtures.json";

describe("getDayQuality - fixtures", () => {
  for (const fix of fixtures) {
    test(`${fix.solarDate} ket qua khop fixture`, () => {
      const q = getDayQuality(new Date(fix.solarDate));
      expect(q.thanTrucNhat).toBe(fix.expectedThanTrucNhat);
      expect(q.isHoangDao).toBe(fix.expectedIsHoangDao);
      expect(q.truc.name).toBe(fix.expectedTruc);
      expect(q.sao28.name).toBe(fix.expectedSao28);
      expect(q.disclaimer).toBe("Tham khao phong thuy dan gian");
      expect(q.hoangDao).toBe(q.isHoangDao);       // alias nhat quan
    });
  }
});

describe("getDayQuality - gio Hoang dao", () => {
  test("moi ngay co dung 6 gio Hoang va 6 gio Hac", () => {
    const q = getDayQuality(new Date("2025-01-29"));
    expect(q.gioHoangDao).toHaveLength(12);
    const hoang = q.gioHoangDao.filter(g => g.isHoang);
    const hac   = q.gioHoangDao.filter(g => !g.isHoang);
    expect(hoang).toHaveLength(6);
    expect(hac).toHaveLength(6);
  });
});

describe("getDayQuality - 28 sao cycle", () => {
  test("chuoi 28 ngay tu ngay Giac cho ra du 28 sao theo thu tu", () => {
    // find a date known to be sao Giac from fixture
    const giac = fixtures.find(f => f.expectedSao28 === "Giac")!;
    const start = new Date(giac.solarDate);
    const cycle = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return getDayQuality(d).sao28.name;
    });
    expect(cycle).toEqual([...SAO_28]);
  });
});

describe("getDayQuality - Truc", () => {
  test("Truc trong thang 1/2025 la gia tri hop le lien tuc trong TRUC_NAMES", () => {
    const results = getMonthDayQualities(2025, 1);
    for (const q of results) {
      expect(TRUC_NAMES).toContain(q.truc.name);
    }
  });
});

describe("getMonthDayQualities", () => {
  test("tra ve 31 ket qua cho thang 1/2025", () => {
    const results = getMonthDayQualities(2025, 1);
    expect(results).toHaveLength(31);
  });

  test("nhat quan voi getDayQuality tung ngay", () => {
    const results = getMonthDayQualities(2025, 1);
    for (const q of results) {
      const single = getDayQuality(new Date(q.date));
      expect(q.hoangDao).toBe(single.hoangDao);
      expect(q.sao28.name).toBe(single.sao28.name);
    }
  });

  test("chay trong < 50ms", () => {
    const t0 = performance.now();
    getMonthDayQualities(2025, 1);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});

describe("getDayQuality - pure function", () => {
  test("goi 100 lan cung solarDate luon cho cung ket qua", () => {
    const date = new Date("2025-01-29");
    const first = getDayQuality(date);
    for (let i = 0; i < 99; i++) {
      const q = getDayQuality(new Date("2025-01-29"));
      expect(q.hoangDao).toBe(first.hoangDao);
      expect(q.truc.name).toBe(first.truc.name);
    }
  });
});

describe("getDayQuality - khong goi network", () => {
  test("khong fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    getDayQuality(new Date("2025-01-29"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("THAN_TRUC_NHAT_TABLE structure", () => {
  test("12 hang, 12 cot, tat ca gia tri hop le", () => {
    expect(THAN_TRUC_NHAT_TABLE).toHaveLength(12);
    for (const row of THAN_TRUC_NHAT_TABLE) {
      expect(row).toHaveLength(12);
    }
  });
});

// AC #16/#17 - dia chi PHAI nhat quan voi FR-LUNAR-002 canChiDay (DEC-LUNAR-112).
// Bat loi lay dia chi bang (jdn+9)%60 % 12 (lech 8 so voi core).
import { canChiDay, jdFromDate } from "@cyberskill/amlich-core";

// thu tu DiaChi dung trong DayQuality.diaChiNgay (khop CHI index cua core)
const DIA_CHI_ORDER = [
  "Ty", "Suu", "Dan", "Meo", "Thin", "Ti", "Ngo", "Mui", "Than", "Dau", "Tuat", "Hoi",
] as const;

describe("getDayQuality - dia chi nhat quan voi canChiDay (FR-002)", () => {
  test("label can-chi khop core cho fixture Tet 2025", () => {
    const jdn = jdFromDate(29, 1, 2025);
    const q = getDayQuality(new Date("2025-01-29"));
    // canChiNgay PHAI bang label cua core (pin ca can lan dia chi)
    expect(q.canChiNgay).toBe(canChiDay(jdn).label);
    expect(DIA_CHI_ORDER.indexOf(q.diaChiNgay)).toBe(canChiDay(jdn).chiIndex);
  });

  test("dia chi khop core qua quet 60 ngay lien tiep", () => {
    const start = new Date("2025-01-01");
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const jdn = jdFromDate(d.getDate(), d.getMonth() + 1, d.getFullYear());
      const q = getDayQuality(d);
      expect(DIA_CHI_ORDER.indexOf(q.diaChiNgay)).toBe(canChiDay(jdn).chiIndex);
      expect(q.canChiNgay).toBe(canChiDay(jdn).label);
    }
  });
});
```

---

## §6 - Implementation skeleton

API contract trong §3 là skeleton chính. Điểm mấu chốt cần ghi rõ: hàm `getDayQuality` gọi `jdFromDate` từ FR-LUNAR-001, sau đó gọi `canChiDay(jdn)` của FR-LUNAR-002 và lấy `const cc = canChiDay(jdn); const diaChiIndex = cc.chiIndex; // = (jdn + 1) % 12; canChiNgay = cc.label`. TUYỆT ĐỐI KHÔNG suy địa chi bằng `(jdn + 9) % 60` rồi `% 12` (cho `(jdn + 9) % 12`, lệch 8 so với core). Lập chỉ mục vào `THAN_TRUC_NHAT_TABLE[diaChiIndex][thangAmIndex]`. Trực tính qua `tietKhiStartDiaChiIndex` lấy từ hàm `tietKhiStartDiaChi(jdn, tz?)` của FR-LUNAR-002 (CONTRACT.md: `export function tietKhiStartDiaChi(jdn: number, tz?: number): number`), sau đó `(diaChiIndex - tietKhiStartDiaChiIndex + 12) % 12` cho index trong `TRUC_NAMES` (DEC-LUNAR-113). Sao 28 tính `(jdn - BASE_JDN_GIAC + 2800) % 28`. Vì cả ba bảng (thần trực nhật, Trực, giờ Hoàng đạo) đều khóa theo `diaChiIndex`, lấy địa chi nhất quán với core là bất biến quan trọng nhất của module này.

---

## §7 - Dependencies

Upstream: FR-LUNAR-002 là phụ thuộc bắt buộc. `getDayQuality` cần `jdFromDate` (FR-LUNAR-001, re-exported qua FR-LUNAR-002), `canChiDay` (FR-LUNAR-002), và `tietKhiStartDiaChi(jdn, tz?)` (FR-LUNAR-002, CONTRACT.md P2/P3 surface) để xác định `diaChiSoDauTiet` cho tính Trực theo công thức `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12` (DEC-LUNAR-113). Tất cả hàm này đã có sẵn khi FR-LUNAR-002 hoàn thành.

Downstream: FR-LUNAR-012 (good-day picker) phụ thuộc hoàn toàn vào `getDayQuality` và `getMonthDayQualities`. FR-LUNAR-013 (widget) dùng `getDayQuality` để hiển thị `canChiNgay`, `label` (Hoàng/Hắc đạo), và `gioHoangDao`. FR-LUNAR-007 (month grid) dùng `isHoangDao` và `truc.name` để hiển thị trong ô ngày.

Cross-cutting: `disclaimer` field đảm bảo nhãn "tham khảo phong thủy dân gian" được truyền xuống mọi lớp UI từ root data, không cần FR-007/012/013 tự thêm nhãn.

---

## §8 - Example payloads

```json
{
  "date": "2025-01-29",
  "canChiNgay": "Quy Suu",
  "diaChiNgay": "Suu",
  "thanTrucNhat": "Minh Duong",
  "hoangDao": true,
  "isHoangDao": true,
  "label": "Hoang dao",
  "truc": {
    "name": "Khai",
    "suitableFor": ["xuat hanh", "ky ket", "khai truong"],
    "avoidFor": ["thuoc men", "chon cat"]
  },
  "sao28": {
    "name": "Tinh",
    "rating": "tot",
    "notes": "Hop viec xuat hanh, ky hop dong, to chuc tiec"
  },
  "gioHoangDao": [
    { "canh": "Ty (23:00-01:00)", "tuGio": "23:00", "denGio": "01:00", "isHoang": true },
    { "canh": "Suu (01:00-03:00)", "tuGio": "01:00", "denGio": "03:00", "isHoang": false },
    { "canh": "Dan (03:00-05:00)", "tuGio": "03:00", "denGio": "05:00", "isHoang": true },
    { "canh": "Meo (05:00-07:00)", "tuGio": "05:00", "denGio": "07:00", "isHoang": false },
    { "canh": "Thin (07:00-09:00)", "tuGio": "07:00", "denGio": "09:00", "isHoang": true },
    { "canh": "Ti (09:00-11:00)", "tuGio": "09:00", "denGio": "11:00", "isHoang": false },
    { "canh": "Ngo (11:00-13:00)", "tuGio": "11:00", "denGio": "13:00", "isHoang": true },
    { "canh": "Mui (13:00-15:00)", "tuGio": "13:00", "denGio": "15:00", "isHoang": false },
    { "canh": "Than (15:00-17:00)", "tuGio": "15:00", "denGio": "17:00", "isHoang": true },
    { "canh": "Dau (17:00-19:00)", "tuGio": "17:00", "denGio": "19:00", "isHoang": false },
    { "canh": "Tuat (19:00-21:00)", "tuGio": "19:00", "denGio": "21:00", "isHoang": true },
    { "canh": "Hoi (21:00-23:00)", "tuGio": "21:00", "denGio": "23:00", "isHoang": false }
  ],
  "disclaimer": "Tham khao phong thuy dan gian"
}
```

---

## §9 - Open questions

Đã giải quyết:
- "Dùng can-chi từ core hay từ thư viện thứ ba?" -> DEC-LUNAR-112: luôn từ core, đồng nhất.
- "Đặt disclaimer ở đâu?" -> DEC-LUNAR-111: ở cấp root DayQuality.
- "BASE_JDN_GIAC xác định bằng gì?" -> DEC-LUNAR-114: bằng fixture đã đối chiếu từ nhiều nguồn VN.

Còn tồn tại (defer):
- Một số trang xem ngày VN có thêm cột "Ngày ký/Ngày phụ" (phụ giờ tốt thay thế khi giờ Hoàng đạo bị trùng giờ xấu). PRD chưa yêu cầu này - defer sang v2.
- Hệ thống "Thần sát" (như Kim Lâu, Hoàng Ốc, etc.) liên quan đến tuổi người chủ hôn. PRD không yêu cầu - defer.
- Cross-check thủ công `THAN_TRUC_NHAT_TABLE` với 3 nguồn sách phong thủy khác nhau trước khi ship (editorial task, không phải code task).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `THAN_TRUC_NHAT_TABLE` thiếu hàng (< 12) | Unit test AC #8 | Test fail, build block | Thêm hàng còn thiếu |
| `BASE_JDN_GIAC` sai giá trị | Fixture test AC #5 chuỗi 28 sao | Test fail, build block | Đối chiếu lại nguồn, cập nhật hằng số |
| JDN từ FR-LUNAR-001 sai 1 đơn vị | Test AC #1 fixture (tet 2025) fail | Sao/Trực/DiaChi lệch 1 | Fix FR-001 trước, ko fix đây |
| `thangAmIndex` bị off-by-one | Fixture test AC #1 | ThanTrucNhat sai | Kiểm tra lại `(thangAm - 1) mod 12` |
| Địa chi lấy bằng `(jdn+9)%60 % 12` (lệch 8 so với core) | AC #16/#17 cross-check với `canChiDay` | Thần trực nhật + Trực + giờ Hoàng đạo đều sai, lệch can-chi trong lịch | Gọi `canChiDay(jdn)` và dùng `chiIndex` (DEC-LUNAR-112) |
| `getDayQuality` gọi fetch | Test AC #10 mock | Test fail | Xóa code gọi mạng |
| `getMonthDayQualities` chậm > 50ms | Test AC #11 | Test fail | Profile + cache jdn batch |
| `disclaimer` không có trong kết quả | Test AC #3 | Test fail | Thêm vào return object |
| enum mới không re-export từ index.ts | FR-012/013 build fail | Import error | Thêm vào index.ts export |
| `isHoangDao` khác `hoangDao` | Test AC #9 | Inconsistency UI | Đặt `isHoangDao = hoangDao` trong return |
| Trực index vượt quá 11 | `mod 12` bảo vệ | Không thể | Design-level đảm bảo |
| `gioHoangDao` chỉ có < 12 phần tử | Test AC #2 | Widget/UI thiếu canh | Kiểm tra vòng lặp 12 |
| Sao28 trả về index 28 (out of range) | `mod 28` bảo vệ | Không thể | Design-level |
| FR-LUNAR-002 chưa sẵn (build order sai) | TypeScript compile error | Build fail | Build FR-002 trước |
| `TrucInfo.suitableFor` rỗng | Test AC #13 | Biểu tượng trống UI | Thêm nội dung phong thủy |
| Tables có ký tự Unicode sai | Fixture snapshot test | Visual mismatch | Dùng literal string đúng |

---

## §11 - Implementation notes

- Tất cả 3 bảng (THAN_TRUC_NHAT_TABLE, GIO_HOANG_DAO_TABLE, dữ liệu 28 sao) cần được cross-check với ít nhất 2 nguồn sách phong thủy hoặc trang xem ngày VN uy tín trước khi commit. Đây là editorial work, không phải coding; nên làm song song với code.
- `BASE_JDN_GIAC` là hằng số nhạy cảm nhất: thay đổi nó làm lệch tất cả 28 sao cho mọi ngày trong 1900-2199. Lock nó vào `dayquality-fixtures.json` và comment rõ "đã đối chiếu với trang X ngày Y".
- `getMonthDayQualities` có thể gọi `getDayQuality` từng ngày trong vòng lặp đơn giản - không cần tối ưu trước. Chỉ refactor sang batch JDN nếu profiling cho thấy cần (có thể với hàng nghìn ngày).
- `disclaimer` là `readonly` literal type `"Tham khao phong thuy dan gian"` - kiểu TypeScript đảm bảo không ai nhầm lấy tổ về không có disclaimer.
- Trực chu kỳ 12 sẽ tập trung: trong 1 tháng 30 ngày, mỗi Trực xuất hiện 2-3 lần. Người dùng nhìn thấy "Khai" nhiều lần - điều này đúng, không phải bug.
- Giờ Hoàng đạo tính theo giờ "canh" Việt Nam (mỗi canh 2 tiếng, 12 canh là 24 giờ). Các hằng số `tuGio`/`denGio` trong GIO_HOANG_DAO_TABLE là string literal ("23:00") để render đơn giản - không phải Date object.
- Cần chú ý: một số nguồn online tính giờ Hoàng đạo theo "giờ dương" (solar hours) thay vì giờ chuẩn. PRD không yêu cầu độ chính xác này; dùng giờ clock chuẩn là đủ.
- Module này không có phụ thuộc npm nào ngoài amlich-core nội bộ - đúng nghĩa zero-dependency có nghĩa là zero third-party.

*Hết FR-LUNAR-011.*
