import { buildMonthGrid, computeReminderDatesForMonth } from "../lib/calendarData";
import type { Reminder } from "../lib/storage";
import { performance } from "perf_hooks";

describe("buildMonthGrid (FR-LUNAR-007)", () => {
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

  test("Performance: buildMonthGrid chay duoi 100ms", () => {
    const start = performance.now();
    buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });

  test("Thang 1/2025 (bat dau Thu 4): padding dung 3 o dau", () => {
    // 01/01/2025 is Wednesday (index 3 in [Sun, Mon, Tue, Wed, Thu, Fri, Sat])
    const grid = buildMonthGrid(2025, 1, new Set(), new Set(), new Date("2025-01-15"));
    expect(grid.cells[0]).toBeNull();
    expect(grid.cells[1]).toBeNull();
    expect(grid.cells[2]).toBeNull();
    expect(grid.cells[3]).not.toBeNull();
  });
});

describe("computeReminderDatesForMonth (FR-LUNAR-007)", () => {
  it("matches RAM reminder on lunar 15th regardless of month", () => {
    const r: Reminder = {
      id: "ram", type: "RAM", title: "Ram",
      lunarDay: 15, lunarMonth: null, lunarYear: null,
      isLeapMonth: false, leapFallback: "REGULAR", recurrence: "MONTHLY",
      leadTimes: [0], notifyTime: "07:00", channels: ["LOCAL"], enabled: true,
      sharedWith: []
    };
    
    // Feb 2025 has lunar Jan 15th on Feb 12th
    const dates = computeReminderDatesForMonth(2025, 2, [r]);
    expect(dates.has("2025-02-12")).toBe(true);
  });
});
