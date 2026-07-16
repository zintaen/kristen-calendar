import { describe, it, expect } from "vitest";
import { jdFromDate, canChiDay, canChiLabel, zodiacOf } from "../src/index.js";

describe("canChiDay - cong thuc canonical (TASK-LUNAR-002)", () => {
  it("chiIndex = (jdn + 1) % 12 (la dia chi ma TASK-011 day-quality PHAI dung, KHONG phai (jdn+9)%12)", () => {
    const base = jdFromDate(2, 2, 1984);
    for (let jd = base; jd < base + 60; jd++) {
      const expectedChi = (((jd + 1) % 12) + 12) % 12;
      expect(canChiDay(jd).chiIndex).toBe(expectedChi);
    }
  });

  it("canIndex = (jdn + 9) % 10", () => {
    const base = jdFromDate(2, 2, 1984);
    for (let jd = base; jd < base + 60; jd++) {
      const expectedCan = (((jd + 9) % 10) + 10) % 10;
      expect(canChiDay(jd).canIndex).toBe(expectedCan);
    }
  });

  it("can-chi ngay tang dung 1 modulo khi JDN + 1 (chu ky lien tuc)", () => {
    const jd = jdFromDate(2, 2, 1984);
    const a = canChiDay(jd);
    const b = canChiDay(jd + 1);
    expect(b.canIndex).toBe((a.canIndex + 1) % 10);
    expect(b.chiIndex).toBe((a.chiIndex + 1) % 12);
  });

  it("canChiLabel + zodiacOf la pure helper (chay duoc ngay khong can implement)", () => {
    expect(canChiLabel(0, 0)).toBe("Giáp Tý");
    expect(zodiacOf(3)).toBe("Mèo"); // chi Mao -> Meo (zodiac VN)
    expect(zodiacOf(1)).toBe("Trâu"); // chi Suu -> Trau
  });
});
