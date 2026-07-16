/**
 * Zalo Mini App Storage layer (TASK-LUNAR-016).
 *
 * Uses zmp Storage API (getStorage/setStorage) to persist settings and reminders.
 * Single key "genie_amlich_v1" to minimize API calls (DEC-LUNAR-161).
 * Does NOT store OccurrenceCache — computed on-the-fly via amlich-core.
 */
import type { StorageData, ZaloReminder, ZaloSettings } from "../types";
import { DEFAULT_STORAGE } from "../types";

const STORAGE_KEY = "genie_amlich_v1";

/** Dynamically import zmp-sdk to allow mocking in tests. */
async function getZmpApis() {
  const apis = await import("zmp-sdk/apis");
  return apis;
}

export async function loadStorageData(): Promise<StorageData> {
  try {
    const { getStorage } = await getZmpApis();
    const result = await getStorage({ keys: [STORAGE_KEY] });
    if (result && result[STORAGE_KEY]) {
      return result[STORAGE_KEY] as StorageData;
    }
  } catch {
    // First launch or corrupted storage — return defaults.
  }
  return { ...DEFAULT_STORAGE };
}

export async function saveReminders(reminders: ZaloReminder[]): Promise<void> {
  const current = await loadStorageData();
  current.reminders = reminders;
  const { setStorage } = await getZmpApis();
  await setStorage({ data: { [STORAGE_KEY]: current } });
}

export async function saveSettings(settings: ZaloSettings): Promise<void> {
  const current = await loadStorageData();
  current.settings = settings;
  const { setStorage } = await getZmpApis();
  await setStorage({ data: { [STORAGE_KEY]: current } });
}

export async function clearAll(): Promise<void> {
  const { setStorage } = await getZmpApis();
  await setStorage({ data: { [STORAGE_KEY]: null } });
}
