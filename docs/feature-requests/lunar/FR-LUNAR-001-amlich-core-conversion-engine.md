---
id: FR-LUNAR-001
title: "Core lunar engine - port thuật toán Hồ Ngọc Đức sang TypeScript, convertSolar2Lunar / convertLunar2Solar theo giờ Việt Nam (UTC+7, 105E), offline, zero-dependency"
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
related_frs: [FR-LUNAR-002, FR-LUNAR-003, FR-LUNAR-004]
depends_on: []
blocks: [FR-LUNAR-002, FR-LUNAR-003, FR-LUNAR-004, FR-LUNAR-007, FR-LUNAR-008, FR-LUNAR-010, FR-LUNAR-013]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-A01, FR-A02, FR-A06)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Offline, NFR-Performance)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#6 (Lunar spec 6.1-6.5)"
source_decisions:
  - DEC-LUNAR-010 (mọi tính toán dùng kinh tuyến 105E với timeZone = 7.0; đây là rule 5 của Hồ Ngọc Đức và là nguyên nhân VN khác TQ)
  - DEC-LUNAR-011 (kỷ luật ba epoch tách bạch: index-k epoch 2415021.076998695, Meeus epoch 2415020.75933, getLunarMonth11 integer 2415021 - không được dùng lẫn)
  - DEC-LUNAR-012 (zero runtime network: tính ngày hoàn toàn trên thiết bị, không gọi API; package zero-dependency)
  - DEC-LUNAR-013 (synodic constants tách vai trò: 29.530588853 cho index-k, 29.53058868 cho đa thức Meeus bên trong NewMoon)
  - DEC-LUNAR-014 (chuyển Julian/Gregorian tại JD 2299161 trong jdFromDate để dùng cho cả dải 1900-2199 và xa hơn)
  - DEC-LUNAR-015 (API trả về tuple [day, month, year, isLeap] giữ nguyên chu ký gốc Đức; isLeap là phần tử thứ tư, không tách struct ở lớp core)
language: typescript 5.x
service: packages/amlich-core/
new_files:
  - packages/amlich-core/src/convert.ts
  - packages/amlich-core/src/newmoon.ts
  - packages/amlich-core/src/sunlongitude.ts
  - packages/amlich-core/src/leap.ts
  - packages/amlich-core/src/index.ts
  - packages/amlich-core/test/convert.test.ts
modified_files:
  - "(none - greenfield)"
