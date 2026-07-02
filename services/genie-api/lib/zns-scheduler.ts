import {
  convertLunar2Solar,
  convertSolar2Lunar,
  isInvalidSolar,
  todayInHCM,
  VN_TZ,
  type SolarDate,
} from "@cyberskill/amlich-core";
import { canSendNow } from "./zns-window.js";
import { sendZNS, type ZNSSendResult } from "./zns-client.js";
import { ensureFreshToken } from "./oa-token.js";

export interface SchedulerReminder {
  id: string;
  title: string;
  lunarDay: number;
  lunarMonth: number;         // 0 = mọi tháng (MONTHLY)
  lunarYear?: number;
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE";
  leadTimes: number[];
  notifyTime: string;         // "HH:MM"
  userPhone: string;          // số điện thoại (đã đổi từ token qua OA API)
  userName: string;
  channels: string[];
  enabled: boolean;
}

export interface CronRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * Check if a ZNS has already been sent today for this reminder + lead combo.
 * In production this queries the zns_send_log table.
 * Injected as a dependency for testability.
 */
export type AlreadySentChecker = (
  trackingId: string,
  todayISO: string
) => Promise<boolean>;

const defaultAlreadySent: AlreadySentChecker = async () => false;

/**
 * Generate candidate (lunarYear, lunarMonth) pairs to scan for occurrences.
 *
 * - MONTHLY: lunarMonth=0 means "every month" -> expand to current and next lunar months.
 * - ANNUAL / ONCE: use fixed lunarMonth across current and next year.
 */
function candidateLunarYears(
  reminder: SchedulerReminder,
  now: Date
): Array<{ lunarYear: number; lunarMonth: number }> {
  // Khoa "hom nay" ve gio Viet Nam (DEC-LUNAR-043). Cron chay tren serverless TZ=UTC; dung
  // now.getFullYear()/getDate() se lay ngay UTC, lech 1 ngay quanh nua dem VN -> quet nham thang am.
  const [tdD, tdM, tdY] = todayInHCM(now);
  const currentYear = tdY;

  if (reminder.recurrence === "MONTHLY") {
    // For MONTHLY reminders, we need to figure out the current lunar month.
    // Convert today (solar, VN) to lunar to get the reference lunar month.
    const [, currentLunarMonth, currentLunarYear] = convertSolar2Lunar(tdD, tdM, tdY, VN_TZ);

    const months: Array<{ lunarYear: number; lunarMonth: number }> = [];

    if (reminder.lunarMonth === 0) {
      // Every month: scan current lunar month and next 2.
      for (let offset = 0; offset <= 2; offset++) {
        let lm = currentLunarMonth + offset;
        let ly = currentLunarYear;
        if (lm > 12) { lm -= 12; ly += 1; }
        months.push({ lunarYear: ly, lunarMonth: lm });
      }
    } else {
      // Specific lunar month but MONTHLY recurrence: still scan current + next year.
      months.push({ lunarYear: currentLunarYear, lunarMonth: reminder.lunarMonth });
      months.push({ lunarYear: currentLunarYear + 1, lunarMonth: reminder.lunarMonth });
    }
    return months;
  }

  // ANNUAL or ONCE: scan fixed lunarMonth for current and next year.
  return [
    { lunarYear: reminder.lunarYear ?? currentYear, lunarMonth: reminder.lunarMonth },
    { lunarYear: (reminder.lunarYear ?? currentYear) + 1, lunarMonth: reminder.lunarMonth },
  ];
}

/**
 * Main cron function: scan reminders, compute occurrences, check windows, send ZNS.
 */
export async function runZNSCron(
  reminders: SchedulerReminder[],
  now: Date = new Date(),
  alreadySentChecker: AlreadySentChecker = defaultAlreadySent
): Promise<CronRunResult> {
  const accessToken = await ensureFreshToken();
  const result: CronRunResult = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  const todayISO = toVNDateISO(now);

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.channels.includes("ZNS")) {
      result.skipped++;
      continue;
    }

    const candidates = candidateLunarYears(reminder, now);

    for (const { lunarYear, lunarMonth } of candidates) {
      for (const leadDays of reminder.leadTimes) {
        // convertLunar2Solar returns tuple SolarDate = [dd, mm, yy].
        // Sentinel [0,0,0] for invalid (not null).
        const solarDate: SolarDate = convertLunar2Solar(
          reminder.lunarDay,
          lunarMonth,
          lunarYear,
          reminder.isLeapMonth ? 1 : 0,
          VN_TZ
        );

        if (isInvalidSolar(solarDate)) {
          result.skipped++;
          continue;
        }

        const [gd, gm, gy] = solarDate;

        // Adjust for leadDays: subtract leadDays from the event date.
        // The "send date" is leadDays before the event.
        const mmStr = String(gm).padStart(2, "0");
        const ddStr = String(gd).padStart(2, "0");
        const eventDateStr = `${gy}-${mmStr}-${ddStr}T${reminder.notifyTime}:00+07:00`;
        const eventDate = new Date(eventDateStr);

        // The actual notification date is event - leadDays.
        const sendDate = new Date(eventDate.getTime() - leadDays * 86_400_000);

        result.scanned++;

        // Check if send date is today (in VN timezone) and within windows.
        const sendDateVN = toVNDateISO(sendDate);
        if (sendDateVN !== todayISO) {
          result.skipped++;
          continue;
        }

        const check = canSendNow(eventDate, now);
        if (!check.allowed) {
          result.skipped++;
          continue;
        }

        // Idempotency: check zns_send_log.
        const trackingId = `${reminder.id}-${lunarYear}-${lunarMonth}-${leadDays}`;
        const wasSent = await alreadySentChecker(trackingId, todayISO);
        if (wasSent) {
          result.skipped++;
          continue;
        }

        // Build ZNS payload.
        const sendResult: ZNSSendResult = await sendZNS({
          phone: reminder.userPhone,
          templateId: process.env.ZNS_TEMPLATE_ID || "ZNS_TMPL_GENIE_001",
          templateData: {
            ten: reminder.userName,
            ngay_duong: `${ddStr}/${mmStr}/${gy}`,
            dip: reminder.title,
            ngay_am: `${reminder.lunarDay}/${lunarMonth}`,
          },
          trackingId,
        }, accessToken);

        if (sendResult.success) {
          result.sent++;
        } else {
          result.errors++;
        }
      }
    }
  }

  return result;
}

/**
 * Convert a Date to "YYYY-MM-DD" in Asia/Ho_Chi_Minh timezone.
 */
function toVNDateISO(d: Date): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // "YYYY-MM-DD"
}
