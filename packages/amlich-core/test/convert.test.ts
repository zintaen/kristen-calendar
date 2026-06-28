import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { convertSolar2Lunar, convertLunar2Solar, isInvalidSolar } from "../src/index.js";

// Golden fixtures la du lieu DOC LAP (PRD 6.6), khong sinh tu engine. P0 go/no-go gate.
const tet = JSON.parse(readFileSync(new URL("./fixtures/tet.json", import.meta.url), "utf-8")) as Array<{
  solar: [number, number, number]; lunar: [number, number, number, 0 | 1]; yearCanChi: string; zodiac: string; note: string;
}>;
const vnCn = JSON.parse(readFileSync(new URL("./fixtures/vn-vs-china.json", import.meta.url), "utf-8")) as Array<{
  year: number; vnTet: [number, number]; cnTet: [number, number]; note: string;
}>;

describe("convertSolar2Lunar / convertLunar2Solar - PRD 6.6 fixtures", () => {
  for (const f of tet) {
    it(`solar ${f.solar.join("/")} -> lunar ${f.lunar.join("/")} (${f.note})`, () => {
      expect(convertSolar2Lunar(f.solar[0], f.solar[1], f.solar[2], 7)).toEqual(f.lunar);
    });
    it(`lunar ${f.lunar.join("/")} -> solar ${f.solar.join("/")} (round-trip nguoc)`, () => {
      const [ld, lm, ly, leap] = f.lunar;
      expect(convertLunar2Solar(ld, lm, ly, leap, 7)).toEqual(f.solar);
    });
  }

  it("1985 co thang 2 nhuan: convertLunar2Solar(1, 2, 1985, leap=1, tz=7) la ngay hop le (khong sentinel)", () => {
    const s = convertLunar2Solar(1, 2, 1985, 1, 7);
    expect(isInvalidSolar(s)).toBe(false);
  });
});

describe("Lech VN vs Trung Quoc (105E/tz=7 vs 120E/tz=8) - PRD 6.4", () => {
  for (const f of vnCn) {
    it(`Tet ${f.year}: VN ${f.vnTet.join("/")} (tz=7) vs TQ ${f.cnTet.join("/")} (tz=8)`, () => {
      const vn = convertLunar2Solar(1, 1, f.year, 0, 7);
      const cn = convertLunar2Solar(1, 1, f.year, 0, 8);
      expect([vn[0], vn[1]]).toEqual(f.vnTet);
      expect([cn[0], cn[1]]).toEqual(f.cnTet);
    });
  }
});
