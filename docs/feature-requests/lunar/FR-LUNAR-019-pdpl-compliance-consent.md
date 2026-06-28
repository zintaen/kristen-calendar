---
id: FR-LUNAR-019
title: "PDPL compliance layer - privacy policy tiếng Việt, consent granular, mặc định on-device, tối thiểu hóa dữ liệu, không chuyển xuyên biên giới khi chưa DPIA"
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
related_frs: [FR-LUNAR-018]
depends_on: [FR-LUNAR-016, FR-LUNAR-018]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#5 (NFR-Privacy/PDPL)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 Key Findings 8 (PDPL)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Recommendations 6 (PDPL action)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#Caveats (PDPL còn điểm chưa rõ)"
source_decisions:
  - DEC-LUNAR-190 (Luật Bảo vệ Dữ liệu Cá nhân Law No. 91/2025/QH15 thông qua 26/6/2025, hiệu lực 01/01/2026; Nghị định 356/2025/ND-CP ban hành 31/12/2025 thay thế Decree 13/2023; startup có ân hạn 5 năm cho DPIA/DPO nhưng nghĩa vụ consent áp dụng ngay)
  - DEC-LUNAR-191 (xử lý dữ liệu cho mục đích cá nhân/gia đình được miễn trừ PDPL - bản MVP cá nhân nằm ngoài phạm vi; bản thương mại (Phase 3+) thu thập dữ liệu ngoài gia đình không được miễn trừ và PHẢI tuân thủ đầy đủ)
  - DEC-LUNAR-192 (tên người đã mất trong đám giỗ là dữ liệu nhạy cảm văn hóa: KHÔNG ĐƯỢC bán, KHÔNG ĐƯỢC chuyển xuyên biên giới khi chưa có DPIA chính thức; tối thiểu hóa - chỉ thu thập trường cần thiết)
  - DEC-LUNAR-193 (consentFlags là mô hình granular: mỗi loại xử lý dữ liệu có cờ riêng; thu hồi một consent KHÔNG ảnh hưởng consent khác; lưu timestamp và version chính sách)
  - DEC-LUNAR-194 (mức phạt PDPL: chuyển dữ liệu xuyên biên giới sai lên đến 5% doanh thu năm trước; mua bán dữ liệu trái phép lên đến 10x lợi bất chính; vi phạm khác trần 3 tỷ VND - đây là ngưỡng pháp lý thiết kế phải nằm dưới)
  - DEC-LUNAR-195 (privacy policy bằng tiếng Việt, ngôn ngữ đơn giản không pháp lý, hiển thị trước khi bất kỳ thu thập dữ liệu nào xảy ra; cập nhật khi pháp luật thay đổi)
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
  - "thu thập dữ liệu ngoài gia đình mà không có consent granular trước (vi phạm DEC-LUNAR-190 / PDPL hiệu lực 01/01/2026)"
  - "chuyển dữ liệu người đã mất xuyên biên giới khi chưa có DPIA (vi phạm DEC-LUNAR-192 / DEC-LUNAR-194)"
  - "bán hoặc chia sẻ consentFlags với bên thứ ba (vi phạm DEC-LUNAR-192)"
effort_hours: 9
sub_tasks:
  - "1.5h: lib/consent.ts - ConsentFlags interface, validateConsent(), revokeConsent(), getConsentVersion(); lưu timestamp + policy_version"
  - "1h: lib/data-minimization.ts - stripSensitiveFields() cho GIO reminder trước khi log/send to AI; checkCrossBorderTransfer()"
  - "1.5h: api/consent.ts - POST /api/consent (cấp consent), DELETE /api/consent/:type (thu hồi), GET /api/consent (lấy trạng thái)"
  - "1h: migration 0018 - bảng consent_log (userId, type, action, policy_version, timestamp, ip_hash)"
  - "1.5h: apps/web/components/ConsentModal.tsx - UI granular: checkbox riêng cho mỗi loại xử lý, link privacy policy, không có dark pattern"
  - "1.5h: apps/web/components/PrivacyPolicy.tsx - nội dung tiếng Việt, ngôn ngữ đơn giản, liệt kê rõ loại dữ liệu, mục đích, thời gian lưu, quyền người dùng, thông tin liên hệ CyberSkill"
  - "1h: apps/web/lib/consent-store.ts - lưu consentFlags on-device (localStorage + sync với cloud khi đã bật), check trước mọi thu thập"
