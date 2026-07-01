import type { Occurrence, Reminder, RecurrenceOptions, SolarDate } from "./types.js";
import { isInvalidSolar } from "./types.js";

/**
 * Ngay hom nay theo lich Asia/Ho_Chi_Minh, tra ve [day, month, year].
 * Implement that (khong phai lunar logic) - dung de FR-016/017 khoa ngay VN thay vi gio thiet bi/server.
 */
export function todayInHCM(now: Date = new Date()): SolarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value);
  return [get("day"), get("month"), get("year")];
}

import { convertLunar2Solar } from "./convert.js";
import { jdToDate } from "./jd.js";
import { getNewMoonDay } from "./astro.js";
import { getLunarMonth11, getLeapMonthOffset } from "./leap.js";
import { EPOCH_INDEX_K, SYNODIC_INDEX_K, VN_TZ } from "./constants.js";

function getMonthLength(lunarMonth: number, lunarYear: number, leap: 0 | 1, tz: number = VN_TZ): number {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, tz);
    b11 = getLunarMonth11(lunarYear, tz);
  } else {
    a11 = getLunarMonth11(lunarYear, tz);
    b11 = getLunarMonth11(lunarYear + 1, tz);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, tz);
    if (leap !== 0 || off >= leapOff) off += 1;
  }
  const k = Math.floor(0.5 + (a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  return getNewMoonDay(k + off + 1, tz) - getNewMoonDay(k + off, tz);
}

export function nextOccurrences(reminder: Reminder, opt: RecurrenceOptions): readonly Occurrence[] {
  const result: Occurrence[] = [];
  const years = opt.count;
  
  // Basic loop for recurring events
  // Note: For MONTHLY, we need a different loop (looping over months instead of years)
  // But for MVP, assume YEARLY or ONCE (if ONCE, just loop once).
  
  let loopCount = reminder.recurrence === "ONCE" ? 1 : years;
  if (reminder.recurrence === "MONTHLY") loopCount = years * 12;

  let currentYear = opt.fromYear;
  let currentMonth = reminder.lunarMonth;

  for (let i = 0; i < loopCount; i++) {
    let year = currentYear;
    let month = currentMonth;
    let leap: 0 | 1 = reminder.isLeapMonth ? 1 : 0;
    
    if (reminder.recurrence === "MONTHLY") {
      year = opt.fromYear + Math.floor(i / 12);
      month = (i % 12) + 1;
      leap = 0; // MONTHLY doesn't really target leap specifically
    } else {
      year = reminder.lunarYear || (opt.fromYear + i);
    }
    
    // Check if leap month is valid this year
    let fellBack = false;
    let pendingUserChoice = false;
    
    let solar = convertLunar2Solar(reminder.lunarDay, month, year, leap);
    if (isInvalidSolar(solar)) {
      if (reminder.leapFallback === "SKIP") {
        if (reminder.recurrence === "ONCE") break;
        continue;
      } else if (reminder.leapFallback === "ASK") {
        pendingUserChoice = true;
        leap = 0;
        solar = convertLunar2Solar(reminder.lunarDay, month, year, leap);
        fellBack = true;
      } else { // REGULAR
        leap = 0;
        solar = convertLunar2Solar(reminder.lunarDay, month, year, leap);
        fellBack = true;
      }
    }

    // Clamp day
    const monthLen = getMonthLength(month, year, leap);
    let dayClamped = false;
    let finalLunarDay = reminder.lunarDay;
    if (finalLunarDay > monthLen) {
      finalLunarDay = monthLen;
      dayClamped = true;
      solar = convertLunar2Solar(finalLunarDay, month, year, leap);
    }

    if (isInvalidSolar(solar)) continue; // Safety check

    const [sd, sm, sy] = solar;
    // Format to YYYY-MM-DD
    const isoDate = `${sy}-${String(sm).padStart(2, '0')}-${String(sd).padStart(2, '0')}`;
    
    // Fan out for lead times
    const leadTimes = reminder.leadTimes?.length > 0 ? reminder.leadTimes : [0];
    for (const lead of leadTimes) {
      // Calculate fire date by subtracting lead days
      const targetDate = new Date(`${isoDate}T00:00:00+07:00`);
      targetDate.setDate(targetDate.getDate() - lead);
      
      const fireSd = targetDate.getDate();
      const fireSm = targetDate.getMonth() + 1;
      const fireSy = targetDate.getFullYear();
      const fireDateStr = `${fireSy}-${String(fireSm).padStart(2, '0')}-${String(fireSd).padStart(2, '0')}`;
      
      const notifyTime = reminder.notifyTime || "07:00";
      const fireAtLocal = `${fireDateStr}T${notifyTime}:00+07:00`;
      
      result.push({
        reminderId: reminder.id,
        gregorianDate: isoDate,
        lunarLabel: `${finalLunarDay}/${month}${leap ? " (nhuận)" : ""}`,
        leadDays: lead,
        fireAtLocal,
        fellBack,
        dayClamped,
        pendingUserChoice,
        solarDate: isoDate, // Added for UI convenience even though not in strict Occurrence interface? Let's keep it if needed.
      } as Occurrence & { solarDate: string }); 
    }

    if (reminder.recurrence === "ONCE") break;
  }

  return result;
}

export function mergeAndSort(all: readonly Occurrence[]): readonly Occurrence[] {
  return [...all].sort((a, b) => {
    if (a.fireAtLocal < b.fireAtLocal) return -1;
    if (a.fireAtLocal > b.fireAtLocal) return 1;
    return 0;
  });
}
