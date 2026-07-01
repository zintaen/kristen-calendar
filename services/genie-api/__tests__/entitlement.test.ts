import { describe, it, expect, vi, beforeEach } from "vitest";
import { TIER_FEATURES, isFeatureAllowed, getEntitlement } from "../lib/entitlement";
import { checkAndIncrementGenieUsage } from "../lib/rate-limiter";
import { handleAppStoreWebhook, handleZaloPayWebhook } from "../api/webhook-payment";
import crypto from "crypto";

describe("TIER_FEATURES - dinh nghia tier bat bien", () => {
  it("Free tier khong co genieAI", () => {
    expect(TIER_FEATURES.free.genieAI).toBe(false);
    expect(TIER_FEATURES.free.genieMonthlyQuota).toBe(0);
    expect(TIER_FEATURES.free.familySharing).toBe(false);
  });

  it("Premium co genieAI nhung khong co familySharing", () => {
    expect(TIER_FEATURES.premium.genieAI).toBe(true);
    expect(TIER_FEATURES.premium.genieMonthlyQuota).toBe(50);
    expect(TIER_FEATURES.premium.familySharing).toBe(false);
  });

  it("Family co tat ca tinh nang Premium cong familySharing", () => {
    expect(TIER_FEATURES.family.familySharing).toBe(true);
    expect(TIER_FEATURES.family.maxFamilyMembers).toBe(10);
    expect(TIER_FEATURES.family.genieMonthlyQuota).toBe(100);
  });
});

describe("isFeatureAllowed", () => {
  it("Free khong duoc phep genieAI", () => {
    expect(isFeatureAllowed("free", "genieAI")).toBe(false);
  });
  it("Premium duoc phep genieAI", () => {
    expect(isFeatureAllowed("premium", "genieAI")).toBe(true);
  });
  it("Premium khong duoc phep familySharing", () => {
    expect(isFeatureAllowed("premium", "familySharing")).toBe(false);
  });
  it("Family duoc phep familySharing", () => {
    expect(isFeatureAllowed("family", "familySharing")).toBe(true);
  });
});

describe("rate-limiter", () => {
  it("cho phep trong gioi han quota", async () => {
    const mockDb = { 
      getCount: vi.fn().mockResolvedValue(49), 
      increment: vi.fn() 
    };
    const result = await checkAndIncrementGenieUsage("user1", 50, mockDb as any);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // lan cuoi
  });

  it("chan khi vuot quota", async () => {
    const mockDb = { 
      getCount: vi.fn().mockResolvedValue(50), 
      increment: vi.fn() 
    };
    const result = await checkAndIncrementGenieUsage("user1", 50, mockDb as any);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("webhook - xac minh HMAC", () => {
  it("MAC sai bi tu choi", async () => {
    const fakePayload = {
      data: JSON.stringify({ orderId: "123", amount: 50000 }),
      mac: "invalid_mac"
    };

    const req = new Request("http://localhost/api/webhook/payment/zalopay", {
      method: "POST",
      body: JSON.stringify(fakePayload)
    });

    const response = await handleZaloPayWebhook(req);
    expect(response.status).toBe(401);
  });

  it("MAC dung duoc chap nhan", async () => {
    const dataStr = JSON.stringify({ orderId: "123", amount: 50000 });
    const fakePayload = {
      data: dataStr,
      mac: "valid_mac_for_test"
    };

    const req = new Request("http://localhost/api/webhook/payment/zalopay", {
      method: "POST",
      body: JSON.stringify(fakePayload)
    });

    const response = await handleZaloPayWebhook(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.return_code).toBe(1);
  });
});
