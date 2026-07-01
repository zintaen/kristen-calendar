import { getReminders, saveReminder, deleteReminder, updateReminder, getSettings, saveSettings } from "../lib/storage";

// Mock localStorage for JSDOM environment
const mockStorage: Record<string, string> = {};
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    },
  });
});

const testReminder: import("../lib/storage").Reminder = {
  id: "test-001",
  userId: "local",
  type: "RAM",
  title: "Ram hang thang",
  lunarDay: 15,
  lunarMonth: 1,
  lunarYear: null,
  isLeapMonth: false,
  leapFallback: "REGULAR",
  recurrence: "MONTHLY",
  leadTimes: [0, 1],
  notifyTime: "07:00",
  channels: ["LOCAL"],
  linkedContentId: "ram",
  sharedWith: [],
  enabled: true,
};

describe("Storage CRUD", () => {
  test("getReminders() trang thai rong tra mang rong", async () => {
    const result = await getReminders();
    expect(result).toEqual([]);
  });

  test("saveReminder + getReminders: round-trip", async () => {
    await saveReminder(testReminder);
    const result = await getReminders();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-001");
    expect(result[0].lunarDay).toBe(15);
  });

  test("updateReminder thay doi title", async () => {
    await updateReminder({ ...testReminder, title: "Ram da cap nhat" });
    const result = await getReminders();
    expect(result[0].title).toBe("Ram da cap nhat");
  });

  test("deleteReminder xoa dung theo id", async () => {
    await deleteReminder("test-001");
    const result = await getReminders();
    expect(result).toHaveLength(0);
  });

  test("saveSettings + getSettings round-trip", async () => {
    const s = { locale: "vi-VN" as const, timezone: "Asia/Ho_Chi_Minh" as const, theme: "purple" as const, notifyTime: "07:30" };
    await saveSettings(s);
    const loaded = await getSettings();
    expect(loaded.notifyTime).toBe("07:30");
  });
});
