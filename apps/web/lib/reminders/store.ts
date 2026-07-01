import { 
  getReminders, 
  saveReminder, 
  updateReminder, 
  deleteReminder 
} from "../storage";
import type { Reminder } from "@cyberskill/amlich-core";
import { reschedule } from "../notifications/scheduler";
import { createNotificationService } from "../notificationGlue";

// A singleton instance for simple state management in the UI
// In a real app, you might use React Context, Redux, or Zustand.
// Here we use a simple observable pattern.
export class ReminderStore {
  private reminders: Reminder[] = [];
  private listeners: (() => void)[] = [];

  async load() {
    this.reminders = await getReminders();
    this.notifyListeners();
  }

  get all() {
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

  async add(r: Reminder) {
    await saveReminder(r);
    await this.load();
    await this.triggerReschedule();
  }

  async update(r: Reminder) {
    await updateReminder(r);
    await this.load();
    await this.triggerReschedule();
  }

  async delete(id: string) {
    await deleteReminder(id);
    await this.load();
    await this.triggerReschedule();
  }

  async toggleMonthly(type: "MUNG_MOT" | "RAM", enabled: boolean) {
    let existing = this.reminders.find(r => r.type === type);
    if (!existing) {
      if (!enabled) return; // nothing to do
      existing = {
        id: `sys-${type}`,
        type: type,
        title: type === "MUNG_MOT" ? "Mùng 1" : "Rằm",
        lunarDay: type === "MUNG_MOT" ? 1 : 15,
        lunarMonth: 1, // Doesn't matter for MONTHLY
        lunarYear: null,
        isLeapMonth: false,
        leapFallback: "REGULAR",
        recurrence: "MONTHLY",
        leadTimes: [0, 1], // Remind 1 day before and on the day
        notifyTime: "07:00",
        channels: ["LOCAL"],
        enabled: true,
        userId: "local-user"
      };
      await this.add(existing);
    } else {
      await this.update({ ...existing, enabled });
    }
  }

  private async triggerReschedule() {
    const adapter = createNotificationService();
    // Assuming engineVersion="1.0.0"
    await reschedule(adapter, this.reminders, Date.now(), "1.0.0");
  }
}

export const globalReminderStore = new ReminderStore();
