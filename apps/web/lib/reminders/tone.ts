export type Tone = "warm" | "neutral" | "formal";

export function renderTone(tone: Tone, title: string, solarDate: string): string {
  switch (tone) {
    case "warm":
      return `Đừng quên nhé, ngày mai là ${title} (${solarDate}). Hãy chuẩn bị chu đáo nhé!`;
    case "formal":
      return `Kính báo: Sự kiện ${title} sẽ diễn ra vào ngày ${solarDate}.`;
    case "neutral":
    default:
      return `Sắp tới: ${title} vào ngày ${solarDate}.`;
  }
}
