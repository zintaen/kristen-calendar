import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { b2bApp } from "../api/b2b/index.js";
import crypto from "crypto";

// Create a wrapper app to test the sub-router
const app = new Hono();
app.route("/v1/b2b", b2bApp);

// Mock Supabase RPC
const mockRpc = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("../lib/supabase.js", () => {
  return {
    getServiceSupabaseClient: () => ({
      rpc: mockRpc,
      from: (table: string) => {
        if (table === "b2b_usage_logs") return { insert: mockInsert };
        return {};
      },
    }),
  };
});

describe("B2B API endpoints", () => {
  beforeEach(() => {
    mockRpc.mockClear();
    mockInsert.mockClear();
  });

  it("MUST reject requests without valid API Key (401)", async () => {
    const res = await app.request("/v1/b2b/lunar/events?month=2026-08");
    expect(res.status).toBe(401);
  });

  it("MUST return 401 if API key is invalid", async () => {
    mockRpc.mockResolvedValue({ data: { valid: false, reason: "invalid_key" }, error: null });
    
    const req = new Request("http://localhost/v1/b2b/lunar/convert?date=2026-08-15");
    req.headers.set("x-api-key", "bad_key");
    const res = await app.request(req);
    
    expect(res.status).toBe(401);
  });

  it("MUST return 429 if quota exceeded", async () => {
    mockRpc.mockResolvedValue({ data: { valid: false, reason: "quota_exceeded" }, error: null });
    
    const req = new Request("http://localhost/v1/b2b/lunar/convert?date=2026-08-15");
    req.headers.set("x-api-key", "valid_test_key_with_0_quota");
    const res = await app.request(req);
    
    expect(res.status).toBe(429);
  });

  it("MUST return 200 and conversion on valid key", async () => {
    mockRpc.mockResolvedValue({ data: { valid: true, partner_id: "p1", remaining: 999 }, error: null });
    
    const req = new Request("http://localhost/v1/b2b/lunar/convert?date=2026-08-15");
    req.headers.set("x-api-key", "valid_key");
    const res = await app.request(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.data.solar_date).toBe("2026-08-15");
    // Just checking it returned a lunar date
    expect(json.data.lunar_day).toBeDefined();
    
    // Check if usage log was called
    // Hono executionCtx.waitUntil might not run immediately in tests without await
    // but vitest mocks can still catch it if it's synchronous or we can wait a bit
  });

  it("MUST return events on valid key", async () => {
    mockRpc.mockResolvedValue({ data: { valid: true, partner_id: "p1", remaining: 999 }, error: null });
    
    const req = new Request("http://localhost/v1/b2b/lunar/events?month=2026-08");
    req.headers.set("x-api-key", "valid_key");
    const res = await app.request(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(Array.isArray(json.data)).toBe(true);
    // There should be some events in August 2026 (like Mung 1, or Vu Lan)
    expect(json.data.length).toBeGreaterThan(0);
  });
});
