import { PURPLE_TOKENS } from "@cyberskill/genie-ui";
// Ensure apca-w3 is imported to calculate contrast if needed, but not strictly required in renderer, only tests.
// The task says: "KHÔNG ĐƯỢC tính lại DayInfo bên trong card renderer; PHẢI nhận CardData đã tính sẵn từ layer trên"

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
    background: PURPLE_TOKENS["cream-50"],
    textPrimary: PURPLE_TOKENS["purple-900"],
    textSecondary: PURPLE_TOKENS["purple-700"],
    accentColor: PURPLE_TOKENS["purple-500"],
  },
  "purple-dark": {
    id: "purple-dark",
    background: PURPLE_TOKENS["purple-900"],
    textPrimary: PURPLE_TOKENS["cream-50"],
    textSecondary: PURPLE_TOKENS["purple-200"], // E8D5FF-like
    accentColor: PURPLE_TOKENS["purple-400"],
  },
};

export interface CardRenderResult {
  canvas: HTMLCanvasElement;
  apcaLc: { primary: number; secondary: number; watermark: number };
}

// We compute APCA inside the draw routine if we need to return it, 
// or we can just calculate it directly if we import apca-w3.
// Wait, to keep it simple, we will calculate the APCA directly using the theme colors in the test,
// but the contract says drawCard returns apcaLc.
import { calcAPCA } from "apca-w3";

/**
 * Load Be Vietnam Pro weight 700 truoc khi draw.
 */
export async function loadCardFont(): Promise<boolean> {
  // If in Node/CI environment (no document), just return true
  if (typeof document === "undefined") return true;

  try {
    const font = new FontFace("Be Vietnam Pro", "url(https://fonts.gstatic.com/s/bevietnampro/v11/wEO_EBrAnO9LwO-x6I84O1q3IiwK_p-45iA.woff2)", { weight: "700" });
    await font.load();
    document.fonts.add(font);
    
    // Timeout mechanism
    let isTimeout = false;
    const timeout = new Promise<void>((_, reject) => setTimeout(() => { isTimeout = true; reject(new Error("timeout")) }, 3000));
    
    await Promise.race([document.fonts.ready, timeout]).catch(() => {});
    return !isTimeout;
  } catch {
    return false;
  }
}

/**
 * Vẽ card lên ctx đã chuẩn bị. Hàm thuần túy: không fetch, không đọc DOM.
 */
export async function drawCard(
  canvas: HTMLCanvasElement,
  data: CardData,
  theme: CardTheme
): Promise<CardRenderResult> {
  const ctx = canvas.getContext("2d")!;
  
  // Set dimensions
  canvas.width = 1080;
  canvas.height = 1080;

  // Draw background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, 1080, 1080);
  
  // Draw abstract pattern (simple gradient circle)
  const grad = ctx.createRadialGradient(540, 540, 200, 540, 540, 800);
  grad.addColorStop(0, theme.accentColor + "20"); // 12% opacity
  grad.addColorStop(1, theme.background);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Borders
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, 960, 960);
  
  // Title (Lunar Label)
  ctx.fillStyle = theme.textPrimary;
  ctx.font = '700 84px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.lunarLabel, 540, 480);
  
  // Subtitle (Solar Label)
  ctx.fillStyle = theme.textSecondary;
  ctx.font = '500 48px "Be Vietnam Pro", sans-serif';
  ctx.fillText(data.solarLabel, 540, 580);
  
  // Optional Can-chi Label
  if (data.canChiLabel) {
    ctx.fillStyle = theme.accentColor;
    ctx.font = '500 36px "Be Vietnam Pro", sans-serif';
    ctx.fillText(data.canChiLabel, 540, 650);
  }
  
  // Watermark (bottom)
  ctx.fillStyle = theme.textSecondary;
  ctx.font = '500 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText(data.watermark, 540, 960);
  
  const lcPrimary = Math.abs(calcAPCA(theme.textPrimary, theme.background) as number);
  const lcSecondary = Math.abs(calcAPCA(theme.textSecondary, theme.background) as number);
  const lcWatermark = Math.abs(calcAPCA(theme.textSecondary, theme.background) as number);

  return {
    canvas,
    apcaLc: {
      primary: lcPrimary,
      secondary: lcSecondary,
      watermark: lcWatermark
    }
  };
}

export async function exportCardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Determine context (Browser vs Node-canvas)
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Export failed"));
        }
      }, "image/png");
    } else {
      // In Node environment (jsdom/canvas), there's a custom toBuffer method
      const buffer = (canvas as any).toBuffer("image/png");
      resolve(new Blob([buffer], { type: "image/png" }));
    }
  });
}

export async function shareCard(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "failed"> {
  const file = new File([blob], filename, { type: "image/png" });
  
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Genie Âm Lịch",
      });
      return "shared";
    } catch (e: any) {
      if (e.name === "AbortError") {
        // User aborted, do not fallback
        return "failed";
      }
      // other errors -> fallback
    }
  }
  
  // Fallback: Download
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "downloaded";
  }
  
  return "failed";
}
