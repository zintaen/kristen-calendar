import { describe, test, expect } from "vitest";
import { checkApca, assertApca, checkWcag, assertWcag21AA } from "./apca";
import { SEMANTIC, COMPONENT, PRIMITIVE, TYPOGRAPHY } from "./tokens";

describe("APCA color gate (DEC-LUNAR-091)", () => {
  test("text-primary tren bg-default dat APCA |Lc| >= 90 (body text dai)", () => {
    const lc = Math.abs(checkApca(SEMANTIC["text-primary"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(90);
  });

  test("text-secondary tren bg-default dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(SEMANTIC["text-secondary"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });

  test("button-primary-text tren button-primary-bg dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });

  test("Tim nhat (purple-400) tren nen kem KHONG du tuong phan - gate hoat dong", () => {
    expect(() => assertApca(PRIMITIVE["purple-400"], SEMANTIC["bg-default"], 75)).toThrow("APCA fail");
  });

  test("error tren bg-default dat APCA |Lc| >= 75", () => {
    const lc = Math.abs(checkApca(SEMANTIC["error"], SEMANTIC["bg-default"]));
    expect(lc).toBeGreaterThanOrEqual(75);
  });

  test("Tat ca text colors tren bg-default phai dat APCA >= 75 (tru text-disabled)", () => {
    const textColors = ["text-primary", "text-secondary", "error"] as const;
    for (const key of textColors) {
      const lc = Math.abs(checkApca(SEMANTIC[key], SEMANTIC["bg-default"]));
      expect(lc).toBeGreaterThanOrEqual(75);
    }
  });
});

describe("WCAG AA parallel gate (DEC-LUNAR-091)", () => {
  test("text-primary tren bg-default dat WCAG AA >= 4.5:1", () => {
    expect(checkWcag(SEMANTIC["text-primary"], SEMANTIC["bg-default"])).toBeGreaterThanOrEqual(4.5);
  });

  test("button-primary-text tren button-primary-bg dat WCAG AA", () => {
    expect(checkWcag(COMPONENT["button-primary-text"], COMPONENT["button-primary-bg"])).toBeGreaterThanOrEqual(4.5);
  });

  test("assertWcag21AA throw khi tuong phan thap", () => {
    // Mau xam nhat tren trang la truong hop xau
    expect(() => assertWcag21AA(PRIMITIVE["gray-400"], PRIMITIVE["white"])).toThrow("WCAG AA fail");
  });
});

describe("Base brand tokens bao ton (DEC-LUNAR-090)", () => {
  test("brand-umber = #45210E", () => {
    expect(PRIMITIVE["brand-umber"]).toBe("#45210E");
  });

  test("brand-ochre = #F4BA17", () => {
    expect(PRIMITIVE["brand-ochre"]).toBe("#F4BA17");
  });
});

describe("Typography", () => {
  test("TYPOGRAPHY.fontFamily bat dau bang Be Vietnam Pro", () => {
    expect(TYPOGRAPHY.fontFamily.startsWith("'Be Vietnam Pro'")).toBe(true);
  });

  test("Tat ca font-size trong TYPOGRAPHY.fontSizes dung don vi rem (khong dung px)", () => {
    Object.values(TYPOGRAPHY.fontSizes).forEach(size => {
      expect(size).toMatch(/rem$/);
      expect(size).not.toMatch(/px$/);
    });
  });
});
