---
id: FR-LUNAR-014
title: "Shareable cards - thiệp tông tím export ảnh ('Hôm nay Rằm tháng Giêng'), chia sẻ mạng xã hội"
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
  - DEC-LUNAR-140 (render card trên HTMLCanvasElement 1080x1080px, xuất PNG qua canvas.toBlob; không dùng html2canvas vì CORS + font-render không ổn định)
  - DEC-LUNAR-141 (mọi cặp chữ/nền PHẢI pass APCA Lc >= 75 bằng apca-w3 truoc khi merge; tím đậm trên nền kem là cặp mặc định)
  - DEC-LUNAR-142 (chia sẻ qua Web Share API (navigator.share) trên iOS/Android; fallback "tải về" khi API không khả dụng)
  - DEC-LUNAR-143 (nội dung card lấy từ DayInfo đã tính sẵn ở FR-LUNAR-007, không tính lại; card không cần mạng)
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
  - gọi network trong quá trình render card (vi phạm DEC-LUNAR-143 / NFR-Offline cho dữ liệu ngày)
  - dùng html2canvas hoặc puppeteer để render (vi phạm DEC-LUNAR-140)
effort_hours: 6
sub_tasks:
  - "1.0h: card-renderer.ts - drawCard(ctx, CardData, CardTheme) ve nen gradient, khung, text layer"
  - "0.5h: font loading - PreloadFont Be Vietnam Pro 700 truoc khi draw, fallback sans-serif"
  - "1.0h: APCA check compile-time - apca-w3 assertion trong card-renderer.test.ts cho moi cap mau"
  - "1.0h: ShareCard.tsx - canvas 1080x1080, preview thu nho 360x360 trong UI"
  - "0.5h: xuất PNG blob, tạo File object cho Web Share API"
  - "1.0h: ShareCardSheet.tsx - bottom-sheet chon template (Rằm, Mùng Một, giỗ, custom), nút Chia sẻ / Tải về"
  - "1.0h: test suite - kich thuoc canvas, APCA assertions, blob output, fallback download"
risk_if_skipped: "Tính năng chia sẻ thiệp tím là điểm nhấn trực quan của persona 'Chị Linh' (diễn viên, thích đăng Instagram). Thiếu FR-014, app không có nội dung viral để lan truyền tự nhiên. FR-009 đã xây tokens tím nhưng không có bề mặt export nào để dùng chúng ra bên ngoài app."
---

## §1 - Description (BCP-14 normative)

Hệ thống PHẢI render thiệp ảnh tông tím dạng vuông 1080x1080px trên `HTMLCanvasElement` và cung cấp nút chia sẻ hoặc tải về. Hợp đồng:

1. PHẢI render card trên `HTMLCanvasElement` 1080x1080px bằng Canvas 2D API; KHÔNG ĐƯỢC dùng `html2canvas`, `puppeteer`, hoặc thư viện DOM-to-image nào (DEC-LUNAR-140).
2. PHẢI export PNG qua `canvas.toBlob("image/png")` với chất lượng không nén; file size mục tiêu < 500 KB.
3. PHẢI hiển thị tối thiểu ba vùng nội dung: (a) dòng tiêu đề ngày âm (ví dụ "Rằm tháng Giêng"), (b) ngày dương tương ứng, (c) logo/watermark nhỏ "Genie Am Lich - CyberSkill".
4. PHẢI load font "Be Vietnam Pro" weight 700 qua `FontFace` API truoc khi gọi `drawCard`; nếu load thất bại trong 3s thì fallback sang sans-serif và ghi log cảnh báo (DEC-LUNAR-143).
5. PHẢI đạt ngưỡng APCA theo cỡ chữ cho mọi cặp text/nền trên card, kiểm bằng `apca-w3` trong test suite; build PHẢI fail nếu thất bại (DEC-LUNAR-141): text chính (>= 60px, `textPrimary`) PHẢI Lc >= 75; text phụ (`textSecondary`) PHẢI Lc >= 60; watermark cỡ nhỏ (~18-22px) PHẢI Lc >= 90 (theo APCA cho chữ nhỏ, §11). Mỗi ngưỡng có một assertion riêng tương ứng cỡ chữ thực tế.
6. PHẢI hỗ trợ ít nhất hai template màu: (a) "purple-cream" - text tím đậm (`#3B1F6E`) trên nền kem (`#FDF6EC`), (b) "purple-dark" - text kem trên nền tím đậm (`#3B1F6E`); cả hai PHẢI pass APCA >= 75.
7. PHẢI cung cấp nút "Chia se" gọi `navigator.share({ files: [File] })` (Web Share API Level 2) để chia sẻ ảnh trực tiếp lên mạng xã hội / Zalo trên iOS/Android (DEC-LUNAR-142).
8. PHẢI có fallback "Tai ve" tạo thẻ `<a download>` và trigger click khi `navigator.canShare` trả về false hoặc không tồn tại (DEC-LUNAR-142).
9. PHẢI hiển thị preview card thu nhỏ 360x360px trong UI (scale từ canvas 1080px) truoc khi người dùng chia sẻ.
10. PHẢI cung cấp `ShareCardSheet` - một bottom-sheet cho phép người dùng chọn template và ngày (mặc định là ngày đang xem trong lịch tháng FR-LUNAR-007).
11. KHÔNG ĐƯỢC tính lại `DayInfo` bên trong card renderer; PHẢI nhận `CardData` đã tính sẵn từ layer trên (DEC-LUNAR-143).
12. NÊN cho phép người dùng chọn thêm can-chi ngày hiển thị trên card (ví dụ "Giáp Tý - ngày Hoàng đạo").
13. NÊN thêm họa tiết trang trí nhẹ (gradient, hoa văn trừu tượng) không che khuất text; họa tiết PHẢI vẽ bằng Canvas 2D, không dùng ảnh ngoài để tránh CORS.