allowed_tools:
  - file_read: packages/amlich-core/**
  - file_write: packages/amlich-core/{src,test}/**
  - bash: cd packages/amlich-core && pnpm test
disallowed_tools:
  - "gọi network hoặc fetch trong quá trình tính ngày (vi phạm DEC-LUNAR-012 / NFR-Offline)"
  - "hard-code timeZone khác 7.0 hoặc kinh tuyến khác 105E (vi phạm DEC-LUNAR-010 / FR-A01)"
  - "thêm runtime dependency vào package.json của amlich-core (vi phạm DEC-LUNAR-012 - zero-dependency)"
effort_hours: 16
sub_tasks:
  - "2.0h: jdFromDate + jdToDate với Julian/Gregorian switch tại JD 2299161 (DEC-LUNAR-014)"
  - "3.0h: NewMoon(k) - đa thức Meeus T/T2/T3, chuỗi hiệu chỉnh C1, deltat; hằng số 2415020.75933 + 29.53058868"
  - "2.0h: SunLongitude(jdn) + getSunLongitude(dayNumber, tz) trả 0-11 với J2000 2451545.0 / 36525, dr=PI/180"
  - "1.5h: getNewMoonDay(k, tz) + getLunarMonth11(yy, tz) dùng integer 2415021"
  - "2.0h: getLeapMonthOffset(a11, tz) - quét các tháng từ a11 tìm tháng không chứa Trung khí"
  - "2.5h: convertSolar2Lunar(dd,mm,yy,tz) - epoch index-k 2415021.076998695, gán lunarMonth/Year/leap"
  - "2.0h: convertLunar2Solar(lunarDay,lunarMonth,lunarYear,lunarLeap,tz) - nghịch đảo, fallback offset"
  - "1.0h: index.ts barrel + JSDoc cho mọi hằng số, freeze constants"
risk_if_skipped: "Đây là tài sản lõi, mọi FR khác build trên nó - FR-LUNAR-002 (can-chi), FR-LUNAR-003 (validation), FR-LUNAR-004 (recurrence), FR-LUNAR-007 (lịch tháng), FR-LUNAR-010 (app shell) đều import trực tiếp. Sai bất kỳ hằng số nào trong 6.2 là sai toàn bộ lịch, và lỗi sẽ lan ra mọi nhắc. Không có engine thì không có sản phẩm."
---

## §1 - Description (BCP-14 normative)

Engine PHẢI chuyển đổi solar và lunar hai chiều cho mọi ngày trong dải 1900-2199 theo giờ Việt Nam, hoàn toàn offline, và port đúng từng hằng số của Hồ Ngọc Đức. Hợp đồng:

1. PHẢI cung cấp `convertSolar2Lunar(dd, mm, yy, tz)` trả về `[lunarDay, lunarMonth, lunarYear, lunarLeap]` cho mọi ngày dương hợp lệ trong 1900-2199, với `tz = 7.0` là mặc định Việt Nam (FR-A01, DEC-LUNAR-010).
2. PHẢI cung cấp `convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, tz)` trả về `[dd, mm, yy]`, là nghịch đảo chính xác của `convertSolar2Lunar` trong toàn dải (FR-A01, diễn giải trong FR-LUNAR-003).
3. PHẢI tính mọi thời điểm theo kinh tuyến 105E với `timeZone = 7.0`; KHÔNG ĐƯỢC dùng 120E hay UTC+8, vì đây là rule 5 quyết định sự khác biệt VN và TQ (DEC-LUNAR-010, PRD 6.1).
4. PHẢI xác định đúng tháng nhuận: tháng đầu tiên sau tháng 11 mà KHÔNG chứa Trung khí (Principal Term) là tháng nhuận, mang tên tháng trước nó kèm cờ `lunarLeap = 1` (FR-A02, PRD 6.1 rule 4).
5. PHẢI đặt `jdFromDate(dd, mm, yy)` xử lý chuyển Julian sang Gregorian tại `JD 2299161`: ngày từ 15/10/1582 trở đi dùng Gregorian, trước đó dùng Julian (DEC-LUNAR-014).
6. PHẢI tính `NewMoon(k)` bằng đa thức Meeus với `T = k / 1236.85`, các lũy thừa `T2`, `T3`, epoch `2415020.75933`, hệ số synodic per-k `29.53058868`, chuỗi hiệu chỉnh `C1` và số hạng `deltat` (PRD 6.2, 6.3, DEC-LUNAR-013).
7. PHẢI tính `SunLongitude(jdn)` bằng epoch J2000 `2451545.0` chia `36525`, với `dr = PI / 180`, trả về radian, và `getSunLongitude(dayNumber, tz) = INT(SunLongitude(dayNumber - 0.5 - tz / 24) / PI * 6)` trả về nguyên 0-11 (PRD 6.3).
8. PHẢI tính `getNewMoonDay(k, tz) = INT(NewMoon(k) + 0.5 + tz / 24)` trả về JDN của ngày chứa điểm Sóc thứ k (PRD 6.3).
9. PHẢI tính `getLunarMonth11(yy, tz)` dùng hằng số nguyên `LUNAR_MONTH11_EPOCH_INT = 2415021` (không phải bản thập phân) để tìm ngày bắt đầu tháng 11 âm chứa Đông chí (PRD 6.2, DEC-LUNAR-011).
10. PHẢI tính `getLeapMonthOffset(a11, tz)` bằng cách quét các tháng kế tiếp từ `a11`, đếm số tháng đến khi gặp tháng có `getSunLongitude` lặp lại (không tăng) - đó là tháng không chứa Trung khí (PRD 6.3).
11. PHẢI tách bạch ba epoch và hai synodic constant trong code, mọi hằng số có JSDoc ghi rõ vai trò và giá trị; KHÔNG ĐƯỢC dùng epoch này cho công thức của epoch khác (DEC-LUNAR-011, DEC-LUNAR-013).
12. PHẢI dùng `EPOCH_INDEX_K = 2415021.076998695` trong `convertSolar2Lunar` và `getLeapMonthOffset` khi suy ra chỉ số k từ một JDN (PRD 6.2).
13. PHẢI hoạt động hoàn toàn offline: KHÔNG ĐƯỢC gọi network, fetch, hay đọc đồng hồ hệ thống để tính ngày; hàm là pure và deterministic theo input (FR-A06, NFR-Offline, DEC-LUNAR-012).
14. PHẢI đặt `package.json` của amlich-core với `dependencies` rỗng; KHÔNG ĐƯỢC thêm runtime dependency (DEC-LUNAR-012).
15. PHẢI đặt mốc hiệu năng: một lần `convertSolar2Lunar` < 5ms trên thiết bị mục tiêu (NFR-Performance); các hàm là O(1) không cấp phát trong vòng nóng.
16. PHẢI freeze tất cả hằng số (ví dụ `Object.freeze` hoặc `as const`) để không bị sửa nhầm lúc runtime (DEC-LUNAR-011).
17. PHẢI export `INVALID_SOLAR: SolarDate` (giá trị `[0, 0, 0]`) và `isInvalidSolar(s): boolean` để caller kiểm sentinel đúng cách, không so sánh `=== null` (CONTRACT.md).
18. NÊN cung cấp `jdToDate(jd)` công khai để FR-LUNAR-002 và FR-LUNAR-003 tính can-chi và round-trip từ JDN mà không tự cài lại (DEC-LUNAR-015).
19. NÊN trả về `lunarLeap` là `0 | 1` thay vì boolean ở lớp core để giữ nguyên chu ký gốc của Đức; lớp UI mới map sang nhãn "nhuận" (FR-A02, DEC-LUNAR-015).

---

## §2 - Why this design (rationale for humans)

**Tại sao port tay thay vì dùng thư viện có sẵn?** PRD 6.5 khuyến nghị mạnh tự port sang TypeScript vì chỉ khoảng 300 dòng, kiểm soát hoàn toàn, và đúng chuẩn Việt Nam. Các thư viện giàu tính năng như `lunar-typescript` tính theo 120E nên cho ngày Sóc và tháng nhuận sai với VN. Tự port cho phép ghim đúng từng hằng số ở 6.2 và chứng minh độ chính xác bằng FR-LUNAR-003 (DEC-LUNAR-010, DEC-LUNAR-012).

**Tại sao 105E và timeZone = 7.0 là bất di bất dịch?** Đây là rule 5 của Hồ Ngọc Đức. Khi điểm Sóc hoặc Trung khí rơi sát nửa đêm, chênh một giờ giữa Hà Nội và Bắc Kinh đẩy ngày sang ngày khác, làm tháng 11 chứa Đông chí khác nhau, và kéo theo toàn bộ chuỗi tháng lệch. Năm 1984 Đông chí rơi 21/12 giờ Hà Nội nhưng 22/12 giờ Bắc Kinh, nên Tết 1985 VN sớm hơn TQ một tháng. Nếu hard-code sai múi giờ, cả lịch sai ở 1985 và ở 2007/2030/2053 (DEC-LUNAR-010, PRD 6.4).

**Tại sao phải tách ba epoch?** Đây là cái bẫy phổ biến nhất khi port. `convertSolar2Lunar` dùng epoch index-k `2415021.076998695` để suy k từ JDN. Bên trong `NewMoon` lại dùng epoch Meeus `2415020.75933` với đa thức. `getLunarMonth11` dùng số nguyên `2415021`. Ba giá trị gần giống nhau nhưng không thay thế cho nhau được; dùng nhầm một trong ba sẽ làm lệch ngày ở một số năm mà test toàn dải mới bắt được (DEC-LUNAR-011).

**Tại sao hai synodic constant khác nhau?** `29.530588853` dùng để quy đổi giữa JDN và chỉ số tuần trăng k (index-k). `29.53058868` là hệ số per-k bên trong đa thức Meeus của `NewMoon`. Hai con số phục vụ hai vai trò toán học khác nhau; gộp làm một sẽ sai vị trí điểm Sóc (DEC-LUNAR-013).

**Tại sao tháng nhuận xác định bằng "không chứa Trung khí"?** Theo 6.1 rule 4, năm nhuận có 13 tháng; tháng nhuận là tháng đầu tiên sau tháng 11 mà không chứa Trung khí (Principal Term). `getSunLongitude` trả về 0-11 cho biết cung hoàng đạo mặt trời; nếu hai điểm Sóc liên tiếp cho cùng một giá trị thì tháng giữa không chứa Trung khí và là tháng nhuận. `getLeapMonthOffset` quét để tìm offset đó (PRD 6.3).

**Tại sao zero-dependency và offline?** NFR-Offline yêu cầu tính ngày không cần mạng, và FR-A06 nói rõ không gọi network để tính ngày. Một package thuần hàm, không dependency, deterministic theo input là cách duy nhất đảm bảo app vẫn chạy khi máy bay chế độ hoặc mất sóng, và là điều kiện để FR-LUNAR-013 (Swift Widget) có thể re-implement hoặc bridge cùng logic (DEC-LUNAR-012).

**Tại sao trả về tuple `[day, month, year, leap]`?** Giữ nguyên chu ký gốc của Đức giảm rủi ro dịch sai khi port, và để FR-LUNAR-003 đối chiếu trực tiếp với các bản tham chiếu. Lớp core không biết về "nhãn nhuận" hay format hiển thị; đó là việc của FR-LUNAR-007 và FR-LUNAR-009. Tách mối quan tâm giữ core nhỏ và kiểm thử được (DEC-LUNAR-015).

---

## §3 - API contract

```typescript
// packages/amlich-core/src/constants.ts + types.ts  (nguon su that la scaffold, KHONG phai file nay)
// Ten hang so sau day phai khop chinh xac CONTRACT.md va src/constants.ts.

/** Mui gio mac dinh Viet Nam: kinh tuyen 105E (DEC-LUNAR-010). Xem CONTRACT: VN_TZ. */
export const VN_TZ = 7.0;

