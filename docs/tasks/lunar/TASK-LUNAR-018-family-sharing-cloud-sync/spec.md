---
id: TASK-LUNAR-018
title: "Family sharing + cloud sync - Supabase/Postgres with RLS, sharedWith, multi-device sync, multiple members receiving one gio reminder"
module: LUNAR
priority: SHOULD
status: ready_to_implement
verify: T
phase: P3
milestone: P3 · slice 7
slice: 7
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [TASK-LUNAR-004, TASK-LUNAR-019]
depends_on: [TASK-LUNAR-004]
blocks: [TASK-LUNAR-019, TASK-LUNAR-020]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (TASK-F04)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (Sync optional)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#10 (sharedWith, consentFlags)"
source_decisions:
  - DEC-LUNAR-180 (on-device is the immutable default; Supabase/Postgres is only enabled after the user grants explicit consent via TASK-019 - no consent, no cloud)
  - DEC-LUNAR-181 (the RLS policy on the reminders table ensures a row can only be read/written by the owner or a member in sharedWith; the backend never bypasses RLS)
  - DEC-LUNAR-182 (sharedWith stores an array of userId; each member receives an independent notification copy, computed on their own device - not a single shared notification)
  - DEC-LUNAR-183 (conflict resolution is "last-write-wins" on updated_at; no CRDT; conflicts are logged for debugging but not shown in the UI)
  - DEC-LUNAR-184 (gio data - the name of the deceased, the date of death - is minimized per DEC-LUNAR-190; the `title` field containing the name of the deceased MUST NOT be sent outside VN before a DPIA)
  - DEC-LUNAR-185 (the invite flow uses a one-time token, expiring after 48h; no email - sent via ZNS or copy link)
language: typescript 5.x
service: services/genie-api/
new_files:
  - services/genie-api/api/sync.ts
  - services/genie-api/lib/supabase.ts
  - services/genie-api/lib/rls-helpers.ts
  - services/genie-api/lib/invite.ts
  - services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
  - services/genie-api/supabase/migrations/0017_family_sharing_rls.sql
  - apps/web/lib/sync-client.ts
  - apps/web/lib/conflict-resolver.ts
modified_files:
  - apps/web/lib/storage.ts
  - services/genie-api/api/genie.ts
