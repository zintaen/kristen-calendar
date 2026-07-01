import { describe, it, expect } from "vitest";
import { planSchedule } from "../lib/notifications/planner";
import type { Reminder } from "@cyberskill/amlich-core";

describe("planner", () => {
  it("should limit to 64 slots and prioritize fairness", () => {
    // Generate many reminders
    const reminders: Reminder[] = Array.from({ length: 70 }, (_, i) => ({
      id: `r-${i}`,
      type: "CUSTOM",
      title: `Reminder ${i}`,
      lunarDay: 15,
      lunarMonth: 1,
      isLeapMonth: false,
      leadTimes: [0],
      recurrence: "ANNUAL",
      enabled: true
    }));

    const nowUtc = new Date("2024-01-01T00:00:00Z").getTime();
    
    // Each of the 70 reminders will have an occurrence.
    // The budget is 64. So 6 items should be dropped.
    // Because we do fairness pass, it will pick the first 64 reminders' soonest occurrence.
    
    const plan = planSchedule(reminders, nowUtc, { engineVersion: "1.0.0", budget: 64, horizonMonths: 24 });
    
    expect(plan.notifications.length).toBe(64);
    expect(plan.diagnostics.scheduled).toBe(64);
    expect(plan.diagnostics.slotsDropped).toBeGreaterThan(0);
    expect(plan.diagnostics.remindersCovered).toBe(64);
    
    // Ensure numeric hash ID logic works
    expect(plan.notifications[0].id).toBeTypeOf("string");
    expect(parseInt(plan.notifications[0].id)).toBeGreaterThan(0);
  });
});
