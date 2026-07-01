import { describe, it, expect, vi } from "vitest";
import { POST } from "../../api/monetization/revenuecat";

// Mock Supabase
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("../../lib/supabase.js", () => {
  return {
    getServiceSupabaseClient: () => ({
      from: (table: string) => {
        if (table === "user_entitlements") return { upsert: mockUpsert };
        if (table === "genie_action_log") return { insert: mockInsert };
        return {};
      },
    }),
  };
});

describe("RevenueCat Webhook", () => {
  it("MUST update user_entitlements tier to premium on INITIAL_PURCHASE", async () => {
    const payload = {
      event: {
        type: "INITIAL_PURCHASE",
        app_user_id: "123-abc",
        product_id: "genie_premium",
        entitlement_ids: ["premium_themes"]
      }
    };
    
    const request = new Request("http://localhost/api/webhook/revenuecat", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);
    const json = await response.json();
    
    expect(json.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      user_id: "123-abc",
      tier: "premium",
      valid_until: null,
      source: "app_store"
    }, { onConflict: "user_id" });
    
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_kind: "monetization.purchase_success",
      payload: expect.objectContaining({
        product_id: "genie_premium",
        entitlement_ids: ["premium_themes"]
      })
    }));
  });

  it("MUST update user_entitlements tier to free on EXPIRATION", async () => {
    mockUpsert.mockClear();
    mockInsert.mockClear();

    const payload = {
      event: {
        type: "EXPIRATION",
        app_user_id: "123-abc",
        product_id: "genie_premium",
        entitlement_ids: ["premium_themes"]
      }
    };
    
    const request = new Request("http://localhost/api/webhook/revenuecat", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);
    const json = await response.json();
    
    expect(json.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      user_id: "123-abc",
      tier: "free",
      valid_until: null,
      source: "app_store"
    }, { onConflict: "user_id" });
    
    expect(mockInsert).not.toHaveBeenCalled(); // We don't log expiration as a purchase success
  });
});
