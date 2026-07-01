import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SchedulerReminder } from "../lib/zns-scheduler";

// Mock the external dependencies before importing the module under test.
vi.mock("../lib/zns-client", () => ({
  sendZNS: vi.fn(async () => ({ success: true, zaloMessageId: "zalo_msg_001" })),
}));
vi.mock("../lib/oa-token", () => ({
  ensureFreshToken: vi.fn(async () => "mock_access_token"),
}));

const { runZNSCron } = await import("../lib/zns-scheduler");
const { sendZNS } = await import("../lib/zns-client");

// Engine truth: convertLunar2Solar(15, 7, 2025, 0, 7) = [6, 9, 2025]
// So 15/7/2025 lunar = 2025-09-06 solar.
// leadTimes=[1] → send date = 2025-09-05.
const validReminder: SchedulerReminder = {
  id: "rem-001",
  title: "Giỗ Bà Nội",
  lunarDay: 15,
  lunarMonth: 7,
  isLeapMonth: false,
  recurrence: "ANNUAL",
  leadTimes: [1],
  notifyTime: "07:00",
  userPhone: "0909123456",
  userName: "Chị Linh",
  channels: ["ZNS"],
  enabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runZNSCron", () => {
  it("gửi thành công cho reminder hợp lệ trong khung", async () => {
    // 15/7/2025 lunar = 2025-09-06 solar (per amlich-core engine).
    // leadTimes=[1] -> send 1 day before event -> send date = 2025-09-05.
    // now = 2025-09-05 08:00 ICT -> within 06:00-22:00, event is 1 day away (<= 7).
    const now = new Date("2025-09-05T01:00:00Z"); // 08:00 ICT
    const result = await runZNSCron([validReminder], now);
    expect(result.sent).toBe(1);
    expect(result.errors).toBe(0);
    expect(sendZNS).toHaveBeenCalledTimes(1);

    // Verify payload has all 4 required template params.
    const call = vi.mocked(sendZNS).mock.calls[0];
    const payload = call[0];
    expect(payload.templateData.ten).toBe("Chị Linh");
    expect(payload.templateData.ngay_duong).toBe("06/09/2025");
    expect(payload.templateData.dip).toBe("Giỗ Bà Nội");
    expect(payload.templateData.ngay_am).toBe("15/7");
  });

  it("bỏ qua reminder có enabled = false", async () => {
    const now = new Date("2025-09-05T01:00:00Z");
    const result = await runZNSCron([{ ...validReminder, enabled: false }], now);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendZNS).not.toHaveBeenCalled();
  });

  it("bỏ qua khi send date không phải hôm nay", async () => {
    // Send date would be 2025-09-05. now = 2025-07-25 -> not today.
    const now = new Date("2025-07-25T01:00:00Z");
    const result = await runZNSCron([validReminder], now);
    expect(result.sent).toBe(0);
    expect(sendZNS).not.toHaveBeenCalled();
  });

  it("bỏ qua khi đã gửi (idempotency)", async () => {
    const now = new Date("2025-09-05T01:00:00Z");
    const alreadySent = vi.fn(async () => true);
    const result = await runZNSCron([validReminder], now, alreadySent);
    expect(result.sent).toBe(0);
    expect(sendZNS).not.toHaveBeenCalled();
  });

  it("MONTHLY RAM reminder - sinh ZNS cho Rằm tháng đúng", async () => {
    const monthlyRamReminder: SchedulerReminder = {
      id: "rem-ram",
      title: "Rằm hàng tháng",
      lunarDay: 15,
      lunarMonth: 0, // 0 = mọi tháng
      isLeapMonth: false,
      recurrence: "MONTHLY",
      leadTimes: [1],
      notifyTime: "07:00",
      userPhone: "0909123456",
      userName: "Chị Linh",
      channels: ["ZNS"],
      enabled: true,
    };

    // Engine: 15/7/2025 lunar = 2025-09-06 solar. lead=1 -> send 2025-09-05.
    // now = 2025-09-05 08:00 ICT.
    const nowSep = new Date("2025-09-05T01:00:00Z"); // 08:00 ICT
    const resultSep = await runZNSCron([monthlyRamReminder], nowSep);
    expect(resultSep.sent).toBeGreaterThanOrEqual(1);
  });
});

describe("handler auth", () => {
  it("empty reminders returns zero counters", async () => {
    const now = new Date("2025-08-07T01:00:00Z");
    const result = await runZNSCron([], now);
    expect(result).toEqual({ scanned: 0, sent: 0, skipped: 0, errors: 0 });
  });
});
