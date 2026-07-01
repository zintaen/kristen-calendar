export interface SendWindowResult {
  allowed: boolean;
  reason?: "outside_hour_range" | "event_too_far" | "event_past";
}

/**
 * Extract the hour in Asia/Ho_Chi_Minh timezone.
 */
function getVNHour(d: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(formatter.format(d), 10);
  return h === 24 ? 0 : h;
}

/**
 * Extract "YYYY-MM-DD" in Asia/Ho_Chi_Minh timezone.
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

/**
 * Kiểm tra khung 06:00-22:00 Asia/Ho_Chi_Minh.
 * 06:00 inclusive, 22:00 exclusive.
 */
export function isWithinHourWindow(now: Date): boolean {
  const hour = getVNHour(now);
  return hour >= 6 && hour < 22;
}

/**
 * Kiểm tra 0 <= daysUntilEvent <= 7.
 * Comparison is DATE-based in VN timezone, not raw milliseconds.
 */
export function isWithinDayRange(eventDate: Date, now: Date): SendWindowResult {
  const eventDay = toVNDateISO(eventDate);
  const nowDay = toVNDateISO(now);

  // Parse YYYY-MM-DD back to ms-since-epoch at midnight for integer day diff.
  const eventMs = Date.parse(eventDay + "T00:00:00+07:00");
  const nowMs = Date.parse(nowDay + "T00:00:00+07:00");
  const diff = Math.round((eventMs - nowMs) / 86_400_000);

  if (diff < 0) return { allowed: false, reason: "event_past" };
  if (diff > 7) return { allowed: false, reason: "event_too_far" };
  return { allowed: true };
}

export function canSendNow(eventDate: Date, now: Date): SendWindowResult {
  if (!isWithinHourWindow(now)) return { allowed: false, reason: "outside_hour_range" };
  return isWithinDayRange(eventDate, now);
}
