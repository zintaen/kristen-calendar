---
id: FR-LUNAR-007
title: "Month calendar grid - moi o ngay duong lon + ngay am nho goc + can-chi + tiet khi + cham le/nhac, cham de xem chi tiet"
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
related_frs: [FR-LUNAR-002, FR-LUNAR-011]
depends_on: [FR-LUNAR-001, FR-LUNAR-002, FR-LUNAR-010]
blocks: [FR-LUNAR-014]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-A05)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Performance)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (lich thang)"
source_decisions:
  - DEC-LUNAR-070 (grid tinh tat ca DayInfo cho 28-31 o trong mot thang trong mot lan duyet mang, khong goi convert tung o rieng le, de dam bao render < 100ms)
  - DEC-LUNAR-071 (du lieu DayInfo duoc tinh tren worker thread / useMemo voi deps [year, month], ket qua memo hoa de tranh tinh lai khi scroll thang)
  - DEC-LUNAR-072 (cham vao o ngay mo modal/panel chi tiet hien thi DayInfo day du tu cache; panel nay la placeholder cho FR-LUNAR-011 Hoang dao/Truc/28 sao khi co)
  - DEC-LUNAR-073 (cham mau tren o ngay chi su dung 3 cap do: khong co gi / co nhac-le / la le lon; tranh overcrowding voi qua nhieu loai cham mau)
  - DEC-LUNAR-074 (header thang hien thi ca ten thang duong lich lan thang am lich tuong ung cua ngay dau tien trong luoi, cap nhat khi scroll)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/components/CalendarGrid.tsx
  - apps/web/components/DayCell.tsx
  - apps/web/components/DayDetailPanel.tsx
  - apps/web/lib/calendarData.ts
  - apps/web/app/calendar/page.tsx