---

## §2 - Why this design (rationale for humans)

**Tại sao dùng Canvas 2D thay vì html2canvas?** `html2canvas` chụp DOM thành ảnh nhưng font render, CORS image, và z-index thường ra kết quả khác trình duyệt. Canvas 2D API là surface đồng nhất, kiểm soát được từng pixel, không phụ thuộc DOM layout, và dễ test bằng node-canvas trong môi trường CI (DEC-LUNAR-140).

**Tại sao kích thuoc 1080x1080px?** Instagram feed yêu cầu tối thiểu 1080px để không bị làm mờ khi upload; tỷ lệ 1:1 là format phổ biến nhất cho story/post dạng vuông. Zalo Stories cũng khuyến nghị 1080px. Hiển thị preview 360px trong app giúp load nhanh mà không ảnh hưởng chất lượng ảnh export (DEC-LUNAR-140).

**Tại sao cần APCA assertion trong test?** Tông tím dễ rơi vào vùng tương phản trung bình nếu chọn sai shade. Bắt lỗi tại compile time bằng `apca-w3` đảm bảo mọi thay đổi token màu trong `packages/ui/` không âm thầm làm hỏng tương phản card mà không ai phát hiện (DEC-LUNAR-141, NFR-Accessibility).

**Tại sao dùng Web Share API thay vì mở link upload?** Web Share API Level 2 cho phép chia sẻ file trực tiếp vào app bất kỳ (Instagram, Zalo, Messenger, Save to Photos) bằng một action sheet native của hệ điều hành. Đây là trải nghiệm mượt mà nhất trên iOS Safari và Android Chrome mà không cần OAuth hay upload lên server (DEC-LUNAR-142).

**Tại sao CardData đến từ layer trên?** Card renderer là một pure drawing function, không có state. Tách nó khỏi tính toán lịch giúp test độc lập và tái dùng khi có thêm template. Việc tính lại `DayInfo` trong renderer sẽ tạo ra dependency vòng với `amlich-core` mà không cần thiết (DEC-LUNAR-143).

**Tại sao dùng hai template tối thiểu?** "Purple-cream" phù hợp không khí nhẹ nhàng (Mùng Một, Rằm); "purple-dark" cho cảm giác trang trọng hơn (Vu Lan, đám giỗ). Hai template cũng là cách test rằng cả hai hướng màu đều pass APCA, không chỉ một chiều (DEC-LUNAR-141).

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

