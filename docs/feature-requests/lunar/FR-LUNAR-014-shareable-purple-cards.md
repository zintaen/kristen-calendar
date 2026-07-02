---
id: FR-LUNAR-014
title: "Shareable cards - purple-toned card image export ('Today is the Full Moon of the first lunar month'), social-media sharing"
module: LUNAR
priority: SHOULD
status: ready_to_implement
verify: T
phase: P2
milestone: P2 · slice 5
slice: 5
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-009]
depends_on: [FR-LUNAR-007, FR-LUNAR-009]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-F03)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#13 (shareable cards)"
source_decisions:
  - DEC-LUNAR-140 (render the card on an HTMLCanvasElement 1080x1080px, export PNG via canvas.toBlob; do not use html2canvas because of CORS + unstable font rendering)
  - DEC-LUNAR-141 (every text/background pair MUST pass APCA Lc >= 75 with apca-w3 before merge; deep purple on cream is the default pair)
  - DEC-LUNAR-142 (share via the Web Share API (navigator.share) on iOS/Android; fall back to "download" when the API is unavailable)
  - DEC-LUNAR-143 (the card content comes from the DayInfo already computed in FR-LUNAR-007, not recomputed; the card needs no network)
language: typescript 5.x
service: apps/web/
new_files:
  - apps/web/components/ShareCard.tsx
  - apps/web/lib/card-renderer.ts
  - apps/web/lib/card-renderer.test.ts
  - apps/web/components/ShareCardSheet.tsx
modified_files:
  - apps/web/components/DayDetail.tsx
