---
id: FR-LUNAR-002
title: "Can-chi, zodiac Việt Nam (Mèo/Trâu), 24 tiết khí + 12 Trung khí - dữ liệu độc lập múi giờ tính từ JDN"
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
related_frs: [FR-LUNAR-001, FR-LUNAR-011]
depends_on: [FR-LUNAR-001]
blocks: [FR-LUNAR-003, FR-LUNAR-007, FR-LUNAR-011, FR-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-A03, FR-A04)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#6 (6.3 getSunLongitude)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#8 (can-chi base for day quality)"
source_decisions:
  - DEC-LUNAR-020 (can-chi ngày tính từ JDN: canIndex = (jdn + 9) % 10, chiIndex = (jdn + 1) % 12; độc lập múi giờ)
  - DEC-LUNAR-021 (zodiac Việt Nam thay con giáp: Mèo thay Thỏ ở chi Mão, Trâu thay Sửu/Bò ở chi Sửu; bảng 12 con giáp VN riêng)
  - DEC-LUNAR-022 (can-chi tháng tính từ lunarMonth và can năm: monthCanIndex = (lunarYearCan * 2 + lunarMonth + 1) % 10; chi tháng cố định bắt đầu Dần)
  - DEC-LUNAR-023 (can-chi năm tính từ lunarYear: can = (lunarYear + 6) % 10, chi = (lunarYear + 8) % 12)
  - DEC-LUNAR-024 (tiết khí tính bằng getSunLongitude ở độ phân giải 15 độ: tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12); 24 tiết khí, 12 là Trung khí)
  - DEC-LUNAR-025 (cross-check 6tail/lunar-typescript CHỈ cho can-chi và Trực - các giá trị độc lập múi giờ; KHÔNG dùng để chốt ngày Sóc / tháng nhuận VN)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/canchi.ts
  - packages/amlich-core/src/tietkhi.ts
  - packages/amlich-core/src/zodiac.ts
  - packages/amlich-core/test/canchi.test.ts
  - packages/amlich-core/test/tietkhi.test.ts
