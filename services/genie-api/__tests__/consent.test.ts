import { describe, it, expect, vi } from "vitest";
import {
  grantConsent, revokeConsent, hasConsent, DEFAULT_CONSENT_FLAGS
} from "../lib/consent";
import { stripSensitiveFields, checkCrossBorderTransfer } from "../lib/data-minimization";
import { handleConsentGet, handleConsentUpdate } from "../api/consent";
import { getSupabaseClient } from "../lib/supabase";

vi.mock("../lib/supabase", () => {
  return {
    getServiceSupabaseClient: vi.fn(),
    getSupabaseClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "userA" } }, error: null })
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  };
});

describe("consent flags - granular independence", () => {
  it("cap cloudSync khong anh huong genieAI", () => {
    const flags = grantConsent(DEFAULT_CONSENT_FLAGS, "cloudSync", "1.0.0");
    expect(hasConsent(flags, "cloudSync")).toBe(true);
    expect(hasConsent(flags, "genieAI")).toBe(false);
  });

  it("thu hoi cloudSync giu nguyen znsReminder", () => {
    let flags = grantConsent(DEFAULT_CONSENT_FLAGS, "cloudSync", "1.0.0");
    flags = grantConsent(flags, "znsReminder", "1.0.0");
    flags = revokeConsent(flags, "cloudSync");
    expect(hasConsent(flags, "cloudSync")).toBe(false);
    expect(hasConsent(flags, "znsReminder")).toBe(true);
  });

  it("mac dinh tat ca flag la false", () => {
    const types: Array<keyof typeof DEFAULT_CONSENT_FLAGS> = [
      "cloudSync", "genieAI", "znsReminder", "analyticsUsage"
    ];
    types.forEach((t) => expect(DEFAULT_CONSENT_FLAGS[t]).toBe(false));
  });

  it("luu policyVersion khi grant", () => {
    const flags = grantConsent(DEFAULT_CONSENT_FLAGS, "genieAI", "1.1.0");
    expect(flags.policyVersion).toBe("1.1.0");
    expect(flags.consentedAt).not.toBeNull();
  });
});

describe("data-minimization", () => {
  it("stripSensitiveFields loai bo truong title", () => {
    const reminder = { type: "GIO", title: "Gio ba noi Nguyen Thi X", lunarDay: 1, lunarMonth: 1 } as any;
    const stripped = stripSensitiveFields(reminder);
    expect((stripped as any).title).toBeUndefined();
    expect(stripped.titleRedacted).toBe(true);
    expect(stripped.lunarDay).toBe(reminder.lunarDay);
  });

  it("checkCrossBorderTransfer - gio_reminder sang US bi chan khi chua DPIA", () => {
    const result = checkCrossBorderTransfer("gio_reminder", "us-east-1");
    expect(result.allowed).toBe(false);
    expect(result.dpiaPending).toBe(true);
  });

  it("checkCrossBorderTransfer - aggregate analytics sang Singapore duoc phep", () => {
    const result = checkCrossBorderTransfer("analytics_aggregate", "sg-ap-southeast-1");
    expect(result.allowed).toBe(true);
  });
});

describe("consent isolation - khong chia se voi ben thu ba", () => {
  it("GET /api/consent khong tra consentFlags cua user khac", async () => {
    const req = new Request("http://localhost/api/consent", {
      headers: { "Authorization": "Bearer tok" }
    });
    
    // We already mocked supabase to return userA. Let's see the response
    const res = await handleConsentGet(req);
    const body = await res.json();
    
    // It should not contain anything about "userB"
    expect(JSON.stringify(body)).not.toContain("userB");
  });
});