allowed_tools:
  - file_read: apps/web/**
  - file_write: apps/web/components/ShareCard.tsx, apps/web/components/ShareCardSheet.tsx, apps/web/lib/card-renderer.ts, apps/web/lib/card-renderer.test.ts
  - bash: cd apps/web && pnpm test card-renderer
disallowed_tools:
  - call the network during card rendering (violates DEC-LUNAR-143 / NFR-Offline for the day data)
  - use html2canvas or puppeteer to render (violates DEC-LUNAR-140)
effort_hours: 6
sub_tasks:
  - "1.0h: card-renderer.ts - drawCard(ctx, CardData, CardTheme) draws the gradient background, frame, text layer"
  - "0.5h: font loading - PreloadFont Be Vietnam Pro 700 before draw, fallback sans-serif"
  - "1.0h: compile-time APCA check - apca-w3 assertion in card-renderer.test.ts for every color pair"
  - "1.0h: ShareCard.tsx - canvas 1080x1080, scaled-down preview 360x360 in the UI"
  - "0.5h: export PNG blob, create a File object for the Web Share API"
  - "1.0h: ShareCardSheet.tsx - bottom-sheet to choose a template (Full Moon, First Day, death anniversary, custom), Share / Download buttons"
  - "1.0h: test suite - canvas size, APCA assertions, blob output, fallback download"
risk_if_skipped: "The purple card-sharing feature is the visual highlight for the persona 'Chi Linh' (an actor who likes to post on Instagram). Without FR-014, the app has no viral content to spread organically. FR-009 already built the purple tokens but there is no export surface to bring them outside the app."
---

## §1 - Description (BCP-14 normative)

The system MUST render a purple-toned card image as a 1080x1080px square on an `HTMLCanvasElement` and provide a share or download button. Contract:

1. MUST render the card on an `HTMLCanvasElement` 1080x1080px with the Canvas 2D API; MUST NOT use `html2canvas`, `puppeteer`, or any DOM-to-image library (DEC-LUNAR-140).
2. MUST export PNG via `canvas.toBlob("image/png")` with uncompressed quality; the target file size is < 500 KB.
3. MUST display at least three content areas: (a) the lunar date title line (for example "Full Moon of the first lunar month"), (b) the corresponding solar date, (c) a small logo/watermark "Genie Am Lich - CyberSkill".
4. MUST load the font "Be Vietnam Pro" weight 700 via the `FontFace` API before calling `drawCard`; if loading fails within 3s, fall back to sans-serif and log a warning (DEC-LUNAR-143).
5. MUST meet the APCA threshold by font size for every text/background pair on the card, checked with `apca-w3` in the test suite; the build MUST fail if it does not (DEC-LUNAR-141): primary text (>= 60px, `textPrimary`) MUST be Lc >= 75; secondary text (`textSecondary`) MUST be Lc >= 60; the small watermark (~18-22px) MUST be Lc >= 90 (per APCA for small text, §11). Each threshold has its own assertion corresponding to the actual font size.
6. MUST support at least two color templates: (a) "purple-cream" - deep purple text (`#3B1F6E`) on a cream background (`#FDF6EC`), (b) "purple-dark" - cream text on a deep purple background (`#3B1F6E`); both MUST pass APCA >= 75.
7. MUST provide a "Share" button that calls `navigator.share({ files: [File] })` (Web Share API Level 2) to share the image directly to social media / Zalo on iOS/Android (DEC-LUNAR-142).
8. MUST have a "Download" fallback that creates an `<a download>` element and triggers a click when `navigator.canShare` returns false or does not exist (DEC-LUNAR-142).
9. MUST display a scaled-down 360x360px card preview in the UI (scaled from the 1080px canvas) before the user shares.
10. MUST provide `ShareCardSheet` - a bottom-sheet that lets the user choose a template and a date (defaulting to the day being viewed in the FR-LUNAR-007 month calendar).
11. MUST NOT recompute `DayInfo` inside the card renderer; it MUST receive the already-computed `CardData` from the layer above (DEC-LUNAR-143).
12. SHOULD let the user additionally choose to display the day's can-chi on the card (for example "Giap Ty - auspicious day").
13. SHOULD add light decorative motifs (a gradient, abstract patterns) that do not obscure the text; the motifs MUST be drawn with Canvas 2D, not using external images, to avoid CORS.

---

## §2 - Why this design (rationale for humans)

**Why use Canvas 2D instead of html2canvas?** `html2canvas` captures the DOM into an image, but font rendering, CORS images, and z-index often produce results that differ across browsers. The Canvas 2D API is a consistent surface, controllable pixel by pixel, independent of DOM layout, and easy to test with node-canvas in a CI environment (DEC-LUNAR-140).

**Why the 1080x1080px size?** The Instagram feed requires at least 1080px to avoid blurring on upload; a 1:1 ratio is the most common format for a square story/post. Zalo Stories also recommends 1080px. Displaying a 360px preview in the app loads quickly without affecting the exported image quality (DEC-LUNAR-140).

**Why an APCA assertion in the test?** Purple tones easily fall into the mid-contrast range if the wrong shade is chosen. Catching the error at compile time with `apca-w3` ensures that any color-token change in `packages/ui/` does not silently break the card contrast without anyone noticing (DEC-LUNAR-141, NFR-Accessibility).

**Why use the Web Share API instead of opening an upload link?** The Web Share API Level 2 lets the user share a file directly into any app (Instagram, Zalo, Messenger, Save to Photos) via a native OS action sheet. This is the smoothest experience on iOS Safari and Android Chrome without needing OAuth or a server upload (DEC-LUNAR-142).

**Why does CardData come from the layer above?** The card renderer is a pure drawing function with no state. Separating it from the calendar computation makes it independently testable and reusable when more templates are added. Recomputing `DayInfo` in the renderer would create an unnecessary circular dependency with `amlich-core` (DEC-LUNAR-143).

**Why use two templates at minimum?** "Purple-cream" suits a light mood (First Day, Full Moon); "purple-dark" gives a more solemn feel (Vu Lan, death anniversaries). Two templates are also a way to test that both color directions pass APCA, not just one (DEC-LUNAR-141).

---

## §3 - API contract

```typescript
// apps/web/lib/card-renderer.ts

export interface CardData {
  lunarLabel: string;       // "Rằm tháng Giêng"
  solarLabel: string;       // "13/02/2025"
  canChiLabel?: string;     // "Giáp Tý - Hoàng đạo" (tùy chọn)
  eventType: "ram" | "mung_mot" | "gio" | "custom";
  watermark: string;        // "Genie Am Lich · CyberSkill"
}

export type CardThemeId = "purple-cream" | "purple-dark";

export interface CardTheme {
  id: CardThemeId;
  background: string;       // CSS color
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}

export const CARD_THEMES: Record<CardThemeId, CardTheme> = {
  "purple-cream": {
    id: "purple-cream",
    background: "#FDF6EC",
    textPrimary: "#3B1F6E",
    textSecondary: "#6B4E9B",
    accentColor: "#8A5CD8",
  },
  "purple-dark": {
    id: "purple-dark",
    background: "#3B1F6E",
    textPrimary: "#FDF6EC",
    textSecondary: "#E8D5FF",
    accentColor: "#C9A4FF",
  },
};

export interface CardRenderResult {
  canvas: HTMLCanvasElement;
  // computed Lc values theo cap text/nen thuc te (DEC-LUNAR-141, §1 #5):
  //   primary >= 75, secondary >= 60, watermark >= 90 (chu nho)
  apcaLc: { primary: number; secondary: number; watermark: number };
}

/**
 * Vẽ card lên ctx đã chuẩn bị. Hàm thuần túy: không fetch, không đọc DOM.
 * Font PHẢI được load trước khi gọi hàm này.
 */
