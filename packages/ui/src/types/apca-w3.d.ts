declare module 'apca-w3' {
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
  export function sRGBtoY(rgba: readonly [number, number, number, number?]): number;
}