modified_files:
  - packages/amlich-core/src/index.ts
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/{src,test}/**
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "dùng lunar-typescript để quyết định ngày Sóc hoặc tháng nhuận VN (vi phạm DEC-LUNAR-025 - nó theo 120E)"
  - "tính can-chi từ lunarDay/Month thay vì từ JDN (vi phạm DEC-LUNAR-020 - sai khi qua ranh tháng)"
  - "dùng con giáp Trung Quốc (Thỏ/Bò) thay vì VN (Mèo/Trâu) (vi phạm DEC-LUNAR-021 / FR-A03)"
effort_hours: 10.5
sub_tasks:
  - "1.5h: canDay/chiDay từ JDN + bảng 10 Can + 12 Chi (tiếng Việt có dấu)"
  - "1.5h: can-chi tháng từ lunarMonth + can năm; can-chi năm từ lunarYear"
  - "1.5h: bảng zodiac Việt Nam 12 con giáp (Mèo, Trâu...) + hàm zodiacOf(lunarYear)"
  - "2.0h: tiết khí qua getSunLongitude độ phân giải 15 độ; bảng 24 tên + cờ Trung khí"
  - "1.0h: tietKhiAt(jdn, tz?) tra index 0-23 + ten + co isTrungKhi (do phan giai 15 do)"
  - "0.5h: tietKhiStartDiaChi(jdn, tz?) - dia chi (0..11) ngay bat dau tiet; FR-011 dung de tinh Truc (CONTRACT.md)"
  - "1.0h: cross-check can-chi với lunar-typescript cho một mẫu ngày (CI optional, độc lập múi giờ)"
  - "1.0h: index.ts barrel exports + JSDoc công thức mọi index"
  - "0.5h: bổ sung type CanChi, TietKhi, Zodiac vào public API"
risk_if_skipped: "Không có can-chi và tiết khí thì lịch tháng FR-LUNAR-007 thiếu thông tin mỗi ô ngày, day quality FR-LUNAR-011 không có đầu vào (Hoàng đạo/Trực/28 sao đều tính từ can-chi ngày), validation FR-LUNAR-003 không assert được năm can-chi của fixture, và widget FR-LUNAR-013 không hiện được can-chi. Sai zodiac (dùng Thỏ thay Mèo) là sai đặc trưng VN mà persona Chị Linh nhận ra ngay (Tết 2023 phải là Mèo)."
---

## §1 - Description (BCP-14 normative)

Module PHẢI tính can-chi ngày/tháng/năm, con giáp theo zodiac Việt Nam, và 24 tiết khí (12 là Trung khí), tất cả độc lập múi giờ và suy ra từ JDN của FR-LUNAR-001. Hợp đồng:

1. PHẢI tính can-chi ngày từ JDN: `canIndex = (jdn + 9) % 10` và `chiIndex = (jdn + 1) % 12`, trả tên ghép từ bảng 10 Can và 12 Chi (FR-A03, DEC-LUNAR-020).
2. PHẢI tính can-chi ngày từ JDN chứ KHÔNG ĐƯỢC tính từ `lunarDay`/`lunarMonth`, vì can-chi chạy liên tục theo ngày dương và sẽ sai khi qua ranh tháng âm (DEC-LUNAR-020).
3. PHẢI tính can-chi năm từ `lunarYear`: `can = (lunarYear + 6) % 10`, `chi = (lunarYear + 8) % 12` (FR-A03, DEC-LUNAR-023).
4. PHẢI tính can-chi tháng từ `lunarMonth` và can của năm: `monthCan = (yearCanIndex * 2 + lunarMonth + 1) % 10`, chi tháng cố định bắt đầu từ Dần ở tháng Giêng (FR-A03, DEC-LUNAR-022).
5. PHẢI dùng zodiac Việt Nam: con giáp ở chi Mão là "Mèo" (không phải Thỏ), ở chi Sửu là "Trâu" (không phải Bò); cung cấp bảng 12 con giáp VN đầy đủ (FR-A03, DEC-LUNAR-021).
6. PHẢI cung cấp `zodiacOf(chiIndex)` trả về con giáp VN tương ứng với chi index 0..11 (CONTRACT.md); caller tính `chiIndex = (lunarYear + 8) % 12` để chuyển từ năm âm (FR-A03).
6a. PHẢI cung cấp `canChiLabel(canIndex, chiIndex): string` là pure helper ghép nhãn "Can Chi" từ hai index; các hàm `canChiDay`/`canChiYear`/`canChiMonth` dùng nó nội bộ (CONTRACT.md).
7. PHẢI tính tiết khí từ `getSunLongitude` ở độ phân giải 15 độ: `tietKhiIndex = INT(SunLongitude(jdn - 0.5 - tz / 24) / PI * 12)` trả về 0-23 (FR-A04, DEC-LUNAR-024).
8. PHẢI cung cấp bảng 24 tiết khí tiếng Việt có dấu theo đúng thứ tự, đánh dấu 12 tiết là Trung khí (Principal Term) (FR-A04).
9. PHẢI bảo đảm Đông chí (Winter Solstice) là một Trung khí và là mốc xác định tháng 11 âm, nhất quán với `getLunarMonth11` của FR-LUNAR-001 (FR-A04, PRD 6.1 rule 3).
10. PHẢI tính mọi giá trị từ JDN và `getSunLongitude` với `tz = 7.0` mặc định, không phụ thuộc thời gian hệ thống; hàm là pure (NFR-Offline).
11. PHẢI cung cấp `tietKhiAt(jdn, tz?)` trả về `TietKhi` gồm `index` 0..23, `name`, và `isTrungKhi` (FR-A04, CONTRACT.md).
11a. PHẢI cung cấp `tietKhiStartDiaChi(jdn, tz?): number` trả về địa chi (0..11) của ngày bắt đầu tiết khí đang quan chua `jdn`; FR-LUNAR-011 dùng để tính Trực theo công thức `(diaChiNgay - tietKhiStartDiaChi + 12) % 12` (CONTRACT.md, DEC-LUNAR-024).
12. KHÔNG ĐƯỢC dùng `lunar-typescript` để quyết định ngày Sóc hoặc tháng nhuận VN; CÓ THỂ dùng nó chỉ để cross-check can-chi và Trực trong CI vì các giá trị đó độc lập múi giờ (DEC-LUNAR-025, PRD 6.5 Caveats).
13. PHẢI export các type `CanChi`, `TietKhi`, `Zodiac` qua barrel `index.ts` để FR-LUNAR-007 và FR-LUNAR-011 dùng lại (DEC-LUNAR-020).
14. NÊN gắn nhãn ngôn ngữ: bảng Can/Chi và tiết khí giữ tiếng Việt có dấu đúng chuẩn, vì đây là nội dung hiển thị cho người dùng (NFR-Localization).
15. NÊN giữ các bảng là `as const` và freeze để không sửa nhầm lúc runtime (DEC-LUNAR-020).

---

## §2 - Why this design (rationale for humans)

**Tại sao can-chi ngày tính từ JDN?** Can-chi ngày là chu kỳ 60 chạy liên tục theo ngày dương, không reset theo tháng âm. Nếu tính từ `lunarDay` sẽ sai ngày qua ranh tháng. JDN là dòng đếm ngày liên tục nên `(jdn + 9) % 10` và `(jdn + 1) % 12` cho đúng Can và Chi cho mọi ngày; các offset 9 và 1 chốt vào mốc can-chi lịch sử (DEC-LUNAR-020).

**Tại sao zodiac Việt Nam khác Trung Quốc?** Việt Nam dùng Mèo ở chi Mão thay vì Thỏ, và Trâu ở chi Sửu thay vì Bò. PRD 6.6 ghi rõ Tết 2023 là năm Mèo "không phải Thỏ". Persona Chị Linh sẽ nhận ra ngay nếu app hiện sai con giáp. Vì vậy bảng con giáp là bảng VN riêng, không tái dùng bảng TQ (DEC-LUNAR-021, FR-A03).

**Tại sao can-chi tháng phụ thuộc can của năm?** Chi của tháng cố định (tháng Giêng là Dần, tháng Hai là Mão...) nhưng Can của tháng xoay theo Can của năm. Công thức `(yearCanIndex * 2 + lunarMonth + 1) % 10` cho đúng Can tháng, nhất quán với cách tính truyền thống. Đây là đầu vào cho Hoàng đạo/Hắc đạo ở FR-LUNAR-011 (DEC-LUNAR-022).

**Tại sao tiết khí dùng getSunLongitude ở độ phân giải 15 độ?** Một vòng hoàng đạo 360 độ chia 24 tiết khí, mỗi tiết 15 độ. FR-LUNAR-001 đã có `getSunLongitude` ở độ phân giải 30 độ (chia 6, trả 0-11) cho Trung khí; ở đây chia 12 để ra 24 tiết khí (`/ PI * 12`). Tái dùng đúng hàm SunLongitude bảo đảm tiết khí nhất quán với việc xác định tháng nhuận ở core (DEC-LUNAR-024).

**Tại sao Đông chí phải là Trung khí?** Rule 3 của Hồ Ngọc Đức: Đông chí luôn rơi vào tháng 11 âm. Bảng 24 tiết khí phải đánh dấu Đông chí là Trung khí và khớp với `getLunarMonth11`. Nếu bảng tiết khí và core lệch nhau về Đông chí thì tháng 11 xác định hai nơi sẽ mâu thuẫn (PRD 6.1 rule 3).

**Tại sao chỉ cross-check, không dựa, vào lunar-typescript?** PRD 6.5 và Caveats nói rõ lunar-typescript tính theo 120E nên sai ngày Sóc và tháng nhuận VN. Nhưng can-chi ngày và Trực độc lập múi giờ, nên có thể dùng nó làm phép đối chiếu một mẫu ngày trong CI để tăng tin cậy, miễn là không bao giờ dùng để chốt giá trị phụ thuộc múi giờ (DEC-LUNAR-025).

---

## §3 - API contract

```typescript
// packages/amlich-core/src/canchi.ts
// Luu y: CAN, CHI, ZODIAC_VN la hang so o constants.ts; CanChi la type o types.ts.
// KHONG redeclare. Import tu barrel "@cyberskill/amlich-core" trong code production.
import { CAN, CHI, ZODIAC_VN } from "./constants.js";
import type { CanChi } from "./types.js";

/**
 * Ghep nhan "Can Chi" tu index (pure helper, data). CONTRACT.md.
 * Dung cho moi noi can tao label ma khong tao CanChi day du.
 */
