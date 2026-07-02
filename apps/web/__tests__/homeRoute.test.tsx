import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "../app/page";
import { vi } from "vitest";

vi.mock("@cyberskill/amlich-core", () => ({
  convertSolar2Lunar: vi.fn().mockReturnValue([1, 1, 2025, 0]),
  jdFromDate: vi.fn().mockReturnValue(2460704),
  canChiDay: vi.fn().mockReturnValue({ label: "Giáp Tý" }),
  canChiMonth: vi.fn().mockReturnValue({ label: "Bính Dần" }),
  canChiYear: vi.fn().mockReturnValue({ label: "Ất Tỵ", chiIndex: 5 }),
  zodiacOf: vi.fn().mockReturnValue("Rắn"),
  VN_TZ: 7.0,
  todayInHCM: vi.fn().mockReturnValue([29, 1, 2025]),
}));

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-29"));
});

afterAll(() => {
  vi.useRealTimers();
});

test("Home page hien thi ngay am va can-chi dung", () => {
  render(<HomePage />);
  expect(screen.getByText(/Mùng 1/)).toBeDefined();
  expect(screen.getByText(/Ất Tỵ/)).toBeDefined();
  expect(screen.getByText(/Giáp Tý/)).toBeDefined();
});
