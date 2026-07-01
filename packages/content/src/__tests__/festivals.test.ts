import { describe, test, expect, vi } from "vitest";
import {
  getAllFestivals, getFestivalById, getFestivalByLunarDate, buildFestivalDateSet
} from "../index";

describe("Content database", () => {
  test("Co dung 13 ban ghi festival", () => {
    expect(getAllFestivals().length).toBe(13);
  });

  test("Moi ban ghi co disclaimer chua 'tham khao theo phong tuc dan gian'", () => {
    getAllFestivals().forEach(f => {
      expect(f.disclaimer.toLowerCase()).toContain("tham khảo theo phong tục dân gian");
    });
  });

  test("Moi ban ghi co offerings >= 3 va checklist >= 2", () => {
    getAllFestivals().forEach(f => {
      expect(f.offerings.length).toBeGreaterThanOrEqual(3);
      expect(f.checklist.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("getFestivalById('mung-mot'): lunarDay=1, lunarMonth=null", () => {
    const f = getFestivalById("mung-mot");
    expect(f).toBeTruthy();
    expect(f!.lunarDay).toBe(1);
    expect(f!.lunarMonth).toBeNull();
  });

  test("getFestivalByLunarDate(15, 1): tra ca ram-thang-gieng VA ram, specific len truoc", () => {
    const results = getFestivalByLunarDate(15, 1);
    const ids = results.map(r => r.id);
    expect(ids).toContain("ram-thang-gieng");
    expect(ids).toContain("ram");
    expect(results[0]!.id).toBe("ram-thang-gieng");
  });

  test("getFestivalByLunarDate(1, 1): tra ca mung-mot va mung-mot-tet", () => {
    const results = getFestivalByLunarDate(1, 1);
    const ids = results.map(r => r.id);
    expect(ids).toContain("mung-mot");
    expect(ids).toContain("mung-mot-tet");
  });

  test("doan-ngo co 3 regionVariants (BAC, TRUNG, NAM)", () => {
    const f = getFestivalById("doan-ngo");
    expect(f!.regionVariants!.length).toBe(3);
    const regions = f!.regionVariants!.map(r => r.region);
    expect(regions).toContain("BAC");
    expect(regions).toContain("TRUNG");
    expect(regions).toContain("NAM");
  });

  test("thanh-minh va dam-gio-ca-nhan co lunarDay = null (truong phang)", () => {
    expect(getFestivalById("thanh-minh")!.lunarDay).toBeNull();
    expect(getFestivalById("dam-gio-ca-nhan")!.lunarDay).toBeNull();
  });

  test("buildFestivalDateSet(2025) chua ngay Ram thang Gieng 2025 = 12/02/2025", () => {
    const set = buildFestivalDateSet(2025);
    expect(set.has("2025-02-12")).toBe(true);
  });

  test("buildFestivalDateSet(2025) chua Mung 1 Tet 2025 = 29/01/2025", () => {
    const set = buildFestivalDateSet(2025);
    expect(set.has("2025-01-29")).toBe(true);
  });

  test("Khong co network request trong moi ham content", () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    getAllFestivals();
    getFestivalById("mung-mot");
    getFestivalByLunarDate(15, 1);
    buildFestivalDateSet(2025);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
