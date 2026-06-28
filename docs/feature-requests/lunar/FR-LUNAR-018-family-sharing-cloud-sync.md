---
id: FR-LUNAR-018
title: "Family sharing + cloud sync - Supabase/Postgres với RLS, sharedWith, đồng bộ đa thiết bị, nhiều thành viên cùng nhận một nhắc giỗ"
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
related_frs: [FR-LUNAR-004, FR-LUNAR-019]
depends_on: [FR-LUNAR-004]
blocks: [FR-LUNAR-019, FR-LUNAR-020]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-F04)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (Sync optional)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#10 (sharedWith, consentFlags)"
source_decisions:
  - DEC-LUNAR-180 (on-device là mặc định bất biến; Supabase/Postgres chỉ được bật sau khi người dùng cấp consent tường minh qua FR-019 - không có consent thì không có cloud)
  - DEC-LUNAR-181 (RLS policy trên bảng reminders đảm bảo hàng chỉ đọc/ghi được bởi owner hoặc thành viên trong sharedWith; backend không bao giờ bypass RLS)
  - DEC-LUNAR-182 (sharedWith lưu mảng userId; mỗi thành viên nhận một bản sao notification độc lập, tính trên thiết bị của họ - không dùng một notification chung)
  - DEC-LUNAR-183 (conflict resolution theo "last-write-wins" trên updated_at; không có CRDT; ghi log mâu thuẫn để debug nhưng không hiện lên UI)
  - DEC-LUNAR-184 (dữ liệu đám giỗ - tên người đã mất, ngày mất - được tối thiểu hóa theo DEC-LUNAR-190; trường `title` chứa tên người đã mất KHÔNG ĐƯỢC gửi ra ngoài VN khi chưa có DPIA)
  - DEC-LUNAR-185 (invite flow dùng token một lần, hết hạn sau 48h; không có email - gửi qua ZNS hoặc copy link)
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
  - "lưu dữ liệu đám giỗ (tên người đã mất) vào cột riêng không mã hóa rồi expose qua REST không RLS (vi phạm DEC-LUNAR-181 / DEC-LUNAR-184)"
  - "bypass RLS bằng cách dùng service_role key ở client (vi phạm DEC-LUNAR-181)"
  - "bật đồng bộ cloud khi chưa nhận consent từ FR-019 (vi phạm DEC-LUNAR-180)"
effort_hours: 12
sub_tasks:
  - "2h: migration SQL 0016 - bảng users, reminders, shared_reminder_members, sync_log; index; RLS enable"
  - "2h: migration SQL 0017 - RLS policies (owner CRUD, member read-only trên shared, anon không có gì)"
  - "1.5h: supabase.ts - Supabase client singleton, auth helper, refresh token; lib/rls-helpers.ts"
  - "1.5h: api/sync.ts - POST /api/sync/push (upsert reminders), GET /api/sync/pull (reminders cho user), PATCH /api/sync/share (thêm/xóa sharedWith)"
  - "1h: lib/invite.ts - tạo invite token (JWT, 48h TTL), validate, resolve thành viên"
  - "1.5h: apps/web/lib/sync-client.ts - SyncClient class: push local -> cloud, pull cloud -> local, debounce, retry exponential backoff"
  - "1.5h: apps/web/lib/conflict-resolver.ts - last-write-wins trên updated_at, ghi conflict log, unit test"
  - "1h: apps/web/lib/storage.ts - mở rộng StorageAdapter kết nối SyncClient khi cloud enabled"
risk_if_skipped: "FR-F04 (family sharing) là một trong những lý do chính để người dùng thương mại trả phí premium - không có FR-018 thì không có multi-member shared giỗ và FR-019 (PDPL layer) thiếu cơ sở hạ tầng cloud để enforce consent. FR-020 (freemium) cũng blocks vì tier 'family' cần FR-018. Nếu bỏ qua, cơ sở bán thương mại bị gãy."
---

## §1 - Description (BCP-14 normative)