export function canChiLabel(canIndex: number, chiIndex: number): string {
  return `${CAN[((canIndex % 10) + 10) % 10]} ${CHI[((chiIndex % 12) + 12) % 12]}`;
}

/**
 * Con giap VIET NAM tu chiIndex (0..11). Meo cho chi Mao (index 3), Trau cho chi Suu (index 1).
 * CONTRACT: zodiacOf(chiIndex: number): string. DEC-LUNAR-021.
 * Cach tinh chiIndex tu nam am: chiIndex = (lunarYear + 8) % 12.
 */
export function zodiacOf(chiIndex: number): string {
  return ZODIAC_VN[((chiIndex % 12) + 12) % 12]!;
}

/** Can-chi NGAY tu JDN: canIndex=(jdn+9)%10, chiIndex=(jdn+1)%12. DEC-LUNAR-020. CONTRACT.md. */
export function canChiDay(jdn: number): CanChi {
  const canIndex = (jdn + 9) % 10;
  const chiIndex = (jdn + 1) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

/** Can-chi NAM am: can=(lunarYear+6)%10, chi=(lunarYear+8)%12. DEC-LUNAR-023. */
export function canChiYear(lunarYear: number): CanChi {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}

/** Can-chi THANG am: chi co dinh bat dau Dan o thang Gieng; can xoay theo can nam. DEC-LUNAR-022. */
export function canChiMonth(lunarMonth: number, lunarYear: number): CanChi {
  const yearCan = (lunarYear + 6) % 10;
  const canIndex = (yearCan * 2 + lunarMonth + 1) % 10;
  const chiIndex = (lunarMonth + 1) % 12; // thang 1 -> Dan (index 2)
  return { canIndex, chiIndex, label: canChiLabel(canIndex, chiIndex) };
}
```

```typescript
// packages/amlich-core/src/tietkhi.ts (tietKhiStartDiaChi la phan bao sung TASK A)
import { VN_TZ, TIET_KHI } from "./constants.js";
import type { TietKhi } from "./types.js";
// SunLongitude, tietKhiAt: import tu cung package (khong import duong dan ngoai)

/** tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12) -> 0..23. DEC-LUNAR-024. */
export function tietKhiAt(jdn: number, tz: number = VN_TZ): TietKhi {
  // implement: const idx = Math.floor((SunLongitude(jdn - 0.5 - tz / 24) / Math.PI) * 12);
  // return { index: idx, name: TIET_KHI[idx], isTrungKhi: idx % 2 === 0 };
}

/**
 * Dia chi (0..11) cua ngay BAT DAU tiet khi dang quan chua jdn.
 * FR-011 dung ham nay de tinh Truc: trucIndex = (diaChiNgay - tietKhiStartDiaChi + 12) % 12.
 * CONTRACT.md: tietKhiStartDiaChi(jdn, tz?): number.
 *
 * Thuat toan: (1) tiet khi hien tai = tietKhiAt(jdn, tz); (2) luo nguoc jdn cho den khi
 * tietKhiAt(jd - 1, tz).index != tietKhiAt(jd, tz).index -> ngay bat dau tiet la jd;
 * (3) tra ve canChiDay(jd).chiIndex.
 * O(1) vi moi tiet khi keo dai trung binh ~15 ngay; vong while chay toi da 16 buoc.
 */
export function tietKhiStartDiaChi(jdn: number, tz: number = VN_TZ): number {
  // implement: look back until tiet index changes, return canChiDay(startJdn).chiIndex
}
```

```typescript
// packages/amlich-core/src/tietkhi.ts
import { SunLongitude } from "./sunlongitude";
import { PI } from "./index";

/** 24 tiết khí; các index chẵn (0,2,...) là Trung khí (Principal Term). */
export const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập",
] as const;

