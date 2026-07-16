import type { Reminder } from "@cyberskill/amlich-core";
import { nextOccurrences, type Occurrence } from "@cyberskill/amlich-core";

export const PENDING_BUDGET = 64;
export const DEFAULT_HORIZON_MONTHS = 12;

export interface PlannedNotification {
  id: string; // deterministic: reminderId|occurrenceDate|leadDays
  title: string;
  body: string;
  fireAtLocal: string; // ISO date string
  userInfo: { reminderId: string; occurrenceDate: string; fellBack?: boolean; pendingUserChoice?: boolean };
}

export interface PlanDiagnostics {
  scheduled: number;
  slotsDropped: number;
  remindersCovered: number;
  horizonMonths: number;
}

export interface SchedulePlan {
  notifications: PlannedNotification[];
  diagnostics: PlanDiagnostics;
}

// Ensure stable deterministic ID
function makeId(reminderId: string, occurrenceDate: string, leadDays: number): string {
  // Can also hash this, but a string is deterministic enough for string IDs.
  // Capacitor expects numeric IDs for schedule(), we might need a hash if string is not supported.
  // wait, the notificationGlue currently uses `id: number`. Let's use a simple numeric hash.
  const str = `${reminderId}|${occurrenceDate}|${leadDays}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // absolute value to avoid negative ids
  return Math.abs(hash).toString();
}

function parseIsoToMs(isoString: string): number {
  return new Date(isoString).getTime();
}

export function planSchedule(
  reminders: Reminder[],
  nowUtcMs: number,
  opts?: { horizonMonths?: number; budget?: number; engineVersion: string }
): SchedulePlan {
  const horizon = opts?.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const budget = opts?.budget ?? PENDING_BUDGET;
  const now = new Date(nowUtcMs);
  
  // Just arbitrary large enough count to cover 1-2 years
  const count = Math.ceil((horizon / 12) * 365) + 5; 

  const upcomingOccurrences: (Occurrence & { reminder: Reminder })[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    
    // nextOccurrences generates in ascending order
    const occs = nextOccurrences(reminder, { 
      fromYear: now.getUTCFullYear(), 
      count: count, 
      engineVersion: opts?.engineVersion || "1.0.0" 
    });

    for (const occ of occs) {
      if (parseIsoToMs(occ.fireAtLocal) > nowUtcMs) {
        // limit by horizon
        const diffMs = parseIsoToMs(occ.fireAtLocal) - nowUtcMs;
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        if (diffMonths <= horizon) {
          upcomingOccurrences.push({ ...occ, reminder });
        }
      }
    }
  }

  // Sort by fireAtLocal ASC
  upcomingOccurrences.sort((a, b) => {
    if (a.fireAtLocal < b.fireAtLocal) return -1;
    if (a.fireAtLocal > b.fireAtLocal) return 1;
    return 0;
  });

  const planned: PlannedNotification[] = [];
  const coveredReminderIds = new Set<string>();

  // 1) Fairness Pass: Ensure every reminder gets its soonest notification
  // Wait, the occurrences already expand leadTimes inside nextOccurrences.
  // A single occurrence in `nextOccurrences` is actually already expanded per lead-time?
  // No, `Occurrence` has `leadDays`. Wait, TASK-LUNAR-004 nextOccurrences returns one item per occurrence (per lead time).
  
  // Let's group by reminder ID to do fairness pass
  const groupedByReminder = new Map<string, typeof upcomingOccurrences>();
  for (const occ of upcomingOccurrences) {
    const list = groupedByReminder.get(occ.reminder.id) || [];
    list.push(occ);
    groupedByReminder.set(occ.reminder.id, list);
  }

  // Take the first available from each reminder
  for (const [rId, list] of Array.from(groupedByReminder.entries())) {
    if (list.length > 0 && planned.length < budget) {
      const occ = list.shift()!;
      coveredReminderIds.add(rId);
      planned.push({
        id: makeId(rId, occ.gregorianDate, occ.leadDays),
        title: occ.reminder.title,
        body: `Upcoming: ${occ.reminder.title} on ${occ.gregorianDate}`,
        fireAtLocal: occ.fireAtLocal,
        userInfo: {
          reminderId: rId,
          occurrenceDate: occ.gregorianDate,
          fellBack: occ.fellBack,
          pendingUserChoice: occ.pendingUserChoice
        }
      });
    }
  }

  // 2) Fill the rest from the remaining pool
  const remainingOccurrences = Array.from(groupedByReminder.values()).flat();
  remainingOccurrences.sort((a, b) => {
    if (a.fireAtLocal < b.fireAtLocal) return -1;
    if (a.fireAtLocal > b.fireAtLocal) return 1;
    return 0;
  });

  let slotsDropped = 0;
  for (const occ of remainingOccurrences) {
    if (planned.length < budget) {
      planned.push({
        id: makeId(occ.reminder.id, occ.gregorianDate, occ.leadDays),
        title: occ.reminder.title,
        body: `Upcoming: ${occ.reminder.title} on ${occ.gregorianDate}`,
        fireAtLocal: occ.fireAtLocal,
        userInfo: {
          reminderId: occ.reminder.id,
          occurrenceDate: occ.gregorianDate,
          fellBack: occ.fellBack,
          pendingUserChoice: occ.pendingUserChoice
        }
      });
    } else {
      slotsDropped++;
    }
  }

  // Re-sort planned array by date
  planned.sort((a, b) => {
    if (a.fireAtLocal < b.fireAtLocal) return -1;
    if (a.fireAtLocal > b.fireAtLocal) return 1;
    return 0;
  });

  return {
    notifications: planned,
    diagnostics: {
      scheduled: planned.length,
      slotsDropped: slotsDropped,
      remindersCovered: coveredReminderIds.size,
      horizonMonths: horizon
    }
  };
}
