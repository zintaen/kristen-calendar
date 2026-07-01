import { describe, it, expect, vi } from "vitest";
import { getUpcomingOccurrences } from "../day-computer";
import type { ZaloReminder } from "../../types";

describe("day-computer", () => {
  it("getUpcomingOccurrences calculates correctly", async () => {
    // 2025-08-08 is 15/6 Leap lunar (in amlich-core engine).
    // Let's create a reminder for 15/6 Leap month
    const reminder: ZaloReminder = {
      id: "rem1",
      title: "Rằm tháng 6 nhuận",
      type: "RAM",
      lunarDay: 15,
      lunarMonth: 6,
      isLeapMonth: true,
      recurrence: "ANNUAL",
      leadTimes: [0, 1], // On day, and 1 day before
      notifyTime: "07:00",
      channels: ["ZNS"],
      enabled: true,
    };

    // Mock todayInHCM to return 2025-08-05 (SolarDate is [5, 8, 2025])
    // The engine says 15/6 Leap month 2025 = 2025-08-08 solar.
    // 08-08 is 3 days away from 08-05.
    vi.mock("@cyberskill/amlich-core", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@cyberskill/amlich-core")>();
      return {
        ...actual,
        todayInHCM: vi.fn(() => [5, 8, 2025] as const),
      };
    });

    // Re-import to get the mocked amlich-core
    const { getUpcomingOccurrences } = await import("../day-computer");
    const occurrences = getUpcomingOccurrences([reminder], 30);
    
    // There should be 2 occurrences (lead = 0 and lead = 1)
    expect(occurrences).toHaveLength(2);
    
    // They are sorted by date ascending: lead=1 (08-07) comes first, then lead=0 (08-08)
    expect(occurrences[0].solarDate).toBe("2025-08-07");
    expect(occurrences[0].daysUntil).toBe(2);
    expect(occurrences[0].reminderTitle).toBe("Rằm tháng 6 nhuận (trước 1 ngày)");
    
    expect(occurrences[1].solarDate).toBe("2025-08-08");
    expect(occurrences[1].daysUntil).toBe(3);
    expect(occurrences[1].reminderTitle).toBe("Rằm tháng 6 nhuận");
  });
});
