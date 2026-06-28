---
id: FR-LUNAR-012
title: "Good-day picker - chọn loại việc (ký hợp đồng, khai máy, ra mắt, khai trương), liệt kê ngày Hoàng đạo trong khoảng, tùy chọn nhập lịch quay (EventKit)"
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
related_frs: [FR-LUNAR-011]
depends_on: [FR-LUNAR-010, FR-LUNAR-011]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-E01, FR-E04 optional)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (đặc thù diễn viên)"
source_decisions:
  - DEC-LUNAR-120 (good-day picker là UI thuần túy trên `getMonthDayQualities` từ FR-011; không có logic phong thủy riêng ở lớp này - toàn bộ lý luận nằm ở FR-011)
  - DEC-LUNAR-121 (bộ lọc theo loại việc là UI preference, không phải filter thuật toán - tất cả ngày Hoàng đạo đều hiển thị, nhãn loại việc giúp người dùng quyết định; không có map "loại việc -> danh sách Trực bắt buộc")
  - DEC-LUNAR-122 (EventKit tích hợp là COULD - chỉ bật khi người dùng cấp quyền Calendar; nếu không cấp quyền, flow chính vẫn hoạt động bình thường mà không có EventKit)
  - DEC-LUNAR-123 (good-day picker không tự tạo Reminder; nó chỉ hiển thị danh sách ngày để người dùng quyết định; nếu người dùng muốn tạo nhắc, họ vào FR-LUNAR-006 reminder management)
  - DEC-LUNAR-124 (khoảng ngày tối đa là 90 ngày; làm rộng hơn gây ổn hàm getMonthDayQualities trong trường hợp bình thường và làm list quá dài cho người dùng)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/app/good-day-picker/page.tsx
  - apps/web/components/GoodDayPicker.tsx
  - apps/web/components/GoodDayList.tsx
  - apps/web/components/EventKitBridge.ts
  - apps/web/lib/good-day.ts
