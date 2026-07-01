import { describe, it, expect, vi, beforeEach } from "vitest";

// We test ensureFreshToken by directly manipulating the module's internal state
// via its exported functions. The real module's refreshOAToken mock path returns
// "mock_new_access_token" when ZALO_APP_ID/SECRET are not set, which is our test env.

describe("ensureFreshToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refresh khi còn < 10 phút hết hạn", async () => {
    // Set env so getOATokenPair returns a near-expiry token.
    process.env.OA_ACCESS_TOKEN = "old_token";
    process.env.OA_REFRESH_TOKEN = "refresh_123";
    process.env.OA_EXPIRES_AT = String(Date.now() + 5 * 60 * 1000); // 5 min left
    // No ZALO_APP_ID/SECRET -> refreshOAToken will return mock values.

    const { ensureFreshToken } = await import("../lib/oa-token");
    const token = await ensureFreshToken();
    // The mock refresh returns "mock_new_access_token" (no external API).
    expect(token).toBe("mock_new_access_token");

    // Clean up
    delete process.env.OA_ACCESS_TOKEN;
    delete process.env.OA_REFRESH_TOKEN;
    delete process.env.OA_EXPIRES_AT;
  });

  it("không refresh khi token còn > 10 phút", async () => {
    process.env.OA_ACCESS_TOKEN = "valid_token";
    process.env.OA_REFRESH_TOKEN = "refresh_xyz";
    process.env.OA_EXPIRES_AT = String(Date.now() + 30 * 60 * 1000); // 30 min left

    const { ensureFreshToken } = await import("../lib/oa-token");
    const token = await ensureFreshToken();
    expect(token).toBe("valid_token");

    delete process.env.OA_ACCESS_TOKEN;
    delete process.env.OA_REFRESH_TOKEN;
    delete process.env.OA_EXPIRES_AT;
  });
});
