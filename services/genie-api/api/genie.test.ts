import { describe, test, expect, vi } from "vitest";
import { createMockAnthropic } from "./__mocks__";
import { POST as handleGenieRequest } from "./genie";
import { buildGenieMessages, sanitizeQuestion } from "../lib/prompt-builder";
import { SYSTEM_PROMPT_BLOCK } from "../lib/system-prompt";
import type { GenieContext } from "../lib/prompt-builder";

function mockContext(): GenieContext {
  return {
    lunarDate: "15/1/2025 (Rằm tháng Giêng)",
    upcomingEvent: "Rằm tháng Giêng",
    questionType: "phong_tuc_hoi_dap",
  };
}

function mockRequest(body: any, auth: string = "Bearer test-user") {
  const headers: any = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = auth;
  
  return new Request("http://localhost:3000/api/genie", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

function createMockSupabaseClient({ tier = "premium", usageCount = 0 } = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { user_id: "test", tier, valid_until: null } })
        })
      }),
      upsert: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }),
    rpc: vi.fn().mockResolvedValue({ data: usageCount + 1, error: null }),
    increment: vi.fn().mockResolvedValue(true),
    getCount: vi.fn().mockResolvedValue(usageCount)
  };
}

describe("genie API", () => {
  // --- Entitlement & Rate limit ---
  test("trả 403 khi userId là anonymous (Free tier)", async () => {
    const req = mockRequest({ question: "test", context: mockContext() }, "");
    const res = await handleGenieRequest(req, {});
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("feature_not_allowed");
  });

  test("trả 429 khi vượt 50 requests/tháng (Premium)", async () => {
    const mockDb = createMockSupabaseClient({ tier: "premium", usageCount: 50 });
    const req = mockRequest({ question: "Rằm cúng gì?", context: mockContext() });
    const res = await handleGenieRequest(req, { supabaseClient: mockDb });
    expect(res.status).toBe(429);
    
    const body = await res.json() as { error: string; resetAt: string };
    expect(body.error).toBe("quota_exceeded");
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  // --- Key không ra client ---
  test("ANTHROPIC_API_KEY không xuất hiện trong response headers hoặc body", async () => {
    const anthropic = createMockAnthropic();
    const mockDb = createMockSupabaseClient();
    const req = mockRequest({ question: "test", context: mockContext() });
    const res = await handleGenieRequest(req, { anthropic, supabaseClient: mockDb });
    
    const text = await res.text();
    expect(text).not.toContain(process.env.ANTHROPIC_API_KEY ?? "sk-ant-");
    expect(res.headers.get("X-Api-Key")).toBeNull();
  });

  // --- Prompt caching ---
  test("system prompt block chứa cache_control ephemeral", () => {
    expect(SYSTEM_PROMPT_BLOCK.cache_control).toEqual({ type: "ephemeral" });
    expect(SYSTEM_PROMPT_BLOCK.text).toContain("Tham khao theo phong tuc dan gian");
  });

  // --- PII sanitize ---
  test("buildGenieMessages loại bỏ tên người đã mất khỏi prompt", () => {
    const question = "Giỗ bà Nguyễn Thị Mai cúng gì? SĐT của tôi 0912345678";
    const sanitized = sanitizeQuestion(question);
    const built = buildGenieMessages(mockContext(), sanitized);
    const userContent = built.messages[0].content;
    
    expect(userContent).not.toContain("Nguyễn Thị Mai");
    expect(userContent).not.toContain("0912345678");
    expect(userContent).toContain("Giỗ"); // Câu hỏi về đám giỗ vẫn được giữ
  });

  // --- Upstream error ---
  test("trả 502 retryable khi Claude API lỗi", async () => {
    const anthropic = createMockAnthropic({ throwStatus: 503 });
    const mockDb = createMockSupabaseClient();
    const req = mockRequest({ question: "test", context: mockContext() });
    const res = await handleGenieRequest(req, { anthropic, supabaseClient: mockDb });
    
    expect(res.status).toBe(502);
    const body = await res.json() as { error: string; retryable: boolean };
    expect(body.error).toBe("UPSTREAM_ERROR");
    expect(body.retryable).toBe(true);
  });

  // --- Question too long ---
  test("trả 400 khi question > 500 ký tự", async () => {
    const question = "a".repeat(501);
    const req = mockRequest({ question, context: mockContext() });
    const mockDb = createMockSupabaseClient();
    const res = await handleGenieRequest(req, { supabaseClient: mockDb });
    
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("INVALID_REQUEST");
  });

  // --- requestId là UUID v4 ---
  test("mỗi response có requestId UUID v4 duy nhất", async () => {
    const anthropic = createMockAnthropic({ answer: "Cúng hoa, quả, hương." });
    const mockDb = createMockSupabaseClient();
    
    const req1 = mockRequest({ question: "q1", context: mockContext() });
    const res1 = await handleGenieRequest(req1, { anthropic, supabaseClient: mockDb });
    
    const req2 = mockRequest({ question: "q2", context: mockContext() });
    const res2 = await handleGenieRequest(req2, { anthropic, supabaseClient: mockDb });
    
    const b1 = await res1.json() as { requestId: string };
    const b2 = await res2.json() as { requestId: string };
    
    expect(b1.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(b1.requestId).not.toBe(b2.requestId);
  });

  // --- Model config không để client override ---
  test("model trong Claude call luôn là claude-haiku-4-5 bất kể body client", async () => {
    const anthropic = createMockAnthropic({ answer: "ok" });
    const mockDb = createMockSupabaseClient();
    const bodyWithModel = { question: "test", context: mockContext(), model: "claude-opus-4" };
    
    const req = mockRequest(bodyWithModel);
    await handleGenieRequest(req, { anthropic, supabaseClient: mockDb });
    
    expect(anthropic.lastCallModel()).toBe("claude-haiku-4-5");
  });
});
