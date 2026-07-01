import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ReminderStore } from "../lib/reminders/store";
import * as storage from "../lib/storage";

// Mock the storage adapter
vi.mock("../lib/storage", () => ({
  getReminders: vi.fn(),
  saveReminder: vi.fn(),
  updateReminder: vi.fn(),
  deleteReminder: vi.fn(),
}));

// Mock the scheduler to avoid side effects
vi.mock("../lib/notifications/scheduler", () => ({
  reschedule: vi.fn(),
}));

describe("ReminderStore", () => {
  let store: ReminderStore;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.getReminders as Mock).mockResolvedValue([]);
    store = new ReminderStore();
  });

  it("should load reminders and notify listeners", async () => {
    const listener = vi.fn();
    store.subscribe(listener);
    
    (storage.getReminders as Mock).mockResolvedValue([{ id: "r1", title: "Test" }]);
    await store.load();
    
    expect(listener).toHaveBeenCalled();
    expect(store.all.length).toBe(1);
    expect(store.all[0].id).toBe("r1");
  });

  it("should toggle monthly reminders (add new)", async () => {
    await store.toggleMonthly("MUNG_MOT", true);
    
    expect(storage.saveReminder).toHaveBeenCalledWith(expect.objectContaining({
      type: "MUNG_MOT",
      lunarDay: 1,
      enabled: true,
      recurrence: "MONTHLY",
    }));
  });

  it("should toggle monthly reminders (disable existing)", async () => {
    (storage.getReminders as Mock).mockResolvedValue([{ id: "sys-MUNG_MOT", type: "MUNG_MOT", enabled: true }]);
    await store.load();
    
    await store.toggleMonthly("MUNG_MOT", false);
    
    expect(storage.saveReminder).toHaveBeenCalledWith(expect.objectContaining({
      type: "MUNG_MOT",
      enabled: false,
    }));
  });

  it("should validate fields on upsert and reject invalid data", async () => {
    const invalidReminder: any = {
      id: "test",
      title: "",
      lunarDay: 32,
      lunarMonth: 13,
      isLeapMonth: false,
    };

    const result = await store.upsert(invalidReminder);
    
    expect(result.errors).toHaveLength(3);
    expect(storage.saveReminder).not.toHaveBeenCalled();
  });
});