Tính năng này mở rộng mô hình lưu trữ on-device của FR-LUNAR-004 lên một tầng cloud tùy chọn, dùng Supabase/Postgres với Row Level Security, để nhiều thành viên cùng gia đình có thể cùng nhận một nhắc đám giỗ và đồng bộ nhắm nhắn trên nhiều thiết bị. Luôn phải lấy consent trước (FR-019) trước khi bật bất kỳ quá trình nào gửi dữ liệu lên cloud.

1. PHẢI giữ on-device làm mặc định bất biến: khi người dùng chưa cấp consent cloud (theo FR-019), mọi dữ liệu PHẢI ở lại trên thiết bị và KHÔNG ĐƯỢC gửi lên Supabase (DEC-LUNAR-180).
2. PHẢI chỉ bật đồng bộ cloud sau khi người dùng cấp `consentFlags.cloudSync = true` qua luồng consent của FR-019; việc thu hồi consent PHẢI tắt đồng bộ ngay lập tức và có thể kích hoạt xóa dữ liệu trên cloud theo yêu cầu (DEC-LUNAR-180).
3. PHẢI sử dụng Supabase/Postgres với RLS bật trên mọi bảng; `service_role` key KHÔNG ĐƯỢC sử dụng ở client - chỉ ở server (DEC-LUNAR-181).
4. PHẢI áp dụng RLS policy: owner của một `Reminder` có full CRUD; thành viên trong `sharedWith` chỉ có READ trên hàng đó; mọi request không xác thực bị từ chối hoàn toàn (DEC-LUNAR-181).
5. PHẢI lưu `sharedWith` là mảng `userId`; mỗi thành viên trong mảng PHẢI nhận một bản sao notification độc lập, được tính và lên lịch trên thiết bị của chính họ qua FR-LUNAR-005 (DEC-LUNAR-182).
6. PHẢI thực hiện invite flow: owner tạo `invite_token` (JWT, TTL 48h) và chia sẻ link/ZNS; người nhận click link -> xác thực -> được thêm vào `sharedWith`; token hết hạn sau 48h và chỉ dùng một lần (DEC-LUNAR-185).
7. PHẢI giải quyết xung đột theo "last-write-wins" dựa trên trường `updated_at`; bản ghi có `updated_at` mới hơn PHẢI ghi đè bản ghi cũ trong mọi trường hợp (DEC-LUNAR-183).
8. PHẢI ghi conflict log khi phát hiện xung đột (hai bản ghi có `updated_at` sai lệch < 1 giây) để debug, nhưng KHÔNG ĐƯỢC hiện log này lên UI người dùng (DEC-LUNAR-183).
9. PHẢI tối thiểu hóa trường dữ liệu đám giỗ: bảng `reminders` lưu `title` (có thể chứa tên người đã mất) nhưng trường này KHÔNG ĐƯỢC expose qua bất kỳ REST endpoint nào không xác thực; KHÔNG ĐƯỢC chuyển dữ liệu này ra ngoài Việt Nam khi chưa có DPIA (DEC-LUNAR-184, NFR-Privacy/PDPL).
10. PHẢI cung cấp `SyncClient` ở client-side với chiến lược: push local -> cloud khi có thay đổi (debounce 2 giây), pull cloud -> local khi mở app, retry exponential backoff khi mất mạng.
11. PHẢI đồng bộ `OccurrenceCache` bị vô hiệu sau mỗi lần pull cloud thành công để đảm bảo lịch tính lại từ dữ liệu mới (DEC-LUNAR-180).
12. NÊN bao gồm endpoint `DELETE /api/sync/account` cho phép người dùng xóa toàn bộ dữ liệu trên cloud theo yêu cầu quyền xóa PDPL (PRD Recommendations #6).
13. KHÔNG ĐƯỢC lưu `lunarDay`, `lunarMonth`, `isLeapMonth` ở dạng plain-text không mã hóa khi lưu trên cloud; NÊN mã hóa cột nhạy cảm ở mức ứng dụng trước khi INSERT (DEC-LUNAR-184).
14. PHẢI trả về HTTP 409 khi có xung đột không tự động giải quyết được và client PHẢI có cơ chế fallback hiển thị last-known-good thay vì crash.

---

## §2 - Why this design (rationale for humans)

**Tại sao on-device là mặc định và cloud là opt-in (DEC-LUNAR-180)?** Dữ liệu đám giỗ gắn liền với tên và ngày mất của người thân - đây là dữ liệu nhạy cảm văn hóa theo PDPL. Gửi nó lên cloud mà không có consent là vi phạm pháp lý ngay cả khi startup được ân hạn 5 năm với DPIA/DPO. Thiết kế opt-in cũng có nghĩa là bản MVP cá nhân (dùng riêng gia đình) hoàn toàn không cần cloud - đúng đúng phạm vi miễn trừ cá nhân/gia đình của PDPL.

**Tại sao Supabase/Postgres với RLS thay vì giải pháp tự xây (DEC-LUNAR-181)?** Supabase cung cấp RLS trên Postgres - có nghĩa quyền truy cập được thiết lập ở tầng cơ sở dữ liệu, không phụ thuộc vào logic tầng ứng dụng. Nếu có lỗi ở API layer, RLS vẫn chặn truy cập trái phép. Đối với dữ liệu nhạy cảm như tên người đã mất, đây là lớp phòng thủ cần thiết.

**Tại sao sharedWith là mảng userId thay vì bảng quan hệ riêng (DEC-LUNAR-182)?** Với quy mô gia đình (thường 2-10 thành viên), mảng userId trong cột JSONB của Postgres là đủ - không cần join phức tạp. Khi cần scale lên nhóm lớn hơn trong tương lai, migration sang bảng quan hệ là thẳng thắn.

**Tại sao last-write-wins thay vì CRDT (DEC-LUNAR-183)?** Người dùng thủ công chỉnh sửa dữ liệu đám giỗ hiếm hơn nhiều so với cả người kế toán chung. Xung đột thực sự là ngoại lệ, không phải quy luật. CRDT thêm độ phức tạp mà không có lợi ích rõ ràng cho use case này. Ghi conflict log là đủ để debug khi nó xảy ra.

**Tại sao invite token JWT 48h thay vì email (DEC-LUNAR-185)?** App này phát triển trên nền tảng Zalo - chia sẻ link qua Zalo chat hay ZNS là tự nhiên hơn và nhanh hơn email. Email cần thêm một bước phức tạp (SMTP setup, spam filter) cho một app tương tác cá nhân. TTL 48h là đủ để người nhận phản hồi nhưng ngắn hạn để giảm rủi ro nếu link bị chia sẻ sai.

**Tại sao đồng bộ tối thiểu hóa dữ liệu đám giỗ (DEC-LUNAR-184)?** PDPL pháp định rằng tên người đã mất là dữ liệu liên quan đến cá nhân khác. Không chuyển qua biên giới khi chưa DPIA là nghĩa vụ pháp lý áp dụng ngay từ 01/01/2026. Dùng hosting Supabase tại khu vực Singapore (ap/southeast-1) giảm rủi ro nhưng vẫn cần DPIA chính thức khi scale - do đó endpoint DELETE và cơ chế hủy consent là bắt buộc ngay bây giờ (PRD Caveats - PDPL còn điểm chưa rõ).

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

1. Khi `consentFlags.cloudSync` là `false` (mặc định), không có request nào được gửi đến Supabase - kiểm tra bằng network log.
2. Sau khi người dùng cấp consent qua FR-019 và bật đồng bộ, `SyncClient.push()` upsert reminders lên Supabase thành công với HTTP 200.
3. RLS policy chặn: user B KHÔNG THỂ đọc reminder của user A nếu A chưa thêm B vào `sharedWith` - trả về 0 hàng, không phải 403 (behavior của RLS).
4. User A thêm user B vào `sharedWith` của một `GIO` reminder -> user B pull -> `SyncPullResponse` của B chứa reminder đó.
5. Mỗi thành viên trong `sharedWith` nhận notification độc lập trên thiết bị của chính họ, không phải notification chung.
6. Invite token hết hạn sau 48h: accept sau 48h trả về HTTP 401.
7. Invite token chỉ dùng một lần: dùng lại token đã sử dụng trả về HTTP 409.
8. Last-write-wins: upsert bản ghi với `updatedAt` mới hơn ghi đè bản ghi cũ; upsert bản ghi cũ hơn không ảnh hưởng bản ghi mới hơn.
9. Khi xung đột (`updatedAt` sai lệch < 1 giây), conflict được ghi vào log nhưng UI vẫn hiển thị giá trị thắng cuộc, không có dialog báo lỗi.
10. `DELETE /api/sync/account` xóa toàn bộ reminders, shared_reminder_members và sync_log của user đó, trả về HTTP 200.
11. Sau `deleteCloudData()`, pull ngay lập tức trả về mảng `reminders` rỗng.
12. Thu hồi consent -> `SyncClient` ngừng push/pull; dữ liệu trên cloud vẫn tồn tại cho đến khi người dùng gọi `deleteCloudData()` riêng.
13. Mất mạng khi push: `SyncClient` retry với exponential backoff (1s, 2s, 4s, tối đa 30s), không crash app.
14. `OccurrenceCache` bị clear sau mỗi lần `SyncClient.pull()` thành công.
15. Trường `title` của reminder type `GIO` không được lộ ra qua endpoint non-authenticated (RLS đảm bảo; test bằng anon request).

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

API contract ở §3 là xương sống. Điểm then chốt cần lưu ý khi implement:

```sql
-- services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
-- (xem §8 cho full migration; so migration P3 duoc phan phoi: 0016-0017 FR-018, 0018 FR-017, 0019 FR-019, 0020 FR-020)
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

Upstream: FR-LUNAR-004 (Reminder data model + recurrence engine) - `RemindersUpsertRow` map trực tiếp từ model `Reminder` của FR-004; FR-018 không thể chạy mà không có model đó.

Downstream: FR-LUNAR-019 (PDPL compliance consent) - FR-018 yêu cầu consent trước khi bật cloud; FR-019 cung cấp `consentFlags` mà FR-018 check. FR-LUNAR-020 (freemium monetization) - tier "family" cần FR-018 chạy thành công trước.

Cross-cutting: FR-LUNAR-005 (local notifications) phải được kick lại sau mỗi lần pull cloud thành công để tái tính 64 slot. FR-LUNAR-016 (Zalo Mini App) dùng ZNS để chia sẻ invite link (DEC-LUNAR-185).

---

## §8 - Example payloads

```sql
-- services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
-- (so migration P3 duoc phan phoi de tranh va cham voi cac FR P3 khac: 0016-0017 cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020)

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

Đã giải quyết:
- Conflict strategy: last-write-wins trên `updated_at` (DEC-LUNAR-183) - đủ cho use case gia đình nhỏ, không cần CRDT.
- Invite channel: ZNS/copy link, không cần email (DEC-LUNAR-185) - phù hợp nền tảng Zalo.
- Cloud region: Supabase `ap-southeast-1` (Singapore) - gần nhất có thể cho Việt Nam, giảm độ trễ; lưu ý vẫn cần DPIA chính thức khi scale ra ngoài gia đình.
- RLS strategy: anon key + user JWT thay vì service_role - đảm bảo RLS hoạt động ở tầng database, không chỉ tầng API (DEC-LUNAR-181).

Còn hoãn (defer):
- End-to-end encryption ở tầng ứng dụng cho `title` của `GIO` reminder (DEC-LUNAR-184): đã ghi nhận là NÊN, nhưng implementation cụ thể (key management, KMS) chưa chọn. Sẽ quyết định khi có DPIA chính thức. Hoãn sang một FR riêng nếu cần.
- Real-time sync qua Supabase Realtime (WebSocket): hiện tại dùng pull-on-open; real-time là tính năng Phase 4 nếu cần.
- Cross-border DPIA chính thức: chưa có; đó là lý do endpoint DELETE và cơ chế thu hồi consent là bắt buộc ngay bây giờ (PRD Caveats - PDPL còn điểm chưa rõ).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Push khi chưa có consent | Check `consentFlags.cloudSync` trước gọi API | Return ngay, không push | Không cần - là behavior chính xác |
| Mất mạng khi push | `fetch` throw NetworkError | Retry exponential backoff (1s, 2s, 4s, max 30s) | Dữ liệu vẫn on-device, push lại khi có mạng |
| RLS chặn đọc dữ liệu | Supabase trả về 0 hàng (không phải lỗi) | Pull nhận mảng rỗng, UI hiện danh sách rỗng | Log server-side, kiểm tra sharedWith |
| Xung đột `updated_at` | `resolveConflict()` phát hiện delta < 1s | Last-write-wins, ghi conflict log | Không hiện UI; debug qua sync_log |
| Invite token hết hạn | `expires_at < NOW()` | HTTP 401, hiện thông báo "link hết hạn" | Owner tạo invite mới |
| Invite token dùng lại | `used_at IS NOT NULL` | HTTP 409 | Owner tạo invite mới |
| Supabase down | HTTP 5xx hoặc timeout | SyncClient trả lời; UI hiện "đồng bộ thất bại" | Retry tự động; dữ liệu on-device vẫn hoạt động |
| RLS policy sai (bug) | Integration test chạy trước deploy | Phát hiện ở test stage | Fix policy, re-deploy migration |
| Pull trả về reminder không hợp lệ | Schema validation ở client | Reminder bị bỏ qua, log lỗi | Xử lý ở FR-019 data validation layer |
| Xóa tài khoản cloud (PDPL) | DELETE /api/sync/account | Xóa toàn bộ dữ liệu cloud | Dữ liệu on-device vẫn giữ; người dùng xác nhận trước |
| sharedWith chứa userId không tồn tại | Foreign key constraint | INSERT bị reject, HTTP 400 | Client phải validate userId trước khi share |
| OccurrenceCache không bị clear sau pull | Unit test kiểm tra | Cache cũ, hiện ngày sai | Fix sync-client: clear cache sau pull thành công |

---

## §11 - Implementation notes

- Điểm quan trọng nhất: check consent TRƯỚC MỌI GÌ ở `SyncClient` - một dòng `if (!this.hasCloudConsent()) return;` ở đầu hàm `push()` và `pull()`. Không có nền mọi logic khác là vô nghĩa về mặt pháp lý.
- RLS phải được test bằng integration test với hai user thật (Supabase local docker) trước khi ship - unit test mock không bao giờ được bug RLS policy.
- `shared_with uuid[]` với GIN index là chọn đúng cho Postgres: `ANY(shared_with)` trong RLS policy sử dụng index hiệu quả hơn `@>` với mảng lớn.
- Debounce 2000ms trên `push()` là cân bằng giữa responsive (dữ liệu lên cloud nhanh) và giảm số request (tránh spam khi người dùng chỉnh sửa nhanh). Giá trị này có thể tune sau khi có data thực.
- `OccurrenceCache` phải bị invalidate sau pull vì cache lưu ngày dương đã tính - nếu có reminder mới từ cloud, cache cũ cho ngày sai. Đây là nguyên nhân phổ biến nhất của bug "nhắc sai ngày" sau đồng bộ.
- Invite token JWT cần `jti` (JWT ID) là UUID duy nhất và phải ghi `used_at` ngay khi accept - không thể dùng JWT standard expiry đơn thuần vì cần single-use enforcement.
- Trường `title` chứa tên người đã mất: trong tương lai nên mã hóa ở tầng ứng dụng trước khi INSERT (AES-256-GCM với key do user giữ). Hiện tại chưa implement nhưng cột `title` đã được RLS bảo vệ và không expose qua anon endpoint - đây là biện pháp giảm thiểu rủi ro tạm thời.
- `DELETE /api/sync/account` cần confirm UI rõ ràng ("Toàn bộ dữ liệu trên cloud sẽ bị xóa vĩnh viễn") và không có undo - đây là quyền PDPL người dùng có, không phải tính năng tùy chọn.
- So migration P3 duoc phan phoi de tranh va cham: 0016-0017 danh cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020.

*Hết FR-LUNAR-018.*
