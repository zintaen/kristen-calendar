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
    process.env.ZALO_PAY_KEY2 = "test_zalo_key";
    const dataStr = JSON.stringify({ orderId: "123", amount: 50000 });
    const mac = crypto.createHmac("sha256", "test_zalo_key").update(dataStr).digest("hex");
    const fakePayload = { data: dataStr, mac };

    const req = new Request("http://localhost/api/webhook/payment/zalopay", {
      method: "POST",
      body: JSON.stringify(fakePayload)
    });

    const response = await handleZaloPayWebhook(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.return_code).toBe(1);
  });

  it("khong con backdoor MAC (valid_mac_for_test bi tu choi)", async () => {
    process.env.ZALO_PAY_KEY2 = "test_zalo_key";
    const dataStr = JSON.stringify({ orderId: "123", amount: 50000 });
    const req = new Request("http://localhost/api/webhook/payment/zalopay", {
      method: "POST",
      body: JSON.stringify({ data: dataStr, mac: "valid_mac_for_test" })
    });
    const response = await handleZaloPayWebhook(req);
    expect(response.status).toBe(401);
  });
});

describe("App Store webhook - fail closed without a verified JWS", () => {
  const post = (body: string) =>
    handleAppStoreWebhook(new Request("http://localhost/api/webhook/payment/appstore", { method: "POST", body }));

  it("body khong phai JSON -> 400", async () => {
    const res = await post("not-json");
    expect(res.status).toBe(400);
  });

  it("thieu signedPayload -> 401", async () => {
    const res = await post(JSON.stringify({ foo: "bar" }));
    expect(res.status).toBe(401);
  });

  it("JWS khong dung 3 doan -> 401", async () => {
    const res = await post(JSON.stringify({ signedPayload: "only.two" }));
    expect(res.status).toBe(401);
  });

  it("JWS gia (3 doan, chu ky sai) KHONG BAO GIO cap quyen", async () => {
    // Fake but well-formed JWS. With no verified signature the handler must never return 200:
    // 401 if the signature is rejected, 500 if the verifier/root cert is unavailable.
    const fake = Buffer.from(JSON.stringify({ alg: "ES256" })).toString("base64url") + ".ey000." + "sig";
    const res = await post(JSON.stringify({ signedPayload: fake }));
    expect(res.status).not.toBe(200);
    expect([401, 500]).toContain(res.status);
  });
});