allowed_tools:
  - file_read: services/genie-api/** apps/web/lib/**
  - file_write: services/genie-api/** apps/web/lib/sync-client.ts apps/web/lib/conflict-resolver.ts
  - bash: cd services/genie-api && pnpm test
disallowed_tools:
  - "store gio data (the name of the deceased) in a separate unencrypted column and then expose it via a REST endpoint without RLS (violates DEC-LUNAR-181 / DEC-LUNAR-184)"
  - "bypass RLS by using the service_role key on the client (violates DEC-LUNAR-181)"
  - "enable cloud sync before receiving consent from TASK-019 (violates DEC-LUNAR-180)"
effort_hours: 12
sub_tasks:
  - "2h: migration SQL 0016 - the users, reminders, shared_reminder_members, sync_log tables; indexes; RLS enable"
  - "2h: migration SQL 0017 - RLS policies (owner CRUD, member read-only on shared, anon nothing)"
  - "1.5h: supabase.ts - Supabase client singleton, auth helper, refresh token; lib/rls-helpers.ts"
  - "1.5h: api/sync.ts - POST /api/sync/push (upsert reminders), GET /api/sync/pull (reminders for the user), PATCH /api/sync/share (add/remove sharedWith)"
  - "1h: lib/invite.ts - create an invite token (JWT, 48h TTL), validate, resolve the member"
  - "1.5h: apps/web/lib/sync-client.ts - SyncClient class: push local -> cloud, pull cloud -> local, debounce, retry exponential backoff"
  - "1.5h: apps/web/lib/conflict-resolver.ts - last-write-wins on updated_at, write a conflict log, unit test"
  - "1h: apps/web/lib/storage.ts - extend the StorageAdapter to connect the SyncClient when cloud is enabled"
risk_if_skipped: "TASK-F04 (family sharing) is one of the main reasons commercial users pay for premium - without TASK-018 there is no multi-member shared gio and TASK-019 (the PDPL layer) lacks the cloud infrastructure to enforce consent. TASK-020 (freemium) is also blocked because the 'family' tier needs TASK-018. If skipped, the commercial sales basis is broken."
---

## §1 - Description (BCP-14 normative)

This feature extends the on-device storage model of TASK-LUNAR-004 with an optional cloud tier, using Supabase/Postgres with Row Level Security, so that multiple members of the same family can receive one gio reminder and sync reminders across multiple devices. Consent must always be obtained first (TASK-019) before enabling any process that sends data to the cloud.

1. MUST keep on-device as the immutable default: when the user has not granted cloud consent (per TASK-019), all data MUST stay on the device and MUST NOT be sent to Supabase (DEC-LUNAR-180).
2. MUST enable cloud sync only after the user grants `consentFlags.cloudSync = true` via the TASK-019 consent flow; revoking consent MUST disable sync immediately and MAY trigger deletion of the cloud data on request (DEC-LUNAR-180).
3. MUST use Supabase/Postgres with RLS enabled on every table; the `service_role` key MUST NOT be used on the client - only on the server (DEC-LUNAR-181).
4. MUST apply the RLS policy: the owner of a `Reminder` has full CRUD; a member in `sharedWith` has only READ on that row; every unauthenticated request is rejected entirely (DEC-LUNAR-181).
5. MUST store `sharedWith` as an array of `userId`; each member in the array MUST receive an independent notification copy, computed and scheduled on their own device via TASK-LUNAR-005 (DEC-LUNAR-182).
6. MUST implement the invite flow: the owner creates an `invite_token` (JWT, 48h TTL) and shares a link/ZNS; the recipient clicks the link -> authenticates -> is added to `sharedWith`; the token expires after 48h and is single-use (DEC-LUNAR-185).
7. MUST resolve conflicts with "last-write-wins" based on the `updated_at` field; the record with a newer `updated_at` MUST overwrite the older record in every case (DEC-LUNAR-183).
8. MUST write a conflict log when a conflict is detected (two records with `updated_at` differing by < 1 second) for debugging, but MUST NOT show this log in the user UI (DEC-LUNAR-183).
9. MUST minimize gio data fields: the `reminders` table stores `title` (which may contain the name of the deceased) but this field MUST NOT be exposed via any unauthenticated REST endpoint; this data MUST NOT be transferred outside Vietnam before a DPIA (DEC-LUNAR-184, NFR-Privacy/PDPL).
10. MUST provide a client-side `SyncClient` with the strategy: push local -> cloud when there is a change (debounce 2 seconds), pull cloud -> local on app open, retry with exponential backoff on network loss.
11. MUST invalidate the `OccurrenceCache` after each successful cloud pull to ensure the calendar recomputes from the new data (DEC-LUNAR-180).
12. SHOULD include a `DELETE /api/sync/account` endpoint that lets the user delete all cloud data on request per the PDPL right to erasure (PRD Recommendations #6).
13. MUST NOT store `lunarDay`, `lunarMonth`, `isLeapMonth` as unencrypted plain-text when stored in the cloud; SHOULD encrypt sensitive columns at the application level before INSERT (DEC-LUNAR-184).
14. MUST return HTTP 409 when there is a conflict that cannot be resolved automatically, and the client MUST have a fallback mechanism to display last-known-good instead of crashing.

---

## §2 - Why this design (rationale for humans)

**Why is on-device the default and cloud opt-in (DEC-LUNAR-180)?** Gio data is tied to the name and death date of a relative - this is culturally sensitive data under PDPL. Sending it to the cloud without consent is a legal violation even though a startup gets a 5-year grace period for DPIA/DPO. The opt-in design also means the personal MVP (used within one's own family) needs no cloud at all - exactly within the personal/family exemption scope of PDPL.

**Why Supabase/Postgres with RLS instead of a self-built solution (DEC-LUNAR-181)?** Supabase provides RLS on Postgres - meaning access rights are set at the database layer, not dependent on application-layer logic. If there is a bug in the API layer, RLS still blocks unauthorized access. For sensitive data like the name of a deceased person, this is a necessary line of defense.

**Why is sharedWith an array of userId instead of a separate relation table (DEC-LUNAR-182)?** At family scale (usually 2-10 members), an array of userId in a Postgres JSONB column is enough - no complex joins needed. When you need to scale to larger groups in the future, migrating to a relation table is straightforward.

**Why last-write-wins instead of CRDT (DEC-LUNAR-183)?** Users manually editing gio data is much rarer than a shared household accountant. A real conflict is the exception, not the rule. CRDT adds complexity without a clear benefit for this use case. Writing a conflict log is enough to debug when it happens.

**Why an invite token JWT 48h instead of email (DEC-LUNAR-185)?** This app grows on the Zalo platform - sharing a link via Zalo chat or ZNS is more natural and faster than email. Email needs an extra complex step (SMTP setup, spam filter) for a personal interaction app. A 48h TTL is enough for the recipient to respond but short enough to reduce the risk if the link is shared wrongly.

**Why does syncing minimize gio data (DEC-LUNAR-184)?** PDPL provides that the name of a deceased person is data related to another individual. Not transferring it across borders before a DPIA is a legal obligation applying from 01/01/2026. Using Supabase hosting in the Singapore region (ap/southeast-1) reduces the risk but still requires an official DPIA at scale - therefore the DELETE endpoint and the consent-revocation mechanism are mandatory right now (PRD Caveats - PDPL still has unclear points).

---

## §3 - API contract

```typescript
// services/genie-api/lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(userJwt: string): SupabaseClient {
  // Dung anon key + user JWT de RLS hoat dong dung
  // KHONG DUOC dung service_role key o day
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userJwt}` } } }
  );
}
```

```typescript
// services/genie-api/api/sync.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface SyncPushBody {
  reminders: RemindersUpsertRow[];
  deviceId: string;
}

export interface RemindersUpsertRow {
  id: string;               // UUID
  userId: string;
  type: "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
  title: string;            // co the chua ten nguoi da mat - nhan vay o RLS
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number | null;
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE";
  leadTimes: number[];
  notifyTime: string;       // "HH:MM"
  channels: ("LOCAL" | "ZNS" | "PUSH")[];
  linkedContentId: string | null;
  sharedWith: string[];     // mang userId
  enabled: boolean;
  updatedAt: string;        // ISO 8601
}

export interface SyncPullResponse {
  reminders: RemindersUpsertRow[];
  serverTime: string;
  conflictsLogged: number;
}

export interface SharePatchBody {
  reminderId: string;
  action: "add" | "remove";
  targetUserId: string;
}

export interface InviteTokenPayload {
  ownerId: string;
  reminderId: string;
  exp: number;              // Unix timestamp, +48h
  jti: string;              // UUID, single-use
}

// POST /api/sync/push
export async function handlePush(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// GET /api/sync/pull
export async function handlePull(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// PATCH /api/sync/share
export async function handleShare(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// POST /api/sync/invite
export async function handleInvite(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ token: string; expiresAt: string }>;

// POST /api/sync/invite/accept
export async function handleInviteAccept(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;

// DELETE /api/sync/account
export async function handleDeleteAccount(
  req: VercelRequest,
  res: VercelResponse
): Promise<void>;
```

```typescript
// apps/web/lib/sync-client.ts
export interface SyncClientOptions {
  userJwt: string;
  deviceId: string;
  onConflict?: (reminderId: string) => void;
}

export class SyncClient {
  constructor(options: SyncClientOptions);

  // Day thay doi len cloud, debounce 2000ms
  push(reminders: RemindersUpsertRow[]): Promise<void>;

  // Keo du lieu tu cloud ve local
  pull(): Promise<SyncPullResponse>;

  // Chia se mot reminder voi thanh vien
  share(reminderId: string, action: "add" | "remove", targetUserId: string): Promise<void>;

  // Tao invite link
  createInvite(reminderId: string): Promise<{ link: string; expiresAt: string }>;

  // Xoa toan bo du lieu cloud (quyen PDPL)
  deleteCloudData(): Promise<void>;
}
```

```typescript
// apps/web/lib/conflict-resolver.ts
export interface ConflictRecord {
  reminderId: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  resolvedTo: "local" | "cloud";
  deltaMs: number;
}

export function resolveConflict(
  local: RemindersUpsertRow,
  cloud: RemindersUpsertRow
): { winner: RemindersUpsertRow; conflict: ConflictRecord | null };
```

---

## §4 - Acceptance criteria

1. When `consentFlags.cloudSync` is `false` (the default), no request is sent to Supabase - checked via the network log.
2. After the user grants consent via TASK-019 and enables sync, `SyncClient.push()` upserts reminders to Supabase successfully with HTTP 200.
3. The RLS policy blocks: user B CANNOT read user A's reminder if A has not added B to `sharedWith` - returns 0 rows, not 403 (RLS behavior).
4. User A adds user B to the `sharedWith` of a `GIO` reminder -> user B pulls -> B's `SyncPullResponse` contains that reminder.
5. Each member in `sharedWith` receives an independent notification on their own device, not a shared notification.
6. The invite token expires after 48h: accepting after 48h returns HTTP 401.
7. The invite token is single-use: reusing an already-used token returns HTTP 409.
8. Last-write-wins: upserting a record with a newer `updatedAt` overwrites the older record; upserting an older record does not affect the newer record.
9. On a conflict (`updatedAt` differing by < 1 second), the conflict is written to the log but the UI still shows the winning value, with no error dialog.
10. `DELETE /api/sync/account` deletes all reminders, shared_reminder_members, and sync_log of that user, returning HTTP 200.
11. After `deleteCloudData()`, an immediate pull returns an empty `reminders` array.
12. Revoking consent -> `SyncClient` stops pushing/pulling; the cloud data still exists until the user calls `deleteCloudData()` separately.
13. Network loss during push: `SyncClient` retries with exponential backoff (1s, 2s, 4s, max 30s), does not crash the app.
14. The `OccurrenceCache` is cleared after each successful `SyncClient.pull()`.
15. The `title` field of a `GIO` reminder is not exposed via a non-authenticated endpoint (RLS ensures it; tested with an anon request).

---

## §5 - Verification

```typescript
// services/genie-api/test/sync.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveConflict } from "../apps/web/lib/conflict-resolver";

describe("conflict-resolver", () => {
  it("chon ban ghi co updatedAt moi hon", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.000Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T10:00:05.000Z" });
    const { winner, conflict } = resolveConflict(local, cloud);
    expect(winner.updatedAt).toBe(cloud.updatedAt);
    expect(conflict).not.toBeNull();
  });

  it("tra ve conflict null khi khong co xung dot", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.000Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T08:00:00.000Z" });
    const { winner, conflict } = resolveConflict(local, cloud);
    expect(winner.updatedAt).toBe(local.updatedAt);
    expect(conflict).toBeNull();
  });

  it("danh dau conflict khi delta < 1000ms", () => {
    const local = makeReminder({ updatedAt: "2026-06-27T10:00:00.800Z" });
    const cloud = makeReminder({ updatedAt: "2026-06-27T10:00:00.200Z" });
    const { conflict } = resolveConflict(local, cloud);
    expect(conflict).not.toBeNull();
    expect(conflict!.deltaMs).toBeLessThan(1000);
  });
});

describe("SyncClient - push/pull", () => {
  it("khong push khi cloudSync consent = false", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const client = new SyncClient({ userJwt: "tok", deviceId: "dev1" });
    // Simulate consent = false
    await client.push([makeReminder({})]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retry 3 lan khi mang loi truoc khi throw", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
    const client = new SyncClient({ userJwt: "tok", deviceId: "dev1" });
    // consent = true
    await expect(client.push([makeReminder({})])).rejects.toThrow();
    // fetch duoc goi nhieu lan (retry)
    expect((global.fetch as any).mock.calls.length).toBeGreaterThan(1);
  });
});

describe("RLS - integration (requires Supabase test instance)", () => {
  it("user B khong the doc reminder cua A khi khong co sharedWith", async () => {
    // Dung Supabase local docker hoac test project
    const clientA = getSupabaseClient(jwtForUser("userA"));
    const clientB = getSupabaseClient(jwtForUser("userB"));
    const { data: inserted } = await clientA
      .from("reminders")
      .insert(makeReminderRow({ userId: "userA", sharedWith: [] }))
      .select();
    const { data: fetched } = await clientB
      .from("reminders")
      .select("*")
      .eq("id", inserted![0].id);
    expect(fetched).toHaveLength(0);
  });
});
```

---

## §6 - Implementation skeleton

The API contract in §3 is the backbone. Key points to keep in mind when implementing:

```sql
-- services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
-- (xem §8 cho full migration; so migration P3 duoc phan phoi: 0016-0017 TASK-018, 0018 TASK-017, 0019 TASK-019, 0020 TASK-020)
-- Diem chinh: sharedWith luu kieu uuid[] de RLS co the dung ANY()
-- updated_at tu dong cap nhat qua trigger

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Diem then chot cua SyncClient.push():
// 1. Kiem tra consent truoc - neu false, return ngay (DEC-LUNAR-180)
// 2. Debounce 2000ms de gop nhieu thay doi nho
// 3. Upsert voi on_conflict: id -> cap nhat neu updatedAt moi hon
// 4. Clear OccurrenceCache sau khi thanh cong
async push(reminders: RemindersUpsertRow[]): Promise<void> {
  if (!this.hasCloudConsent()) return; // DEC-LUNAR-180
  // ... debounce + upsert
}
```

---

## §7 - Dependencies

Upstream: TASK-LUNAR-004 (the Reminder data model + recurrence engine) - `RemindersUpsertRow` maps directly from TASK-004's `Reminder` model; TASK-018 cannot run without that model.

Downstream: TASK-LUNAR-019 (PDPL compliance consent) - TASK-018 requires consent before enabling the cloud; TASK-019 provides the `consentFlags` that TASK-018 checks. TASK-LUNAR-020 (freemium monetization) - the "family" tier needs TASK-018 to run successfully first.

Cross-cutting: TASK-LUNAR-005 (local notifications) must be re-kicked after each successful cloud pull to recompute the 64 slots. TASK-LUNAR-016 (Zalo Mini App) uses ZNS to share the invite link (DEC-LUNAR-185).

---

## §8 - Example payloads

```sql
-- services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
-- (so migration P3 duoc phan phoi de tranh va cham voi cac task P3 khac: 0016-0017 cho TASK-018, 0018 cho TASK-017, 0019 cho TASK-019, 0020 cho TASK-020)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name  TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'vi-VN',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('RAM','MUNG_MOT','GIO','CUSTOM','FESTIVAL')),
  title             TEXT NOT NULL,
  lunar_day         SMALLINT NOT NULL CHECK (lunar_day BETWEEN 1 AND 30),
  lunar_month       SMALLINT NOT NULL CHECK (lunar_month BETWEEN 1 AND 12),
  lunar_year        SMALLINT,
  is_leap_month     BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence        TEXT NOT NULL CHECK (recurrence IN ('MONTHLY','ANNUAL','ONCE')),
  lead_times        SMALLINT[] NOT NULL DEFAULT '{0}',
  notify_time       TIME NOT NULL DEFAULT '07:00',
  channels          TEXT[] NOT NULL DEFAULT '{LOCAL}',
  linked_content_id TEXT,
  shared_with       UUID[] NOT NULL DEFAULT '{}',
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_shared_with ON reminders USING GIN(shared_with);

CREATE TABLE IF NOT EXISTS invite_tokens (
  jti         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            BIGSERIAL PRIMARY KEY,
  reminder_id   UUID NOT NULL,
  device_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  conflict_data JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

```sql
-- services/genie-api/supabase/migrations/0017_family_sharing_rls.sql

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "owner_all" ON reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Thanh vien shared: chi doc
CREATE POLICY "member_select" ON reminders
  FOR SELECT
  USING (auth.uid() = ANY(shared_with));

-- Anon: khong co gi (mac dinh deny)
```

```json
// Push request body mau
{
  "reminders": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "user-uuid-here",
      "type": "GIO",
      "title": "Gio ba noi",
      "lunarDay": 10,
      "lunarMonth": 3,
      "lunarYear": null,
      "isLeapMonth": false,
      "recurrence": "ANNUAL",
      "leadTimes": [0, 1],
      "notifyTime": "07:00",
      "channels": ["LOCAL", "ZNS"],
      "linkedContentId": "festival-dam-gio",
      "sharedWith": ["member-uuid-1", "member-uuid-2"],
      "enabled": true,
      "updatedAt": "2026-06-27T10:30:00.000Z"
    }
  ],
  "deviceId": "iphone-uuid-device"
}
```

```json
// Pull response mau
{
  "reminders": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "user-uuid-here",
      "type": "GIO",
      "title": "Gio ba noi",
      "lunarDay": 10,
      "lunarMonth": 3,
      "lunarYear": null,
      "isLeapMonth": false,
      "recurrence": "ANNUAL",
      "leadTimes": [0, 1],
      "notifyTime": "07:00",
      "channels": ["LOCAL", "ZNS"],
      "linkedContentId": "festival-dam-gio",
      "sharedWith": ["member-uuid-1", "member-uuid-2"],
      "enabled": true,
      "updatedAt": "2026-06-27T10:30:00.000Z"
    }
  ],
  "serverTime": "2026-06-27T10:35:00.000Z",
  "conflictsLogged": 0
}
```

---

## §9 - Open questions

Resolved:
- Conflict strategy: last-write-wins on `updated_at` (DEC-LUNAR-183) - enough for the small-family use case, no CRDT needed.
- Invite channel: ZNS/copy link, no email needed (DEC-LUNAR-185) - suits the Zalo platform.
- Cloud region: Supabase `ap-southeast-1` (Singapore) - the closest possible for Vietnam, reducing latency; note an official DPIA is still needed when scaling beyond the family.
- RLS strategy: anon key + user JWT instead of service_role - ensures RLS works at the database layer, not only the API layer (DEC-LUNAR-181).

Still deferred:
- End-to-end encryption at the application layer for the `title` of a `GIO` reminder (DEC-LUNAR-184): recorded as SHOULD, but the specific implementation (key management, KMS) is not yet chosen. Will be decided once there is an official DPIA. Deferred to a separate task if needed.
- Real-time sync via Supabase Realtime (WebSocket): currently uses pull-on-open; real-time is a Phase 4 feature if needed.
- Official cross-border DPIA: not yet done; that is why the DELETE endpoint and the consent-revocation mechanism are mandatory right now (PRD Caveats - PDPL still has unclear points).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Push without consent | Check `consentFlags.cloudSync` before calling the API | Return immediately, no push | Not needed - this is the correct behavior |
| Network loss during push | `fetch` throws NetworkError | Retry with exponential backoff (1s, 2s, 4s, max 30s) | Data stays on-device, push again when there is network |
| RLS blocks reading data | Supabase returns 0 rows (not an error) | Pull receives an empty array, UI shows an empty list | Log server-side, check sharedWith |
| `updated_at` conflict | `resolveConflict()` detects a delta < 1s | Last-write-wins, write a conflict log | Not shown in the UI; debug via sync_log |
| Invite token expired | `expires_at < NOW()` | HTTP 401, show "link expired" | Owner creates a new invite |
| Invite token reused | `used_at IS NOT NULL` | HTTP 409 | Owner creates a new invite |
| Supabase down | HTTP 5xx or timeout | SyncClient responds; UI shows "sync failed" | Automatic retry; on-device data still works |
| Wrong RLS policy (bug) | Integration test runs before deploy | Detected at the test stage | Fix the policy, re-deploy the migration |
| Pull returns an invalid reminder | Schema validation on the client | The reminder is skipped, log the error | Handled in the TASK-019 data validation layer |
| Cloud account deletion (PDPL) | DELETE /api/sync/account | Delete all cloud data | On-device data still kept; the user confirms first |
| sharedWith contains a non-existent userId | Foreign key constraint | INSERT is rejected, HTTP 400 | The client must validate the userId before sharing |
| OccurrenceCache not cleared after pull | Unit test checks it | Stale cache, shows the wrong date | Fix sync-client: clear the cache after a successful pull |

---

## §11 - Implementation notes

- The most important point: check consent BEFORE ANYTHING in `SyncClient` - a single line `if (!this.hasCloudConsent()) return;` at the start of the `push()` and `pull()` functions. Without that foundation, all other logic is legally meaningless.
- RLS must be tested with an integration test using two real users (Supabase local docker) before shipping - a mocked unit test can never catch an RLS policy bug.
- `shared_with uuid[]` with a GIN index is the right choice for Postgres: `ANY(shared_with)` in the RLS policy uses the index more efficiently than `@>` with a large array.
- Debounce 2000ms on `push()` is a balance between responsive (data reaches the cloud fast) and reducing request count (avoiding spam when the user edits quickly). This value can be tuned once there is real data.
- The `OccurrenceCache` must be invalidated after a pull because the cache stores computed solar dates - if there is a new reminder from the cloud, the stale cache shows the wrong date. This is the most common cause of the "wrong reminder date" bug after syncing.
- The invite token JWT needs `jti` (JWT ID) to be a unique UUID and must write `used_at` right on accept - you cannot use plain standard JWT expiry alone because single-use enforcement is needed.
- The `title` field containing the name of the deceased: in the future it SHOULD be encrypted at the application layer before INSERT (AES-256-GCM with a key the user holds). This is not implemented yet, but the `title` column is already protected by RLS and is not exposed via the anon endpoint - this is a temporary risk-mitigation measure.
- `DELETE /api/sync/account` needs a clear confirm UI ("All cloud data will be permanently deleted") with no undo - this is a PDPL right the user has, not an optional feature.
- The P3 migration numbers are distributed to avoid collisions: 0016-0017 for TASK-018, 0018 for TASK-017, 0019 for TASK-019, 0020 for TASK-020.

*End of TASK-LUNAR-018.*