risk_if_skipped: "PDPL hiệu lực 01/01/2026 áp dụng ngay cho nghĩa vụ consent - bỏ qua FR-019 ở Phase 3 thương mại là kinh doanh trái pháp luật, ngăn FR-018 (cloud sync) hoạt động hợp lệ vì thiếu lớp consent. Mức phạt lên đến 5% doanh thu và 3 tỷ VND là rủi ro kinh doanh nghiêm trọng cho startup. Không có consent granular thì không thể thu hồi riêng từng loại xử lý khi có yêu cầu pháp lý."
---

## §1 - Description (BCP-14 normative)

FR-019 xây dựng lớp tuân thủ PDPL (Law No. 91/2025/QH15, hiệu lực 01/01/2026) cho bản thương mại của "Genie Âm Lịch". Mục tiêu là đảm bảo mọi việc thu thập dữ liệu ngoài phạm vi gia đình đều có consent trước, rõ ràng, granular, và có thể thu hồi được - trong khi bản MVP cá nhân vẫn hoạt động đầy đủ không bị ảnh hưởng.

1. PHẢI nhận biết ngưỡng miễn trừ: bản MVP cá nhân/gia đình thuần túy ĐƯỢC MIỄN TRỪ PDPL (DEC-LUNAR-191); tuy nhiên hệ thống PHẢI thiết kế sẵn khả năng tuân thủ để bản thương mại Phase 3 không cần rewrite cơ bản (PRD NFR-Privacy/PDPL).
2. PHẢI hiển thị privacy policy bằng **tiếng Việt, ngôn ngữ đơn giản** (không phải văn bản pháp lý khó hiểu) trước khi bất kỳ thu thập dữ liệu nào ở bản thương mại xảy ra; privacy policy PHẢI ghi rõ: loại dữ liệu thu thập, mục đích xử lý, thời gian lưu giữ, quyền của người dùng (truy cập, chỉnh sửa, xóa, thu hồi), thông tin liên hệ của CyberSkill (DEC-LUNAR-195).
3. PHẢI thực hiện `consentFlags` granular: tối thiểu gồm các cờ `cloudSync`, `genieAI`, `znsReminder`, `analyticsUsage`; mỗi cờ là một toggle độc lập; thu hồi một cờ KHÔNG ĐƯỢC ảnh hưởng cờ khác (DEC-LUNAR-193).
4. PHẢI lưu từng sự kiện consent (cấp, thu hồi, chính sách version) vào bảng `consent_log` với timestamp và hash của IP - đây là năng lực audit đối với PDPL (DEC-LUNAR-193).
5. PHẢI cập nhật `consentFlags.cloudSync` về `false` ngay lập tức khi người dùng thu hồi, và FR-LUNAR-018 `SyncClient` PHẢI ngừng push/pull ngay (DEC-LUNAR-180 + DEC-LUNAR-193).
6. PHẢI áp dụng data minimization cho dữ liệu đám giỗ: `lib/data-minimization.ts` có hàm `stripSensitiveFields()` loại bỏ trường `title` (có thể chứa tên người đã mất) trước khi dữ liệu được gửi đến AI Genie (FR-015) hoặc ghi vào any log (DEC-LUNAR-192).
7. KHÔNG ĐƯỢC chuyển dữ liệu người đã mất (bất kỳ trường nào của `GIO` reminder, đặc biệt `title`) ra ngoài lãnh thổ Việt Nam khi chưa có DPIA chính thức, kể cả khi hosting ở Singapore (DEC-LUNAR-192, DEC-LUNAR-194).
8. PHẢI có hàm `checkCrossBorderTransfer(dataType, destination)` trả về `allowed: boolean` - tất cả endpoint gửi dữ liệu ra ngoài PHẢI gọi hàm này trước; nếu `allowed = false`, request PHẢI bị chặn và ghi log (DEC-LUNAR-192).
9. PHẢI cung cấp endpoint `GET /api/consent` cho người dùng lấy toàn bộ lịch sử consent của họ (quyền truy cập PDPL); `DELETE /api/consent/:type` để thu hồi từng loại.
10. KHÔNG ĐƯỢC sử dụng "dark pattern" trong ConsentModal: tất cả checkbox PHẢI bắt đầu ở trạng thái unchecked; không có pre-checked bộ, không có ngôn ngữ mơ hồ; nút "Từ chối tất cả" PHẢI dễ tìm và có kích thước tương đương nút "Đồng ý" (DEC-LUNAR-195).
11. PHẢI lưu `consentFlags` on-device trong `consent-store.ts` (localStorage) và đồng bộ lên cloud consent_log khi người dùng đã bật `cloudSync`; khi offline, check local trước.
12. NÊN lưu `policy_version` (string semver, ví dụ "1.0.0") cùng với consent để biết khi nào cần yêu cầu lại consent nếu chính sách thay đổi (DEC-LUNAR-195).
13. KHÔNG ĐƯỢC chia sẻ, bán, hoặc cung cấp `consentFlags` hay dữ liệu xử lý cho bất kỳ bên thứ ba nào - kể cả đối tác phân tích (DEC-LUNAR-192); nếu cần phân tích, chỉ dùng dữ liệu tổng hợp đã loại danh tính.
14. PHẢI có `PrivacyPolicy.tsx` có thể hiển thị trong app và liên kết truy cập được từ ConsentModal và từ menu Settings; nội dung PHẢI được cập nhật trước khi bất kỳ thay đổi pháp luật PDPL có hiệu lực.

