declare module "apca-w3" {
  export function APCAcontrast(txtY: number, bgY: number): number;
  export function sRGBtoY(color: number[] | Uint8ClampedArray): number;
}
