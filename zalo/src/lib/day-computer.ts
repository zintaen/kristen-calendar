/**
 * Day computation layer (TASK-LUNAR-016).
 *
 * Wraps @cyberskill/amlich-core to provide lunar date info for the Zalo Mini App.
 * All dates are locked to Asia/Ho_Chi_Minh (todayInHCM). No network calls.
 */
import {
  convertSolar2Lunar,
  convertLunar2Solar,
  canChiDay,
  canChiYear,
  todayInHCM,
  jdFromDate,
  jdToDate,
  isInvalidSolar,
  VN_TZ,
  type LunarDate,
  type SolarDate,
} from "@cyberskill/amlich-core";
import type { ZaloReminder, UpcomingOccurrence } from "../types";

/**
 * Get today's lunar date. Uses todayInHCM() which returns a SolarDate TUPLE,
 * NOT an object with .day/.month/.year properties (Contract invariant).
 */
export function todayLunar(): LunarDate {
  const [dd, mm, yy] = todayInHCM();
  return convertSolar2Lunar(dd, mm, yy, VN_TZ);
}

/**
 * Get today's solar date tuple in HCM timezone.
 */
export function todaySolar(): SolarDate {
  return todayInHCM();
}

/**
 * Get can-chi label for a given JDN.
 */
export function canChiForJdn(jdn: number) {
  return canChiDay(jdn);
}

/**
 * Compute upcoming occurrences for a list of reminders within `daysAhead` days.
 * Computes on-the-fly — no storage of OccurrenceCache (DEC-LUNAR-161).
 */
export function getUpcomingOccurrences(
  reminders: ZaloReminder[],
  daysAhead: number = 30
): UpcomingOccurrence[] {
  const [todayD, todayM, todayY] = todayInHCM();
  const todayJdn = jdFromDate(todayD, todayM, todayY);
  const todayMs = new Date(`${todayY}-${String(todayM).padStart(2, "0")}-${String(todayD).padStart(2, "0")}T00:00:00+07:00`).getTime();
  const results: UpcomingOccurrence[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    // Determine which (lunarYear, lunarMonth) combos to scan.
    const candidates = getCandidates(reminder, todayY);

    for (const { lunarYear, lunarMonth } of candidates) {
      const solar: SolarDate = convertLunar2Solar(
        reminder.lunarDay,
        lunarMonth,
        lunarYear,
        reminder.isLeapMonth ? 1 : 0,
        VN_TZ
      );

      if (isInvalidSolar(solar)) {
        // Leap month fallback: try non-leap if leap was specified.
        if (reminder.isLeapMonth) {
          const fallback = convertLunar2Solar(
            reminder.lunarDay,
            lunarMonth,
            lunarYear,
            0,
            VN_TZ
          );
          if (!isInvalidSolar(fallback)) {
            addOccurrence(results, reminder, fallback, todayMs, daysAhead, lunarYear, lunarMonth);
          }
        }
        continue;
      }

      addOccurrence(results, reminder, solar, todayMs, daysAhead, lunarYear, lunarMonth);
    }
  }

  // Sort by solar date ascending.
  results.sort((a, b) => a.solarDate.localeCompare(b.solarDate));
  return results;
}

function addOccurrence(
  results: UpcomingOccurrence[],
  reminder: ZaloReminder,
  solar: SolarDate,
  todayMs: number,
  daysAhead: number,
  lunarYear: number,
  lunarMonth: number
): void {
  const [gd, gm, gy] = solar;
  const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
  // Tinh chenh lech ngay bang JD (TZ-independent), khong dung Date-ms de tranh lech quanh nua dem VN.
  const eventJd = jdFromDate(gd, gm, gy);
  const todayJdn = jdFromDate(...(todayInHCM()));
  const diffDays = eventJd - todayJdn;

  if (diffDays < 0 || diffDays > daysAhead) return;

  // Get can-chi year label for the lunar label.
  const yearCanChi = canChiYear(lunarYear);
  const leapSuffix = reminder.isLeapMonth ? " (nhuận)" : "";

  // Also add lead-time occurrences as separate entries.
  for (const lead of reminder.leadTimes) {
    const leadDiff = diffDays - lead;
    if (leadDiff < 0) continue; // Lead date is in the past.

    const titleSuffix = lead > 0 ? ` (trước ${lead} ngày)` : "";
    // Lui `lead` ngay trong khong gian JD roi format (khong doc getDate() theo TZ thiet bi).
    const [ld2, lm2, ly2] = jdToDate(eventJd - lead);
    const leadDateStr = `${ly2}-${String(lm2).padStart(2, "0")}-${String(ld2).padStart(2, "0")}`;

    results.push({
      reminderId: reminder.id,
      reminderTitle: `${reminder.title}${titleSuffix}`,
      solarDate: lead === 0 ? dateStr : leadDateStr,
      lunarLabel: `${reminder.lunarDay}/${lunarMonth} ${yearCanChi.label}${leapSuffix}`,
      daysUntil: lead === 0 ? diffDays : diffDays - lead,
    });
  }
}

/**
 * Generate candidate (lunarYear, lunarMonth) for scanning.
 */
function getCandidates(
  reminder: ZaloReminder,
  currentSolarYear: number
): Array<{ lunarYear: number; lunarMonth: number }> {
  if (reminder.recurrence === "MONTHLY") {
    // For "every month" reminders (lunarMonth=0 or specific month):
    if (reminder.lunarMonth === 0) {
      // Scan all 12 months for current and next year.
      const candidates: Array<{ lunarYear: number; lunarMonth: number }> = [];
      for (const year of [currentSolarYear, currentSolarYear + 1]) {
        for (let m = 1; m <= 12; m++) {
          candidates.push({ lunarYear: year, lunarMonth: m });
        }
      }
      return candidates;
    }
    // Specific month but MONTHLY: use that month across years.
    return [
      { lunarYear: currentSolarYear, lunarMonth: reminder.lunarMonth },
      { lunarYear: currentSolarYear + 1, lunarMonth: reminder.lunarMonth },
    ];
  }

  if (reminder.recurrence === "ONCE" && reminder.lunarYear) {
    return [{ lunarYear: reminder.lunarYear, lunarMonth: reminder.lunarMonth }];
  }

  // ANNUAL: check current and next year.
  return [
    { lunarYear: currentSolarYear, lunarMonth: reminder.lunarMonth },
    { lunarYear: currentSolarYear + 1, lunarMonth: reminder.lunarMonth },
  ];
}