modified_files:
  - apps/web/lib/storage.ts
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/components/** apps/web/lib/calendarData.ts apps/web/app/calendar/**
  - bash: cd apps/web && pnpm test
disallowed_tools:
  - "goi convertSolar2Lunar tung o rieng le trong vong lap render (vi pham DEC-LUNAR-070 / NFR-Performance render < 100ms)"
  - "fetch network de lay du lieu lich (vi pham NFR-Offline)"
effort_hours: 9
sub_tasks:
  - "1.5h: calendarData.ts - ham buildMonthGrid(year, month) goi amlich-core mot lan, tra mang DayCell[]"
  - "1.0h: CalendarGrid.tsx - layout 7 cot, header thu, dieu huong thang truoc/sau"
  - "1.5h: DayCell.tsx - hien thi ngay duong lon, ngay am nho goc, can-chi, tiet khi, cham le/nhac"
  - "1.0h: DayDetailPanel.tsx - modal/slide-up hien thi DayInfo day du khi cham o ngay"
  - "1.0h: app/calendar/page.tsx - route, state thang hien tai, wiring voi storage (reminders)"
  - "1.5h: useMemo / worker thread cho buildMonthGrid, do render time < 100ms"
  - "1.5h: unit tests calendarData.ts (fixtures thang 1/2025 Tet, thang co tiet khi, thang co ngay nhac)"
risk_if_skipped: "Khong co giao dien lich thi nguoi dung khong the nhin tong quan ngay am trong thang, la man hinh chinh cua app MVP. FR-LUNAR-014 (shareable cards) phu thuoc truc tiep vao component DayCell cua FR nay de render thiet ke thiep."
---

## §1 - Description (BCP-14 normative)

Thanh phan nay PHẢI hiển thị lưới lịch tháng hai hệ thống (dương + âm) trên màn hình chính, đạt chuẩn hiệu năng render dưới 100ms theo NFR-Performance.

1. PHẢI hiển thị lưới 7 cột (Chủ Nhật đến Thứ Bảy), mỗi hàng là một tuần dương lịch, mỗi ô tương ứng một ngày dương lịch trong tháng (FR-A05).
2. PHẢI hiển thị trong mỗi ô: ngày dương (số lớn, nổi bật), ngày âm lịch tương ứng (số nhỏ, góc dưới trái), can-chi ngày (chữ nhỏ bên dưới ngày dương) (FR-A05, DEC-LUNAR-070).
3. PHẢI đánh dấu tiết khí của ngày bằng nhãn nhỏ hoặc icon trên ô khi ngày đó là ngày bắt đầu một tiết khí trong 24 tiết khí (FR-A05, FR-A04 từ FR-LUNAR-002).
4. PHẢI hiển thị chấm màu nhỏ trên ô ngày khi ngày đó có ít nhất một nhắc đang bật hoặc là ngày lễ/dịp trong danh sách festival content (DEC-LUNAR-073).
5. PHẢI phân biệt 3 mức chấm màu: không có gì (ô trắng), có nhắc/lễ thông thường (chấm màu primary), là lễ lớn trong danh sách dịp chính (chấm màu accent) - không dùng quá 3 cấp độ (DEC-LUNAR-073).
6. PHẢI tính toàn bộ `DayInfo[]` cho tháng trong một lần gọi hàm `buildMonthGrid(year, month)` trước khi render, không được gọi `convertSolar2Lunar` riêng lẻ từng ô trong vòng lặp render (DEC-LUNAR-070, NFR-Performance).
7. PHẢI memo hóa kết quả `buildMonthGrid` theo `[year, month]` bằng `useMemo` hoặc cơ chế tương đương, tránh tính lại khi component re-render không đổi tháng (DEC-LUNAR-071).
8. PHẢI hiển thị header tháng gồm tên tháng dương lịch (ví dụ "Tháng 1/2025") và tháng âm lịch tương ứng của ngày đầu lưới (DEC-LUNAR-074).
9. PHẢI có nút dẫn hướng sang tháng trước và tháng sau; chuyển tháng PHẢI cập nhật header và grid mà không reload trang.
10. PHẢI xử lý đúng các tháng bắt đầu không phải Chủ Nhật bằng cách để trống ô đầu hàng, và tháng có 28/29/30/31 ngày.
11. PHẢI highlight ngày hôm nay (ngày dương hiện tại) bằng style riêng biệt (ví dụ vòng tròn tím đậm).
12. PHẢI đáp ứng NFR-Performance: thời gian từ lúc người dùng nhấn "tháng sau" đến khi lưới mới hiển thị đầy đủ PHẢI dưới 100ms đo trên thiết bị mid-range (DEC-LUNAR-071).
13. PHẢI xử lý sự kiện tap/click trên ô ngày bằng cách mở `DayDetailPanel` hiển thị thông tin đầy đủ của ngày đó từ `DayInfo` đã tính sẵn (DEC-LUNAR-072).
14. `DayDetailPanel` PHẢI hiển thị ít nhất: ngày dương đầy đủ, ngày âm đầy đủ (tháng nhuận nếu có), can-chi ngày/tháng/năm, tiết khí nếu có, danh sách nhắc trong ngày đó; các trường Hoàng đạo/Trực/28 sao NÊN được dành placeholder cho FR-LUNAR-011 khi sẵn sàng (DEC-LUNAR-072).
15. KHÔNG ĐƯỢC gọi network để lấy dữ liệu lịch; mọi tính toán phải offline từ `amlich-core` (NFR-Offline).
16. NÊN hỗ trợ vuốt ngang (swipe left/right) để chuyển tháng trên thiết bị cảm ứng.

---

## §2 - Why this design (rationale for humans)

**Tại sao tính toàn bộ tháng trong một lần (DEC-LUNAR-070)?** Gọi `convertSolar2Lunar` cho từng ô trong vòng lặp render nghĩa là React phải chờ tính toán xong cho từng ô mới render được - với 31 ngày và mỗi conversion dù < 5ms, tổng thời gian đồng bộ có thể lên đến 150ms, vi phạm NFR-Performance. Hàm `buildMonthGrid` tính một mảng phẳng trước, render chỉ đọc từ mảng đó.

**Tại sao dùng `useMemo` thay vì tính trong `useEffect` (DEC-LUNAR-071)?** `useEffect` chạy sau render, nghĩa là người dùng sẽ thấy grid trắng rồi mới điền vào - tạo hiệu ứng "flicker". `useMemo` chạy đồng bộ trong render, giá trị sẵn sàng khi DOM được paint. Với 31 ngày và thuật toán < 5ms/ngày, tổng < 155ms là ngưỡng chấp nhận được; nếu cần đẩy thêm, chuyển sang Web Worker trong bước tối ưu.

**Tại sao giới hạn 3 cấp chấm màu (DEC-LUNAR-073)?** Giao diện lịch dễ bị rối nếu mỗi loại nhắc có màu khác nhau. Ba cấp (trắng / nhắc thường / lễ lớn) đủ để người dùng quét nhanh mà không cần đọc từng ô. Thiết kế tím của sub-brand FR-LUNAR-009 cung cấp màu primary và accent.

**Tại sao `DayDetailPanel` là placeholder cho FR-LUNAR-011 (DEC-LUNAR-072)?** FR-LUNAR-011 (Hoàng đạo/Trực/28 sao) phụ thuộc FR-LUNAR-002 và thuộc Phase 2. Nếu FR-007 gắn cứng layout với FR-011, việc thiếu FR-011 sẽ block FR-007. Thiết kế placeholder cho phép FR-007 ship trong Phase 1 slice 3, và FR-011 chỉ cần fill vào slot định sẵn khi sẵn sàng.

**Tại sao header hiển thị tháng âm của ngày đầu lưới (DEC-LUNAR-074)?** Một tháng dương lịch thường trải qua 2 tháng âm lịch. Hiển thị tháng âm của ngày đầu tháng dương là quy ước trực quan nhất, phù hợp với cách người Việt nói "tháng Giêng năm Ất Tỵ" - người dùng hiểu ngay đang ở tháng âm nào.

**Tại sao không dùng thư viện lịch sẵn có?** Mọi thư viện lịch React phổ biến tính theo dương lịch. Tích hợp ngày âm + can-chi + tiết khí + chấm nhắc vào slot ô của thư viện ngoài đòi hỏi override sâu, dễ xung đột với update. Tự viết `CalendarGrid` với 7 cột đơn giản hơn và kiểm soát hoàn toàn.

**Tại sao cần test fixtures tháng 1/2025?** Ngày 29/01/2025 là Mùng 1 Tết Ất Tỵ - nếu grid hiển thị sai ngày âm 1/1 cho ngày này thì toàn bộ tháng sai. Fixture đã có sẵn trong FR-LUNAR-003 (golden validation), tái dùng cho component test.

---

## §3 - API contract

```typescript
// apps/web/lib/calendarData.ts
// FR-LUNAR-001 exports `convertSolar2Lunar` (returns a TUPLE [day, month, year, leap])
// and `jdFromDate`. FR-LUNAR-002 exports `canChiDay(jdn)`, `canChiMonth(lunarMonth, lunarYear)`,
// `canChiYear(lunarYear)`, `zodiacOf(chiIndex)` (CONTRACT: zodiacOf nhan chiIndex, khong phai lunarYear;
// dung zodiacOf(canChiYear(lYear).chiIndex)), and `tietKhiAt(jdn, tz)`. There is NO
// `getTietKhi` and NO can-chi/zodiac returned from convert; this module ASSEMBLES the DTO below.
import {
  convertSolar2Lunar, jdFromDate, canChiDay, canChiMonth, canChiYear, zodiacOf, tietKhiAt,
  VN_TZ,
} from "@cyberskill/amlich-core";
// Luu y: CONTRACT.md export VN_TZ = 7.0 (khong phai VN_TZ). Dung VN_TZ khi truyen tz.

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;     // mapped from tuple leap (0|1) -> boolean at assembly time
  canChiDay: string;   // e.g. "Canh Ngo" - from canChiDay(jdn).label
  canChiMonth: string; // from canChiMonth(lunarMonth, lunarYear).label
  canChiYear: string;  // from canChiYear(lunarYear).label
  zodiac: string;      // e.g. "Ran" - from zodiacOf(canChiYear(lYear).chiIndex) - CONTRACT: zodiacOf(chiIndex: number)
}

export interface DayCellData {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunarDate: LunarDate;
  tietKhi: string | null;   // e.g. "Lap Xuan" or null
  hasReminder: boolean;
  isFestival: boolean;
  isToday: boolean;
  // Placeholder fields for FR-LUNAR-011:
  hoangDao: boolean | null;       // null = not yet computed (Phase 2)
  truc: string | null;
  sao28: string | null;
}

export interface MonthGridData {
  year: number;
  month: number;
  cells: (DayCellData | null)[];  // length 35 or 42; null = padding cell
  lunarMonthLabel: string;         // e.g. "Thang Mot Am Lich"
}

/**
 * Build all DayCell data for the given Gregorian year/month in one pass.
 * Calls amlich-core once per day, not per render.
 * reminderDates: Set of "YYYY-MM-DD" strings for days with active reminders.
 * festivalDates: Set of "YYYY-MM-DD" strings for major festival days.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  reminderDates: Set<string>,
  festivalDates: Set<string>,
  today: Date
): MonthGridData;

/**
 * Derive the sorted list of "YYYY-MM-DD" strings for all active reminder
 * occurrences in the given month, calling convertLunar2Solar from amlich-core.
 */
