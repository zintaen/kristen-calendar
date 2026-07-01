import type { Reminder } from "@cyberskill/amlich-core";
import { SyncClient } from "./sync-client";
import type { RemindersUpsertRow } from "./conflict-resolver";
export type { Reminder };

let syncClient: SyncClient | null = null;
export function initSyncClient(jwt: string, deviceId: string) {
  syncClient = new SyncClient({ userJwt: jwt, deviceId });
}

function mapToUpsertRow(r: Reminder): RemindersUpsertRow {
  // Temporary mapping until full auth is wired up
  return {
    id: r.id,
    userId: "local-user",
    type: r.type,
    title: r.title,
    lunarDay: r.lunarDay,
    lunarMonth: r.lunarMonth,
    lunarYear: r.lunarYear || null,
    isLeapMonth: r.isLeapMonth,
    recurrence: r.recurrence,
    leadTimes: r.leadTimes ? [...r.leadTimes] : [0],
    notifyTime: r.notifyTime || "07:00",
    channels: r.channels ? [...r.channels] : ["LOCAL"],
    linkedContentId: r.linkedContentId || null,
    sharedWith: r.sharedWith ? [...r.sharedWith] : [],
    enabled: r.enabled !== false,
    updatedAt: (r as any).updatedAt || new Date().toISOString()
  };
}

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
  if (syncClient) {
    syncClient.push([mapToUpsertRow(r)]).catch(console.error);
  }
}

export async function updateReminder(r: Reminder): Promise<void> {
  return saveReminder(r); // same logic for simple list
}

export async function deleteReminder(id: string): Promise<void> {
  const existing = await getReminders();
  const target = existing.find(e => e.id === id);
  const updated = existing.filter(e => e.id !== id);
  await storageSet(REMINDERS_KEY, JSON.stringify(updated));

  if (syncClient && target) {
    // Soft delete for cloud sync
    const softDeleted = { ...target, enabled: false };
    syncClient.push([mapToUpsertRow(softDeleted)]).catch(console.error);
  }
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