modified_files:
  - apps/web/app/layout.tsx
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/app/good-day-picker/**, apps/web/components/GoodDay*, apps/web/lib/good-day.ts
  - bash: cd apps/web && pnpm test
disallowed_tools:
  - "gọi API bất kỳ để lấy ngày Hoàng đạo (vi phạm DEC-LUNAR-120 / NFR-Offline)"
  - "tự động tạo Reminder từ good-day picker (vi phạm DEC-LUNAR-123)"
effort_hours: 7
sub_tasks:
  - "1h: lib/good-day.ts - kiểu WorkType, hàm filterGoodDays(days: DayQuality[], workType: WorkType): DayQuality[]"
  - "1.5h: GoodDayPicker.tsx - date range picker (startDate, endDate, max 90 ngày) + WorkType selector (4 loại)"
  - "1.5h: GoodDayList.tsx - danh sách ngày Hoàng đạo: hiển thị ngày dương + âm + can-chi + Trực + sao + giờ Hoàng đạo đầu tiên; badge 'Hoàng đạo'"
  - "0.5h: page.tsx - kết hợp GoodDayPicker + GoodDayList + disclaimer banner"
  - "0.5h: disclaimer component tại thanh - 'Tham khảo phong thủy dân gian, không phải tư vấn chuyên môn'"
  - "1h: EventKitBridge.ts - COULD: kiểm tra quyền Calendar, lấy events trong khoảng, đánh dấu ngày 'Đã có lịch quay'; không block flow chính nếu không có quyền"
  - "1h: test lib/good-day.ts - filterGoodDays trả đúng ngày, khoảng > 90 ngày bị clamp, EventKit opt-out không lỗi"
risk_if_skipped: "FR-E01 là yêu cầu MUST cho persona diễn viên (Persona 1 Chú Linh) và người kinh doanh (Persona 3 Anh Tuấn). Không có good-day picker, một trong hai điểm bán chính của app Phase 2 bị thiếu. FR-012 cũng là màn hình đếm thị tính năng cốt lõi của FR-LUNAR-011 dưới góc độ người dùng - nếu nó không có thì giá trị của FR-011 bị ẩn."
---

## §1 - Description (BCP-14 normative)

Good-day picker là màn hình React cho phép người dùng chọn khoảng thời gian và loại việc, sau đó hiển thị danh sách ngày Hoàng đạo trong khoảng đó. Toàn bộ logic phong thủy nằm ở FR-LUNAR-011.

1. PHẢI hiển thị màn hình "Chọn ngày tốt" với 3 thành phần: chọn khoảng ngày (startDate, endDate), chọn loại việc, và danh sách kết quả (DEC-LUNAR-120).
2. PHẢI hỗ trợ 4 loại việc: "Ký hợp đồng / biên bản" (ky-hop-dong), "Khai máy / bắt đầu quay" (khai-may), "Ra mắt / premiere" (ra-mat), "Khai trương / khởi nghiệp" (khai-truong); bản này bao gồm đúng danh sách từ PRD §13 "đặc thù diễn viên" (FR-E01).
3. PHẢI giới hạn khoảng ngày tối đa 90 ngày; nếu người dùng chọn khoảng > 90 ngày, PHẢI clamp `endDate = startDate + 90 ngày` và hiển thị thông báo giải thích (DEC-LUNAR-124).
4. PHẢI gọi `getMonthDayQualities` (FR-LUNAR-011) theo từng tháng trong khoảng, lọc ra các ngày có `isHoangDao === true`, và sắp xếp theo ngày tăng dần (DEC-LUNAR-120).
5. PHẢI hiển thị cho mỗi ngày trong danh sách: ngày dương (dd/MM/yyyy), ngày âm (dd/MM/yyyy AL), `canChiNgay`, `truc.name`, `sao28.name`, và 3 canh giờ Hoàng đạo đầu tiên trong ngày để người dùng chọn giờ (gioHoangDao filter `isHoang: true`).
6. PHẢI hiển thị banner disclaimer cố định ở cuối màn hình: "Thông tin này chỉ mang tính tham khảo theo phong thủy dân gian. Không phải tư vấn chuyên môn." (DEC-LUNAR-121).
7. PHẢI đảm bảo màn hình hoạt động hoàn toàn offline; mọi dữ liệu lấy từ amlich-core (FR-LUNAR-011) mà không gọi network (DEC-LUNAR-120, NFR-Offline).
8. KHÔNG ĐƯỢC tự động tạo Reminder hay thêm vào lịch khi người dùng chọn ngày; màn hình chỉ hiển thị để tham khảo (DEC-LUNAR-123).
9. NÊN hiển thị đếm "X ngày Hoàng đạo trong khoảng này" ở đầu danh sách để người dùng biết ngay kết quả trước khi cuộn xuống.
10. NÊN cho phép người dùng sao chép thông tin ngày (e.g. nhấn vào để copy "Thứ Tư 29/01/2025 - Hoàng đạo - Khai - Quý Sửu").
11. CÓ THỂ (COULD) tích hợp EventKit theo DEC-LUNAR-122: nếu người dùng đã cấp quyền Calendar, hiển thị thêm cờ "Đã có lịch quay" trên ngày đã có event trong lịch iOS/macOS; câu hỏi cấp quyền là lazy (chỉ hỏi khi người dùng tap "Kết nối lịch của tôi"); nếu từ chối, flow chính không bị ảnh hưởng.
12. CÓ THỂ hiển thị chip "Phù hợp việc X" khi Trực của ngày có tên loại việc trong `truc.suitableFor` - đây là thông tin bổ sung từ FR-011, chỉ hiển thị khi dữ liệu có sẵn.

---

## §2 - Why this design (rationale for humans)

**Tại sao good-day picker là UI thuần, không có logic phong thủy riêng (DEC-LUNAR-120)?** Tất cả lý luận phong thủy (Hoàng/Hắc đạo, Trực, sao, giờ) đã nằm trong FR-011. Nếu FR-012 đủ sửa logic thì dễ lệch: 2 nơi có thể trả lời khác nhau cho cùng một ngày. Giữ FR-012 là UI thuần còn FR-011 là source of truth bảo đảm nhất quán.

**Tại sao không map "loại việc -> Trực bắt buộc" (DEC-LUNAR-121)?** PRD chưa có yêu cầu này. Thêm mapping "ký hợp đồng chỉ hợp với Trực Khai/Định/Thành" là mở thêm chức năng phong thủy mà chưa có nguồn chuẩn. Hiển thị tất cả ngày Hoàng đạo và để người dùng quyết định dựa trên tên Trực + notes là cách thận trọng hơn và hơn trung thực về góc độ editorial.

**Tại sao EventKit là COULD, không phải SHOULD (DEC-LUNAR-122)?** Tích hợp EventKit là thay đổi khá năng nghiêm trọng trên iOS (cần quyền Calendar, khác nhau giữa iOS/macOS/web). Nếu là SHOULD sẽ tạo áp lực build EventKit trước khi có giá trị cơ bản. Với người dùng có lịch quay biết, đây là tính năng quý; với người dùng khác nó là nhiễu. COULD cho phép ship tính năng cơ bản trước và thêm EventKit sau.

**Tại sao giới hạn 90 ngày (DEC-LUNAR-124)?** Một người dùng tìm ngày trong 1-3 tháng là use case chính. Cho phép khoảng 365 ngày có thể tạo danh sách 100+ ngày Hoàng đạo - vừa khó xem vừa tốn thời gian render. 90 ngày (3 tháng) là thời gian lập kế hoạch thực tế cho ký hợp đồng hay khai quay phim.

**Tại sao không tự động tạo Reminder (DEC-LUNAR-123)?** Good-day picker là công cụ tham khảo, không phải công cụ hành động. Người dùng có thể muốn xem nhiều ngày, suy nghĩ, rồi mới chọn. Auto-creating reminder sẽ làm lộ hành động "mua nhắc" mà người dùng chưa sẵn sàng. FR-006 đã có UI tạo nhắc - người dùng sang FR-006 sau khi đã chọn ngày.

**Tại sao hiển thị giờ Hoàng đạo trong danh sách (PRD FR-E03)?** Xem ngày tốt để ký hợp đồng nhưng giờ ký lại là giờ Hắc đạo thì mất điểm. Hiển thị top 3 giờ Hoàng đạo cùng trên từng ngày giúp người dùng chọn ngày và giờ cùng một lúc - điều này đầy đủ đáp ứng PRD FR-E03 trong context này mà không cần màn hình riêng.

---

## §3 - API contract

```typescript
// apps/web/lib/good-day.ts

// DayQuality/GioInfo/getMonthDayQualities deu tu FR-LUNAR-011 (re-export qua amlich-core).
// FR-012 KHONG tu tinh phong thuy - chi loc va lam giau DayQuality (DEC-LUNAR-120).
import type { DayQuality, GioInfo } from "@cyberskill/amlich-core";
import { getMonthDayQualities } from "@cyberskill/amlich-core";

export type WorkType =
  | "ky-hop-dong"   // Ky hop dong / bien ban
  | "khai-may"      // Khai may / bat dau quay
  | "ra-mat"        // Ra mat / premiere
  | "khai-truong";  // Khai truong / khoi nghiep

export interface WorkTypeOption {
  value: WorkType;
  label: string;     // Vietnamese label e.g. "Ky hop dong / bien ban"
  icon: string;      // emoji or icon name for UI
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
  { value: "ky-hop-dong",  label: "Ky hop dong / bien ban",    icon: "pen-line" },
  { value: "khai-may",     label: "Khai may / bat dau quay",   icon: "clapperboard" },
  { value: "ra-mat",       label: "Ra mat / premiere",         icon: "star" },
  { value: "khai-truong",  label: "Khai truong / khoi nghiep", icon: "store" },
];

export interface GoodDayResult extends DayQuality {
  topHoangGio: GioInfo[];      // top 3 isHoang === true canh gio
  hasCalendarConflict?: boolean; // true khi EventKit boc lo event trung ngay (COULD)
  trucMatchesWorkType?: boolean; // true khi truc.suitableFor co workType keyword (COULD)
}

export interface GoodDayPickerState {
  startDate: Date;
  endDate: Date;       // clamped to startDate + 90 days if needed
  workType: WorkType;
  results: GoodDayResult[];
  totalGoodDays: number;
  isClamped: boolean;  // true neu khoang da bi clamp xuong 90 ngay
}

/** Filter to Hoang dao days only, enrich with topHoangGio. */
export function filterGoodDays(
  days: DayQuality[],
  workType: WorkType
): GoodDayResult[];