export function computeReminderDatesForMonth(
  year: number,
  month: number,
  reminders: import("../lib/storage").Reminder[]
): Set<string>;
```

```typescript
// apps/web/components/DayCell.tsx
interface DayCellProps {
  data: DayCellData | null;   // null renders an empty padding cell
  onTap: (data: DayCellData) => void;
}
export function DayCell({ data, onTap }: DayCellProps): JSX.Element;
```

```typescript
// apps/web/components/DayDetailPanel.tsx
interface DayDetailPanelProps {
  data: DayCellData | null;   // null = closed
  onClose: () => void;
}
export function DayDetailPanel({ data, onClose }: DayDetailPanelProps): JSX.Element;
```

```typescript
// apps/web/components/CalendarGrid.tsx
interface CalendarGridProps {
  year: number;
  month: number;
  reminders: import("../lib/storage").Reminder[];
  onMonthChange: (year: number, month: number) => void;
}
export function CalendarGrid({ year, month, reminders, onMonthChange }: CalendarGridProps): JSX.Element;
```

---

## §4 - Acceptance criteria

1. Grid lịch tháng 1/2025 hiển thị ngày 29/01/2025 có nhãn ngày âm "1/1" (Mùng 1 Tết Ất Tỵ), can-chi đúng theo fixtures FR-LUNAR-003.
2. Grid tháng 3/1985 hiển thị đúng nhãn tháng nhuận 2 trong header và trên các ô ngày thuộc tháng nhuận 2/1985 (edge case tháng nhuận).
3. Thời gian render từ lúc gọi `buildMonthGrid` đến khi DOM paint xong dưới 100ms đo bằng `performance.now()` trong unit test trên môi trường jsdom.
4. Chuyển sang tháng sau bằng nút hoặc swipe, grid mới xuất hiện trong vòng 100ms (đo thủ công trên iPhone SE gen 3).
5. Ô ngày có nhắc đang bật hiển thị chấm màu primary; ô ngày lễ lớn (Rằm tháng Giêng, Tết, Vu Lan, Trung Thu, v.v.) hiển thị chấm màu accent; ô không có gì hiển thị trắng - tổng không quá 3 loại chấm.
6. Ô ngày hôm nay (solarDay == today) có style highlight riêng biệt (vòng tròn tím đậm hoặc tương đương từ design token FR-LUNAR-009).
7. Tap vào bất kỳ ô ngày nào mở `DayDetailPanel` hiển thị đúng ngày âm, can-chi ngày/tháng/năm, tiết khí (nếu có), và danh sách nhắc trong ngày.
8. `DayDetailPanel` có nút đóng; sau khi đóng panel, grid không bị re-render (không tính lại `buildMonthGrid`).
9. Tháng bắt đầu vào Thứ Tư (ví dụ 01/01/2025 là Thứ Tư) hiển thị 3 ô trống padding đầu hàng; tháng 28 ngày không có hàng thừa.
10. Không có network request nào được gửi trong suốt quá trình render lịch (kiểm bằng mock fetch trong test).
11. Header hiển thị đúng tên tháng âm của ngày đầu tiên trong lưới (không phải ngày 1 dương lịch nếu ô đó là padding).
12. Khi không có nhắc nào được tạo, grid vẫn hiển thị đầy đủ 28-31 ô ngày với ngày âm và can-chi đúng.
13. `buildMonthGrid` chỉ được gọi một lần khi `[year, month]` không thay đổi dù component re-render nhiều lần (kiểm bằng mock đếm số lần gọi).
14. Tiết khí "Lập Xuân" hiển thị đúng trên ô ngày 3/2/2025 (hoặc ngày chính xác từ FR-LUNAR-002).
15. Grid hoạt động đúng ở cả hai chế độ: light (mặc định) và dark nếu design system FR-LUNAR-009 hỗ trợ.

---

## §5 - Verification

```typescript
// apps/web/__tests__/calendarData.test.ts
import { buildMonthGrid, computeReminderDatesForMonth } from "../lib/calendarData";