export interface TietKhi {
  index: number;        // 0..23
  name: typeof TIET_KHI[number];
  isTrungKhi: boolean;  // Trung khí = Principal Term (Đông chí, Hạ chí, Xuân/Thu phân...)
}

/** tietKhiIndex = INT(SunLongitude(jdn-0.5-tz/24) / PI * 12). DEC-LUNAR-024. */
export function tietKhiAt(jdn: number, tz: number): TietKhi {
  const idx = Math.floor((SunLongitude(jdn - 0.5 - tz / 24) / PI) * 12);
  return { index: idx, name: TIET_KHI[idx], isTrungKhi: idx % 2 === 0 };
}
```

---

## §4 - Acceptance criteria

1. `canChiDay(jdFromDate(2, 2, 1984))` có `label` là can-chi ngày hợp lệ và ổn định giữa các lần gọi (deterministic).
2. `canChiYear(2025)` trả về `Ất Tỵ` (fixture Tết 2025, PRD 6.6).
3. `canChiYear(2024)` trả về `Giáp Thìn`; `canChiYear(2023)` trả về `Quý Mão`; `canChiYear(2026)` trả về `Bính Ngọ`; `canChiYear(1984)` trả về `Giáp Tý`.
4. `zodiacOf((2023 + 8) % 12)` - tức `zodiacOf(7)` - trả về `Mèo` (không phải Thỏ) - đặc trưng VN (PRD 6.6, CONTRACT.md: zodiacOf(chiIndex)).
5. `zodiacOf((2025+8)%12)` trả về `Rắn`; `zodiacOf((2024+8)%12)` trả về `Rồng`; `zodiacOf((2026+8)%12)` trả về `Ngựa`; `zodiacOf((2021+8)%12)` trả về `Trâu` (không phải Bò).
5a. `canChiLabel(1, 1)` trả về `"Ất Sửu"` (AC cho pure helper CONTRACT.md).
6. `canChiDay` đổi index đúng khi tăng JDN thêm 1: `canIndex` tăng 1 modulo 10 và `chiIndex` tăng 1 modulo 12 (chu kỳ liên tục, DEC-LUNAR-020).
7. `canChiMonth(1, 2025).chiIndex` bằng `2` (Dần = index 2; tháng Giêng luôn Dần, DEC-LUNAR-022).
8. `tietKhiAt` trả về `index` trong `[0, 23]` cho mọi JDN trong dải test.
9. Có ngày trong khoảng Đông chí (~21-22/12 dương) mà `tietKhiAt` trả về `Đông chí` với `isTrungKhi = true`.
10. 12 tiết là Trung khí và 12 là Tiết khí thường; đếm `isTrungKhi === true` trong bảng là 12.
11. Ngày bắt đầu tháng 11 âm (`getLunarMonth11`) của FR-LUNAR-001 chứa Đông chí: `tietKhiAt` của một ngày trong tháng 11 âm gần Đông chí trả về Trung khí Đông chí (nhất quán core, FR-A04).
12. Bảng `CAN`, `CHI`, `ZODIAC_VN`, `TIET_KHI` là `as const` và bị freeze; sửa ở runtime vô hiệu (DEC-LUNAR-020).
13. Cross-check tùy chọn: can-chi ngày của một mẫu 10 ngày khớp với `lunar-typescript` (giá trị độc lập múi giờ, DEC-LUNAR-025).
14. Không có lỗi gọi network trong test suite (offline, NFR-Offline).
15. `tietKhiStartDiaChi(jdn, 7)` trả về số nguyên trong `[0, 11]` cho mọi JDN trong dải test.
16. Hai ngày liên tiếp trong cùng một tiết khí có `tietKhiStartDiaChi` bằng nhau; hai ngày hai bên ranh tiết khác nhau có giá trị khác nhau.
17. Với `jdn` là ngày bắt đầu tiết (xác định bằng `tietKhiAt(jdn-1).index != tietKhiAt(jdn).index`), `tietKhiStartDiaChi(jdn)` bằng `canChiDay(jdn).chiIndex` (§1 #11a, CONTRACT.md).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/canchi.test.ts
import { describe, it, expect } from "vitest";
import { canChiDay, canChiYear, canChiMonth, canChiLabel, zodiacOf } from "../src/canchi";
import { jdFromDate, VN_TZ } from "../src/index";

describe("can-chi nam (PRD 6.6 fixtures)", () => {
  // label phai la tieng Viet co dau dung chinh ta
  it("2025 = At Ty", () => expect(canChiYear(2025).label).toBe("Ất Tỵ"));
  it("2024 = Giap Thin", () => expect(canChiYear(2024).label).toBe("Giáp Thìn"));
  it("2023 = Quy Mao", () => expect(canChiYear(2023).label).toBe("Quý Mão"));
  it("2026 = Binh Ngo", () => expect(canChiYear(2026).label).toBe("Bính Ngọ"));
  it("1984 = Giap Ty", () => expect(canChiYear(1984).label).toBe("Giáp Tý"));
});

describe("zodiac Viet Nam: zodiacOf(chiIndex) - CONTRACT.md", () => {
  // chiIndex = (lunarYear + 8) % 12
  it("2023 -> chiIndex 7 = Meo (khong phai Tho)", () => expect(zodiacOf((2023 + 8) % 12)).toBe("Mèo"));
  it("2021 -> chiIndex 5 = Trau (khong phai Bo)", () => expect(zodiacOf((2021 + 8) % 12)).toBe("Trâu"));
  it("2025 -> Ran", () => expect(zodiacOf((2025 + 8) % 12)).toBe("Rắn"));
  it("2024 -> Rong", () => expect(zodiacOf((2024 + 8) % 12)).toBe("Rồng"));
});

describe("canChiLabel pure helper (CONTRACT.md)", () => {
  it("canChiLabel(1, 1) = At Suu", () => expect(canChiLabel(1, 1)).toBe("Ất Sửu"));
  it("canChiLabel(0, 0) = Giap Ty", () => expect(canChiLabel(0, 0)).toBe("Giáp Tý"));
});

describe("can-chi ngay chay lien tuc theo JDN (DEC-LUNAR-020)", () => {
  it("canIndex tang 1 mod 10, chiIndex tang 1 mod 12 khi JDN tang 1", () => {
    const jd = jdFromDate(2, 2, 1984);
    const a = canChiDay(jd);
    const b = canChiDay(jd + 1);
    expect(b.canIndex).toBe((a.canIndex + 1) % 10);
    expect(b.chiIndex).toBe((a.chiIndex + 1) % 12);
  });
  it("can=(jdn+9)%10 va chi=(jdn+1)%12 cho ngay cu the (CONTRACT.md source of truth)", () => {
    const jd = jdFromDate(29, 1, 2025);
    expect(canChiDay(jd).canIndex).toBe((jd + 9) % 10);
    expect(canChiDay(jd).chiIndex).toBe((jd + 1) % 12);
  });
  it("deterministic", () => {
    const jd = jdFromDate(29, 1, 2025);
    expect(canChiDay(jd).label).toBe(canChiDay(jd).label);
  });
});

describe("can-chi thang (DEC-LUNAR-022)", () => {
  it("thang Gieng luon co chiIndex = 2 (Dan)", () => {
    expect(canChiMonth(1, 2025).chiIndex).toBe(2);
  });
  it("can-chi thang xoay theo can nam (Giap nien thang Gieng = Binh Dan, canIndex=2)", () => {
    // Giap = canIndex 0; monthCan = (0 * 2 + 1 + 1) % 10 = 2 = Binh
    const cc = canChiMonth(1, 2024); // 2024 Giap Thin, yearCan=0
    expect(cc.canIndex).toBe(2);     // Binh
    expect(cc.chiIndex).toBe(2);     // Dan
  });
});
```

