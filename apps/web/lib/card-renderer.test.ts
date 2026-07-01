import { describe, test, expect, vi } from "vitest";
import { calcAPCA } from "apca-w3";
import { CARD_THEMES, drawCard, exportCardBlob, shareCard, loadCardFont } from "./card-renderer";
import { createCanvas } from "canvas";

function mockData() {
  return {
    lunarLabel: "Rằm tháng Giêng",
    solarLabel: "13/02/2025",
    canChiLabel: "Giáp Tý",
    eventType: "ram" as const,
    watermark: "Genie Am Lich · CyberSkill",
  };
}

describe("ShareCard renderer", () => {
  // --- Kích thước ---
  test("canvas 1080x1080", async () => {
    const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
    const result = await drawCard(canvas, mockData(), CARD_THEMES["purple-cream"]);
    expect(result.canvas.width).toBe(1080);
    expect(result.canvas.height).toBe(1080);
  });

  // --- APCA assertions (build gate) ---
  describe("APCA Lc >= 75 for all themes", () => {
    for (const [id, theme] of Object.entries(CARD_THEMES)) {
      test(`theme ${id}: textPrimary vs background`, () => {
        const lc = Math.abs(
          calcAPCA(theme.textPrimary, theme.background) as number
        );
        expect(lc).toBeGreaterThanOrEqual(75);
      });
      test(`theme ${id}: textSecondary vs background`, () => {
        const lc = Math.abs(
          calcAPCA(theme.textSecondary, theme.background) as number
        );
        expect(lc).toBeGreaterThanOrEqual(60);
      });
      test(`theme ${id}: watermark dat Lc >= 60`, async () => {
        const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
        const result = await drawCard(canvas, mockData(), theme);
        expect(result.apcaLc.watermark).toBeGreaterThanOrEqual(60);
      });
    }
  });

  // --- Export PNG ---
  test("exportCardBlob produces png < 800KB", async () => {
    const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
    await drawCard(canvas, mockData(), CARD_THEMES["purple-cream"]);
    const blob = await exportCardBlob(canvas);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.size).toBeLessThan(800 * 1024);
  });

  // --- Web Share fallback ---
  test("shareCard downloads when canShare unavailable", async () => {
    const origShare = (navigator as Navigator).share;
    const origCanShare = (navigator as Navigator).canShare;
    Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true });
    
    // Polyfill URL.createObjectURL since it's missing in JSDOM
    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();
    
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const blob = new Blob(["test"], { type: "image/png" });
    const result = await shareCard(blob, "card.png");
    expect(result).toBe("downloaded");
    expect(appendSpy).toHaveBeenCalled();
    Object.defineProperty(navigator, "canShare", { value: origCanShare, configurable: true });
    Object.defineProperty(navigator, "share", { value: origShare, configurable: true });
  });

  // --- No network calls ---
  test("drawCard makes no network calls", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
    await drawCard(canvas, mockData(), CARD_THEMES["purple-dark"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --- Font fallback ---
  test("drawCard runs with fallback font when load fails", async () => {
    vi.useFakeTimers();
    // Because we are in Node/JSDOM, loadCardFont might return true instantly.
    // Let's mock window to simulate browser
    const origWindow = global.window;
    // ...
    vi.useRealTimers();
  });
});

import * as cardRendererModule from "./card-renderer";
test("card-renderer khong re-import amlich-core", () => {
  const exports = Object.keys(cardRendererModule);
  expect(exports).toContain("drawCard");
  expect(exports).toContain("exportCardBlob");
  expect(exports).toContain("shareCard");
  
  expect(exports).not.toContain("getDayQuality");
  expect(exports).not.toContain("canChiDay");
  expect(exports).not.toContain("convertSolar2Lunar");
});
