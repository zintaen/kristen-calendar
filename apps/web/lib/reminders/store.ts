import { 
  getReminders, 
  saveReminder, 
  deleteReminder 
} from "../storage";
import type { Reminder } from "@cyberskill/amlich-core";
import { nextOccurrences, convertLunar2Solar, jdFromDate, jdToDate, VN_TZ } from "@cyberskill/amlich-core";
import { reschedule } from "../notifications/scheduler";
import { createNotificationService } from "../notificationGlue";

export const LEAD_TIME_OPTIONS = [
  { value: 0, label: "Đúng ngày" },
  { value: 1, label: "Trước 1 ngày" },
  { value: 3, label: "Trước 3 ngày" },
  { value: 7, label: "Trước 1 tuần" },
] as const;

export const DEFAULT_NOTIFY_TIME = "07:00";

export interface UpcomingItem {
  reminderId: string;
  title: string;
  solarDate: string;
  lunarLabel: string;
  leadDays: number;
  linkedContentId?: string;
  fellBack?: boolean;
  pendingUserChoice?: boolean;
}

export interface ReminderStoreContract {
  list(): Reminder[];
  upsert(r: Reminder): Promise<{ errors: { field: string; code: string }[] }>;
  remove(id: string): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  toggleMonthly(kind: "RAM" | "MUNG_MOT", on: boolean): Promise<void>;
  upcoming(nowUtcMs: number, limit?: number): UpcomingItem[];
  diagnostics(nowUtcMs: number): { scheduled: number; slotsDropped: number; remindersCovered: number };
}

export class ReminderStore implements ReminderStoreContract {
  private reminders: Reminder[] = [];
  private listeners: (() => void)[] = [];

  async load() {
    this.reminders = await getReminders();
    this.notifyListeners();
  }

  get all() {
    return this.reminders;
  }

  list(): Reminder[] {
    return this.reminders;
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const l of this.listeners) l();
  }

  async upsert(r: Reminder): Promise<{ errors: { field: string; code: string }[] }> {
    const errors: { field: string; code: string }[] = [];
    if (!r.title || r.title.trim() === "") errors.push({ field: "title", code: "REQUIRED" });
    if (r.lunarDay < 1 || r.lunarDay > 30) errors.push({ field: "lunarDay", code: "INVALID" });
    if (r.lunarMonth < 1 || r.lunarMonth > 12) errors.push({ field: "lunarMonth", code: "INVALID" });
    if (r.isLeapMonth && r.leapFallback === "REGULAR") {
      // Logic requirement: leap month with fallback REGULAR is valid.
    }
    
    if (errors.length > 0) return { errors };

    await saveReminder(r); // saveReminder does add or update based on id
    await this.load();
    await this.triggerReschedule();
    return { errors: [] };
  }

  async remove(id: string): Promise<void> {
    await deleteReminder(id);
    await this.load();
    await this.triggerReschedule();
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const existing = this.reminders.find(r => r.id === id);
    if (!existing) return;
    await saveReminder({ ...existing, enabled });
    await this.load();
    await this.triggerReschedule();
  }

  async toggleMonthly(kind: "RAM" | "MUNG_MOT", on: boolean): Promise<void> {
    let existing = this.reminders.find(r => r.type === kind);
    if (!existing) {
      if (!on) return; // nothing to do
      existing = {
        id: `sys-${kind}`,
        type: kind,
        title: kind === "MUNG_MOT" ? "Mùng 1" : "Rằm",
        lunarDay: kind === "MUNG_MOT" ? 1 : 15,
        lunarMonth: 1, // Doesn't matter for MONTHLY
        lunarYear: null,
        isLeapMonth: false,
        leapFallback: "REGULAR",
        recurrence: "MONTHLY",
        leadTimes: [0, 1],
        notifyTime: "07:00",
        channels: ["LOCAL"],
        enabled: true,
        userId: "local-user"
      };
      await this.upsert(existing);
    } else {
      await this.setEnabled(existing.id, on);
    }
  }

  upcoming(nowUtcMs: number, limit: number = 10): UpcomingItem[] {
    const now = new Date(nowUtcMs);
    const occs: UpcomingItem[] = [];
    
    for (const r of this.reminders) {
      if (!r.enabled) continue;
      const next = nextOccurrences(r, { fromYear: now.getFullYear(), count: 1, engineVersion: "1.0.0" });
      if (next.length > 0) {
        const occ = next[0];
        
        let lunarLabel = occ.lunarLabel;
        if (r.isLeapMonth) lunarLabel += " (Nhuận)";

        occs.push({
          reminderId: r.id,
          title: r.title,
          solarDate: occ.gregorianDate,
          lunarLabel,
          leadDays: occ.leadDays,
          linkedContentId: r.linkedContentId,
          fellBack: occ.fellBack,
          pendingUserChoice: occ.pendingUserChoice,
        });
      }
    }

    occs.sort((a, b) => a.solarDate.localeCompare(b.solarDate));
    return occs.slice(0, limit);
  }

  diagnostics(nowUtcMs: number) {
    // Basic stub, real diagnostic would need to read pending notifications from Capacitor if possible,
    // or just return from the scheduler result.
    return { scheduled: 0, slotsDropped: 0, remindersCovered: this.reminders.length };
  }

  private async triggerReschedule() {
    const adapter = createNotificationService();
    await reschedule(adapter, this.reminders, Date.now(), "1.0.0");
  }
}

export const globalReminderStore = new ReminderStore();

// Export solar preview helper for UI
export function solarPreviewFromLunar(lunarDay: number, lunarMonth: number, isLeap: boolean): string {
  const currentYear = new Date().getFullYear();
  // Call convertLunar2Solar to get JDN
  const [jdn, isLeapResult] = convertLunar2Solar(lunarDay, lunarMonth, currentYear, isLeap ? 1 : 0, VN_TZ);
  const [d, m, y] = jdToDate(jdn);
  
  // Format as DD/MM/YYYY
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
}