1. Canvas được tạo đúng kích thuoc 1080x1080px; `canvas.width === 1080 && canvas.height === 1080`.
2. `lunarLabel` xuất hiện trong vùng trung tâm card với font size >= 60px; `solarLabel` xuất hiện bên dưới.
3. Cặp `textPrimary` / `background` của "purple-cream" đạt APCA Lc >= 75 khi kiểm bằng `apca-w3`; assertion fail build nếu < 75.
4. Cặp `textPrimary` / `background` của "purple-dark" đạt APCA Lc >= 75; assertion fail build nếu < 75.
5. `exportCardBlob` trả về `Blob` type `"image/png"` có size > 0 và < 500 KB cho nội dung tiêu chuẩn.
6. Khi `navigator.canShare` là true, `shareCard` gọi `navigator.share` với object chứa `files: [File]`.
7. Khi `navigator.canShare` là false hoặc undefined, `shareCard` tạo `<a download>` element và trigger click; không throw.
8. Preview 360px hiển thị trong `ShareCard` component truoc khi người dùng ấn nút chia sẻ.
9. `ShareCardSheet` hiển thị bottom-sheet với ít nhất 2 template option; chọn template cập nhật preview ngay lập tức.
10. `loadCardFont` trả về `false` khi timeout 3s; `drawCard` vẫn chạy với font fallback và không throw.
11. `drawCard` không gọi `fetch`, `XMLHttpRequest`, hoặc bất kỳ network API nào.
12. Watermark "Genie Am Lich · CyberSkill" xuất hiện ở góc dưới card với font size nhỏ hơn text chính, và `drawCard(...).apcaLc.watermark >= 90` cho cả hai theme (chữ nhỏ cần Lc cao hơn theo APCA, §1 #5/§11); assertion fail build nếu < 90.
13. Toàn bộ test suite `card-renderer.test.ts` pass trong môi trường CI (jsdom hoặc node-canvas).
14. `drawCard` nhận `CardData` làm tham số; không có import `canChiDay`, `getDayQuality`, `convertSolar2Lunar`, hoặc bất kỳ symbol nào từ `@cyberskill/amlich-core` trong file `card-renderer.ts` (DEC-LUNAR-143) - kiểm tra bằng grep assertion trong CI: `grep -r "amlich-core" apps/web/lib/card-renderer.ts` trả về 0 kết quả.

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

Contract đầy đủ ở §3. Điểm duy nhất cần ghim: vẽ text PHẢI gọi `ctx.font = \`700 ${size}px "Be Vietnam Pro", sans-serif\`` sau khi font đã load. Nếu font chưa trong `document.fonts`, gọi `document.fonts.load(...)` và await truoc khi `drawCard`. Trên node-canvas (CI), dùng `registerFont` của thư viện thay thế.

---

## §7 - Dependencies

Upstream: FR-LUNAR-007 cung cấp `DayInfo` (lunarDate, canChiDay, ...) là nguồn của `CardData`; FR-LUNAR-009 cung cấp color tokens tím - các giá trị hex trong `CARD_THEMES` PHẢI lấy từ `packages/ui/src/theme/tokens.ts` và không được hardcode riêng để đảm bảo nhất quán.

Downstream: không có FR nào block trực tiếp từ FR-014.

Cross-cutting: `apca-w3` là dev dependency của `apps/web/`; cần kiểm tra đã có trong `packages/ui/` (FR-LUNAR-009 dùng nó cho theme gate) để tránh trùng lặp.

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

Đã giải quyết: kích thuoc 1080px, renderer Canvas 2D, Web Share API Level 2.

Còn deferred: (a) hỗ trợ thêm định dạng 9:16 (1080x1920) cho Instagram Story - chưa cần cho slice 5, có thể thêm sau khi có feedback thực tế; (b) thêm animation (GIF/video card) - ghi nhận ở Caveats PRD nhưng chưa có FR; (c) template do người dùng tự thiết kế - nằm ngoài scope FR-014.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Font "Be Vietnam Pro" timeout | `loadCardFont` trả về false sau 3s | Fallback sans-serif, text vẫn render | Log cảnh báo; không block UX |
| APCA < 75 khi đổi token màu | CI test `calcAPCA` fail | Build fail | Developer sửa token trước khi merge |
| `canvas.toBlob` trả về null | Check `blob == null` | Throw `CardExportError` | Hiển thị toast "Không thể xuất ảnh, thử lại" |
| File PNG > 500 KB | Check `blob.size` trong test | Test fail | Giảm họa tiết hoặc dùng nén JPEG |
| `navigator.share` throw `AbortError` | catch AbortError | Bỏ qua (người dùng hủy) | Không báo lỗi |
| `navigator.share` throw khác | catch generic Error | Log + fallback download | Toast "Chia sẻ không thành công, đã tải về" |
| `canShare` = false (desktop browser) | `!navigator.canShare` | Kích hoạt download path | Nút đổi nhãn thành "Tải về" |
| CORS khi load ảnh ngoài vào canvas | canvas bị "tainted" | `toBlob` throw SecurityError | DEC-LUNAR-140: không dùng ảnh ngoài; họa tiết vẽ bằng Canvas 2D |
| node-canvas không có trong CI | import fail | Test crash | Thêm `canvas` vào devDependencies |
| Web Share API không hỗ trợ `files` | `canShare({ files })` = false | Fallback download | Documented behavior |

---

## §11 - Implementation notes

- `drawCard` là async vì cần await `document.fonts.ready` sau khi load; trong môi trường CI dùng node-canvas thì bỏ qua bước này.
- Khi tính `apcaLc`, nhớ rằng `calcAPCA` từ `apca-w3` trả về giá trị âm khi text tối trên nền sáng; dùng `Math.abs` truoc khi so sánh với ngưỡng 75.
- Web Share API `navigator.share({ files })` yêu cầu gesture (user click); KHÔNG ĐƯỢC gọi trong `useEffect` hoặc timeout tự động.
- Preview 360px là CSS `transform: scale(0.333)` từ canvas 1080px - cách này giữ nguyên chất lượng pixel thay vì vẽ lại canvas nhỏ hơn.
- `ShareCardSheet` nên lazy-load `card-renderer.ts` bằng dynamic import để không ảnh hưởng bundle size màn hình chính.
- Token màu trong `CARD_THEMES` PHẢI import từ `packages/ui/src/theme/tokens.ts` để khi FR-LUNAR-009 cập nhật palette, card tự cập nhật theo mà không cần sửa hai nơi.
- Watermark text nhỏ (khoảng 18-22px tương đương 18px ở 1080px canvas) - cần kiểm riêng APCA cho watermark vì size nhỏ đòi Lc >= 90 theo APCA guidelines; nếu không đạt, tăng contrast hoặc thêm nền bán trong suốt.

*Hết FR-LUNAR-014.*
