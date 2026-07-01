// packages/content/src/types.ts
export type ContentId =
  | "mung-mot"
  | "ram"
  | "giao-thua"
  | "mung-mot-tet"
  | "ong-cong-ong-tao"
  | "ram-thang-gieng"
  | "via-than-tai"
  | "thanh-minh"
  | "gio-to-hung-vuong"
  | "doan-ngo"
  | "vu-lan"
  | "trung-thu"
  | "dam-gio-ca-nhan";

export interface FestivalContent {
  readonly id: string;
  readonly name: string;
  readonly lunarDay: number | null;
  readonly lunarMonth: number | null;
  readonly meaning: string;
  readonly offerings: readonly string[];
  readonly checklist: readonly string[];
  readonly regionVariants?: readonly { readonly region: "BAC" | "TRUNG" | "NAM"; readonly note: string }[];
  readonly disclaimer: string;
}

export interface _InternalRecord extends FestivalContent {
  readonly celebrationTime?: string | null;
  readonly dateNote?: string | null;
}