/** IANA timezone id (todayInHCM). */
export const VN_TZ_ID = "Asia/Ho_Chi_Minh";

/** Kinh tuyen tham chieu (do). */
export const VN_MERIDIAN = 105;

/** Synodic month trung binh, dung de index k (JDN <-> so tuan trang). PRD 6.2. */
export const SYNODIC_INDEX_K = 29.530588853;

/** Epoch index-k: mean new moon 1/1/1900 dang JD. Dung trong convertSolar2Lunar / getLeapMonthOffset. */
export const EPOCH_INDEX_K = 2415021.076998695;

/** Meeus mean-new-moon epoch, dung ben trong NewMoon(). PRD 6.2. CONTRACT: MEEUS_NEW_MOON_EPOCH. */
export const MEEUS_NEW_MOON_EPOCH = 2415020.75933;

/** He so synodic per-k cua Meeus, dung ben trong NewMoon(). PRD 6.2. CONTRACT: MEEUS_SYNODIC_PER_K. */
export const MEEUS_SYNODIC_PER_K = 29.53058868;

/** Epoch nguyen (integer) cho getLunarMonth11. CONTRACT: LUNAR_MONTH11_EPOCH_INT. */
export const LUNAR_MONTH11_EPOCH_INT = 2415021;

/** J2000 epoch trong SunLongitude. */
export const J2000 = 2451545.0;