---

## §2 - Why this design (rationale for humans)

**Tại sao phân biệt rõ bản cá nhân (miễn trừ) và bản thương mại (không miễn trừ) (DEC-LUNAR-191)?** PDPL khẳng định rõ "xử lý dữ liệu cho mục đích cá nhân hoặc gia đình" là miễn trừ. Điều này có nghĩa bản MVP (với vợ founder, dùng riêng gia đình) hoàn toàn nằm ngoài phạm vi - FR-019 không cần thiết cho Phase 1 và 2. Nhưng ngay khi có người thứ ba đăng ký (bản thương mại Phase 3), miễn trừ hết hiệu lực. Thiết kế phân biệt này tránh việc "over-engineer" cho bản cá nhân trong khi vẫn có thể tuân thủ khi scale.

**Tại sao consent granular (4 cờ) thay vì một "Đồng ý tất cả" (DEC-LUNAR-193)?** PDPL yêu cầu consent phải "cụ thể, rõ ràng, và có thể thu hồi được". Một checkbox "Đồng ý điều khoản dịch vụ" không đủ cụ thể. Người dùng có thể đồng ý nhận ZNS nhưng không muốn dữ liệu được dùng cho analytics. Granular consent cũng đảm bảo khi một cờ bị thu hồi (ví dụ người dùng tắt AI Genie), các tính năng khác (ví dụ cloud sync) vẫn hoạt động bình thường - không có hiệu ứng domino.

**Tại sao tên người đã mất là trường hợp đặc biệt cần data minimization (DEC-LUNAR-192)?** PDPL điều 2 định nghĩa "dữ liệu cá nhân nhạy cảm" gồm dữ liệu liên quan đến "nhân thân, lịch sử cá nhân". Tên và ngày mất của người đã mất là dữ liệu liên quan trực tiếp đến cá nhân khác (người đã mất), và là dữ liệu cố hữu nhất của gia đình Việt Nam. Gửi trường `title` ("Giỗ bà nội Nguyễn Thị X") lên AI Genie là không cần thiết - Genie chỉ cần biết "đây là GIO reminder" để trả lời, không cần tên cụ thể. `stripSensitiveFields()` cắt bỏ trường này ở tầng API trước khi tiếp xuyên với bất kỳ service bên ngoài.

**Tại sao `checkCrossBorderTransfer()` là một hàm kiểm tra tường minh (DEC-LUNAR-192, DEC-LUNAR-194)?** Mức phạt 5% doanh thu năm trước cho chuyển dữ liệu xuyên biên giới sai là mức phạt rất lớn ngay cả với startup. Thay vì tin vào tác giả FR sau nhớ quy tắc, một hàm explicit tạo ra một "kiểm tra bắt buộc" mà mọi endpoint mới PHẢI gọi - giống như cổng vào. Log khi `allowed = false` là bằng chứng audit nếu có thanh tra.