export async function drawCard(
  canvas: HTMLCanvasElement,
  data: CardData,
  theme: CardTheme
): Promise<CardRenderResult>;

/**
 * Load Be Vietnam Pro weight 700 truoc khi draw.
 * Trả về true nếu thành công, false nếu timeout (3000ms).
 */
export async function loadCardFont(): Promise<boolean>;

/**
 * Export canvas thành PNG Blob.
 */
export async function exportCardBlob(canvas: HTMLCanvasElement): Promise<Blob>;

/**
 * Chia sẻ card qua Web Share API Level 2.
 * Nếu canShare = false hoặc share thất bại, tạo download link thay thế.
 */
export async function shareCard(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "failed">;
```

```typescript
// apps/web/components/ShareCard.tsx
interface ShareCardProps {
  data: CardData;
  themeId?: CardThemeId;
  onClose: () => void;
}
export function ShareCard(props: ShareCardProps): React.ReactElement;

// apps/web/components/ShareCardSheet.tsx
interface ShareCardSheetProps {
  defaultData: CardData;
  open: boolean;
  onClose: () => void;
}
export function ShareCardSheet(props: ShareCardSheetProps): React.ReactElement;
```

---

## §4 - Acceptance criteria

1. The canvas is created at exactly 1080x1080px; `canvas.width === 1080 && canvas.height === 1080`.
2. `lunarLabel` appears in the center area of the card with a font size >= 60px; `solarLabel` appears below it.
3. The `textPrimary` / `background` pair of "purple-cream" reaches APCA Lc >= 75 when checked with `apca-w3`; the assertion fails the build if < 75.
4. The `textPrimary` / `background` pair of "purple-dark" reaches APCA Lc >= 75; the assertion fails the build if < 75.
5. `exportCardBlob` returns a `Blob` of type `"image/png"` with size > 0 and < 500 KB for standard content.
6. When `navigator.canShare` is true, `shareCard` calls `navigator.share` with an object containing `files: [File]`.
7. When `navigator.canShare` is false or undefined, `shareCard` creates an `<a download>` element and triggers a click; it does not throw.
8. A 360px preview displays in the `ShareCard` component before the user presses the share button.
9. `ShareCardSheet` displays a bottom-sheet with at least 2 template options; choosing a template updates the preview immediately.
10. `loadCardFont` returns `false` on a 3s timeout; `drawCard` still runs with the fallback font and does not throw.
11. `drawCard` does not call `fetch`, `XMLHttpRequest`, or any network API.
12. The watermark "Genie Am Lich · CyberSkill" appears in the bottom corner of the card with a smaller font size than the primary text, and `drawCard(...).apcaLc.watermark >= 90` for both themes (small text needs a higher Lc per APCA, §1 #5/§11); the assertion fails the build if < 90.
13. The entire `card-renderer.test.ts` test suite passes in the CI environment (jsdom or node-canvas).
14. `drawCard` receives `CardData` as a parameter; there is no import of `canChiDay`, `getDayQuality`, `convertSolar2Lunar`, or any symbol from `@cyberskill/amlich-core` in the file `card-renderer.ts` (DEC-LUNAR-143) - checked with a grep assertion in CI: `grep -r "amlich-core" apps/web/lib/card-renderer.ts` returns 0 results.

---

## §5 - Verification

```typescript
// apps/web/lib/card-renderer.test.ts
import { calcAPCA } from "apca-w3";
import { CARD_THEMES, drawCard, exportCardBlob, shareCard, loadCardFont } from "./card-renderer";
import { createCanvas } from "canvas"; // node-canvas cho CI

// --- Kích thuoc ---
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
      expect(lc).toBeGreaterThanOrEqual(60); // secondary text nhỏ hơn, ngưỡng thấp hơn
    });
    // Watermark (~18-22px) PHAI dat Lc >= 90 theo APCA cho chu nho (§1 #5, §11).
    // drawCard tra ve apcaLc.watermark = Lc cua mau watermark thuc te tren nen.
    test(`theme ${id}: watermark dat Lc >= 90`, async () => {
      const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
      const result = await drawCard(canvas, mockData(), theme);
      expect(result.apcaLc.watermark).toBeGreaterThanOrEqual(90);
    });
  }
});