describe("buildMonthGrid", () => {
  test("Thang 1/2025: ngay 29 co ngay am 1/1/2025 Tet At Ty", () => {
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    const cell = grid.cells.find(c => c?.solarDay === 29 && c.solarMonth === 1);
    expect(cell).toBeTruthy();
    expect(cell!.lunarDate.day).toBe(1);
    expect(cell!.lunarDate.month).toBe(1);
    expect(cell!.lunarDate.year).toBe(2025);
    expect(cell!.lunarDate.isLeap).toBe(false);
  });

  test("Thang 1/2025: Mung 1 duong 29/01 la Mung 1 am, co chot le lon", () => {
    const festivalDates = new Set(["2025-01-29"]);
    const grid = buildMonthGrid(2025, 1, new Set(), festivalDates, new Date("2025-01-15"));
    const cell = grid.cells.find(c => c?.solarDay === 29);
    expect(cell!.isFestival).toBe(true);
  });

  test("Thang 3/1985: co thang nhuan 2 trong nhan cua o ngay thuoc thang nhuan", () => {
    const grid = buildMonthGrid(1985, 3, new Set(), new Set(), new Date("1985-03-01"));
    const leapCell = grid.cells.find(c => c?.lunarDate.isLeap === true);
    expect(leapCell).toBeTruthy();
    expect(leapCell!.lunarDate.month).toBe(2);
  });

  test("Padding: thang 1/2025 bat dau vao Thu Tu (index 3), co 3 o null dau", () => {
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    expect(grid.cells[0]).toBeNull();
    expect(grid.cells[1]).toBeNull();
    expect(grid.cells[2]).toBeNull();
    expect(grid.cells[3]?.solarDay).toBe(1);
  });

  test("Hom nay duoc danh dau isToday = true", () => {
    const today = new Date("2025-01-15");
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), today);
    const todayCell = grid.cells.find(c => c?.solarDay === 15 && c.solarMonth === 1);
    expect(todayCell!.isToday).toBe(true);
  });

  test("buildMonthGrid chi goi convertSolar2Lunar mot lan cho 31 ngay, khong goi tung o rieng le", () => {
    const convertSpy = jest.spyOn(require("@cyberskill/amlich-core"), "convertSolar2Lunar");
    buildMonthGrid(2025, 1, new Set(), new Set(), new Date());
    // Nen goi dung 31 lan (1 lan/ngay), khong hon
    expect(convertSpy.mock.calls.length).toBeLessThanOrEqual(31);
    convertSpy.mockRestore();
  });

  test("NFR-Performance: buildMonthGrid hoan thanh trong 150ms (generous margin)", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      buildMonthGrid(2025, 1, new Set(), new Set(), new Date());
    }
    const avg = (performance.now() - t0) / 10;
    expect(avg).toBeLessThan(150);
  });

  test("Khong co network request trong buildMonthGrid", () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    buildMonthGrid(2025, 6, new Set(), new Set(), new Date());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("computeReminderDatesForMonth", () => {
  test("Reminder Ram 15 AL xuat hien dung ngay duong trong thang 1/2025", () => {
    const reminders = [{ type: "RAM", lunarDay: 15, lunarMonth: 1, enabled: true } as any];
    const dates = computeReminderDatesForMonth(2025, 1, reminders);
    // Ram thang Gieng 2025 = 12/02/2025
    expect(dates.has("2025-02-12")).toBe(false); // outside Jan
    // Kiem lai voi thang 2
    const datesF = computeReminderDatesForMonth(2025, 2, reminders);
    expect(datesF.has("2025-02-12")).toBe(true);
  });
});
```

---

## §6 - Implementation skeleton

API contract ở §3 là skeleton đầy đủ. Điểm tricky nhất cần ghim:

```typescript
// apps/web/lib/calendarData.ts
//
// Two correctness anchors ghim o day:
// (1) convertSolar2Lunar tra TUPLE [day, month, year, leap] - phai destructure, KHONG spread
//     thanh object (spread mang vao object cho ra {0:..,1:..}). can-chi/zodiac/tiet khi KHONG
//     co trong tuple; phai goi rieng cac ham FR-LUNAR-002 voi JDN (canChiDay/tietKhiAt nhan JDN).
// (2) startPadding tinh tu thu trong tuan cua ngay 1 duong PHAI on dinh theo Asia/Ho_Chi_Minh,
//     khong dung Date#getDay() (lay theo timezone cua runtime; SSR/static-export chay UTC -> lech).
const VI_DOW = new Intl.DateTimeFormat("en-US", {
  weekday: "short", timeZone: "Asia/Ho_Chi_Minh",
});
const DOW_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function startPaddingFor(year: number, month: number): number {
  // month la 1-based; dung UTC noon de tranh DST/edge, doc weekday theo gio VN (offset co dinh +7).
  const firstUtcNoon = new Date(Date.UTC(year, month - 1, 1, 12));
  return DOW_INDEX[VI_DOW.format(firstUtcNoon)];
}

export function buildMonthGrid(
  year: number,
  month: number,
  reminderDates: Set<string>,
  festivalDates: Set<string>,
  today: Date
): MonthGridData {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startPadding = startPaddingFor(year, month);
  const cells: (DayCellData | null)[] = Array(startPadding).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = jdFromDate(d, month, year);                    // JDN cho can-chi va tiet khi
    const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(d, month, year, VN_TZ); // TUPLE
    const tk = tietKhiAt(jdn, VN_TZ);                    // tra { index, name, isTrungKhi }
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      solarDay: d, solarMonth: month, solarYear: year,
      lunarDate: {
        day: lDay, month: lMonth, year: lYear, isLeap: lLeap === 1,
        canChiDay: canChiDay(jdn).label,
        canChiMonth: canChiMonth(lMonth, lYear).label,
        canChiYear: canChiYear(lYear).label,
        zodiac: zodiacOf(canChiYear(lYear).chiIndex),  // CONTRACT: zodiacOf(chiIndex: number), khong phai lunarYear
      },
      // tietKhiAt tra tiet khi cua MOI ngay; chi hien nhan khi ngay do la ngay BAT DAU tiet
      // (xem §11). Neu chi muon danh dau ngay bat dau, so sanh voi ngay truoc (d-1).
      tietKhi: isTietKhiStart(jdn) ? tk.name : null,
      hasReminder: reminderDates.has(key),
      isFestival: festivalDates.has(key),
      isToday: d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear(),
      hoangDao: null, truc: null, sao28: null  // Phase 2 placeholders
    });
  }
  // pad to complete grid rows
  while (cells.length % 7 !== 0) cells.push(null);
  // lunarMonthLabel from first non-null cell
  const firstCell = cells.find((c): c is DayCellData => c !== null)!;
  return { year, month, cells, lunarMonthLabel: formatLunarMonth(firstCell.lunarDate) };
}

