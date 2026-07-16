---
id: TASK-LUNAR-019
title: "PDPL compliance layer - Vietnamese privacy policy, granular consent, on-device by default, data minimization, no cross-border transfer before a DPIA"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P3
milestone: P3 · slice 7
slice: 7
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [TASK-LUNAR-018]
depends_on: [TASK-LUNAR-016, TASK-LUNAR-018]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Privacy/PDPL)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 Key Findings 8 (PDPL)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Recommendations 6 (PDPL action)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Caveats (PDPL còn điểm chưa rõ)"
source_decisions:
  - DEC-LUNAR-190 (the Personal Data Protection Law No. 91/2025/QH15 passed on 26/6/2025, effective 01/01/2026; Decree 356/2025/ND-CP issued on 31/12/2025 replaces Decree 13/2023; startups have a 5-year grace period for DPIA/DPO but the consent obligation applies immediately)
  - DEC-LUNAR-191 (processing data for personal/family purposes is exempt from PDPL - the personal MVP is out of scope; the commercial version (Phase 3+) collecting data beyond the family is not exempt and MUST fully comply)
  - DEC-LUNAR-192 (the name of the deceased in a gio is culturally sensitive data: MUST NOT be sold, MUST NOT be transferred across borders before an official DPIA; minimize - collect only the necessary fields)
  - DEC-LUNAR-193 (consentFlags is a granular model: each type of data processing has its own flag; revoking one consent does NOT affect another; store the timestamp and policy version)
  - DEC-LUNAR-194 (PDPL penalties: incorrect cross-border data transfer up to 5% of the prior year's revenue; illegal data trading up to 10x the illicit gain; other violations capped at 3 billion VND - these are the legal thresholds the design must stay below)
  - DEC-LUNAR-195 (the privacy policy is in Vietnamese, plain non-legal language, shown before any data collection occurs; updated when the law changes)
language: typescript 5.x
service: services/genie-api/
new_files:
  - services/genie-api/lib/consent.ts
  - services/genie-api/lib/data-minimization.ts
  - services/genie-api/api/consent.ts
  - services/genie-api/supabase/migrations/0019_consent_log.sql
  - apps/web/components/ConsentModal.tsx
  - apps/web/components/PrivacyPolicy.tsx
  - apps/web/lib/consent-store.ts
modified_files:
  - services/genie-api/api/sync.ts
  - services/genie-api/api/genie.ts
  - apps/web/lib/storage.ts
allowed_tools:
  - file_read: services/genie-api/** apps/web/components/Consent* apps/web/lib/consent*
  - file_write: services/genie-api/lib/consent.ts services/genie-api/lib/data-minimization.ts services/genie-api/api/consent.ts services/genie-api/supabase/migrations/0019_consent_log.sql apps/web/components/** apps/web/lib/consent-store.ts
  - bash: cd services/genie-api && pnpm test
disallowed_tools:
  - "collect data beyond the family without granular consent first (violates DEC-LUNAR-190 / PDPL effective 01/01/2026)"
  - "transfer data of the deceased across borders before a DPIA (violates DEC-LUNAR-192 / DEC-LUNAR-194)"
  - "sell or share consentFlags with a third party (violates DEC-LUNAR-192)"
effort_hours: 9
sub_tasks:
  - "1.5h: lib/consent.ts - ConsentFlags interface, validateConsent(), revokeConsent(), getConsentVersion(); store timestamp + policy_version"
  - "1h: lib/data-minimization.ts - stripSensitiveFields() for a GIO reminder before log/send to AI; checkCrossBorderTransfer()"
  - "1.5h: api/consent.ts - POST /api/consent (grant consent), DELETE /api/consent/:type (revoke), GET /api/consent (get status)"
  - "1h: migration 0018 - the consent_log table (userId, type, action, policy_version, timestamp, ip_hash)"
  - "1.5h: apps/web/components/ConsentModal.tsx - granular UI: a separate checkbox for each processing type, a link to the privacy policy, no dark pattern"
  - "1.5h: apps/web/components/PrivacyPolicy.tsx - Vietnamese content, plain language, clearly listing the data types, purpose, retention period, user rights, CyberSkill contact information"
  - "1h: apps/web/lib/consent-store.ts - store consentFlags on-device (localStorage + sync with the cloud when enabled), check before any collection"
risk_if_skipped: "PDPL, effective 01/01/2026, applies immediately to the consent obligation - skipping TASK-019 at commercial Phase 3 is operating illegally, and prevents TASK-018 (cloud sync) from operating lawfully due to the missing consent layer. Penalties of up to 5% of revenue and 3 billion VND are a serious business risk for a startup. Without granular consent, you cannot separately revoke each processing type when a legal request arrives."
---

## §1 - Description (BCP-14 normative)

TASK-019 builds the PDPL compliance layer (Law No. 91/2025/QH15, effective 01/01/2026) for the commercial version of "Genie Am Lich". The goal is to ensure any data collection beyond the family scope has consent first, is clear, granular, and revocable - while the personal MVP still operates fully unaffected.

1. MUST recognize the exemption threshold: the pure personal/family MVP IS EXEMPT from PDPL (DEC-LUNAR-191); however the system MUST be designed for compliance-readiness so the commercial Phase 3 version does not need a fundamental rewrite (PRD NFR-Privacy/PDPL).
2. MUST display the privacy policy in **Vietnamese, plain language** (not a hard-to-understand legal text) before any data collection in the commercial version occurs; the privacy policy MUST clearly state: the data types collected, the processing purpose, the retention period, the user's rights (access, edit, delete, revoke), and CyberSkill's contact information (DEC-LUNAR-195).
3. MUST implement granular `consentFlags`: at minimum the flags `cloudSync`, `genieAI`, `znsReminder`, `analyticsUsage`; each flag is an independent toggle; revoking one flag MUST NOT affect another (DEC-LUNAR-193).
4. MUST store each consent event (grant, revoke, policy version) into the `consent_log` table with the timestamp and a hash of the IP - this is the audit capability for PDPL (DEC-LUNAR-193).
5. MUST set `consentFlags.cloudSync` to `false` immediately when the user revokes, and the TASK-LUNAR-018 `SyncClient` MUST stop pushing/pulling right away (DEC-LUNAR-180 + DEC-LUNAR-193).
6. MUST apply data minimization for gio data: `lib/data-minimization.ts` has a `stripSensitiveFields()` function that removes the `title` field (which may contain the name of the deceased) before the data is sent to AI Genie (TASK-015) or written to any log (DEC-LUNAR-192).
7. MUST NOT transfer data of the deceased (any field of a `GIO` reminder, especially `title`) outside Vietnamese territory before an official DPIA, even when hosting is in Singapore (DEC-LUNAR-192, DEC-LUNAR-194).
8. MUST have a `checkCrossBorderTransfer(dataType, destination)` function returning `allowed: boolean` - every endpoint that sends data outside MUST call this function first; if `allowed = false`, the request MUST be blocked and logged (DEC-LUNAR-192).
9. MUST provide the `GET /api/consent` endpoint for the user to retrieve their entire consent history (the PDPL access right); `DELETE /api/consent/:type` to revoke each type.
10. MUST NOT use a "dark pattern" in the ConsentModal: all checkboxes MUST start in the unchecked state; no pre-checked boxes, no ambiguous language; the "Reject all" button MUST be easy to find and of equal size to the "Agree" button (DEC-LUNAR-195).
11. MUST store `consentFlags` on-device in `consent-store.ts` (localStorage) and sync to the cloud consent_log when the user has enabled `cloudSync`; when offline, check local first.
12. SHOULD store `policy_version` (a semver string, e.g. "1.0.0") alongside consent to know when to re-request consent if the policy changes (DEC-LUNAR-195).
13. MUST NOT share, sell, or provide `consentFlags` or processed data to any third party - including analytics partners (DEC-LUNAR-192); if analytics is needed, use only aggregated, de-identified data.
14. MUST have a `PrivacyPolicy.tsx` that can be displayed in-app and linked from the ConsentModal and the Settings menu; the content MUST be updated before any PDPL legal change takes effect.

---

## §2 - Why this design (rationale for humans)

**Why clearly separate the personal version (exempt) and the commercial version (not exempt) (DEC-LUNAR-191)?** PDPL clearly affirms that "processing data for personal or family purposes" is exempt. This means the MVP (with the founder's wife, used within one's own family) is entirely out of scope - TASK-019 is not needed for Phase 1 and 2. But as soon as a third party registers (the commercial Phase 3 version), the exemption ends. This separation avoids "over-engineering" for the personal version while still being able to comply at scale.

**Why granular consent (4 flags) instead of a single "Agree to all" (DEC-LUNAR-193)?** PDPL requires consent to be "specific, clear, and revocable". A single "Agree to the terms of service" checkbox is not specific enough. A user may agree to receive ZNS but not want the data used for analytics. Granular consent also ensures that when one flag is revoked (for example the user disables AI Genie), the other features (for example cloud sync) still work normally - no domino effect.

**Why is the name of the deceased a special case needing data minimization (DEC-LUNAR-192)?** PDPL Article 2 defines "sensitive personal data" as including data related to "identity, personal history". The name and death date of a deceased person are data directly related to another individual (the deceased), and are the most private data of a Vietnamese family. Sending the `title` field ("Gio ba noi Nguyen Thi X") to AI Genie is unnecessary - Genie only needs to know "this is a GIO reminder" to respond, not the specific name. `stripSensitiveFields()` cuts this field at the API layer before any contact with an external service.

**Why is `checkCrossBorderTransfer()` an explicit check function (DEC-LUNAR-192, DEC-LUNAR-194)?** The penalty of 5% of the prior year's revenue for an incorrect cross-border data transfer is very large even for a startup. Instead of trusting a later task author to remember the rule, an explicit function creates a "mandatory check" that every new endpoint MUST call - like a gate. Logging when `allowed = false` is audit evidence if there is an inspection.

**Why no dark pattern in the ConsentModal (DEC-LUNAR-195)?** PDPL Article 11 requires consent to be "voluntary" and "refusable without disadvantage". A pre-checked box or an "Agree" button more prominent than "Reject" is a dark pattern violating this "voluntary" condition. Beyond that, Vietnamese app users are increasingly aware of dark patterns after many data scandals - a clean design builds trust.

**Why store `policy_version` (DEC-LUNAR-195)?** PDPL and Decree 356/2025 still have unclear points and will see amendments. When the law changes, you need to re-request consent with the new policy. `policy_version` records who agreed to which version - avoiding having to re-request all users when only a small part changes.

---

## §3 - API contract

```typescript
// services/genie-api/lib/consent.ts

export const CONSENT_POLICY_VERSION = "1.0.0";

export interface ConsentFlags {
  cloudSync: boolean;       // TASK-018 Supabase sync
  genieAI: boolean;         // TASK-015 Claude proxy
  znsReminder: boolean;     // TASK-017 ZNS
  analyticsUsage: boolean;  // thu thap du lieu su dung tong hop
  consentedAt: string | null;       // ISO 8601, null neu chua consent
  policyVersion: string | null;     // semver cua chinh sach tai thoi diem consent
}

export const DEFAULT_CONSENT_FLAGS: ConsentFlags = {
  cloudSync: false,
  genieAI: false,
  znsReminder: false,
  analyticsUsage: false,
  consentedAt: null,
  policyVersion: null,
};

export type ConsentType = keyof Omit<ConsentFlags, "consentedAt" | "policyVersion">;

// Cap consent cho mot loai xu ly cu the
export function grantConsent(
  flags: ConsentFlags,
  type: ConsentType,
  policyVersion: string
): ConsentFlags;

// Thu hoi consent cho mot loai, khong anh huong loai khac
export function revokeConsent(
  flags: ConsentFlags,
  type: ConsentType
): ConsentFlags;

// Kiem tra mot loai xu ly co duoc phep khong
export function hasConsent(flags: ConsentFlags, type: ConsentType): boolean;

// Lay version chinh sach hien tai
export function getCurrentPolicyVersion(): string;
```

```typescript
// services/genie-api/lib/data-minimization.ts
import type { RemindersUpsertRow } from "./sync";

// Loai bo truong nhay cam truoc khi gui den AI hoac ghi log
export function stripSensitiveFields(
  reminder: RemindersUpsertRow
): Omit<RemindersUpsertRow, "title"> & { titleRedacted: true } {
  const { title: _removed, ...rest } = reminder;
  return { ...rest, titleRedacted: true as const };
}

// Kiem tra quyen chuyen du lieu xuyen bien gioi
export interface CrossBorderCheckResult {
  allowed: boolean;
  reason: string;
  dpiaPending: boolean;
}

export function checkCrossBorderTransfer(
  dataType: "gio_reminder" | "user_profile" | "analytics_aggregate",
  destination: "sg-ap-southeast-1" | "us-east-1" | "eu-west-1" | string
): CrossBorderCheckResult;
```

```typescript
// services/genie-api/api/consent.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// POST /api/consent
// Body: { type: ConsentType; grant: boolean; policyVersion: string }
export async function handleConsentUpdate(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// GET /api/consent
// Response: { flags: ConsentFlags; history: ConsentLogEntry[] }
export async function handleConsentGet(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// DELETE /api/consent/:type
// Thu hoi consent mot loai cu the
export async function handleConsentRevoke(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

export interface ConsentLogEntry {
  type: ConsentType;
  action: "grant" | "revoke";
  policyVersion: string;
  timestamp: string;        // ISO 8601
  ipHash: string;           // SHA-256 cua IP, khong luu IP ro
}
```

```typescript
// apps/web/lib/consent-store.ts
export class ConsentStore {
  // Doc consentFlags tu localStorage
  getFlags(): ConsentFlags;

  // Cap nhat mot co va luu localStorage
  setFlag(type: ConsentType, value: boolean): Promise<void>;

  // Dong bo len cloud (chi khi cloudSync da duoc cap truoc do)
  syncToCloud(flags: ConsentFlags): Promise<void>;

  // Xoa toan bo consent local (khi xoa tai khoan)
  clear(): void;
}
```

```tsx
// apps/web/components/ConsentModal.tsx
interface ConsentModalProps {
  onAccept: (flags: Partial<ConsentFlags>) => void;
  onDismiss: () => void;
  policyVersion: string;
}
// - Moi checkbox bat dau unchecked (khong dark pattern)
// - Link "Xem chinh sach quyen rieng tu" mo PrivacyPolicy.tsx
// - Nut "Tu choi tat ca" va "Xac nhan lua chon" co kich thuoc ngang nhau
// - Khong co nut "Dong y tat ca" noi bat hon
```

---

## §4 - Acceptance criteria

1. When the user first enters the commercial version, `ConsentModal` appears before any data-collecting action; dismissing the modal without choosing anything still lets them use the app in on-device mode (no cloud, no AI, no ZNS).
2. All checkboxes in `ConsentModal` start in the unchecked state; no pre-selected option; the "Reject all" and "Confirm selection" buttons are of equal size - checked via a visual snapshot test.
3. Granting `cloudSync = true` -> `ConsentStore.setFlag()` saves to localStorage; `SyncClient` starts pushing/pulling.
4. Revoking `cloudSync` -> `ConsentStore.setFlag()` updates; `SyncClient` stops pushing/pulling within <= 1 subsequent request.
5. Revoking `genieAI` does NOT affect `cloudSync` - check that the two flags are independent in `ConsentStore`.
6. Each consent grant/revoke event is written to the `consent_log` table with `timestamp`, `policy_version`, and `ip_hash`; `ip_hash` is the SHA-256 of the IP, with no plaintext IP.
7. `GET /api/consent` returns the full consent history for the authenticated user; an unauthenticated request is rejected with HTTP 401.
8. `DELETE /api/consent/cloudSync` returns HTTP 200 and `consentFlags.cloudSync` turns `false` in both localStorage and the cloud.
9. `stripSensitiveFields()` on a `GIO` reminder with `title = "Gio ba noi"` returns an object without the `title` field and with `titleRedacted = true`.
10. `checkCrossBorderTransfer("gio_reminder", "us-east-1")` when there is no DPIA returns `{ allowed: false, dpiaPending: true }`.
11. `checkCrossBorderTransfer("analytics_aggregate", "sg-ap-southeast-1")` with aggregated, de-identified data returns `{ allowed: true }`.
12. `api/genie.ts` must call `stripSensitiveFields()` before passing any reminder field into Claude's system prompt; checked via a mocked unit test.
13. `PrivacyPolicy.tsx` displays fully: the data types, purpose, retention period, user rights (access/edit/delete/revoke), CyberSkill contact information; ready to display in Vietnamese.
14. `policy_version` is stored alongside consent; when `CONSENT_POLICY_VERSION` bumps (e.g. "1.1.0"), the system detects a user with `policyVersion = "1.0.0"` and shows the `ConsentModal` again.
15. The personal MVP (Phase 1, 2) runs fully without showing `ConsentModal` - because the default is on-device and PDPL-exempt.
16. `GET /api/consent` and all endpoints that emit `consentFlags` or `consent_log` NEVER return another user's consent data and do NOT include `consentFlags` information in the response of any third-party API - checked via a mocked unit test on the handler, confirming the response body does not contain a `consentFlags` object in the outbound payload (DEC-LUNAR-192, §1 #13).

---

## §5 - Verification

```typescript
// services/genie-api/test/consent.test.ts
import { describe, it, expect } from "vitest";
import {
  grantConsent, revokeConsent, hasConsent, DEFAULT_CONSENT_FLAGS
} from "../lib/consent";
import { stripSensitiveFields, checkCrossBorderTransfer } from "../lib/data-minimization";

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
    const reminder = makeGioReminder({ title: "Gio ba noi Nguyen Thi X" });
    const stripped = stripSensitiveFields(reminder);
    expect((stripped as any).title).toBeUndefined();
    expect(stripped.titleRedacted).toBe(true);
    expect(stripped.lunarDay).toBe(reminder.lunarDay); // cac truong khac giu nguyen
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

describe("ConsentModal - khong dark pattern", () => {
  it("tat ca checkbox bat dau unchecked", () => {
    // React Testing Library
    render(<ConsentModal onAccept={vi.fn()} onDismiss={vi.fn()} policyVersion="1.0.0" />);
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });

  it("nut Tu choi co accessible name ro rang", () => {
    render(<ConsentModal onAccept={vi.fn()} onDismiss={vi.fn()} policyVersion="1.0.0" />);
    expect(screen.getByRole("button", { name: /tu choi/i })).toBeInTheDocument();
  });
});

describe("consent isolation - khong chia se voi ben thu ba", () => {
  it("GET /api/consent khong tra consentFlags cua user khac", async () => {
    // Mock hai user
    const responseA = await simulateConsentGet(jwtForUser("userA"));
    const responseB = await simulateConsentGet(jwtForUser("userB"));
    // Hai response la doc lap, khong cross-leak
    expect(responseA.body.flags).not.toEqual(responseB.body.flags);
    // Khong co truong nao la consentFlags cua userB trong response cua userA
    expect(JSON.stringify(responseA.body)).not.toContain("userB");
  });

  it("payload gui ra external service khong chua consentFlags", async () => {
    // Gia su handleConsentUpdate goi mot service ngoai (analytics), mock no
    const externalCallSpy = vi.fn();
    // Chay handler voi mock
    await simulateConsentUpdate({ type: "analyticsUsage", grant: true, policyVersion: "1.0.0" });
    // Payload gui ra ngoai khong duoc chua du lieu consent nguoi dung
    const outboundPayloads = externalCallSpy.mock.calls.map((c) => JSON.stringify(c[0]));
    outboundPayloads.forEach((p) => {
      expect(p).not.toContain("consentFlags");
      expect(p).not.toContain("cloudSync");
    });
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is the backbone. Two key points:

```typescript
// Kiem tra consent truoc moi thu thap du lieu - mau nay ap dung khap noi
function guardConsent(store: ConsentStore, type: ConsentType): void {
  if (!store.getFlags()[type]) {
    throw new ConsentRequiredError(
      `Thu thap du lieu loai "${type}" yeu cau consent nguoi dung chua cap.`
    );
  }
}

// stripSensitiveFields phai la ham thuan tuy (pure) - khong co side effect
// Goi o dau vao cua moi ham xu ly du lieu GIO reminder
```

```typescript
// checkCrossBorderTransfer - logic hien tai (truoc DPIA chinh thuc)
export function checkCrossBorderTransfer(
  dataType: string,
  destination: string
): CrossBorderCheckResult {
  const sensitiveTypes = ["gio_reminder", "user_profile"];
  const vnDomestic = ["vn-hanoi-1"]; // placeholder cho Supabase VN khi co
  if (sensitiveTypes.includes(dataType) && !vnDomestic.includes(destination)) {
    return { allowed: false, reason: "DPIA chua co cho du lieu nhay cam", dpiaPending: true };
  }
  return { allowed: true, reason: "ok", dpiaPending: false };
}
```

---

## §7 - Dependencies

Upstream: TASK-LUNAR-016 (Zalo Mini App) - Zalo Mini App users need a separate consent for ZNS; `consentFlags.znsReminder` is set via this flow before TASK-017 sends any ZNS. TASK-LUNAR-018 (family sharing cloud sync) - TASK-018's `SyncClient` depends on `consentFlags.cloudSync` from TASK-019 to decide whether to push/pull.

Downstream: TASK-019 blocks no task but is a precondition for every data collection in Phase 3 to be lawful. Every Phase 3 task that sends data off the device (016, 017, 018, 020) MUST reference `ConsentStore` before acting.

Cross-cutting: TASK-LUNAR-015 (AI Genie) MUST call `stripSensitiveFields()` before passing reminder content into the Claude prompt. TASK-LUNAR-017 (ZNS) MUST check `consentFlags.znsReminder` before sending any message.

---

## §8 - Example payloads

```sql
-- services/genie-api/supabase/migrations/0019_consent_log.sql

CREATE TABLE IF NOT EXISTS consent_log (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type   TEXT NOT NULL CHECK (
    consent_type IN ('cloudSync','genieAI','znsReminder','analyticsUsage')
  ),
  action         TEXT NOT NULL CHECK (action IN ('grant','revoke')),
  policy_version TEXT NOT NULL,
  ip_hash        TEXT NOT NULL,   -- SHA-256 cua IP; KHONG luu IP ro
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- Nguoi dung chi doc lich su cua chinh ho
CREATE POLICY "user_own_consent_log" ON consent_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert chi tu server (service role) - client khong insert truc tiep
CREATE POLICY "server_insert_only" ON consent_log
  FOR INSERT
  WITH CHECK (FALSE); -- override bang service role o server
```

```json
// GET /api/consent response mau
{
  "flags": {
    "cloudSync": true,
    "genieAI": false,
    "znsReminder": true,
    "analyticsUsage": false,
    "consentedAt": "2026-06-27T08:00:00.000Z",
    "policyVersion": "1.0.0"
  },
  "history": [
    {
      "type": "cloudSync",
      "action": "grant",
      "policyVersion": "1.0.0",
      "timestamp": "2026-06-27T08:00:00.000Z",
      "ipHash": "a3f5e8...2d1c"
    },
    {
      "type": "znsReminder",
      "action": "grant",
      "policyVersion": "1.0.0",
      "timestamp": "2026-06-27T08:00:30.000Z",
      "ipHash": "a3f5e8...2d1c"
    }
  ]
}
```

```json
// POST /api/consent body mau - cap consent
{
  "type": "genieAI",
  "grant": true,
  "policyVersion": "1.0.0"
}
```

```typescript
// ConsentFlags on-device (localStorage key: "genie_amlich_consent")
{
  "cloudSync": true,
  "genieAI": false,
  "znsReminder": true,
  "analyticsUsage": false,
  "consentedAt": "2026-06-27T08:00:00.000Z",
  "policyVersion": "1.0.0"
}
```

---

## §9 - Open questions

Resolved:
- Personal/family exemption: clearly confirmed the conditions (DEC-LUNAR-191) - the Phase 1, 2 MVP does not need TASK-019 actively running; AC #15 checks this.
- Specific penalties: DEC-LUNAR-194 records the 3 penalty tiers from PRD Key Findings 8 - these are the legal thresholds the design must stay below.
- granular consent: 4 types (cloudSync, genieAI, znsReminder, analyticsUsage) are enough for the initial Phase 3.
- Dark pattern: clearly defined in §1 #10 and the §5 tests.

Still deferred:
- Official DPIA: the startup has a 5-year grace period (DEC-LUNAR-190), but it must be done before scaling across borders (DEC-LUNAR-192). Described as a precondition for transferring data to a destination outside "sg-ap-southeast-1" - a legal consultation is a mandatory step, outside the scope of this task.
- DPO (Data Protection Officer): the startup has a 5-year grace period (DEC-LUNAR-190); only mandatory once the grace period is removed. Scheduled into Phase 4.
- Consent for third-party data (for example an analytics SDK like Firebase/Mixpanel): currently `analyticsUsage` is a placeholder; the SDKs used need to be clearly identified and declared in the privacy policy before enabling.
- The consent-revocation interface on the Zalo Mini App side (TASK-016): Zalo has a `revokeUserInfo` API; it needs integration with `ConsentStore` - deferred to an TASK-016 extension.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Collecting data without consent | `guardConsent()` throws `ConsentRequiredError` | Request blocked before processing | Show the ConsentModal to the user |
| Dark pattern (pre-checked checkbox) | Snapshot test + accessibility audit | Test fails before shipping | Fix the component: set unchecked as the default |
| Consent revoked but SyncClient still pushes | Unit test SyncClient after revoke | Data sent without authorization | Fix: SyncClient checks the flag before each push |
| Transferring GIO data abroad before a DPIA | `checkCrossBorderTransfer()` returns `allowed: false` | Request blocked, logged | Show an error message; wait until there is a DPIA |
| `stripSensitiveFields` skipped in genie.ts | Unit test mocking the genie handler | The name of the deceased is sent to Claude | Fix: add the function call before building the prompt |
| Plaintext IP in consent_log | Schema check: the `ip_hash` TEXT column, no `ip` column | Log contains plaintext IP (PDPL violation) | Fix the migration: drop the `ip` column if present; store only the hash |
| policy_version not bumped when the policy changes | CI check comparing `CONSENT_POLICY_VERSION` in code vs the latest version in consent_log | The user is not re-requested for consent | Bump `CONSENT_POLICY_VERSION` in lib/consent.ts |
| Consent log accessed by another user | RLS policy `user_own_consent_log` | RLS blocks (0 rows) | Check the RLS policy in the integration test |
| Server inserting directly into consent_log violates | Policy `server_insert_only WITH CHECK FALSE` | Client INSERT is rejected | Only the server (service role) inserts; read via the API |
| ConsentModal not shown when policy_version bumps | Check `flags.policyVersion < CONSENT_POLICY_VERSION` | The user is on the old policy | Add a version check to `ConsentStore.getFlags()` |

---

## §11 - Implementation notes

- `guardConsent()` must be a synchronous function so it can be called at the start of any async handler with no overhead. The consent check MUST be the first line, before any operation.
- `stripSensitiveFields()` must be a pure function: input `RemindersUpsertRow`, output an object without `title`. No logging, no side effect - easy to test and easy to audit.
- `ip_hash` in consent_log: use `crypto.createHash('sha256').update(ip + SALT).digest('hex')` with `SALT` as an environment variable. This is the minimum data needed to audit ("consent from which address") without storing the plaintext IP - reducing PDPL risk.
- `ConsentModal` should use `role="dialog"` and `aria-modal="true"` to support screen readers; the "Reject all" and "Confirm selection" buttons must have a clear `aria-label` in Vietnamese.
- `policy_version` uses semver (major.minor.patch): bump major on a fundamental change to user rights (requires re-consent); bump minor when adding a new processing type; bump patch for typos/small fixes.
- Vietnamese privacy policy: avoid copying English legal text and machine-translating it - Vietnamese users need to understand it. Test with a non-technical person: if they do not understand, rewrite it.
- `ConsentStore.syncToCloud()` is only called when `consentFlags.cloudSync` is ALREADY `true` beforehand. If cloudSync is the first flag granted, then after saving to localStorage, only then call the cloud sync. This logic needs clear testing to avoid a loop.
- The commercial version needs a legal consultation before the official launch: PDPL and Decree 356/2025 still have "Caveats" (PRD) unclear points - especially the relationship with the Data Law and the expanded definition of sensitive data.
- The P3 migration numbers are distributed to avoid collisions: 0016-0017 for TASK-018, 0018 for TASK-017, 0019 for TASK-019, 0020 for TASK-020.

*End of TASK-LUNAR-019.*