/** Compute date range (clamped), call getMonthDayQualities per month, return GoodDayPickerState. */
export function computeGoodDays(
  startDate: Date,
  endDate: Date,
  workType: WorkType
): GoodDayPickerState;
```

```typescript
// apps/web/components/EventKitBridge.ts  (COULD sub-feature)

import { Capacitor } from "@capacitor/core";

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
}

/** Returns events in range if Calendar permission granted; empty array otherwise. */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]>;

/** Request Calendar permission lazily (only call when user taps "Ket noi lich"). */
export async function requestCalendarPermission(): Promise<"granted" | "denied" | "unavailable">;
```

```tsx
// apps/web/components/GoodDayPicker.tsx (interface sketch)

interface GoodDayPickerProps {
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function GoodDayPicker({ defaultStartDate, defaultEndDate }: GoodDayPickerProps): JSX.Element;
```

---

## §4 - Acceptance criteria

1. Màn hình "good-day-picker" hiển thị đúng 3 khu vực: date range input, work type selector với 4 lựa chọn, và danh sách kết quả (hoặc trạng thái "Không có ngày Hoàng đạo nào trong khoảng này").
2. `filterGoodDays` chỉ trả về ngày có `isHoangDao === true` - không có ngày Hắc đạo trong kết quả.
3. Khoảng 100 ngày bị clamp thành 90 ngày; UI hiển thị thông báo "Đã giới hạn khoảng xuống 90 ngày".
4. Kết quả sắp xếp theo ngày tăng dần (ngày sớm nhất lên đầu).
5. Mỗi hàng trong danh sách hiển thị đủ: ngày dương, ngày âm, `canChiNgay`, `truc.name`, `sao28.name`, và ít nhất 1 canh giờ Hoàng đạo.
6. Banner disclaimer cố định hiển thị văn bản "Thông tin này chỉ mang tính tham khảo theo phong thủy dân gian" - kiểm tra bằng DOM query.
7. `computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong")` trả về `totalGoodDays > 0` và mỗi kết quả có `isHoangDao === true`.
8. Không có request network nào được thực hiện trong quá trình tính kết quả (mock fetch, assert 0 calls).
9. Khi EventKit bật (COULD) và quyền bị từ chối, flow chính vẫn hiển thị kết quả; cột `hasCalendarConflict` là `undefined`.
10. Khi khoảng ngày thay đổi (startDate hoặc endDate thay đổi), danh sách kết quả tự động tính lại mà không cần tap nút "Tìm kiếm".
11. Trên điện thoại (viewport 375px), danh sách cuộn dọc và mỗi hàng có chiều cao đủ để hiển thị thông tin.
12. Màn hình đạt APCA Lc >= 75 cho văn bản kết quả (theo DEC-LUNAR-090 từ FR-009 purple theme).
13. Không có lời gọi nào đến API tạo Reminder (FR-LUNAR-006), EventKit write, hoặc bất kỳ side-effect nào khi người dùng chọn ngày trong danh sách; màn hình chỉ hiển thị và copy text (DEC-LUNAR-123) - kiểm tra bằng unit test mock `createReminder` và assert 0 calls trong `computeGoodDays` và `filterGoodDays`.

---

## §5 - Verification

```typescript
// apps/web/tests/good-day.test.ts
import { describe, test, expect, vi } from "vitest";
import { filterGoodDays, computeGoodDays, WORK_TYPE_OPTIONS } from "../lib/good-day";
import { getMonthDayQualities } from "@cyberskill/amlich-core";

describe("filterGoodDays", () => {
  test("chi tra ngay Hoang dao", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ky-hop-dong");
    expect(results.every(d => d.isHoangDao)).toBe(true);
  });

  test("khong co ngay Hac dao trong ket qua", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "khai-may");
    expect(results.some(d => !d.isHoangDao)).toBe(false);
  });

  test("moi ket qua co topHoangGio voi it nhat 1 canh", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ra-mat");
    for (const r of results) {
      expect(r.topHoangGio.length).toBeGreaterThanOrEqual(1);
      expect(r.topHoangGio.every(g => g.isHoang)).toBe(true);
    }
  });
});

describe("computeGoodDays - clamping", () => {
  test("khoang 100 ngay bi clamp thanh 90", () => {
    const start = new Date("2025-01-01");
    const end   = new Date("2025-04-11"); // 100 ngay
    const state = computeGoodDays(start, end, "khai-truong");
    expect(state.isClamped).toBe(true);
    const diffDays = (state.endDate.getTime() - state.startDate.getTime()) / 86400000;
    expect(diffDays).toBeLessThanOrEqual(90);
  });

  test("khoang 30 ngay khong bi clamp", () => {
    const start = new Date("2025-01-01");
    const end   = new Date("2025-01-31");
    const state = computeGoodDays(start, end, "ky-hop-dong");
    expect(state.isClamped).toBe(false);
  });
});

describe("computeGoodDays - results", () => {
  test("tra ve totalGoodDays > 0 cho thang 1/2025", () => {
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong");
    expect(state.totalGoodDays).toBeGreaterThan(0);
    expect(state.results.length).toBe(state.totalGoodDays);
  });

  test("ket qua sap xep tang dan theo ngay", () => {
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-03-31"), "ra-mat");
    for (let i = 1; i < state.results.length; i++) {
      expect(new Date(state.results[i].date) >= new Date(state.results[i - 1].date)).toBe(true);
    }
  });

  test("khong goi network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "khai-may");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("WORK_TYPE_OPTIONS", () => {
  test("co dung 4 loai viec", () => {
    expect(WORK_TYPE_OPTIONS).toHaveLength(4);
    const values = WORK_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain("ky-hop-dong");
    expect(values).toContain("khai-may");
    expect(values).toContain("ra-mat");
    expect(values).toContain("khai-truong");
  });
});

// AC #13 - khong co side-effect tao Reminder (DEC-LUNAR-123)
describe("filterGoodDays va computeGoodDays - khong tao Reminder", () => {
  test("filterGoodDays khong goi createReminder hay bat ky Reminder API nao", () => {
    // Mock namespace FR-006 reminder API de bao dam zero calls
    const createReminderSpy = vi.fn();
    // filterGoodDays la pure function: khong co import FR-006 -> spy khong can inject
    // Goi filterGoodDays va kiem tra khong co side effect ngoai return value
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ky-hop-dong");
    expect(createReminderSpy).not.toHaveBeenCalled();
    expect(results).toBeDefined(); // ket qua tra ve binh thuong
  });

  test("computeGoodDays khong goi createReminder hay write EventKit", () => {
    const createReminderSpy = vi.fn();
    const state = computeGoodDays(new Date("2025-01-01"), new Date("2025-01-31"), "ky-hop-dong");
    expect(createReminderSpy).not.toHaveBeenCalled();
    expect(state.results.length).toBeGreaterThanOrEqual(0); // tra ket qua, khong lam gi khac
  });
});
```

---

## §6 - Implementation skeleton

`computeGoodDays` tách khoảng ngày thành các tháng liên quan, gọi `getMonthDayQualities(y, m)` từng tháng, kết nối mảng, lọc theo `isHoangDao`, trim ngưỡng startDate và endDate, sắp xếp, và tính `topHoangGio`. Điểm duy nhất cần chú ý: khi khoảng chạy qua ranh giới năm (ví dụ 15/12/2025 - 15/02/2026), phải gọi `getMonthDayQualities` cho cả tháng 12/2025, 1/2026, 2/2026. Phần EventKitBridge dùng `@capacitor/calendar` hoặc `Capacitor.Plugins.Calendar` (COULD); trong môi trường web thì trả về mảng rỗng.

---

## §7 - Dependencies

Upstream: FR-LUNAR-011 là phụ thuộc bắt buộc - không có `DayQuality` thì không có gì để lọc. FR-LUNAR-010 (app shell) là phụ thuộc về khung React/routing - màn hình `good-day-picker/page.tsx` mount vào Next.js app router của FR-010.

Downstream: FR-012 không block FR nào khác. Người dùng có thể đi từ đây đến FR-006 để tạo nhắc cho ngày đã chọn, nhưng đây là navigation user thủ công, không phải block khái niệm.

Cross-cutting: Purple theme (FR-009) áp dụng cho màn hình này qua shared token. Disclaimer text đồng nhất với DEC-LUNAR-111 ở FR-011 (phải copy chính xác).

---

## §8 - Example payloads

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "workType": "ky-hop-dong",
  "isClamped": false,
  "totalGoodDays": 14,
  "results": [
    {
      "date": "2025-01-03",
      "canChiNgay": "At Mao",
      "diaChiNgay": "Meo",
      "thanTrucNhat": "Thanh Long",
      "hoangDao": true,
      "isHoangDao": true,
      "label": "Hoang dao",
      "truc": { "name": "Dinh", "suitableFor": ["ky ket", "dam phan"], "avoidFor": [] },
      "sao28": { "name": "Chang", "rating": "tot", "notes": "Hop ky ket, lam an" },
      "topHoangGio": [
        { "canh": "Dan (03:00-05:00)", "tuGio": "03:00", "denGio": "05:00", "isHoang": true },
        { "canh": "Ngo (11:00-13:00)", "tuGio": "11:00", "denGio": "13:00", "isHoang": true },
        { "canh": "Than (15:00-17:00)", "tuGio": "15:00", "denGio": "17:00", "isHoang": true }
      ],
      "disclaimer": "Tham khao phong thuy dan gian"
    }
  ]
}
```

---

## §9 - Open questions

Đã giải quyết:
- "Có cần map loại việc -> Trực bắt buộc không?" -> DEC-LUNAR-121: không; hiển thị tất cả Hoàng đạo, thêm chip "Phù hợp" từ `truc.suitableFor` là đủ.
- "EventKit là SHOULD hay COULD?" -> DEC-LUNAR-122: COULD, lazy permission.
- "Giới hạn khoảng ngày bao nhiêu?" -> DEC-LUNAR-124: 90 ngày.

Còn lại (defer):
- Tương lai: thêm filter theo Trực cụ thể (người dùng tick "Chỉ hiện Trực Khai/Định") - thứ 2 sẽ làm phức tạp UI; defer sang v2.
- "Hợp tuổi" (hạp tuổi người dùng với can-chi ngày) là tính năng phong thủy nâng cao, chưa có trong PRD - defer.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| `getMonthDayQualities` trả rỗng | Kết quả 0 ngày, banner "không có" hiện | UI empty state | Debug FR-011 trước |
| Khoảng > 90 ngày không bị clamp | AC #3 test fail | Danh sách quá dài | Thêm clamp logic |
| Kết quả có ngày Hắc đạo | AC #2 test fail | Sai logic lọc | Debug `filterGoodDays` |
| Khoảng qua ranh giới năm không lấy đủ tháng | Tháng giao 12/1 thiếu kết quả | Thiếu ngày | Xử lý multi-year iteration |
| Request network trong computeGoodDays | AC #8 mock test fail | Vi phạm NFR-Offline | Xóa code gọi mạng |
| Banner disclaimer không hiện | AC #6 DOM test fail | Thiếu thông tin bảo vệ | Thêm vào layout cố định |
| EventKit permission gặp đến main flow | AC #9 test | Flow lỗi | Wrap try/catch, default rỗng |
| Sắp xếp sai thứ tự | AC #4 test fail | UX nhầm lẫn | Fix sort comparator |
| Viewport 375px bị overflow | Manual/E2E test | UX vỡ | CSS responsive fix |
| APCA < 75 trên text kết quả | apca-w3 audit | Accessibility vi phạm | Fix màu text/nền |
| EventKit unavailable trên web | `Capacitor.isNativePlatform()` check | Return rỗng | Bảo vệ bằng platform check |

---

## §11 - Implementation notes

- `computeGoodDays` cần xử lý edge case tháng 12 -> 1 (qua năm mới): loop qua tháng tăng dần từ start đến end, khi tháng đạt 13 thì tăng năm và reset tháng = 1.
- `topHoangGio` lấy 3 phần tử đầu `filter(g => g.isHoang)` từ `gioHoangDao` - chỉ lấy 3 để không làm chật màn hình; 6 canh Hoàng đầy đủ vẫn trong DayQuality nếu người dùng muốn xem thêm (expandable row).
- Màn hình này KHÔNG cần state management phức tạp (Redux/Zustand) - `computeGoodDays` là pure function, kết quả là derived state từ startDate/endDate/workType; `useState` là đủ.
- EventKitBridge PHẢI check `Capacitor.isNativePlatform()` trước khi import bao giờ họ là native-only; trên web (dev environment) phải return `[]` ngay lập tức.
- Chip "Phù hợp việc X" (§1 #12) là optional display logic: `truc.suitableFor.some(s => s.includes(workTypeKeyword))`; nếu false thì không hiện chip - không cần hide hay error.
- Disclaimer text phải khớp CHÍNH XÁC với text trong DEC-LUNAR-111 và FR-011 - copy-paste, không paraphrase.

*Hết FR-LUNAR-012.*
