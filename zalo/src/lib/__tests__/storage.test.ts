import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadStorageData, saveSettings, saveReminders } from "../storage";
import { DEFAULT_STORAGE } from "../../types";

let mockStorage: any = null;

vi.mock("zmp-sdk/apis", () => {
  return {
    getStorage: vi.fn(async ({ keys }) => {
      if (keys && keys.includes("genie_amlich_v1")) {
        return { "genie_amlich_v1": mockStorage };
      }
      return {};
    }),
    setStorage: vi.fn(async ({ data }) => {
      if (data && "genie_amlich_v1" in data) {
        mockStorage = data["genie_amlich_v1"];
      }
    }),
  };
});

describe("storage", () => {
  beforeEach(() => {
    mockStorage = null;
    vi.clearAllMocks();
  });

  it("loadStorageData returns defaults if empty", async () => {
    const data = await loadStorageData();
    expect(data).toEqual(DEFAULT_STORAGE);
  });

  it("saveSettings updates only settings", async () => {
    await saveSettings({ ...DEFAULT_STORAGE.settings, znsEnabled: true });
    const data = await loadStorageData();
    expect(data.settings.znsEnabled).toBe(true);
    expect(data.reminders).toEqual([]); // Reminders untouched
  });
});