/** So ngay mot Julian century. CONTRACT: JULIAN_CENTURY_DAYS. */
export const JULIAN_CENTURY_DAYS = 36525;

/** Mau so cho T trong NewMoon: T = k / T_DIVISOR. */
export const T_DIVISOR = 1236.85;

/** Degrees sang radians. */
export const DR = Math.PI / 180;

/** JD ngay chuyen Julian -> Gregorian (15/10/1582). PRD 6.3. */
export const GREGORIAN_SWITCH_JD = 2299161;

export type LunarDate = readonly [day: number, month: number, year: number, leap: 0 | 1];
export type SolarDate = readonly [day: number, month: number, year: number];
/** Sentinel cho solar khong hop le (lunarLeap khong khop): [0, 0, 0]. CONTRACT.md. */
export const INVALID_SOLAR: SolarDate;
/** Tra true khi SolarDate la sentinel [0,0,0]. CONTRACT.md. */
export function isInvalidSolar(s: SolarDate): boolean;

/** Ngày dương (dd/mm/yy) -> Julian Day Number, switch Julian/Gregorian tại 2299161. */
export function jdFromDate(dd: number, mm: number, yy: number): number;

/** JDN -> ngày dương (dd/mm/yy), nghịch đảo của jdFromDate. */
export function jdToDate(jd: number): SolarDate;

/** JD của điểm Sóc thứ k (đa thức Meeus T/T2/T3, chuỗi C1, deltat). */
export function NewMoon(k: number): number;

/** Kinh độ mặt trời (radian) tại jdn. */
export function SunLongitude(jdn: number): number;

/** = INT(SunLongitude(dayNumber - 0.5 - tz/24) / PI * 6), trả 0..11 (xác định Trung khí). */
export function getSunLongitude(dayNumber: number, tz: number): number;

/** = INT(NewMoon(k) + 0.5 + tz/24): JDN ngày chứa điểm Sóc thứ k. */
export function getNewMoonDay(k: number, tz: number): number;

/** Ngày (JDN) bắt đầu tháng 11 âm chứa Đông chí của năm dương yy. */
export function getLunarMonth11(yy: number, tz: number): number;

/** Vị trí tháng nhuận (offset tháng từ a11), 0 nếu không có. */
export function getLeapMonthOffset(a11: number, tz: number): number;

/** Solar -> lunar theo giờ Việt Nam (tz mặc định 7.0). */
export function convertSolar2Lunar(
  dd: number, mm: number, yy: number, tz?: number,
): LunarDate;

/** Lunar -> solar theo giờ Việt Nam (tz mặc định 7.0). */
export function convertLunar2Solar(
  lunarDay: number, lunarMonth: number, lunarYear: number, lunarLeap: 0 | 1, tz?: number,
): SolarDate;
```

```typescript
// packages/amlich-core/src/convert.ts  (port canonical, hằng số ở §3)

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < GREGORIAN_SWITCH_JD) {
    // trước 15/10/1582: dùng lịch Julian (DEC-LUNAR-014)
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd: number): SolarDate {
  let a: number, b: number, c: number;
  if (jd >= GREGORIAN_SWITCH_JD) {
    // 15/10/1582 (JD 2299161) trở đi dùng Gregorian; canonical Đức dùng jd > 2299160,
    // tức jd >= GREGORIAN_SWITCH_JD. Dùng dấu ">" sẽ đẩy đúng ngày switch sang nhánh Julian
    // và làm jdToDate(2299161) trả 5/10/1582 thay vì 15/10/1582 (DEC-LUNAR-014).
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

export function convertSolar2Lunar(
  dd: number, mm: number, yy: number, tz: number = VN_TZ,
): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap: 0 | 1 = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = 1;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

export function convertLunar2Solar(
  lunarDay: number, lunarMonth: number, lunarYear: number, lunarLeap: 0 | 1,
  tz: number = VN_TZ,
): SolarDate {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, tz);
    b11 = getLunarMonth11(lunarYear, tz);
  } else {
    a11 = getLunarMonth11(lunarYear, tz);
    b11 = getLunarMonth11(lunarYear + 1, tz);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0]; // tháng nhuận không khớp -> caller áp fallback (PRD 10)
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }
  const k = Math.floor(0.5 + (a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  const monthStart = getNewMoonDay(k + off, tz);
  return jdToDate(monthStart + lunarDay - 1);
}
```

```typescript
// packages/amlich-core/src/newmoon.ts

export function NewMoon(k: number): number {
  const T = k / 1236.85;           // Julian centuries từ 1900 (PRD 6.2)
  const T2 = T * T;
  const T3 = T2 * T;
  let Jd1 = MEEUS_NEW_MOON_EPOCH + MEEUS_SYNODIC_PER_K * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * DR) +
    0.0021 * Math.sin(2 * DR * M) -
    0.4068 * Math.sin(Mpr * DR) +
    0.0161 * Math.sin(2 * DR * Mpr) -
    0.0004 * Math.sin(3 * DR * Mpr) +
    0.0104 * Math.sin(2 * DR * F) -
    0.0051 * Math.sin((M + Mpr) * DR) -
    0.0074 * Math.sin((M - Mpr) * DR) +
    0.0004 * Math.sin((2 * F + M) * DR) -
    0.0004 * Math.sin((2 * F - M) * DR) -
    0.0006 * Math.sin((2 * F + Mpr) * DR) +
    0.001 * Math.sin((2 * F - Mpr) * DR) +
    0.0005 * Math.sin((2 * Mpr + M) * DR);
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

export function getNewMoonDay(k: number, tz: number): number {
  return Math.floor(NewMoon(k) + 0.5 + tz / 24);
}
```

```typescript
// packages/amlich-core/src/sunlongitude.ts

export function SunLongitude(jdn: number): number {
  const T = (jdn - J2000) / JULIAN_CENTURY_DAYS;   // J2000 / 36525 (PRD 6.2)
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M) +
    (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) +
    0.00029 * Math.sin(DR * 3 * M);
  let L = L0 + DL;
  L = L * DR;
  L = L - PI * 2 * Math.floor(L / (PI * 2));   // chuẩn hóa về [0, 2PI)
  return L;
}

