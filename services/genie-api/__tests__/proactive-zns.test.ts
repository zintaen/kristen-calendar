import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processProactiveZnsBatch } from "../lib/proactive-zns.js";
import * as amlichCore from "@cyberskill/amlich-core";
import * as supabaseMod from "../lib/supabase.js";
import * as znsClient from "../lib/zns-client.js";
import * as oaToken from "../lib/oa-token.js";

vi.mock("@cyberskill/amlich-core");
vi.mock("../lib/supabase.js");
vi.mock("../lib/zns-client.js");
vi.mock("../lib/oa-token.js");
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class AnthropicMock {
      messages = {
        create: vi.fn().mockImplementation(async () => {
          // Delay to allow timeout tests
          await new Promise(res => setTimeout(res, 10));
          return { content: [{ type: "text", text: "Mock Claude greeting!" }] };
        })
      };
    }
  };
});

describe("processProactiveZnsBatch", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockResolvedValue({ error: null })
    };

    vi.spyOn(supabaseMod, "getServiceSupabaseClient").mockReturnValue(mockSupabase);
    vi.spyOn(oaToken, "ensureFreshToken").mockResolvedValue("fake-token");
    vi.spyOn(znsClient, "sendZNS").mockResolvedValue({ success: true, zaloMessageId: "msg_123" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should skip if tomorrow is not a major event", async () => {
    vi.spyOn(amlichCore, "convertSolar2Lunar").mockReturnValue([2, 1, 2026, false]);
    const res = await processProactiveZnsBatch(new Date("2026-02-17T00:00:00Z"));
    expect(res.ok).toBe(true);
    expect(res.message).toContain("not a major lunar event");
  });

  it("should process users if tomorrow is Mùng 1", async () => {
    vi.spyOn(amlichCore, "convertSolar2Lunar").mockReturnValue([1, 1, 2026, false]);
    
    // Mock eligible users
    mockSupabase.not.mockResolvedValue({
      data: [{ id: "u1", display_name: "Alice", phone: "0901234567" }],
      error: null
    });

    // Mock no existing log (not skipped)
    mockSupabase.single.mockResolvedValue({ data: null });

    const res = await processProactiveZnsBatch(new Date("2026-02-16T00:00:00Z"));
    
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(1);
    expect(res.skipped).toBe(0);
    
    expect(znsClient.sendZNS).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "0901234567",
        templateData: expect.objectContaining({
          ten: "Alice",
          dip: "Mùng 1",
          ai_message: "Mock Claude greeting!"
        })
      }),
      "fake-token"
    );

    // Verify it inserts into log
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        event: "proactive.zns_sent"
      })
    );
  });

  it("should skip already sent users (idempotency)", async () => {
    vi.spyOn(amlichCore, "convertSolar2Lunar").mockReturnValue([1, 1, 2026, false]);
    
    // Mock eligible users
    mockSupabase.not.mockResolvedValue({
      data: [{ id: "u1", display_name: "Alice", phone: "0901234567" }],
      error: null
    });

    // Mock existing log 
    mockSupabase.single.mockResolvedValue({ data: { id: "log1" } });

    const res = await processProactiveZnsBatch(new Date("2026-02-16T00:00:00Z"));
    
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(0);
    expect(res.skipped).toBe(1);
    
    expect(znsClient.sendZNS).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("should fallback to generic message on Claude timeout", async () => {
    vi.spyOn(amlichCore, "convertSolar2Lunar").mockReturnValue([15, 1, 2026, false]); // Rằm
    
    mockSupabase.not.mockResolvedValue({
      data: [{ id: "u2", display_name: "Bob", phone: "0987654321" }],
      error: null
    });
    mockSupabase.single.mockResolvedValue({ data: null });

    // Set timeout to 1ms, Claude mock takes 10ms
    const res = await processProactiveZnsBatch(new Date("2026-03-02T00:00:00Z"), {
      batchSize: 50,
      maxRetries: 1,
      claudeTimeoutMs: 1 
    });
    
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(1);

    expect(znsClient.sendZNS).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "0987654321",
        templateData: expect.objectContaining({
          ten: "Bob",
          dip: "Rằm",
          ai_message: "Chúc bạn một ngày Rằm an lành!" // Fallback message
        })
      }),
      "fake-token"
    );
  });
});
