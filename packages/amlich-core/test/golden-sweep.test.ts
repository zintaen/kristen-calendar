import { describe, it, expect } from "vitest";
import { jdFromDate, jdToDate, convertSolar2Lunar, convertLunar2Solar } from "../src/index.js";

/**
 * Go/no-go gate cua P0 (FR-LUNAR-003, NFR-Accuracy): round-trip L2S(S2L(d)) == d cho MOI ngay 1900-2199.
 * Neu lech bat ky ngay nao -> dung, debug truoc khi xay UI.
 */
describe("Golden round-trip sweep 1900-2199 (FR-LUNAR-003)", () => {
  it("L2S(S2L(d, tz=7), tz=7) == d cho moi ngay duong trong dai", () => {
    const start = jdFromDate(1, 1, 1900);
    const end = jdFromDate(31, 12, 2199);
    let checked = 0;
    let mismatches = 0;
    for (let jd = start; jd <= end; jd++) {
      const [d, m, y] = jdToDate(jd);
      const [ld, lm, ly, leap] = convertSolar2Lunar(d, m, y, 7);
      const rt = convertLunar2Solar(ld, lm, ly, leap, 7);
      if (rt[0] !== d || rt[1] !== m || rt[2] !== y) mismatches++;
      checked++;
    }
    expect(checked).toBeGreaterThan(100000);
    expect(mismatches).toBe(0);
  });

  it("jdToDate xu ly dung ngay switch Gregorian 15/10/1582 (FR-LUNAR-001 audit fix: jd >= GREGORIAN_SWITCH_JD)", () => {
    expect(jdToDate(2299161)).toEqual([15, 10, 1582]);
    expect(jdFromDate(4, 10, 1582)).toBe(2299160);
  });
});