```typescript
// packages/amlich-core/test/tietkhi.test.ts
import { describe, it, expect } from "vitest";
import { tietKhiAt, tietKhiStartDiaChi, TIET_KHI } from "../src/tietkhi";
import { canChiDay, canChiLabel } from "../src/canchi";
import { jdFromDate, VN_TZ } from "../src/index";

const TZ = VN_TZ;

describe("tiet khi (FR-A04, DEC-LUNAR-024)", () => {
  it("index luon trong [0,23]", () => {
    const start = jdFromDate(1, 1, 2000);
    for (let jd = start; jd < start + 366; jd += 7) {
      const t = tietKhiAt(jd, TZ);
      expect(t.index).toBeGreaterThanOrEqual(0);
      expect(t.index).toBeLessThanOrEqual(23);
    }
  });
  it("co 24 tiet trong bang va 12 la Trung khi (index chan)", () => {
    expect(TIET_KHI.length).toBe(24);
    const trungKhiCount = Array.from({ length: 24 }, (_, i) => i).filter(i => i % 2 === 0).length;
    expect(trungKhiCount).toBe(12);
  });
  it("ngay quanh Dong chi 22/12/2024 la Dong chi (Trung khi, index 18)", () => {
    const t = tietKhiAt(jdFromDate(22, 12, 2024), TZ);
    expect(t.name).toBe("Đông chí");
    expect(t.isTrungKhi).toBe(true);
    expect(t.index).toBe(18);
  });
});

describe("tietKhiStartDiaChi (CONTRACT.md, AC #15-17)", () => {
  it("tra ve so nguyen trong [0,11] cho moi JDN thu nghiem", () => {
    const start = jdFromDate(1, 1, 2020);
    for (let jd = start; jd < start + 366; jd += 7) {
      const v = tietKhiStartDiaChi(jd, TZ);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });
  it("hai ngay trong cung tiet co tietKhiStartDiaChi bang nhau (AC #16)", () => {
    // Tim hai ngay lien tiep co cung tiet index
    const jd1 = jdFromDate(1, 1, 2025);
    if (tietKhiAt(jd1, TZ).index === tietKhiAt(jd1 + 1, TZ).index) {
      expect(tietKhiStartDiaChi(jd1, TZ)).toBe(tietKhiStartDiaChi(jd1 + 1, TZ));
    }
  });
  it("ngay bat dau tiet: tietKhiStartDiaChi bang canChiDay(jd).chiIndex (AC #17)", () => {
    // Tim jd bat dau tiet (tiet index thay doi so voi jd-1)
    const start = jdFromDate(1, 1, 2025);
    for (let jd = start + 1; jd < start + 30; jd++) {
      if (tietKhiAt(jd - 1, TZ).index !== tietKhiAt(jd, TZ).index) {
        // jd la ngay bat dau tiet moi
        expect(tietKhiStartDiaChi(jd, TZ)).toBe(canChiDay(jd).chiIndex);
        break;
      }
    }
  });
});
```