export function getSunLongitude(dayNumber: number, tz: number): number {
  return Math.floor((SunLongitude(dayNumber - 0.5 - tz / 24) / PI) * 6);
}
```

```typescript
// packages/amlich-core/src/leap.ts

export function getLunarMonth11(yy: number, tz: number): number {
  const off = jdFromDate(31, 12, yy) - LUNAR_MONTH11_EPOCH_INT;   // integer epoch (PRD 6.2)
  const k = Math.floor(off / SYNODIC_INDEX_K);
  let nm = getNewMoonDay(k, tz);
  const sunLong = getSunLongitude(nm, tz);                  // mặt trời tại điểm Sóc này
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, tz);
  }
  return nm;
}

export function getLeapMonthOffset(a11: number, tz: number): number {
  const k = Math.floor((a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K + 0.5);
  let last = 0;
  let i = 1; // bắt đầu từ tháng sau tháng 11
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}
```

---

## §4 - Acceptance criteria

1. `convertSolar2Lunar(29, 1, 2025, 7)` trả về `[1, 1, 2025, 0]` (Tết 2025, fixture 6.6).
2. `convertSolar2Lunar(10, 2, 2024, 7)` trả về `[1, 1, 2024, 0]` (Tết 2024).
3. `convertSolar2Lunar(2, 2, 1984, 7)` trả về `[1, 1, 1984, 0]` (mốc Đức công bố).
4. `convertLunar2Solar(1, 1, 2025, 0, 7)` trả về `[29, 1, 2025]` (nghịch đảo AC #1).
5. Round-trip: với một mẫu ngày dương bất kỳ trong 1900-2199, `convertLunar2Solar(...convertSolar2Lunar(d, m, y, 7), 7)` trả lại đúng `[d, m, y]`.
6. `jdFromDate(15, 10, 1582)` trả về `2299161` (ngày switch, nhánh Gregorian); `jdFromDate(4, 10, 1582)` trả về `2299160` qua nhánh Julian (ngày Julian liền trước switch - lưu ý 14/10/1582 KHÔNG tồn tại liền kề vì Julian và Gregorian lệch 10 ngày tại mốc 1582, `jdFromDate(14, 10, 1582)` rơi vào nhánh Julian và trả `2299170`) (DEC-LUNAR-014).
7. `jdToDate(jdFromDate(dd, mm, yy))` trả lại `[dd, mm, yy]` cho mọi ngày test (nghịch đảo JDN).
8. `getSunLongitude` luôn trả về số nguyên trong `[0, 11]` cho mọi JDN trong dải.
9. `getNewMoonDay(k, 7)` cho ngày JDN nguyên (không phải số thực) với mọi k tương ứng 1900-2199.
10. Năm 1985 phát hiện tháng 2 nhuận: tồn tại tháng âm `[*, 2, 1985, 1]` và `convertLunar2Solar` của nó rơi vào khoảng 21/03 đến 19/04/1985 (fixture 6.6).
11. Tết VN 1985 = 21/01/1985: `convertLunar2Solar(1, 1, 1985, 0, 7)` trả về `[21, 1, 1985]` (sớm hơn TQ một tháng, PRD 6.4).
12. Hằng số trong module bị freeze: gán lại `EPOCH_INDEX_K` ở runtime ném lỗi (strict mode) hoặc không có tác dụng (DEC-LUNAR-011, §1 #16).
13. `package.json` của amlich-core có `dependencies` rỗng (DEC-LUNAR-012).
14. Hiệu năng: trung bình một lần `convertSolar2Lunar` < 5ms khi đo qua 10.000 lần gọi (NFR-Performance).
15. Không có lỗi gọi network trong suốt test suite (offline guard; DEC-LUNAR-012).
16. `convertLunar2Solar` với cờ nhuận không khớp (ví dụ tháng không phải tháng nhuận của năm đó) trả về `[0, 0, 0]` để báo caller áp fallback (PRD 10, liên quan FR-LUNAR-004).
17. `INVALID_SOLAR` bằng `[0, 0, 0]`; `isInvalidSolar(INVALID_SOLAR)` trả về `true`; `isInvalidSolar([29, 1, 2025])` trả về `false` (CONTRACT.md, §1 #17).

---

## §5 - Verification

```typescript
// packages/amlich-core/test/convert.test.ts
import { describe, it, expect } from "vitest";
import {
  convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate,
  getSunLongitude, GREGORIAN_SWITCH_JD, VN_TZ, INVALID_SOLAR, isInvalidSolar,
} from "../src/index";

const TZ = VN_TZ;

describe("Tet fixtures (PRD 6.6)", () => {
  it("29/01/2025 -> 1/1/2025 (At Ty)", () => {
    expect(convertSolar2Lunar(29, 1, 2025, TZ)).toEqual([1, 1, 2025, 0]);
  });
  it("17/02/2026 -> 1/1/2026 (Binh Ngo)", () => {
    expect(convertSolar2Lunar(17, 2, 2026, TZ)).toEqual([1, 1, 2026, 0]);
  });
  it("10/02/2024 -> 1/1/2024 (Giap Thin)", () => {
    expect(convertSolar2Lunar(10, 2, 2024, TZ)).toEqual([1, 1, 2024, 0]);
  });
  it("22/01/2023 -> 1/1/2023 (Quy Mao)", () => {
    expect(convertSolar2Lunar(22, 1, 2023, TZ)).toEqual([1, 1, 2023, 0]);
  });
  it("02/02/1984 -> 1/1/1984 (Giap Ty)", () => {
    expect(convertSolar2Lunar(2, 2, 1984, TZ)).toEqual([1, 1, 1984, 0]);
  });
});

describe("Julian/Gregorian switch (DEC-LUNAR-014)", () => {
  it("15/10/1582 = JD 2299161 (ngay switch)", () => {
    expect(jdFromDate(15, 10, 1582)).toBe(GREGORIAN_SWITCH_JD);
  });
  it("4/10/1582 = JD 2299160 qua nhanh Julian (ngay Julian lien truoc switch)", () => {
    expect(jdFromDate(4, 10, 1582)).toBe(2299160);
  });
  it("jdToDate(2299161) == 15/10/1582 (bien switch, bat off-by-one o nhanh Gregorian)", () => {
    // Bo guard "jd > GREGORIAN_SWITCH_JD" se day dung ngay switch sang nhanh Julian -> 5/10/1582.
    expect(jdToDate(GREGORIAN_SWITCH_JD)).toEqual([15, 10, 1582]);
  });
  it("jdToDate is the inverse of jdFromDate (gom ca ngay switch)", () => {
    for (const [d, m, y] of [[1, 1, 1900], [31, 12, 2199], [29, 1, 2025], [15, 10, 1582]] as const) {
      expect(jdToDate(jdFromDate(d, m, y))).toEqual([d, m, y]);
    }
  });
});

describe("Reverse + round-trip (NFR-Accuracy)", () => {
  it("L2S inverts S2L for Tet 2025", () => {
    expect(convertLunar2Solar(1, 1, 2025, 0, TZ)).toEqual([29, 1, 2025]);
  });
  it("round-trip identity sweep 1900-2199 (step 37 days)", () => {
    const start = jdFromDate(1, 1, 1900);
    const end = jdFromDate(31, 12, 2199);
    for (let jd = start; jd <= end; jd += 37) {
      const [d, m, y] = jdToDate(jd);
      const [ld, lm, ly, leap] = convertSolar2Lunar(d, m, y, TZ);
      expect(convertLunar2Solar(ld, lm, ly, leap, TZ)).toEqual([d, m, y]);
    }
  });
});

describe("1985 leap month 2 + early Tet (PRD 6.4 / 6.6)", () => {
  it("Tet VN 1985 = 21/01/1985 (som hon TQ mot thang)", () => {
    expect(convertLunar2Solar(1, 1, 1985, 0, TZ)).toEqual([21, 1, 1985]);
  });
  it("thang 2 nhuan 1985 ton tai va roi trong 21/03..19/04", () => {
    const solar = convertLunar2Solar(1, 2, 1985, 1, TZ);
    expect(solar).not.toEqual([0, 0, 0]);
    const jd = jdFromDate(solar[0], solar[1], solar[2]);
    expect(jd).toBeGreaterThanOrEqual(jdFromDate(21, 3, 1985));
    expect(jd).toBeLessThanOrEqual(jdFromDate(19, 4, 1985));
  });
});

describe("getSunLongitude bounds + perf", () => {
  it("luon tra 0..11", () => {
    const start = jdFromDate(1, 1, 1900);
    for (let jd = start; jd < start + 1200; jd += 11) {
      const v = getSunLongitude(jd, TZ);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });
  it("convertSolar2Lunar < 5ms trung binh tren 10k lan", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) convertSolar2Lunar(29, 1, 2025, TZ);
    const per = (performance.now() - t0) / 10_000;
    expect(per).toBeLessThan(5);
  });
});