**Tại sao không dark pattern trong ConsentModal (DEC-LUNAR-195)?** PDPL điều 11 yêu cầu consent phải "tự nguyện" và "có thể từ chối mà không bị thiệt thòi". Pre-checked box hay nút "Đồng ý" nổi bật hơn "Từ chối" là dark pattern vi phạm điều kiện "tự nguyện" này. Ngoài ra, dân ứng dụng Việt Nam ngày càng nhận biết dark pattern sau nhiều vụ scandal dữ liệu - thiết kế sạch sẽ xây dựng lợi tín.

**Tại sao lưu `policy_version` (DEC-LUNAR-195)?** PDPL và Nghị định 356/2025 vẫn có những điểm chưa rõ và sẽ có sửa đổi. Khi pháp luật thay đổi, cần yêu cầu lại consent với chính sách mới. `policy_version` cho biết ai đã đồng ý với phiên bản nào - tránh phải yêu cầu lại tất cả người dùng khi chỉ có một nửa thay đổi nhỏ.

---

## §3 - API contract

```typescript
// services/genie-api/lib/consent.ts

export const CONSENT_POLICY_VERSION = "1.0.0";

export interface ConsentFlags {
  cloudSync: boolean;       // FR-018 Supabase sync
  genieAI: boolean;         // FR-015 Claude proxy
  znsReminder: boolean;     // FR-017 ZNS
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

1. Khi người dùng lần đầu vào bản thương mại, `ConsentModal` hiện ra trước bất kỳ hành động nào thu thập dữ liệu; bỏ qua modal mà không chọn gì vẫn cho phép dùng app ở chế độ on-device (không có cloud, không có AI, không có ZNS).
2. Tất cả checkbox trong `ConsentModal` bắt đầu ở trạng thái unchecked; không có pre-selected option; nút "Từ chối tất cả" và "Xác nhận lựa chọn" có kích thước ngang nhau - kiểm tra bằng visual snapshot test.
3. Cấp `cloudSync = true` -> `ConsentStore.setFlag()` lưu localStorage; `SyncClient` bắt đầu push/pull.
4. Thu hồi `cloudSync` -> `ConsentStore.setFlag()` cập nhật; `SyncClient` ngừng push/pull trong vòng <= 1 request tiếp theo.
5. Thu hồi `genieAI` KHÔNG ảnh hưởng `cloudSync` - kiểm tra hai flag độc lập nhau trong `ConsentStore`.
6. Mỗi sự kiện cấp/thu hồi consent được ghi vào bảng `consent_log` với `timestamp`, `policy_version`, và `ip_hash`; `ip_hash` là SHA-256 của IP, không có IP rõ.
7. `GET /api/consent` trả về lịch sử consent đầy đủ cho user đã xác thực; request không xác thực bị từ chối với HTTP 401.
8. `DELETE /api/consent/cloudSync` trả về HTTP 200 và `consentFlags.cloudSync` chuyển về `false` trong cả localStorage lẫn cloud.
9. `stripSensitiveFields()` trên một `GIO` reminder có `title = "Gio ba noi"` trả về object không có trường `title` và có `titleRedacted = true`.
10. `checkCrossBorderTransfer("gio_reminder", "us-east-1")` khi chưa có DPIA trả về `{ allowed: false, dpiaPending: true }`.
11. `checkCrossBorderTransfer("analytics_aggregate", "sg-ap-southeast-1")` với dữ liệu tổng hợp đã loại danh tính trả về `{ allowed: true }`.
12. `api/genie.ts` phải gọi `stripSensitiveFields()` trước khi truyền bất kỳ trường reminder nào vào system prompt của Claude; kiểm tra bằng unit test mock.
13. `PrivacyPolicy.tsx` hiển thị đầy đủ: loại dữ liệu, mục đích, thời gian lưu, quyền người dùng (truy cập/chỉnh sửa/xóa/thu hồi), thông tin liên hệ CyberSkill; sẵn sàng hiển thị bằng tiếng Việt.
14. `policy_version` được lưu cùng với consent; khi `CONSENT_POLICY_VERSION` tăng lên (ví dụ "1.1.0"), hệ thống phát hiện người dùng có `policyVersion = "1.0.0"` và hiện lại `ConsentModal`.
15. Bản MVP cá nhân (Phase 1, 2) chạy đầy đủ không hiện `ConsentModal` - vì mặc định là on-device và miễn trừ PDPL.
16. `GET /api/consent` và tất cả các endpoint phát ra `consentFlags` hoặc `consent_log` KHÔNG BAO GỜ trả về dữ liệu consent của người dùng khác và KHÔNG bao gồm thông tin `consentFlags` trong response của bất kỳ API bên thứ ba nào - kiểm tra bằng unit test mock trên handler, xác nhận response body không chứa `consentFlags` object trong payload gửi ra ngoài (DEC-LUNAR-192, §1 #13).

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

API contract ở §3 là xương sống. Hai điểm then chốt:

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

Upstream: FR-LUNAR-016 (Zalo Mini App) - người dùng Zalo Mini App cần consent riêng cho ZNS; `consentFlags.znsReminder` được set qua luồng này trước khi FR-017 gửi bất kỳ ZNS nào. FR-LUNAR-018 (family sharing cloud sync) - FR-018 `SyncClient` phụ thuộc `consentFlags.cloudSync` từ FR-019 để quyết định có push/pull hay không.

Downstream: FR-019 không blocks FR nào nhưng là điều kiện tiên quyết để mọi thu thập dữ liệu ở Phase 3 là hợp pháp. Mọi FR Phase 3 gửi dữ liệu ra ngoài thiết bị (016, 017, 018, 020) PHẢI tham chiếu `ConsentStore` trc khi hành động.

Cross-cutting: FR-LUNAR-015 (AI Genie) PHẢI gọi `stripSensitiveFields()` trước khi truyền reminder content vào Claude prompt. FR-LUNAR-017 (ZNS) PHẢI check `consentFlags.znsReminder` trước khi gửi bất kỳ tin nhắn nào.

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

Đã giải quyết:
- Miễn trừ cá nhân/gia đình: xác nhận rõ điều kiện (DEC-LUNAR-191) - bản MVP Phase 1, 2 không cần FR-019 hoạt động tích cực; AC #15 kiểm tra điều này.
- Mức phạt cụ thể: DEC-LUNAR-194 ghi lại 3 mức phạt từ PRD Key Findings 8 - đây là các ngưỡng pháp lý thiết kế phải nằm dưới.
- granular consent: 4 loại (cloudSync, genieAI, znsReminder, analyticsUsage) là đủ cho Phase 3 ban đầu.
- Dark pattern: định nghĩa rõ trong §1 #10 và §5 test.

Còn hoãn (defer):
- DPIA chính thức: startup có ân hạn 5 năm (DEC-LUNAR-190), nhưng cần thực hiện trước khi scale xuyên biên giới (DEC-LUNAR-192). Mô tả như điều kiện tiên quyết cho chuyển dữ liệu sang destination ngoài "sg-ap-southeast-1" - tham vấn pháp lý là bước bắt buộc, ngoài phạm vi FR này.
- DPO (Data Protection Officer): startup có ân hạn 5 năm (DEC-LUNAR-190); chỉ bắt buộc khi xóa bỏ ân hạn. Tích vào lịch trình Phase 4.
- Consent cho dữ liệu người thứ ba (ví dụ analytics SDK như Firebase/Mixpanel): hiện tại `analyticsUsage` là placeholder; cần xác định rõ các SDK được dùng và khai báo trong privacy policy trước khi bật.
- Giao diện thu hồi consent phía Zalo Mini App (FR-016): Zalo có API `revokeUserInfo`; cần tích hợp với `ConsentStore` - defer sang FR-016 extension.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Thu thập dữ liệu khi chưa có consent | `guardConsent()` throw `ConsentRequiredError` | Request bị chặn trước khi xử lý | Hiện ConsentModal cho người dùng |
| Dark pattern (pre-checked checkbox) | Snapshot test + accessibility audit | Test fail trước khi ship | Fix component: đặt unchecked làm default |
| Thu hồi consent nhưng SyncClient vẫn push | Unit test SyncClient sau revoke | Dữ liệu bị gửi trái phép | Fix: SyncClient check cờ trước mỗi push |
| Chuyển dữ liệu GIO sang nước ngoài khi chưa DPIA | `checkCrossBorderTransfer()` trả `allowed: false` | Request bị block, ghi log | Hiện thông báo lỗi; chờ đến khi có DPIA |
| `stripSensitiveFields` bị bỏ qua trong genie.ts | Unit test mock genie handler | Tên người đã mất bị gửi đến Claude | Fix: thêm gọi hàm trước khi build prompt |
| IP rõ trong consent_log | Schema check: cột `ip_hash` TEXT, không có cột `ip` | Log chứa IP rõ (vi phạm PDPL) | Sửa migration: xóa cột `ip` nếu có; chỉ lưu hash |
| policy_version không tăng khi chính sách thay đổi | CI check so sánh `CONSENT_POLICY_VERSION` trong code vs version mới nhất trong consent_log | Người dùng không được yêu cầu lại consent | Bump `CONSENT_POLICY_VERSION` trong lib/consent.ts |
| Consent log bị truy cập bởi user khác | RLS policy `user_own_consent_log` | RLS chặn (0 hàng) | Kiểm tra RLS policy trong integration test |
| Server insert trực tiếp vào consent_log vi phạm | Policy `server_insert_only WITH CHECK FALSE` | Client INSERT bị reject | Chỉ server (service role) insert; đọc bằng API |
| ConsentModal không hiện khi policy_version tăng | Check `flags.policyVersion < CONSENT_POLICY_VERSION` | Người dùng dùng chính sách cũ | Thêm version check vào `ConsentStore.getFlags()` |

---

## §11 - Implementation notes

- `guardConsent()` phải là hàm đồng bộ (synchronous) để có thể gọi ở bắt đầu bất kỳ async handler nào mà không có overhead. Consent check PHẢI là dòng đầu tiên, trước mọi operation.
- `stripSensitiveFields()` phải là hàm thuần túy (pure function): đầu vào `RemindersUpsertRow`, đầu ra object không có `title`. Không có logging, không có side effect - dễ test và dễ audit.
- `ip_hash` trong consent_log: dùng `crypto.createHash('sha256').update(ip + SALT).digest('hex')` với `SALT` là environment variable. Đây là dữ liệu tối thiểu cần để audit ("đồng ý từ địa chỉ nào") mà không lưu IP rõ - giảm rủi ro PDPL.
- `ConsentModal` nên dùng `role="dialog"` và `aria-modal="true"` để hỗ trợ screen reader; nút "Từ chối tất cả" và "Xác nhận lựa chọn" phải có `aria-label` rõ ràng bằng tiếng Việt.
- `policy_version` dùng semver (major.minor.patch): tăng major khi có thay đổi cơ bản quyền lợi người dùng (yêu cầu lại consent); tăng minor khi thêm loại xử lý mới; tăng patch cho chính tả/sửa nhỏ.
- Privacy policy tiếng Việt: tránh sao chép văn bản pháp lý tiếng Anh rồi dịch máy - người dùng Việt Nam cần hiểu được. Test với một người không làm kỹ thuật: nếu họ không hiểu, viết lại.
- `ConsentStore.syncToCloud()` chỉ gọi khi `consentFlags.cloudSync` ĐÃ là `true` trước đó. Nếu cloudSync là flag đầu tiên được grant, thì sau khi lưu localStorage, mới gọi cloud sync. Logic này cần được test rõ ràng để tránh vô vòng.
- Bản thương mại cần tham vấn pháp lý trước khi ra mắt chính thức: PDPL và Nghị định 356/2025 còn có điểm "Caveats" (PRD) chưa rõ - especially mối quan hệ với Data Law và định nghĩa dữ liệu nhạy cảm mở rộng.
- So migration P3 duoc phan phoi de tranh va cham: 0016-0017 danh cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020.

*Hết FR-LUNAR-019.*