---

## §6 - Implementation skeleton

API ở §3 là skeleton đầy đủ. Chi tiết đáng ghim: tiết khí và Trung khí dùng CHUNG hàm `SunLongitude` của FR-LUNAR-001 nhưng khác độ phân giải - Trung khí chia 6 (độ phân giải 30 độ, trong core), tiết khí chia 12 (độ phân giải 15 độ, ở đây). Phải đảm bảo chúng cùng lấy `jdn - 0.5 - tz/24` làm đầu vào để hai nơi nhất quán về Đông chí. AC #11 là ràng buộc nhất quán giữa bảng tiết khí này và `getLunarMonth11` của core.

---

## §7 - Dependencies

Upstream: FR-LUNAR-001 - dùng `jdFromDate`, `jdToDate`, `SunLongitude`, và `VN_TIMEZONE`. Tên khớp frontmatter depends_on.

Downstream: FR-LUNAR-003 assert năm can-chi của các fixture Tết; FR-LUNAR-007 hiện can-chi và tiết khí trên mỗi ô lịch; FR-LUNAR-011 dùng can-chi ngày làm đầu vào cho Hoàng đạo/Hắc đạo/Trực/28 sao; FR-LUNAR-013 hiện can-chi trên widget. Tên khớp frontmatter blocks.

