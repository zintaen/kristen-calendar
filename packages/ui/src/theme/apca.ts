import { APCAcontrast, sRGBtoY } from "apca-w3";

/**
 * Tinh APCA Lc (co dau am/duong) cho cap mau chu/nen.
 * fgHex, bgHex: hex string co hoac khong co dau #
 */
export function checkApca(fgHex: string, bgHex: string): number {
  const fg = hexToRgbArray(fgHex);
  const bg = hexToRgbArray(bgHex);
  // apca-w3 typing might not exist or might expect numbers
  return APCAcontrast(sRGBtoY(fg as any), sRGBtoY(bg as any)) as number;
}

/**
 * Throw Error neu |Lc| < minLc.
 * minLc = 75 cho body text; 90 cho body text dai >= 18px/400.
 */
export function assertApca(fgHex: string, bgHex: string, minLc: number): void {
  const lc = Math.abs(checkApca(fgHex, bgHex));
  if (lc < minLc) {
    throw new Error(
      `APCA fail: ${fgHex} on ${bgHex} = Lc ${lc.toFixed(1)} < ${minLc}`
    );
  }
}

/** WCAG 2.x relative luminance ratio */
export function checkWcag(fgHex: string, bgHex: string): number {
  const fgL = wcagLuminance(hexToRgbArray(fgHex));
  const bgL = wcagLuminance(hexToRgbArray(bgHex));
  const [l1, l2] = fgL > bgL ? [fgL, bgL] : [bgL, fgL];
  return (l1 + 0.05) / (l2 + 0.05);
}

export function assertWcag21AA(fgHex: string, bgHex: string): void {
  const ratio = checkWcag(fgHex, bgHex);
  if (ratio < 4.5) {
    throw new Error(`WCAG AA fail: ${fgHex} on ${bgHex} = ${ratio.toFixed(2)} < 4.5`);
  }
}

function hexToRgbArray(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function wcagLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = ([r, g, b].map(c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  })) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