describe("Leap mismatch -> [0,0,0] (PRD 10)", () => {
  it("co nhuan khong khop tra ve sentinel", () => {
    // 2025 khong co thang 5 nhuan -> yeu cau thang 5 nhuan tra ve [0,0,0]
    expect(convertLunar2Solar(1, 5, 2025, 1, TZ)).toEqual([0, 0, 0]);
  });
});

describe("INVALID_SOLAR / isInvalidSolar (CONTRACT.md, AC #17)", () => {
  it("INVALID_SOLAR === [0,0,0]", () => {
    expect(INVALID_SOLAR).toEqual([0, 0, 0]);
  });
  it("isInvalidSolar(INVALID_SOLAR) = true", () => {
    expect(isInvalidSolar(INVALID_SOLAR)).toBe(true);
  });
  it("isInvalidSolar([29,1,2025]) = false", () => {
    expect(isInvalidSolar([29, 1, 2025])).toBe(false);
  });
  it("convertLunar2Solar nhuan khong khop la isInvalidSolar", () => {
    const s = convertLunar2Solar(1, 5, 2025, 1, TZ);
    expect(isInvalidSolar(s)).toBe(true);
  });
});
```

---

## §6 - Implementation skeleton

API contract ở §3 là skeleton đầy đủ; toàn bộ logic đã port nguyên vẹn. Chi tiết duy nhất đáng ghim lại là thứ tự suy k trong `convertSolar2Lunar`: tính `k` từ `EPOCH_INDEX_K`, lấy `getNewMoonDay(k + 1)`, và nếu nó vượt qua `dayNumber` thì lùi về `getNewMoonDay(k)`. Đây là chỗ dễ sai off-by-one nhất; FR-LUNAR-003 round-trip sweep là lưới an toàn bắt mọi lệch ở bước này. Hằng số trong §3 PHẢI được `Object.freeze` ở barrel `index.ts`.

---

## §7 - Dependencies

Upstream: không có. Đây là primitive thấp nhất của hệ thống; depends_on rỗng.

Downstream: FR-LUNAR-002 dùng `jdToDate` và `getSunLongitude` cho can-chi và tiết khí; FR-LUNAR-003 dùng toàn bộ API làm golden harness; FR-LUNAR-004 gọi `convertLunar2Solar` mỗi năm cho recurrence engine; FR-LUNAR-007 dùng `convertSolar2Lunar` để vẽ lịch tháng; FR-LUNAR-008 neo các dịp vào ngày âm; FR-LUNAR-010 import core vào app shell; FR-LUNAR-013 re-implement hoặc bridge logic tối thiểu sang Swift. Tất cả tên trong `blocks` khớp frontmatter.

Cross-cutting: các hằng số ở §3 là nguồn sự thật duy nhất cho mọi FR phía sau; sửa ở đây ảnh hưởng toàn hệ. Hiệu năng < 5ms của FR này là điều kiện cho NFR-Performance render < 100ms của FR-LUNAR-007.

---

## §8 - Example payloads

```json
{
  "input": { "fn": "convertSolar2Lunar", "args": [29, 1, 2025, 7.0] },
  "output": [1, 1, 2025, 0],
  "note": "Tet At Ty; leap = 0"
}
```

```json
{
  "input": { "fn": "convertLunar2Solar", "args": [1, 2, 1985, 1, 7.0] },
  "output": [21, 3, 1985],
  "note": "tháng 2 nhuận 1985; một trong các năm nhuận lịch sử"
}
```

```json
{
  "input": { "fn": "convertLunar2Solar", "args": [1, 5, 2025, 1, 7.0] },
  "output": [0, 0, 0],
  "note": "cờ nhuận không khớp -> sentinel cho caller áp fallback (PRD 10)"
}
```

---

## §9 - Open questions

Đã giải quyết trong phạm vi FR này: dải 1900-2199, múi giờ 105E, ba epoch, format tuple, sentinel `[0,0,0]` cho nhuận không khớp.

Defer (gắn với Caveats PRD):
- Độ chính xác ở các năm rất xa (trước ~1200 hoặc sau 2199) khi điểm Sóc rơi sát nửa đêm có thể lệch 1 ngày; bản thuật toán công bố là bản đơn giản hóa. Không mở rộng dải trong FR này; FR-LUNAR-003 chỉ cam kết 1900-2199 và đánh dấu các năm nghi ngờ nếu phát hiện.
- Hong Kong Observatory cảnh báo discrepancy quanh 28/9/2057 (chuẩn TQ 120E); chỉ liên quan khi cross-check TQ, không ảnh hưởng kết quả VN. Ghi nhận, không xử lý ở core.
- Có cung cấp thêm hàm tiện ích (ví dụ tính tuổi âm, số ngày giữa hai ngày âm) hay không - defer sang các FR cần nó, không đưa vào core ở slice 1.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Dùng nhầm epoch (ví dụ Meeus epoch trong convertSolar2Lunar) | round-trip sweep FR-LUNAR-003 fail một số năm | lệch ngày không hệ thống | sửa về đúng epoch theo §3 |
| Gộp hai synodic constant làm một | điểm Sóc lệch, fixture Tết fail | sai ngày đầu tháng | tách 29.530588853 và 29.53058868 |
| Hard-code tz != 7.0 hoặc 120E | 1985 và 2007/2030/2053 fail | toàn bộ lịch theo TQ | khóa VN_TIMEZONE = 7.0 |
| Quên Julian/Gregorian switch | jdFromDate sai trước 1582 | JDN lệch với ngày cổ | nhánh `jd < 2299161` -> Julian |
| Off-by-one ở biên switch trong jdToDate (`jd > 2299161` thay vì `>=`) | round-trip sweep 1900-2199 KHÔNG bắt được (mọi JDN >> biên); chỉ lộ ở AC test ngày switch | `jdToDate(2299161)` trả 5/10/1582 thay 15/10/1582 | dùng `jd >= GREGORIAN_SWITCH_JD` (đồng nghĩa canonical `jd > 2299160`); test ngày switch ở §5 |
| getSunLongitude không chuẩn hóa về [0,2PI) | trả về ngoài [0,11] | tháng nhuận sai | modulo 2PI trong SunLongitude |
| Off-by-one khi suy k | ngày đầu tháng lệch 1 | lunarDay sai | lùi getNewMoonDay(k) khi vượt dayNumber |
| getLeapMonthOffset vòng vô hạn | treo khi năm lỗi dữ liệu | hang | chặn `i < 14` trong vòng do-while |
| Cờ nhuận không khớp trong L2S | trả về [0,0,0] | caller chưa xử lý | FR-LUNAR-004 áp fallback tháng thường |
| Float precision tích lũy ở năm xa | round-trip lệch 1 ngày năm xa | sai ngày hiếm | giữ dải 1900-2199, đánh dấu nghi ngờ |
| Hằng số bị sửa ở runtime | gán lại ném hoặc vô hiệu | sai im lặng | Object.freeze + test AC #12 |
| Thêm dependency vô tình | package.json deps khác rỗng | mất zero-dep | test AC #13 guard |
| Gọi network trong test | offline guard bắt | mất NFR-Offline | xóa mọi fetch/IO khỏi core |
| Input ngoài dải dương lịch (ví dụ yy < 1900) | trả về vẫn dùng nhưng chưa test | không đảm bảo | caller chặn dải trước khi gọi |

---

## §11 - Implementation notes

- Ba epoch là cái bẫy lớn nhất: `EPOCH_INDEX_K = 2415021.076998695` cho convertSolar2Lunar và getLeapMonthOffset, `MEEUS_NEW_MOON_EPOCH = 2415020.75933` chỉ bên trong NewMoon, `LUNAR_MONTH11_EPOCH_INT = 2415021` là số nguyên cho getLunarMonth11. Đặt ba hằng số cạnh nhau trong constants.ts với JSDoc vai trò để không ai dùng nhầm.
- Hai synodic constant cũng một dạng bẫy: `SYNODIC_INDEX_K = 29.530588853` chỉ để quy đổi JDN và k; `MEEUS_SYNODIC_PER_K = 29.53058868` là hệ số per-k trong đa thức Meeus. Không gộp.
- `getSunLongitude` PHẢI nhận `dayNumber - 0.5 - tz/24` chứ không phải `dayNumber`; trừ 0.5 vì JDN bắt đầu lúc trưa, trừ tz/24 để quy về giờ địa phương 105E. Sai dấu ở đây làm Trung khí lệch.
- `getNewMoonDay` làm tròn `NewMoon(k) + 0.5 + tz/24` xuống để ra JDN nguyên của ngày chứa điểm Sóc; cộng 0.5 và tz/24 cùng lý do trên.
- Vòng `getLeapMonthOffset` so sánh `getSunLongitude` của các điểm Sóc liên tiếp; khi giá trị lặp lại (không tăng) thì tháng giữa không chứa Trung khí và là tháng nhuận. Phải chặn `i < 14` để không treo khi dữ liệu bất thường.
- `convertLunar2Solar` trả `[0,0,0]` khi cờ nhuận không khớp năm; đây là sentinel có chủ ý để FR-LUNAR-004 áp quy tắc fallback (giờ tháng nhuận cũng vào tháng thường), không phải lỗi ném.
- Round-trip sweep 1900-2199 là lưới an toàn rẻ nhất: nó bắt mọi off-by-one ở suy k, mọi lệch epoch, và mọi lỗi múi giờ mà fixture Tết lẻ không chạm tới. Chạy nó trong CI mỗi commit chạm vào core.
- Freeze hằng số ở barrel và kiểm tra bằng AC #12; một lần sửa nhầm giá trị runtime là sai im lặng cả lịch, khó debug nhất trong các loại lỗi.

---

*Hết FR-LUNAR-001.*