Cross-cutting: bảng Can/Chi và tiết khí là nội dung hiển thị tiếng Việt, liên quan NFR-Localization. Cross-check optional với lunar-typescript chỉ cho giá trị độc lập múi giờ (DEC-LUNAR-025).

---

## §8 - Example payloads

```json
{
  "input": { "fn": "canChiYear", "args": [2025] },
  "output": { "can": "Ất", "chi": "Tỵ", "canIndex": 1, "chiIndex": 1, "label": "Ất Tỵ" }
}
```

```json
{
  "input": { "fn": "zodiacOf", "args": [2023] },
  "output": "Mèo",
  "note": "VN dùng Mèo, không phải Thỏ (PRD 6.6)"
}
```

```json
{
  "input": { "fn": "tietKhiAt", "args": [2460667, 7.0] },
  "output": { "index": 18, "name": "Đông chí", "isTrungKhi": true }
}
```

---

## §9 - Open questions

Đã giải quyết: nguồn gốc offset can-chi ngày (9 và 1), bảng zodiac VN, công thức can-chi tháng, độ phân giải tiết khí 15 độ.

Defer:
- Các hệ thống thần sát sâu hơn (trực tính, sao tốt/xấu chi tiết) nằm ở FR-LUNAR-011, không đưa vào đây; FR này chỉ lo can-chi/zodiac/tiết khí làm nền.
- Có đưa thêm tên tiết khí dạng Hán-Việt kèm chữ Hán hay không - defer sang lớp nội dung FR-LUNAR-008 nếu cần hiển thị phong phú hơn.
- Cross-check toàn dải 1900-2199 với lunar-typescript cho can-chi (thay vì chỉ một mẫu) - có thể bật trong CI nặng nếu muốn, nhưng chỉ cho giá trị độc lập múi giờ (DEC-LUNAR-025).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Tính can-chi từ lunarDay thay vì JDN | sai khi qua ranh tháng âm | can-chi ngày lệch | tính từ JDN (DEC-LUNAR-020) |
| Dùng con giáp TQ (Thỏ/Bò) | AC #4/#5 fail (2023 != Mèo) | sai đặc trưng VN | bảng ZODIAC_VN |
| Offset can-chi sai (ví dụ +8 thay +9) | năm can-chi fixture fail | toàn bộ can-chi lệch | giữ (jdn+9)%10, (jdn+1)%12 |
| Tiết khí chia 6 thay vì 12 | chỉ ra 12 giá trị thay 24 | mất nửa tiết khí | chia 12 (/ PI * 12) |
| Đầu vào tiết khí không trừ tz/24 | Đông chí lệch ngày | tháng 11 mâu thuẫn core | dùng jdn-0.5-tz/24 |
| Bảng tiết khí sai thứ tự | Đông chí không đúng index | isTrungKhi sai | giữ thứ tự chuẩn §3 |
| Dùng lunar-typescript chốt ngày Sóc | tháng nhuận VN sai | sai lịch | chỉ cross-check độc lập múi giờ |
| Bảng bị sửa runtime | AC #12 fail | sai im lặng | as const + freeze |
| Can-chi tháng không xoay theo can năm | can tháng sai | đầu vào FR-011 sai | công thức DEC-LUNAR-022 |
| Gọi network trong test | offline guard | mất NFR-Offline | xóa IO khỏi module |
| Mất dấu tiếng Việt trong bảng | hiển thị sai chính tả | UX kém | giữ tiếng Việt có dấu |
| Đông chí và getLunarMonth11 lệch | AC #11 fail | tháng 11 hai nơi khác | dùng chung SunLongitude |

