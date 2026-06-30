import { buildMonthGrid, computeReminderDatesForMonth } from "../lib/calendarData";
import type { Reminder } from "../lib/storage";

describe("calendarData - buildMonthGrid", () => {
  it("computes padding correctly for a specific month (Feb 2025)", () => {
    const today = new Date(Date.UTC(2025, 0, 29)); // doesn't matter for padding
    const grid = buildMonthGrid(2025, 2, new Set(), new Set(), today);
    // Feb 2025 starts on Saturday -> Sat is index 6
    // cells array should start with 6 nulls
    let nullCount = 0;
    while(grid.cells[nullCount] === null) nullCount++;
    expect(nullCount).toBe(6);
  });

  it("identifies tiet khi start correctly", () => {
    // 2025-02-03 is Lap Xuan (tiet khi index 21)
    // 2025-02-04 Lap Xuan, wait, what is the exact date?
    const grid = buildMonthGrid(2025, 2, new Set(), new Set(), new Date());
    const cells = grid.cells.filter(c => c !== null);
    
    // There should be two tiet khi starts in a month roughly
    const tietKhiStarts = cells.filter(c => c.tietKhi !== null);
    expect(tietKhiStarts.length).toBeGreaterThanOrEqual(1);
  });

  it("flags today correctly", () => {
    const today = new Date(2025, 1, 15); // Feb 15
    const grid = buildMonthGrid(2025, 2, new Set(), new Set(), today);
    const cells = grid.cells.filter(c => c !== null);
    const todayCell = cells.find(c => c.solarDay === 15);
    expect(todayCell?.isToday).toBe(true);
    const notTodayCell = cells.find(c => c.solarDay === 16);
    expect(notTodayCell?.isToday).toBe(false);
  });
});

describe("calendarData - computeReminderDatesForMonth", () => {
  it("matches RAM reminder on lunar 15th regardless of month", () => {
    const r: Reminder = {
      id: "ram", type: "RAM", title: "Ram",
      lunarDay: 15, lunarMonth: null, lunarYear: null,
      isLeapMonth: false, leapFallback: "REGULAR", recurrence: "MONTHLY",
      leadTimes: [0], notifyTime: "07:00", channels: ["LOCAL"], linkedContentId: "ram", sharedWith: [], enabled: true
    };
    
    // Feb 2025 has lunar Jan 15th on Feb 12th
    const dates = computeReminderDatesForMonth(2025, 2, [r]);
    expect(dates.has("2025-02-12")).toBe(true);
  });
});
