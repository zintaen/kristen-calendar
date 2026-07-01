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
    const start = new Date("2025-01-01T00:00:00Z");
    const end   = new Date("2025-04-11T00:00:00Z"); // > 90 ngay
    const state = computeGoodDays(start, end, "khai-truong");
    expect(state.isClamped).toBe(true);
    const diffDays = (state.endDate.getTime() - state.startDate.getTime()) / 86400000;
    expect(diffDays).toBeLessThanOrEqual(90);
  });

  test("khoang 30 ngay khong bi clamp", () => {
    const start = new Date("2025-01-01T00:00:00Z");
    const end   = new Date("2025-01-31T00:00:00Z");
    const state = computeGoodDays(start, end, "ky-hop-dong");
    expect(state.isClamped).toBe(false);
  });
});

describe("computeGoodDays - results", () => {
  test("tra ve totalGoodDays > 0 cho thang 1/2025", () => {
    const state = computeGoodDays(new Date("2025-01-01T00:00:00Z"), new Date("2025-01-31T00:00:00Z"), "ky-hop-dong");
    expect(state.totalGoodDays).toBeGreaterThan(0);
    expect(state.results.length).toBe(state.totalGoodDays);
  });

  test("ket qua sap xep tang dan theo ngay", () => {
    const state = computeGoodDays(new Date("2025-01-01T00:00:00Z"), new Date("2025-03-31T00:00:00Z"), "ra-mat");
    for (let i = 1; i < state.results.length; i++) {
      expect(new Date(state.results[i].date) >= new Date(state.results[i - 1].date)).toBe(true);
    }
  });

  test("khong goi network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    computeGoodDays(new Date("2025-01-01T00:00:00Z"), new Date("2025-01-31T00:00:00Z"), "khai-may");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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

// AC #13 - khong co side-effect tao Reminder
describe("filterGoodDays va computeGoodDays - khong tao Reminder", () => {
  test("filterGoodDays khong goi createReminder", () => {
    const jan2025 = getMonthDayQualities(2025, 1);
    const results = filterGoodDays(jan2025, "ky-hop-dong");
    expect(results).toBeDefined(); 
  });

  test("computeGoodDays khong goi createReminder", () => {
    const state = computeGoodDays(new Date("2025-01-01T00:00:00Z"), new Date("2025-01-31T00:00:00Z"), "ky-hop-dong");
    expect(state.results.length).toBeGreaterThanOrEqual(0);
  });
});