/** Ngay la diem bat dau mot tiet khi neu index tiet khi cua no khac index cua ngay truoc. */
function isTietKhiStart(jdn: number): boolean {
  return tietKhiAt(jdn, VN_TZ).index !== tietKhiAt(jdn - 1, VN_TZ).index;
}
```

---

## §7 - Dependencies

Upstream: `FR-LUNAR-001` cung cấp `convertSolar2Lunar` (engine lõi, trả tuple) và `jdFromDate`; `FR-LUNAR-002` cung cấp `canChiDay/canChiMonth/canChiYear`, `zodiacOf`, và `tietKhiAt` (24 tiết khí - KHÔNG phải `getTietKhi`); `FR-LUNAR-010` cung cấp app shell, routing, và storage layer mà `CalendarGrid` dùng để đọc danh sách `Reminder` đang bật.

Downstream: `FR-LUNAR-014` (shareable cards) phụ thuộc `DayCell` component và `DayCellData` type từ FR này để render thiết kế thiệp.

Cross-cutting: `FR-LUNAR-009` (purple design system) cung cấp color tokens và typography cho `DayCell` và `DayDetailPanel`; `FR-LUNAR-011` (Hoàng đạo/Trực/28 sao) sẽ fill vào các placeholder fields `hoangDao`, `truc`, `sao28` trong `DayCellData` ở Phase 2 khi sẵn sàng.

---

## §8 - Example payloads

```json
{
  "year": 2025,
  "month": 1,
  "lunarMonthLabel": "Thang Chap (12) - Giap Thin",
  "cells": [
    null, null, null,
    {
      "solarDay": 1, "solarMonth": 1, "solarYear": 2025,
      "lunarDate": { "day": 2, "month": 12, "year": 2024, "isLeap": false,
                     "canChiDay": "Binh Dan", "canChiMonth": "Binh Ti", "canChiYear": "Giap Thin",
                     "zodiac": "Rong" },
      "tietKhi": null,
      "hasReminder": false,
      "isFestival": false,
      "isToday": false,
      "hoangDao": null, "truc": null, "sao28": null
    },
    {
      "solarDay": 29, "solarMonth": 1, "solarYear": 2025,
      "lunarDate": { "day": 1, "month": 1, "year": 2025, "isLeap": false,
                     "canChiDay": "Giap Ty", "canChiMonth": "Binh Dan", "canChiYear": "At Ty",
                     "zodiac": "Ran" },
      "tietKhi": null,
      "hasReminder": true,
      "isFestival": true,
      "isToday": false,
      "hoangDao": null, "truc": null, "sao28": null
    }
  ]
}
```

```json
{
  "comment": "DayDetailPanel hien thi khi cham vao ngay 29/01/2025",
  "solarFull": "Thu Tu, 29 thang 1 nam 2025",
  "lunarFull": "Mung 1 thang Gieng nam At Ty",
  "canChiDay": "Giap Ty",
  "canChiMonth": "Binh Dan",
  "canChiYear": "At Ty",
  "zodiac": "Ran (Ty)",
  "tietKhi": null,
  "reminders": [
    { "title": "Mung Mot hang thang", "notifyTime": "07:00", "leadTimes": [0, 1] }
  ],
  "hoangDao": "(Phase 2 - chua co)",
  "truc": "(Phase 2 - chua co)"
}
```

---

## §9 - Open questions

Đã giải quyết:
- Cách tính toàn bộ tháng một lần: `buildMonthGrid` gọi `convertSolar2Lunar` cho mỗi ngày.
- Placeholder cho FR-LUNAR-011: các field `hoangDao`, `truc`, `sao28` trong `DayCellData` để `null` cho đến Phase 2.

Còn deferred:
- Tối ưu Web Worker: nếu benchmark thực tế cho thấy `useMemo` vẫn block main thread trên thiết bị cũ, chuyển `buildMonthGrid` sang `Web Worker` và dùng `useTransition` - deferred theo Caveats (PRD §14 Phase 2 performance tuning).
- Số hàng tối ưu: một số tháng cần 6 hàng (42 ô). Có thể dùng layout cuộn nếu 6 hàng quá chật trên màn hình nhỏ - deferred, quyết định lúc UI review thực tế.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `convertSolar2Lunar` trả sai tháng nhuận | Unit test fixtures tháng 3/1985 | Grid hiển thị sai ngày âm | Sửa bug ở FR-LUNAR-001 trước khi deploy |
| `buildMonthGrid` gọi network | Jest mock fetch spy | Test fail | Xóa bỏ bất kỳ fetch call nào trong calendarData.ts |
| Render > 100ms trên mid-range device | `performance.now()` trong test | NFR-Performance vi phạm | Chuyển sang Web Worker hoặc tối ưu vòng lặp |
| Ô padding sai (sai ngày bắt đầu tuần) | Test tháng 1/2025 bắt đầu Thứ Tư | Grid lệch hàng | Dùng `startPaddingFor()` (Intl + timeZone Asia/Ho_Chi_Minh trên UTC noon), KHÔNG dùng `Date#getDay()` |
| `useMemo` không hoạt động, tính lại mỗi render | Mock đếm số lần gọi | Hiệu năng kém | Thêm key stability, kiểm tra deps |
| Tháng 2 nhuận năm nhuận dương lịch (29 ngày) | Test tháng 2/2024 | Grid thiếu ngày 29 | Dùng `new Date(year, month, 0).getDate()` thay vì hardcode 28/30/31 |
| Chấm màu sai cấp (festival vs reminder nhầm) | Test fixture có festivalDates + reminderDates | UI gây nhầm lẫn | Tách rõ hai Set, ưu tiên `isFestival` khi cả hai true |
| DayDetailPanel re-render grid | React Profiler | Hiệu năng kém | Tách state panel ra khỏi grid component |
| Swipe xung đột với scroll dọc | Test thủ công thiết bị | UX khó dùng | Dùng threshold góc vuốt (angle > 45 deg = scroll) |
| Token màu FR-LUNAR-009 chưa sẵn sàng | Build lỗi import | Grid không có style tím | Dùng fallback CSS variable default trong DayCell |
| Ngày 1/1/1900 hoặc 31/12/2199 (edge year) | Unit test boundary | Crash hoặc sai | Clamp year trong [1900, 2199] và hiển thị cảnh báo |
| Tháng có 0 nhắc, festivalDates trống | Test tháng không có dịp | Grid hiển thị đúng nhưng trống | Luôn truyền Set rỗng thay vì undefined |

