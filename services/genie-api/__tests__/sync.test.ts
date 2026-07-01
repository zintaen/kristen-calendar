import { describe, it, expect, vi } from "vitest";
import { resolveConflict, RemindersUpsertRow } from "../../../apps/web/lib/conflict-resolver";
import { SyncClient } from "../../../apps/web/lib/sync-client";

function makeReminder(overrides: Partial<RemindersUpsertRow>): RemindersUpsertRow {
  return {
    id: "uuid-1",
    userId: "u1",
    type: "GIO",
    title: "Test",
    lunarDay: 1,
    lunarMonth: 1,
    lunarYear: null,
    isLeapMonth: false,
    recurrence: "ANNUAL",
    leadTimes: [0],
    notifyTime: "07:00",
    channels: ["LOCAL"],
    linkedContentId: null,
    sharedWith: [],
    enabled: true,
    updatedAt: "2026-06-27T10:00:00.000Z",
    ...overrides
  };
}

describe("conflict-resolver", () => {
  it("chon ban ghi co updatedAt moi hon", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.000Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T10:00:05.000Z" });
    const { winner, conflict } = resolveConflict(local, cloud);
    expect(winner.updatedAt).toBe(cloud.updatedAt);
    expect(conflict).not.toBeNull();
  });

  it("tra ve conflict null khi khong co xung dot", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.000Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T08:00:00.000Z" });
    const { winner, conflict } = resolveConflict(local, cloud);
    expect(winner.updatedAt).toBe(local.updatedAt);
    expect(conflict).toBeNull();
  });

  it("danh dau conflict khi delta < 1000ms", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.800Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T10:00:00.200Z" });
    const { conflict } = resolveConflict(local, cloud);
    expect(conflict).not.toBeNull();
    expect(conflict!.deltaMs).toBeLessThan(1000);
  });
});

describe("SyncClient - push/pull", () => {
  it("khong push khi cloudSync consent = false", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const client = new SyncClient({ userJwt: "tok", deviceId: "dev1" });
    // Simulate consent = false is default right now
    await client.push([makeReminder({})]);
    // It shouldn't even set a timeout, it returns immediately
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retry 3 lan khi mang loi truoc khi throw", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
    const client = new SyncClient({ userJwt: "tok", deviceId: "dev1" });
    // Overriding the private method to mock consent for this test
    (client as any).hasCloudConsent = () => true;

    // Use fake timers to speed up the backoff and debounce
    vi.useFakeTimers();

    const pushPromise = client.push([makeReminder({})]);
    pushPromise.catch(() => {}); // Prevent unhandled rejection warning
    
    // Advance 2000ms for debounce
    await vi.advanceTimersByTimeAsync(2000);
    // Backoff delays: 1000, 2000
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    
    await expect(pushPromise).rejects.toThrow("network");
    expect(fetchSpy.mock.calls.length).toBe(3); // 3 retries max before throwing

    vi.useRealTimers();
  });
});