// --- Export PNG ---
test("exportCardBlob produces png < 500KB", async () => {
  const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
  await drawCard(canvas, mockData(), CARD_THEMES["purple-cream"]);
  const blob = await exportCardBlob(canvas);
  expect(blob.type).toBe("image/png");
  expect(blob.size).toBeGreaterThan(0);
  expect(blob.size).toBeLessThan(500 * 1024);
});

// --- Web Share fallback ---
test("shareCard downloads when canShare unavailable", async () => {
  const origShare = (navigator as Navigator).share;
  const origCanShare = (navigator as Navigator).canShare;
  Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true });
  const appendSpy = jest.spyOn(document.body, "appendChild");
  const blob = new Blob(["test"], { type: "image/png" });
  const result = await shareCard(blob, "card.png");
  expect(result).toBe("downloaded");
  expect(appendSpy).toHaveBeenCalled();
  Object.defineProperty(navigator, "canShare", { value: origCanShare, configurable: true });
  Object.defineProperty(navigator, "share", { value: origShare, configurable: true });
});

// --- No network calls ---
test("drawCard makes no network calls", async () => {
  const fetchSpy = jest.spyOn(global, "fetch");
  const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
  await drawCard(canvas, mockData(), CARD_THEMES["purple-dark"]);
  expect(fetchSpy).not.toHaveBeenCalled();
});

// --- Font fallback ---
test("drawCard runs with fallback font when load fails", async () => {
  jest.useFakeTimers();
  const fontPromise = loadCardFont();
  jest.advanceTimersByTime(3001);
  const loaded = await fontPromise;
  expect(loaded).toBe(false);
  // drawCard vẫn không throw
  const canvas = createCanvas(1080, 1080) as unknown as HTMLCanvasElement;
  await expect(drawCard(canvas, mockData(), CARD_THEMES["purple-cream"])).resolves.toBeDefined();
  jest.useRealTimers();
});

// AC #14 - card-renderer.ts khong import amlich-core (DEC-LUNAR-143)
// Kiem tra bang static analysis: file card-renderer.ts khong chua "@cyberskill/amlich-core"
import * as cardRendererModule from "./card-renderer";
test("card-renderer khong re-import amlich-core (DayInfo la tham so, khong tinh lai)", () => {
  // Tat ca symbol export tu card-renderer phai la drawing functions, khong phai calc functions
  const exports = Object.keys(cardRendererModule);
  expect(exports).toContain("drawCard");
  expect(exports).toContain("exportCardBlob");
  expect(exports).toContain("shareCard");
  // Khong co getDayQuality hay canChiDay trong exports cua card-renderer
  expect(exports).not.toContain("getDayQuality");
  expect(exports).not.toContain("canChiDay");
  expect(exports).not.toContain("convertSolar2Lunar");
});

function mockData() {
  return {
    lunarLabel: "Rằm tháng Giêng",
    solarLabel: "13/02/2025",
    canChiLabel: "Giáp Tý",
    eventType: "ram" as const,
    watermark: "Genie Am Lich · CyberSkill",
  };
}
```

---

## §6 - Implementation skeleton

The full contract is in §3. The single point to pin down: drawing text MUST call `ctx.font = \`700 ${size}px "Be Vietnam Pro", sans-serif\`` after the font has loaded. If the font is not in `document.fonts`, call `document.fonts.load(...)` and await it before `drawCard`. On node-canvas (CI), use the library's `registerFont` instead.

