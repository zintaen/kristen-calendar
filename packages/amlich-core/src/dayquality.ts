import { canChiDay } from "./canchi.js";
import { jdFromDate } from "./jd.js";
import { tietKhiStartDiaChi } from "./tietkhi.js";

export const THAN_TRUC_NHAT = [
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh",
  "Bach Ho",    "Thien Hinh", "Chu Tuoc", "Thien Lao", "Nguyen Vu", "Cau Tran"
] as const;
export type ThanTrucNhat = typeof THAN_TRUC_NHAT[number];

export const HOANG_DAO_THAN = new Set<ThanTrucNhat>([
  "Thanh Long", "Minh Duong", "Kim Quy", "Bao Quang", "Ngoc Duong", "Tu Menh"
]);

export const TRUC_NAMES = [
  "Kien", "Tru", "Man", "Binh", "Dinh", "Chap", "Pha", "Nguy", "Thanh", "Thu", "Khai", "Be"
] as const;
export type Truc = typeof TRUC_NAMES[number];

export const SAO_28 = [
  "Giac", "Cang", "De", "Phong", "Tam", "Tinh", "Vo",
  "Quy",  "Liu",  "Tinh28", "Chang", "I",   "Chan",
  "Goc",  "Lau",  "Vi28",  "Mao28", "Tat",  "Truy",
  "Cam",  "Giai", "Cu",    "Phap",  "Khuy",  "Luu28", "Nhat", "Pi", "Chan28"
] as const;
export type Sao28 = typeof SAO_28[number];

export type DiaChi =
  "Ty" | "Suu" | "Dan" | "Meo" | "Thin" | "Ti" | "Ngo" | "Mui" | "Than" | "Dau" | "Tuat" | "Hoi";

export const DIA_CHI_ORDER: readonly DiaChi[] = [
  "Ty", "Suu", "Dan", "Meo", "Thin", "Ti", "Ngo", "Mui", "Than", "Dau", "Tuat", "Hoi"
] as const;

export interface GioInfo {
  canh: string;
  tuGio: string;
  denGio: string;
  isHoang: boolean;
}

export interface TrucInfo {
  name: Truc;
  suitableFor: string[];
  avoidFor: string[];
}

export interface Sao28Info {
  name: Sao28;
  rating: "tot" | "xau" | "binh";
  notes: string;
}

export interface DayQuality {
  date: string;
  canChiNgay: string;
  diaChiNgay: DiaChi;
  thanTrucNhat: ThanTrucNhat;
  hoangDao: boolean;
  isHoangDao: boolean;
  label: "Hoang dao" | "Hac dao";
  truc: TrucInfo;
  sao28: Sao28Info;
  gioHoangDao: GioInfo[];
  disclaimer: "Tham khao phong thuy dan gian";
}

import { THAN_TRUC_NHAT_TABLE, GIO_HOANG_DAO_TABLE, BASE_JDN_GIAC, TRUC_SUITABLE_AVOID, SAO_28_INFO_MAP } from "./dayquality-tables.js";
import { convertSolar2Lunar } from "./convert.js";

export function getDayQuality(solarDate: Date): DayQuality {
  // Doc thanh phan lich theo UTC (khong theo TZ thiet bi) de day-quality on dinh o moi mui gio.
  // Caller truyen ngay lich (vd new Date("2025-01-29") = UTC midnight); DEC-LUNAR-043.
  const d = solarDate.getUTCDate();
  const m = solarDate.getUTCMonth() + 1;
  const y = solarDate.getUTCFullYear();
  const jdn = jdFromDate(d, m, y);

  const cc = canChiDay(jdn);
  const diaChiIndex = cc.chiIndex;
  const canChiNgay = cc.label;
  const diaChiNgay = DIA_CHI_ORDER[diaChiIndex]!;

  // thang am index: (thangAm - 1) % 12
  const lunarDate = convertSolar2Lunar(d, m, y);
  const thangAmIndex = (lunarDate[1] - 1) % 12; // lunarDate is [day, month, year, isLeap]

  const thanTrucNhat = THAN_TRUC_NHAT_TABLE[diaChiIndex]![thangAmIndex]!;
  const hoangDao = HOANG_DAO_THAN.has(thanTrucNhat);
  const label = hoangDao ? "Hoang dao" : "Hac dao";

  const diaChiDauTiet = tietKhiStartDiaChi(jdn);
  const trucIndex = (diaChiIndex - diaChiDauTiet + 12) % 12;
  const trucName = TRUC_NAMES[trucIndex]!;
  const trucInfo = TRUC_SUITABLE_AVOID[trucName]!;

  // We add a large multiple of 28 to ensure positive modulo
  const saoIndex = ((jdn - BASE_JDN_GIAC) % 28 + 28) % 28;
  const saoName = SAO_28[saoIndex]!;
  const saoInfo = SAO_28_INFO_MAP[saoName]!;

  const gioHoangDao = GIO_HOANG_DAO_TABLE[diaChiIndex]!;

  // Local ISO date format YYYY-MM-DD
  const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return {
    date: isoDate,
    canChiNgay,
    diaChiNgay,
    thanTrucNhat,
    hoangDao,
    isHoangDao: hoangDao,
    label,
    truc: {
      name: trucName,
      suitableFor: trucInfo.suitableFor,
      avoidFor: trucInfo.avoidFor
    },
    sao28: {
      name: saoName,
      rating: saoInfo.rating,
      notes: saoInfo.notes
    },
    gioHoangDao: [...gioHoangDao], // clone to ensure immutable return
    disclaimer: "Tham khao phong thuy dan gian"
  };
}

export function getMonthDayQualities(year: number, month: number): DayQuality[] {
  // So ngay trong thang duong (UTC-based de khong lech theo TZ thiet bi).
  const numDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const results: DayQuality[] = [];
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    results.push(getDayQuality(date));
  }
  return results;
}
