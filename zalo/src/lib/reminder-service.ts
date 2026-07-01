import type { ZaloReminder } from "../types";
import { loadStorageData, saveReminders } from "./storage";

export async function getReminders(): Promise<ZaloReminder[]> {
  const data = await loadStorageData();
  return data.reminders;
}

export async function upsertReminder(r: ZaloReminder): Promise<void> {
  const data = await loadStorageData();
  const idx = data.reminders.findIndex((rem) => rem.id === r.id);
  if (idx >= 0) {
    data.reminders[idx] = r;
  } else {
    data.reminders.push(r);
  }
  await saveReminders(data.reminders);
}

export async function deleteReminder(id: string): Promise<void> {
  const data = await loadStorageData();
  const filtered = data.reminders.filter((r) => r.id !== id);
  await saveReminders(filtered);
}