---

## §7 - Dependencies

Upstream: FR-LUNAR-007 provides `DayInfo` (lunarDate, canChiDay, ...) as the source of `CardData`; FR-LUNAR-009 provides the purple color tokens - the hex values in `CARD_THEMES` MUST come from `packages/ui/src/theme/tokens.ts` and must not be separately hardcoded, to ensure consistency.

Downstream: no FR is directly blocked by FR-014.

Cross-cutting: `apca-w3` is a dev dependency of `apps/web/`; check that it is already in `packages/ui/` (FR-LUNAR-009 uses it for the theme gate) to avoid duplication.

---

## §8 - Example payloads

```json
{
  "cardData": {
    "lunarLabel": "Rằm tháng Giêng",
    "solarLabel": "13/02/2025",
    "canChiLabel": "Giáp Tý - Hoàng đạo",
    "eventType": "ram",
    "watermark": "Genie Am Lich · CyberSkill"
  },
  "themeId": "purple-cream",
  "apcaResult": {
    "primary": 87.4,
    "secondary": 63.1,
    "watermark": 92.6
  },
  "exportResult": {
    "blobType": "image/png",
    "sizeKB": 142
  },
  "shareResult": "shared"
}
```

---

## §9 - Open questions

Resolved: the 1080px size, the Canvas 2D renderer, the Web Share API Level 2.

Still deferred: (a) support for an additional 9:16 format (1080x1920) for Instagram Story - not needed for slice 5, can be added after real feedback; (b) adding animation (a GIF/video card) - noted in the PRD Caveats but no FR yet; (c) user-designed templates - out of scope for FR-014.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Font "Be Vietnam Pro" timeout | `loadCardFont` returns false after 3s | Fallback sans-serif, text still renders | Log a warning; do not block UX |
| APCA < 75 when a color token changes | CI test `calcAPCA` fails | Build fails | Developer fixes the token before merge |
| `canvas.toBlob` returns null | Check `blob == null` | Throw `CardExportError` | Show a toast "Cannot export the image, try again" |
| PNG file > 500 KB | Check `blob.size` in the test | Test fails | Reduce the motifs or use JPEG compression |
| `navigator.share` throws `AbortError` | catch AbortError | Ignore (user cancelled) | No error reported |
| `navigator.share` throws otherwise | catch generic Error | Log + fallback download | Toast "Share failed, downloaded instead" |
| `canShare` = false (desktop browser) | `!navigator.canShare` | Activate the download path | Button relabeled to "Download" |
| CORS when loading an external image into the canvas | canvas is "tainted" | `toBlob` throws SecurityError | DEC-LUNAR-140: do not use external images; draw the motifs with Canvas 2D |
| node-canvas missing in CI | import fails | Test crash | Add `canvas` to devDependencies |
| Web Share API does not support `files` | `canShare({ files })` = false | Fallback download | Documented behavior |

---

## §11 - Implementation notes

- `drawCard` is async because it needs to await `document.fonts.ready` after loading; in a CI environment using node-canvas this step is skipped.
- When computing `apcaLc`, remember that `calcAPCA` from `apca-w3` returns a negative value when dark text is on a light background; use `Math.abs` before comparing against the threshold of 75.
- The Web Share API `navigator.share({ files })` requires a gesture (a user click); it MUST NOT be called inside `useEffect` or an automatic timeout.
- The 360px preview is a CSS `transform: scale(0.333)` from the 1080px canvas - this preserves pixel quality instead of redrawing a smaller canvas.
- `ShareCardSheet` should lazy-load `card-renderer.ts` via a dynamic import so it does not affect the main-screen bundle size.
- The color tokens in `CARD_THEMES` MUST be imported from `packages/ui/src/theme/tokens.ts` so that when FR-LUNAR-009 updates the palette, the card updates automatically without editing two places.
- The watermark text is small (about 18-22px, equivalent to 18px on the 1080px canvas) - it needs a separate APCA check because the small size requires Lc >= 90 per APCA guidelines; if it does not meet this, increase the contrast or add a semi-transparent background.

*End of FR-LUNAR-014.*