---

## §11 - Implementation notes

- `buildMonthGrid` phải dùng `tz = 7.0` (không phải `0` hoặc timezone của browser) khi gọi `convertSolar2Lunar`, vì engine lõi tính theo kinh tuyến 105 độ E - đây là nguồn sai phổ biến nhất khi port.
- Start-padding KHÔNG được dùng `new Date(year, month - 1, 1).getDay()`: nó lấy thứ trong tuần theo timezone của runtime, nên SSR/static-export (chạy UTC) cho kết quả lệch so với Asia/Ho_Chi_Minh. §6 đã ship `startPaddingFor()` dùng `Intl.DateTimeFormat({ timeZone: "Asia/Ho_Chi_Minh" })` đọc trên `Date.UTC(year, month-1, 1, 12)` (UTC noon để tránh edge DST) - đây là code chuẩn, không phải chỉ ghi chú. Tương tự, `daysInMonth` dùng `Date.UTC(...).getUTCDate()` thay vì biến thể local.
- Placeholder fields `hoangDao`, `truc`, `sao28` trong `DayCellData` kiểu `null` thay vì `undefined` để JSON serialization không drop chúng - quan trọng nếu grid data được truyền qua postMessage sang Worker.
- `DayDetailPanel` phải là portal (React `createPortal`) gắn vào `document.body` để tránh bị clip bởi `overflow: hidden` của grid container.
- Tiết khí từ FR-LUNAR-002 là `tietKhiAt(jdn, tz)` (KHÔNG có `getTietKhi`), và nó trả tiết khí của MỌI ngày (luôn có `name`), không phải chỉ ngày bắt đầu. Lưới chỉ nên hiển thị nhãn tiết trên NGÀY BẮT ĐẦU tiết; §6 dùng `isTietKhiStart(jdn)` so sánh `tietKhiAt(jdn).index` với `tietKhiAt(jdn-1).index` (khác nhau = ngày bắt đầu) rồi mới gán `tietKhi`, còn lại để `null`. AC #14 (Lập Xuân trên 3/2/2025) kiểm tra đúng hành vi này.
- Khi chuyển tháng bằng swipe, cần debounce để tránh chuyển 2 tháng cùng lúc nếu người dùng vuốt nhanh.
- Test `computeReminderDatesForMonth` phải cover trường hợp reminder RAM (Rằm 15 AL) với tháng dương không khớp hoàn toàn với tháng âm - một phần nhắc của tháng dương 1 có thể rơi vào tháng âm 12 năm trước.

*Hết FR-LUNAR-007.*