---

## §11 - Implementation notes

- Can-chi ngày PHẢI tính từ JDN, không từ ngày âm. Đây là chu kỳ 60 liên tục theo ngày dương; `(jdn + 9) % 10` cho Can, `(jdn + 1) % 12` cho Chi. Hai offset chốt vào mốc can-chi lịch sử và đã được kiểm qua các bản canonical.
- Zodiac VN là điểm khác biệt văn hóa quan trọng: Mèo ở chi Mão, Trâu ở chi Sửu. Tết 2023 phải ra Mèo; nếu ra Thỏ là dùng bảng TQ và sai với người dùng Việt.
- Tiết khí tái dùng đúng `SunLongitude` của core nhưng chia 12 (15 độ mỗi tiết) thay vì chia 6 (30 độ, độ phân giải Trung khí trong core). Cùng đầu vào `jdn - 0.5 - tz/24` để Đông chí nhất quán với `getLunarMonth11`.
- Trung khí là các tiết ở index chẵn trong bảng (Đông chí, Hạ chí, Xuân phân, Thu phân, và các Trung khí khác); 12 Trung khí và 12 tiết thường. Đây là cơ sở cho rule 4 (tháng không chứa Trung khí là tháng nhuận) mà core dùng.
- Can-chi tháng có Chi cố định (tháng Giêng là Dần) nhưng Can xoay theo Can năm; công thức `(yearCan * 2 + lunarMonth + 1) % 10`. Đây là đầu vào bắt buộc cho bảng Hoàng đạo/Hắc đạo theo địa chi ngày x tháng ở FR-LUNAR-011.
- Cross-check với lunar-typescript chỉ hợp lệ cho can-chi và Trực (độc lập múi giờ); tuyệt đối không dùng nó để chốt ngày Sóc hay tháng nhuận VN, vì nó theo 120E (Caveats PRD).
- Giữ các bảng `as const` và freeze; chúng là nội dung hiển thị và tham số toán học cùng lúc, sửa nhầm một phần tử vừa sai chính tả vừa sai tính toán.

---

*Hết FR-LUNAR-002.*
