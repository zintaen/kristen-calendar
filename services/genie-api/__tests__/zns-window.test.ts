import { describe, it, expect } from "vitest";
import { isWithinHourWindow, isWithinDayRange, canSendNow } from "../lib/zns-window";

describe("isWithinHourWindow", () => {
  it("06:00 VN (23:00 UTC-1) -> true", () => {
    // 06:00 ICT = 23:00 UTC trước đó
    const now = new Date("2025-08-08T23:00:00Z"); // 06:00 ICT
    expect(isWithinHourWindow(now)).toBe(true);
  });

  it("05:59 VN -> false", () => {
    const now = new Date("2025-08-08T22:59:00Z"); // 05:59 ICT
    expect(isWithinHourWindow(now)).toBe(false);
  });

  it("22:00 VN -> false (biên trên exclusive)", () => {
    const now = new Date("2025-08-08T15:00:00Z"); // 22:00 ICT
    expect(isWithinHourWindow(now)).toBe(false);
  });

  it("21:59 VN -> true", () => {
    const now = new Date("2025-08-08T14:59:00Z"); // 21:59 ICT
    expect(isWithinHourWindow(now)).toBe(true);
  });
});

describe("isWithinDayRange", () => {
  const now = new Date("2025-08-01T08:00:00+07:00");

  it("sự kiện hôm nay (0 ngày) -> allowed", () => {
    const event = new Date("2025-08-01T07:00:00+07:00");
    expect(isWithinDayRange(event, now).allowed).toBe(true);
  });

  it("sự kiện 7 ngày tới -> allowed", () => {
    const event = new Date("2025-08-08T07:00:00+07:00");
    expect(isWithinDayRange(event, now).allowed).toBe(true);
  });

  it("sự kiện 8 ngày tới -> event_too_far", () => {
    const event = new Date("2025-08-09T07:00:00+07:00");
    const result = isWithinDayRange(event, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("event_too_far");
  });

  it("sự kiện quá hạn (-1 ngày) -> event_past", () => {
    const event = new Date("2025-07-31T07:00:00+07:00");
    const result = isWithinDayRange(event, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("event_past");
  });
});

describe("canSendNow", () => {
  it("giờ VN 23:00, sự kiện 3 ngày tới -> outside_hour_range", () => {
    const now = new Date("2025-08-01T16:00:00Z"); // 23:00 ICT
    const event = new Date("2025-08-04T07:00:00+07:00");
    expect(canSendNow(event, now).reason).toBe("outside_hour_range");
  });
});

describe("Template length check", () => {
  it("template mặc định <= 400 ký tự và có >= 1 tham số", () => {
    const template = "Chào {tên}, ngày mai ({ngày dương}) là {dịp} ({ngày âm}). Đừng quên chuẩn bị nhé!";
    expect(template.length).toBeLessThanOrEqual(400);
    expect(template).toContain("{tên}");
    expect(template).toContain("{ngày dương}");
    expect(template).toContain("{dịp}");
    expect(template).toContain("{ngày âm}");
  });
});
