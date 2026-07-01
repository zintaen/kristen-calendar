import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUserInfo, fetchPhoneNumber } from "../zalo-auth";

vi.mock("zmp-sdk/apis", () => {
  return {
    getUserInfo: vi.fn(async () => ({
      userInfo: { id: "123", name: "Test User", avatar: "http://avatar.com/123" },
    })),
    getPhoneNumber: vi.fn(async () => ({
      token: "phone_token_123",
    })),
  };
});

describe("zalo-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchUserInfo returns mapped data", async () => {
    const info = await fetchUserInfo();
    expect(info.id).toBe("123");
    expect(info.name).toBe("Test User");
    expect(info.avatar).toBe("http://avatar.com/123");
  });

  it("fetchPhoneNumber returns token", async () => {
    const token = await fetchPhoneNumber();
    expect(token).toBe("phone_token_123");
  });
});
