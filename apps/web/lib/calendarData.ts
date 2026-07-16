import {
  convertSolar2Lunar, jdFromDate, canChiDay, canChiMonth, canChiYear, zodiacOf, tietKhiAt,
  VN_TZ,
} from "@cyberskill/amlich-core";
import type { Reminder } from "./storage";

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  canChiDay: string;
  canChiMonth: string;
  canChiYear: string;
  zodiac: string;
}

export interface DayCellData {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunarDate: LunarDate;
  tietKhi: string | null;
  hasReminder: boolean;
  isFestival: boolean;
  isToday: boolean;
  hoangDao: boolean | null;
  truc: string | null;
  sao28: string | null;
}

export interface MonthGridData {
  year: number;
  month: number;
  cells: (DayCellData | null)[];
  lunarMonthLabel: string;
}

const VI_DOW = new Intl.DateTimeFormat("en-US", {
  weekday: "short", timeZone: "Asia/Ho_Chi_Minh",
});
const DOW_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function startPaddingFor(year: number, month: number): number {
  const firstUtcNoon = new Date(Date.UTC(year, month - 1, 1, 12));
  return DOW_INDEX[VI_DOW.format(firstUtcNoon)];
}

function isTietKhiStart(jdn: number): boolean {
  return tietKhiAt(jdn, VN_TZ).index !== tietKhiAt(jdn - 1, VN_TZ).index;
}

function formatLunarMonth(ld: LunarDate): string {
  const leapStr = ld.isLeap ? " (Nhuận)" : "";
  return `Tháng ${ld.month}${leapStr} Âm Lịch - ${ld.canChiYear}`;
}

export function buildMonthGrid(
  year: number,
  month: number,
  reminderDates: Set<string>,
  festivalDates: Set<string>,
  today: Date
): MonthGridData {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startPadding = startPaddingFor(year, month);
  const cells: (DayCellData | null)[] = Array(startPadding).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = jdFromDate(d, month, year);
    const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(d, month, year, VN_TZ);
    const tk = tietKhiAt(jdn, VN_TZ);
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    
    cells.push({
      solarDay: d, solarMonth: month, solarYear: year,
      lunarDate: {
        day: lDay, month: lMonth, year: lYear, isLeap: lLeap === 1,
        canChiDay: canChiDay(jdn).label,
        canChiMonth: canChiMonth(lMonth, lYear).label,
        canChiYear: canChiYear(lYear).label,
        zodiac: zodiacOf(canChiYear(lYear).chiIndex),
      },
      tietKhi: isTietKhiStart(jdn) ? tk.name : null,
      hasReminder: reminderDates.has(key),
      isFestival: festivalDates.has(key),
      isToday: d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear(),
      hoangDao: null, truc: null, sao28: null
    });
  }
  
  while (cells.length % 7 !== 0) cells.push(null);
  
  const firstCell = cells.find((c): c is DayCellData => c !== null)!;
  return { year, month, cells, lunarMonthLabel: formatLunarMonth(firstCell.lunarDate) };
}

export function computeReminderDatesForMonth(
  year: number,
  month: number,
  reminders: Reminder[]
): Set<string> {
  const dates = new Set<string>();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  
  // NOTE: A more accurate check would use recurrence engine from TASK-004
  // For MVP UI building we will do a basic scan if the UI needs it.
  // The tests expect basic mapping for RAM (15 AL).
  for (let d = 1; d <= daysInMonth; d++) {
    const [lDay, lMonth, _lYear, _lLeap] = convertSolar2Lunar(d, month, year, VN_TZ);
    for (const r of reminders) {
      if (r.enabled && r.lunarDay === lDay) {
        if (r.lunarMonth === null || r.lunarMonth === lMonth) {
          dates.add(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        }
      }
    }
  }
  
  return dates;
}
