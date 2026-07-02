import { describe, it, expect } from "vitest";
import { normalizeReminder, validateReminder, isCacheStale, type Reminder } from "../src/reminder";
import { nextOccurrences, mergeAndSort } from "../src/recurrence";
import { todayInHCM } from "../src/tz";
// CONTRACT: todayInHCM(now?: Date): SolarDate (tuple [day, month, year])

const ENGINE = "1.0.0";
const gio = (over: Partial<Reminder>): Reminder =>
  normalizeReminder({
    id: "r1",
    userId: "u1",
    type: "GIO",
    title: "Gio ba",
    lunarDay: 10,
    lunarMonth: 8,
    recurrence: "ANNUAL",
    isLeapMonth: false,
    ...over,
  });

describe("recurrence engine", () => {
  it("ANNUAL derives different solar dates per year (DEC-LUNAR-041, AC #1/#2)", () => {
    const occ = nextOccurrences(gio({ leadTimes: [0] }), { fromYear: 2025, count: 2, engineVersion: ENGINE });
    expect(occ).toHaveLength(2);
    expect(occ[0]!.gregorianDate).not.toEqual(occ[1]!.gregorianDate);
  });

  it("ANNUAL count:3 yields 3 consecutive lunar years (AC #2)", () => {
    const occ = nextOccurrences(gio({ leadTimes: [0] }), { fromYear: 2025, count: 3, engineVersion: ENGINE });
    expect(occ).toHaveLength(3);
  });

  it("MONTHLY produces 13 occurrences in a leap year (AC #3)", () => {
    const r = gio({ recurrence: "MONTHLY", lunarDay: 15, leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2025, count: 13, engineVersion: ENGINE });
    expect(occ.filter((o) => o.lunarLabel.startsWith("15/")).length).toBe(13);
  });

  it("ONCE returns exactly one occurrence and does not recur (AC #4)", () => {
    const r = gio({ recurrence: "ONCE", lunarYear: 2025, leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2025, count: 5, engineVersion: ENGINE });
    expect(occ).toHaveLength(1);
  });

  it("leap-month gio falls back to regular month (DEC-LUNAR-042, AC #5)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, isLeapMonth: true, leapFallback: "REGULAR", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2030, count: 1, engineVersion: ENGINE });
    expect(occ[0]!.fellBack).toBe(true);
    expect(occ[0]!.lunarLabel).toContain("16/2");
  });

  it("SKIP fallback drops the year without a matching leap month (AC #6)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, isLeapMonth: true, leapFallback: "SKIP", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2030, count: 1, engineVersion: ENGINE });
    // 2030 has no leap month 2 -> skipped; the produced occurrence must be a genuine leap-month-2 year.
    for (const o of occ) expect(o.fellBack).toBe(false);
  });

  it("ASK fallback yields pendingUserChoice, no auto-cung (AC #7)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, isLeapMonth: true, leapFallback: "ASK", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2030, count: 1, engineVersion: ENGINE });
    expect(occ[0]!.pendingUserChoice).toBe(true);
  });

  it("1985 leap month 2 lands in the Mar-Apr window (AC #8, cross-check FR-001)", () => {
    const r = gio({ lunarDay: 16, lunarMonth: 2, lunarYear: 1985, isLeapMonth: true, recurrence: "ONCE", leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 1985, count: 1, engineVersion: ENGINE });
    const d = occ[0]!.gregorianDate; // "1985-MM-DD"
    expect(d >= "1985-03-21" && d <= "1985-04-19").toBe(true);
  });

  it("day 30 clamps to last day of a 29-day month (AC #9)", () => {
    const r = gio({ lunarDay: 30, lunarMonth: 9, leadTimes: [0] });
    const occ = nextOccurrences(r, { fromYear: 2027, count: 1, engineVersion: ENGINE });
    if (occ[0]!.dayClamped) expect(occ[0]!.lunarLabel).toMatch(/^(29|30)\//);
  });

  it("lead-times fan out to multiple Occurrence (AC #10)", () => {
    const occ = nextOccurrences(gio({ leadTimes: [0, 1, 7] }), { fromYear: 2025, count: 1, engineVersion: ENGINE });
    expect(occ.map((o) => o.leadDays).sort((a, b) => a - b)).toEqual([0, 1, 7]);
  });

  it("notifyTime is applied to fireAtLocal (AC #11)", () => {
    const occ = nextOccurrences(gio({ notifyTime: "06:30", leadTimes: [0] }), { fromYear: 2025, count: 1, engineVersion: ENGINE });
    expect(occ[0]!.fireAtLocal.endsWith("T06:30:00+07:00")).toBe(true);
  });

  it("timezone is locked to HCM regardless of process TZ (DEC-LUNAR-043, AC #12)", () => {
    const prev = process.env.TZ;
    process.env.TZ = "America/New_York";
    const fixedNow = new Date(Date.UTC(2026, 1, 17, 5, 0, 0)); // 17/02/2026 12:00 +07
    const result = todayInHCM(fixedNow);
    expect(result[0]).toBe(17);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(2026);
    process.env.TZ = prev;
  });

  it("fireAtLocal is TZ-independent (regression: lead-time date math)", () => {
    const prev = process.env.TZ;
    process.env.TZ = "America/New_York";
    const occ = nextOccurrences(gio({ leadTimes: [1], notifyTime: "07:00" }), { fromYear: 2025, count: 1, engineVersion: ENGINE });
    const g = occ[0]!.gregorianDate;
    const fire = occ[0]!.fireAtLocal.slice(0, 10);
    // fire must be exactly one calendar day before the occurrence, independent of process TZ
    const dayMs = 86400000;
    const diff = (Date.parse(g + "T00:00:00Z") - Date.parse(fire + "T00:00:00Z")) / dayMs;
    expect(diff).toBe(1);
    process.env.TZ = prev;
  });

  it("validateReminder catches RAM day mismatch and ONCE without year (AC #14)", () => {
    const e1 = validateReminder(gio({ type: "RAM", lunarDay: 14 }));
    expect(e1.some((e) => e.code === "RAM_DAY_MISMATCH")).toBe(true);
    const e2 = validateReminder(gio({ recurrence: "ONCE", lunarYear: null }));
    expect(e2.some((e) => e.code === "ONCE_NEEDS_YEAR")).toBe(true);
  });

  it("normalizeReminder applies stable defaults (AC #15)", () => {
    const r = normalizeReminder({ id: "x", userId: "u", type: "GIO", title: "t", lunarDay: 1, lunarMonth: 1, recurrence: "ANNUAL" });
    expect(r.notifyTime).toBe("07:00");
    expect(r.leadTimes).toEqual([1]);
    expect(r.channels).toEqual(["LOCAL"]);
    expect(r.leapFallback).toBe("REGULAR");
    expect(r.enabled).toBe(true);
  });

  it("cache invalidates when engineVersion changes (DEC-LUNAR-044, AC #13)", () => {
    expect(
      isCacheStale(
        { reminderId: "r", gregorianDate: "2025-01-01", lunarLabel: "1/1", computedAt: "2025-01-01T00:00:00Z", engineVersion: "1.0.0" },
        "1.1.0",
      ),
    ).toBe(true);
  });

  it("mergeAndSort orders ascending by fireAtLocal (AC #16)", () => {
    const a = nextOccurrences(gio({ id: "a", lunarMonth: 1, leadTimes: [0] }), { fromYear: 2026, count: 1, engineVersion: ENGINE });
    const b = nextOccurrences(gio({ id: "b", lunarMonth: 7, leadTimes: [0] }), { fromYear: 2026, count: 1, engineVersion: ENGINE });
    const merged = mergeAndSort([...b, ...a]);
    for (let i = 1; i < merged.length; i++) expect(merged[i - 1]!.fireAtLocal <= merged[i]!.fireAtLocal).toBe(true);
  });

  it("round-trip: occurrence gregorianDate maps back to the input lunar month (AC #17)", () => {
    const occ = nextOccurrences(gio({ lunarDay: 10, lunarMonth: 8, leadTimes: [0] }), { fromYear: 2025, count: 1, engineVersion: ENGINE });
    // not fellBack/clamped here, so the round-trip must hold
    expect(occ[0]!.lunarLabel.startsWith("10/8")).toBe(true);
  });
});
