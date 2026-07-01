import type { NotificationStyle } from "@cyberskill/amlich-core";

export type { NotificationStyle };
export type Tone = NotificationStyle["tone"];

export interface ToneContext {
  title: string;
  solarLabel: string;
  lunarLabel: string;
  leadDays: number;
}

/** Render body thông báo từ template theo tone. Không gọi mạng, không AI (DEC-LUNAR-065). */
export function renderBody(style: NotificationStyle, ctx: ToneContext): string {
  const tone = style?.tone || "neutral";
  
  const when = ctx.leadDays === 0 ? "hôm nay" : ctx.leadDays === 1 ? "ngày mai" : `sau ${ctx.leadDays} ngày nữa`;
  
  switch (tone) {
    case "warm":
      return `Đừng quên nhé, ${when} (${ctx.solarLabel}) là ngày ${ctx.title} (${ctx.lunarLabel}). Hãy chuẩn bị chu đáo nhé!`;
    case "formal":
      return `Kính báo: Sự kiện ${ctx.title} (${ctx.lunarLabel}) sẽ diễn ra vào ${when}, nhằm ngày ${ctx.solarLabel}.`;
    case "neutral":
    default:
      return `Sắp tới: ${ctx.title} (${ctx.lunarLabel}) vào ${when} (${ctx.solarLabel}).`;
  }
}
