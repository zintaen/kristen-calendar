import type { Reminder } from "@cyberskill/amlich-core";
export type { Reminder };

export interface UserSettings {
  locale: "vi-VN";
  timezone: "Asia/Ho_Chi_Minh";
  theme: "purple";
  notifyTime: string;
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

const REMINDERS_KEY = "genie_reminders";
const SETTINGS_KEY = "genie_settings";

async function getPreferences() {
  const mod = await import("@capacitor/preferences");
  return mod.Preferences;
}

async function storageGet(key: string): Promise<string | null> {
  if (isCapacitor()) {
    const Preferences = await getPreferences();
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isCapacitor()) {
    const Preferences = await getPreferences();
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getReminders(): Promise<Reminder[]> {
  const raw = await storageGet(REMINDERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Reminder[];
}

export async function saveReminder(r: Reminder): Promise<void> {
  const existing = await getReminders();
  const updated = [...existing.filter(e => e.id !== r.id), r];
  await storageSet(REMINDERS_KEY, JSON.stringify(updated));
}

export async function updateReminder(r: Reminder): Promise<void> {
  return saveReminder(r); // same logic for simple list
}

export async function deleteReminder(id: string): Promise<void> {
  const existing = await getReminders();
  const updated = existing.filter(e => e.id !== id);
  await storageSet(REMINDERS_KEY, JSON.stringify(updated));
}

export async function getSettings(): Promise<UserSettings> {
  const raw = await storageGet(SETTINGS_KEY);
  if (!raw) {
    return {
      locale: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
      theme: "purple",
      notifyTime: "07:00"
    };
  }
  return JSON.parse(raw) as UserSettings;
}

export async function saveSettings(s: UserSettings): Promise<void> {
  await storageSet(SETTINGS_KEY, JSON.stringify(s));
}
