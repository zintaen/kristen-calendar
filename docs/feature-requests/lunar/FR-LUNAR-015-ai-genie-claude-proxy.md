---
id: FR-LUNAR-015
title: "AI Genie - serverless Claude proxy (/api/genie), Claude Haiku 4.5, prompt caching, persona Genie, rate-limit per user, key chỉ ở server, TTS tùy chọn"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P2
milestone: P2 · slice 4
slice: 4
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-008]
depends_on: [FR-LUNAR-008, FR-LUNAR-010]
blocks: [FR-LUNAR-020]
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-C01, FR-C02, FR-C03, FR-C04, FR-C05, FR-C06)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#12 (AI Feature Architecture)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#7 (Key Findings 7 - Claude pricing)"
source_decisions:
  - DEC-LUNAR-150 (ANTHROPIC_API_KEY chi ton tai trong bien moi truong serverless; KHONG DUOC nhung vao client bundle, env client, hoac log; vi pham la loi bao mat P0)
  - DEC-LUNAR-151 (model mac dinh la claude-haiku-4-5; chi nang len claude-sonnet khi do chinh xac thuc te duoi nguong; quyet dinh do operator, khong auto-escalate)
  - DEC-LUNAR-152 (system prompt phong tuc Viet duoc danh dau cache_control type "ephemeral" de ap dung prompt caching; giam toi 90% input token cost cho moi cuoc hoi-dap)
  - DEC-LUNAR-153 (rate-limit: toi da 20 requests/user/ngay tren Vercel KV hoac in-memory; bust rate-limit tra 429 voi Retry-After header; khong cho phep bypass phia client)
  - DEC-LUNAR-154 (khong truyen ten nguoi da mat, so dien thoai, hoac du lieu dinh danh ca nhan ra ngoai Claude API; chi truyen ngay am, ten dip, cau hoi phong tuc - tuan thu PDPL)
  - DEC-LUNAR-155 (TTS la FR-C05 tuy chon: Web Speech API tren web, AVSpeechSynthesizer qua Capacitor tren iOS; proxy khong lam gi cho TTS - client tu xu ly tren text response)
language: typescript 5.x
service: services/genie-api/
new_files:
  - services/genie-api/api/genie.ts
  - services/genie-api/lib/rate-limiter.ts
  - services/genie-api/lib/prompt-builder.ts
  - services/genie-api/lib/system-prompt.ts
  - services/genie-api/api/genie.test.ts
  - apps/web/components/GenieChat.tsx
  - apps/web/lib/genie-client.ts
modified_files:
  - apps/web/app/layout.tsx
allowed_tools:
  - file_read: services/genie-api/**, apps/web/**
  - file_write: services/genie-api/api/genie.ts, services/genie-api/lib/**, apps/web/components/GenieChat.tsx, apps/web/lib/genie-client.ts
  - bash: cd services/genie-api && pnpm test
disallowed_tools:
  - nhung ANTHROPIC_API_KEY vao bat ky file client-side (vi pham DEC-LUNAR-150 / FR-C06)
  - log noi dung request chua du lieu dinh danh ca nhan (vi pham DEC-LUNAR-154 / NFR-Privacy)
  - tu dong nang model len Sonnet ma khong co config cua operator (vi pham DEC-LUNAR-151)
  - truyen ten nguoi da mat hoac so dien thoai den Claude API (vi pham DEC-LUNAR-154 / PDPL)
effort_hours: 14
sub_tasks:
  - "1.5h: system-prompt.ts - viet system prompt tieng Viet cho persona Genie, danh dau cache_control type ephemeral"
  - "2.0h: prompt-builder.ts - buildGenieMessages(ctx, question) them context ngay am + dip sap toi; sanitize input (loai truong PII)"
  - "2.0h: api/genie.ts - handler POST /api/genie: xac thuc userId, rate-limit check, goi Claude API, tra JSON response"
  - "1.5h: rate-limiter.ts - RateLimiter interface + VercelKVRateLimiter impl (20 req/user/ngay) + InMemoryRateLimiter (test/dev)"
  - "1.5h: genie-client.ts - fetchGenie(request): fetch /api/genie, xu ly loi 429/500, retry once on 5xx"
  - "2.0h: GenieChat.tsx - UI chat bubble, input box, loading state, TTS button (Web Speech API tuy chon)"
  - "2.0h: api/genie.test.ts - unit test handler: rate-limit, key absent, PII stripped, response shape, 429 path"
  - "1.5h: integration smoke test voi Claude API (manual / staging environment)"
risk_if_skipped: "FR-C01..C06 la toan bo nhom tinh nang AI Genie - phong tuc hoi-dap, goi y mam cung, loi nhac ca nhan hoa - la ly do chinh de nguoi dung tra phi premium (FR-LUNAR-020 block vao day). Khong co FR-015 thi FR-LUNAR-020 (freemium monetization) mat di san pham premium hang dau. Ngoai ra, neu API key bi nhung vao client (bo FR-C06), rui ro lo key la P0 bao mat."
---

## §1 - Description (BCP-14 normative)

Hệ thống PHẢI xây một serverless endpoint `/api/genie` làm proxy giữa client và Claude API, giữ API key hoàn toàn phía server, áp dụng persona Genie, rate-limit per user, và xử lý prompt caching. Hợp đồng:

1. PHẢI đặt `ANTHROPIC_API_KEY` chỉ trong biến môi trường serverless (Vercel Environment Variables hoặc tương đương); KHÔNG ĐƯỢC xuất hiện trong bất kỳ file client-side nào, bundle JS, hoặc log (DEC-LUNAR-150, FR-C06).
2. PHẢI nhận request `POST /api/genie` với body `GenieRequest` (xem §3) từ client đã xác thực; trả về `GenieResponse` với field `answer` là chuỗi văn bản tiếng Việt.
3. PHẢI gọi Claude API bằng model `claude-haiku-4-5` theo mặc định (DEC-LUNAR-151); model ID PHẢI là config server-side, không được client truyền lên.
4. PHẢI áp dụng prompt caching cho system prompt bằng cách đặt `cache_control: { type: "ephemeral" }` trên content block chứa system prompt phong tục (DEC-LUNAR-152); mục đích là giảm tới 90% input token cost.
5. PHẢI xây dựng system prompt tiếng Việt định hình persona "Genie Am Lich": giọng ấm áp, kính trọng, tiếng Việt chuẩn dấu, kiến thức rộng về Rằm/giỗ/lễ tết/phong tục; mọi câu trả lời PHẢI kèm footer "Tham khao theo phong tuc dan gian" (DEC-LUNAR-152).
6. PHẢI nhận `context` trong request gồm: `lunarDate` (ngày âm hiện tại), `upcomingEvent` (tên dịp sắp tới nếu có), `questionType` (xem §3 enum); KHÔNG ĐƯỢC nhận hoặc chuyển tiếp bất kỳ field nào chứa tên người đã mất, số điện thoại, hay định danh cá nhân khác (DEC-LUNAR-154, NFR-Privacy/PDPL).
7. PHẢI thực thi rate-limit: tối đa 20 requests/userId/ngày; khi vượt ngưỡng trả `429 Too Many Requests` với header `Retry-After` là số nguyên giây còn lại đến nửa đêm theo `Asia/Ho_Chi_Minh` (UTC+7) - cùng mốc reset với key rate-limit ở §11 (DEC-LUNAR-153).
8. PHẢI log tối thiểu: chỉ log `{ timestamp, userId (hashed), questionType, latencyMs, tokenUsage }`; KHÔNG ĐƯỢC log `question` hoặc `answer` full text trong môi trường production (DEC-LUNAR-154, NFR-Privacy/PDPL).
9. PHẢI trả structured error khi Claude API thất bại: `{ error: "UPSTREAM_ERROR", retryable: true, message: "..." }` cho 5xx; `{ error: "RATE_LIMITED", retryAfter: <s> }` cho 429 từ Anthropic (hiếm).
10. PHẢI cover FR-C01 (hoi-dap phong tuc, ky ki), FR-C02 (goi y mam cung + checklist), FR-C03 (y nghia ngay am lich), FR-C04 (loi nhac ca nhan hoa giong am) bằng `questionType` enum; mỗi type có template prompt riêng trong `prompt-builder.ts`.
11. CÓ THỂ hỗ trợ FR-C05 (TTS): sau khi nhận `answer` từ `/api/genie`, client PHẢI tự gọi `window.speechSynthesis.speak()` (Web Speech API) hoặc `AVSpeechSynthesizer` qua Capacitor; proxy KHÔNG xử lý TTS (DEC-LUNAR-155).
12. PHẢI có `GenieChat` component phía client với: ô nhập câu hỏi, loading spinner, bubble hiển thị câu trả lời, nút TTS (tùy chọn, NÊN kiểm tra `'speechSynthesis' in window` truoc khi bật).
13. KHÔNG ĐƯỢC cho phép client truyền `model`, `maxTokens`, hoặc bất kỳ tham số Claude API nào lên proxy; mọi tham số model là server-side config (DEC-LUNAR-151).
14. NÊN thêm `X-Request-Id` header trong response để debug; PHẢI là UUID v4 sinh phía server, không liên kết với `userId`.
15. NÊN stream response (`stream: true` với Anthropic SDK) và trả về `text/event-stream` khi client hỗ trợ; fallback là non-stream JSON nếu client không hỗ trợ SSE.

---

## §2 - Why this design (rationale for humans)

**Tại sao phải có proxy thay vì gọi Claude API trực tiếp từ client?** API key trong client bundle hoặc trong `NEXT_PUBLIC_*` env là lỗ hổng bảo mật P0: bất kỳ ai inspect DevTools đều lấy được key và có thể dùng tùy ý, toàn bộ chi phí rơi vào tài khoản của mình. Proxy giữ key trong biến môi trường serverless, không bao giờ ra client (DEC-LUNAR-150, FR-C06).

**Tại sao Claude Haiku 4.5 là mặc định?** Haiku 4.5 giá $1/$5 per 1M token - với vài chục câu hỏi/gia đình/tháng, chi phí AI dưới vài nghìn VND. Sonnet cho chất lượng cao hơn nhưng giá cao hơn đáng kể; quyết định nâng model PHẢI là decision của operator khi đánh giá thực tế, không auto-escalate (DEC-LUNAR-151, Key Findings §7).

**Tại sao prompt caching với `cache_control: ephemeral`?** System prompt phong tục Việt là một khối văn bản lớn (ước tính 800-1500 token) được gửi cùng mỗi request. Anthropic prompt caching cho phép tái dùng KV cache của khối này trong tối đa 5 phút, giảm tới 90% chi phí input token. Với tần suất hỏi liên tục trong một buổi, đây là tiết kiệm đáng kể (DEC-LUNAR-152).

**Tại sao không gửi tên người đã mất ra Claude?** Đám giỗ (giỗ ông bà, người thân mất) là dữ liệu nhạy cảm theo văn hóa và theo PDPL Law 91/2025. Proxy PHẢI strip các field PII truoc khi gọi Claude. Người dùng hỏi về phong tục không cần model biết tên cụ thể của người mất - "đám giỗ" là đủ context (DEC-LUNAR-154).

**Tại sao rate-limit 20 req/user/ngày?** Với gia đình dùng thông thường, 20 câu/ngày là quá đủ. Giới hạn này bảo vệ khỏi lạm dụng (abuse, scraping, bot), giữ chi phí Claude có thể dự đoán được, và là cơ sở để phân biệt free vs premium tier trong FR-LUNAR-020 (DEC-LUNAR-153).

**Tại sao TTS xử lý phía client?** Web Speech API và AVSpeechSynthesizer là on-device, miễn phí, hỗ trợ tiếng Việt tốt trên iOS/Android. Nếu TTS qua server thi thêm latency, thêm chi phí, và phức tạp streaming audio. Client xử lý text response rồi tự đọc là đơn giản và hiệu quả hơn nhiều (DEC-LUNAR-155).

**Tại sao log minimization?** Ghi log toàn bộ câu hỏi và câu trả lời sẽ vi phạm PDPL nếu câu hỏi chứa thông tin cá nhân ngầm định (tên người thân, ngày giỗ cụ thể). Log chỉ metadata (timestamp, type, latency, token count) đủ để debug và monitor mà không tạo rủi ro pháp lý (DEC-LUNAR-154, NFR-Privacy/PDPL).

---

## §3 - API contract

```typescript
// services/genie-api/api/genie.ts - REST contract

// --- Request ---
export type GenieQuestionType =
  | "phong_tuc_hoi_dap"      // FR-C01: hỏi phong tục, kiêng kỵ
  | "goi_y_mam_cung"         // FR-C02: gợi ý mâm cúng + checklist lễ vật
  | "y_nghia_ngay"           // FR-C03: ý nghĩa ngày âm lịch/dịp
  | "loi_nhac_ca_nhan_hoa";  // FR-C04: sinh lời nhắc giọng ấm

export interface GenieContext {
  lunarDate: string;          // "15/1/2025 (Rằm tháng Giêng)"
  upcomingEvent?: string;     // "Vu Lan - 15/7 ÂL" nếu có
  questionType: GenieQuestionType;
  // KHÔNG có: tên người đã mất, số điện thoại, userId raw (DEC-LUNAR-154)
}

export interface GenieRequest {
  question: string;           // Câu hỏi của người dùng, max 500 ký tự
  context: GenieContext;
  ttsRequested?: boolean;     // Hint để client bật TTS sau khi nhận (DEC-LUNAR-155)
}

// --- Response ---
export interface GenieResponse {
  answer: string;             // Văn bản tiếng Việt từ Claude
  questionType: GenieQuestionType;
  requestId: string;          // UUID v4 server-generated (DEC-LUNAR-154)
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;  // Anthropic prompt caching field
    cacheCreationInputTokens?: number;
  };
}

export interface GenieErrorResponse {
  error: "RATE_LIMITED" | "UPSTREAM_ERROR" | "INVALID_REQUEST" | "AUTH_ERROR";
  message: string;
  retryAfter?: number;        // giây, chỉ có khi error = RATE_LIMITED
  retryable?: boolean;
  requestId: string;
}

// --- HTTP ---
// POST /api/genie
// Headers: Content-Type: application/json, Authorization: Bearer <session-token>
// Status 200: GenieResponse
// Status 400: GenieErrorResponse { error: "INVALID_REQUEST" }
// Status 401: GenieErrorResponse { error: "AUTH_ERROR" }
// Status 429: GenieErrorResponse { error: "RATE_LIMITED" }, header Retry-After
// Status 502: GenieErrorResponse { error: "UPSTREAM_ERROR", retryable: true }
```

```typescript
// services/genie-api/lib/system-prompt.ts
// System prompt với prompt caching marker

export const SYSTEM_PROMPT_BLOCK = {
  type: "text" as const,
  text: `Bạn là Genie Âm Lịch - trợ lý phong tục âm lịch Việt Nam của CyberSkill.

Giọng điệu: ấm áp, kính trọng, như người thân trong gia đình chia sẻ kiến thức.
Ngôn ngữ: tiếng Việt chuẩn dấu. Không dùng từ tiếng Anh không cần thiết.
Phạm vi: phong tục âm lịch Việt Nam (Rằm, Mùng Một, đám giỗ, lễ tết, mâm cúng,
  can-chi, Hoàng đạo, tiết khí). Luôn nêu rõ biến thể vùng miền khi có.
Giới hạn: không khẳng định tuyệt đối về tâm linh; không tư vấn y tế/pháp lý.
Footer bắt buộc: kết thúc mỗi câu trả lời bằng dòng
  "(*) Tham khao theo phong tuc dan gian - co the khac nhau tuy vung mien."`,
  cache_control: { type: "ephemeral" as const },  // DEC-LUNAR-152
};
```

```typescript
// services/genie-api/lib/prompt-builder.ts

export interface BuiltMessages {
  system: typeof SYSTEM_PROMPT_BLOCK[];
  messages: { role: "user"; content: string }[];
}

/**
 * Xây messages cho Claude API.
 * PHẢI không chứa PII: tên người đã mất, số điện thoại (DEC-LUNAR-154).
 */
export function buildGenieMessages(
  context: GenieContext,
  question: string
): BuiltMessages;

/** Sanitize input: strip PII patterns truoc khi đưa vào prompt */
export function sanitizeQuestion(raw: string): string;
```

```typescript
// services/genie-api/lib/rate-limiter.ts

export interface RateLimiter {
  /** Kiểm tra và ghi nhận request. Trả số requests còn lại, hoặc -1 nếu đã đủ. */
  check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
}

export class InMemoryRateLimiter implements RateLimiter {
  constructor(private readonly limitPerDay: number = 20) {}
  async check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
}

export class VercelKVRateLimiter implements RateLimiter {
  constructor(private readonly kv: KVNamespace, private readonly limitPerDay: number = 20) {}
  async check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
}
```

```typescript
// apps/web/lib/genie-client.ts

export interface GenieClientOptions {
  apiBase?: string;  // mặc định "/api/genie"
}

export async function fetchGenie(
  request: GenieRequest,
  options?: GenieClientOptions
): Promise<GenieResponse>;

// Ví dụ dùng TTS sau khi nhận response (DEC-LUNAR-155):
// const res = await fetchGenie({ question, context });
// if (ttsEnabled && 'speechSynthesis' in window) {
//   const utterance = new SpeechSynthesisUtterance(res.answer);
//   utterance.lang = "vi-VN";
//   window.speechSynthesis.speak(utterance);
// }
```

---

## §4 - Acceptance criteria

1. `ANTHROPIC_API_KEY` không xuất hiện trong bất kỳ file `.js`, `.ts`, `.tsx` nào trong `apps/web/`; grep trả về 0 kết quả.
2. `POST /api/genie` với body hợp lệ trả `200` với `GenieResponse` chứa `answer` là chuỗi tiếng Việt không rỗng.
3. System prompt PHẢI chứa `cache_control: { type: "ephemeral" }` trên text block phong tục; kiểm bằng unit test inspect `BuiltMessages`.
4. Khi gọi quá 20 requests cùng `userId` trong một ngày, request thứ 21 trả `429` với header `Retry-After` có giá trị > 0.
5. Request chứa field `tenNguoiMat: "Nguyen Van A"` trong body bị strip truoc khi gửi Claude; unit test verify `buildGenieMessages` không chứa chuỗi này trong output.
6. `question` và `answer` không xuất hiện trong production log; chỉ log `{ timestamp, userIdHash, questionType, latencyMs, tokenUsage }`.
7. Response luôn chứa field `requestId` là UUID v4; hai request khác nhau PHẢI có `requestId` khác nhau.
8. Handler trả `502` với `{ error: "UPSTREAM_ERROR", retryable: true }` khi Claude API trả 5xx.
9. `client-side test`: `genie-client.ts` không import `ANTHROPIC_API_KEY` hoặc bất kỳ biến môi trường `ANTHROPIC_*` nào.
10. `GenieChat` component hiển thị loading spinner trong lúc chờ response; spinner biến mất khi có `answer`.
11. Nút TTS chỉ xuất hiện khi `'speechSynthesis' in window` là true; click nút gọi `window.speechSynthesis.speak` với `lang = "vi-VN"`.
12. `answer` cuối mỗi response kết thúc bằng hoặc chứa chuỗi "Tham khao theo phong tuc dan gian" (footer từ system prompt, DEC-LUNAR-152).
13. Handler từ chối request nếu `question.length > 500`; trả `400 { error: "INVALID_REQUEST" }`.
14. Model gọi Claude là `claude-haiku-4-5`; giá trị này là server-side config, client không thể override (DEC-LUNAR-151).
15. Test suite `genie.test.ts` pass hoàn toàn mà không cần network thật (dùng mock Anthropic SDK).

---

## §5 - Verification

```typescript
// services/genie-api/api/genie.test.ts
import { createMockAnthropic, createMockRateLimiter } from "./__mocks__";
import { handleGenieRequest } from "./genie";
import { buildGenieMessages, sanitizeQuestion } from "../lib/prompt-builder";
import { SYSTEM_PROMPT_BLOCK } from "../lib/system-prompt";

// --- Rate limit ---
test("trả 429 khi vượt 20 requests/ngày", async () => {
  const limiter = createMockRateLimiter({ allowed: false, remaining: 0, resetAt: new Date() });
  const req = mockRequest({ question: "Rằm cúng gì?", context: mockContext() });
  const res = await handleGenieRequest(req, { rateLimiter: limiter });
  expect(res.status).toBe(429);
  const body = await res.json() as { error: string; retryAfter: number };
  expect(body.error).toBe("RATE_LIMITED");
  expect(res.headers.get("Retry-After")).toBeTruthy();
  expect(body.retryAfter).toBeGreaterThan(0);
});

// --- Key không ra client ---
test("ANTHROPIC_API_KEY không xuất hiện trong response headers hoặc body", async () => {
  const res = await handleGenieRequest(mockRequest({ question: "test", context: mockContext() }), {});
  const text = await res.text();
  expect(text).not.toContain(process.env.ANTHROPIC_API_KEY ?? "sk-ant-");
  expect(res.headers.get("X-Api-Key")).toBeNull();
});

// --- Prompt caching ---
test("system prompt block chứa cache_control ephemeral", () => {
  expect(SYSTEM_PROMPT_BLOCK.cache_control).toEqual({ type: "ephemeral" });
  expect(SYSTEM_PROMPT_BLOCK.text).toContain("Tham khao theo phong tuc dan gian");
});

// --- PII sanitize ---
test("buildGenieMessages loại bỏ tên người đã mất khỏi prompt", () => {
  const question = "Giỗ bà Nguyễn Thị Mai cúng gì?";
  const sanitized = sanitizeQuestion(question);
  const built = buildGenieMessages(mockContext(), sanitized);
  const userContent = built.messages[0].content;
  expect(userContent).not.toContain("Nguyễn Thị Mai");
  // Câu hỏi về đám giỗ vẫn được giữ
  expect(userContent).toContain("đám giỗ");
});

// --- Upstream error ---
test("trả 502 retryable khi Claude API lỗi", async () => {
  const anthropic = createMockAnthropic({ throwStatus: 503 });
  const res = await handleGenieRequest(mockRequest({ question: "test", context: mockContext() }), { anthropic });
  expect(res.status).toBe(502);
  const body = await res.json() as { error: string; retryable: boolean };
  expect(body.error).toBe("UPSTREAM_ERROR");
  expect(body.retryable).toBe(true);
});

// --- Question too long ---
test("trả 400 khi question > 500 ký tự", async () => {
  const question = "a".repeat(501);
  const res = await handleGenieRequest(mockRequest({ question, context: mockContext() }), {});
  expect(res.status).toBe(400);
  const body = await res.json() as { error: string };
  expect(body.error).toBe("INVALID_REQUEST");
});

// --- requestId là UUID v4 ---
test("mỗi response có requestId UUID v4 duy nhất", async () => {
  const anthropic = createMockAnthropic({ answer: "Cúng hoa, quả, hương." });
  const res1 = await handleGenieRequest(mockRequest({ question: "q1", context: mockContext() }), { anthropic });
  const res2 = await handleGenieRequest(mockRequest({ question: "q2", context: mockContext() }), { anthropic });
  const b1 = await res1.clone().json() as { requestId: string };
  const b2 = await res2.clone().json() as { requestId: string };
  expect(b1.requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(b1.requestId).not.toBe(b2.requestId);
});

// --- Model config không để client override ---
test("model trong Claude call luôn là claude-haiku-4-5 bất kể body client", async () => {
  const anthropic = createMockAnthropic({ answer: "ok" });
  const bodyWithModel = { question: "test", context: mockContext(), model: "claude-opus-4" };
  await handleGenieRequest(mockRequest(bodyWithModel as any), { anthropic });
  expect(anthropic.lastCallModel()).toBe("claude-haiku-4-5");
});

function mockContext(): import("./genie").GenieContext {
  return {
    lunarDate: "15/1/2025 (Rằm tháng Giêng)",
    upcomingEvent: "Rằm tháng Giêng",
    questionType: "phong_tuc_hoi_dap",
  };
}
```

---

## §6 - Implementation skeleton

Contract đầy đủ ở §3. Hai điểm cần ghim:

```typescript
// services/genie-api/api/genie.ts - cấu trúc handler
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { SYSTEM_PROMPT_BLOCK } from "../lib/system-prompt";
import { buildGenieMessages, sanitizeQuestion } from "../lib/prompt-builder";
import { VercelKVRateLimiter } from "../lib/rate-limiter";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });  // server-side only
const rateLimiter = new VercelKVRateLimiter(/* kv */ undefined!, 20);

export async function POST(request: Request): Promise<Response> {
  const requestId = uuidv4();
  // 1. Auth - lấy userId từ session, hash truoc khi log
  // 2. Rate-limit check
  // 3. Validate + sanitize body
  // 4. Build messages
  const body = await request.json() as GenieRequest;
  const sanitized = sanitizeQuestion(body.question);
  const { system, messages } = buildGenieMessages(body.context, sanitized);
  // 5. Gọi Claude với cache_control trên system prompt
  const completion = await anthropic.messages.create({
    model: "claude-haiku-4-5",  // DEC-LUNAR-151: hardcoded, không để client override
    max_tokens: 1024,
    system: [SYSTEM_PROMPT_BLOCK],  // prompt caching (DEC-LUNAR-152)
    messages,
  });
  // 6. Extract text, return GenieResponse
  const answer = completion.content[0].type === "text" ? completion.content[0].text : "";
  return Response.json({
    answer,
    questionType: body.context.questionType,
    requestId,
    tokenUsage: completion.usage,
  } satisfies GenieResponse);
}
```

---

## §7 - Dependencies

Upstream: FR-LUNAR-008 cung cấp `FestivalContent` database - `prompt-builder.ts` CÓ THỂ đọc nội dung tĩnh của dịp sắp tới để thêm context cho Genie (ví dụ: nếu upcomingEvent là "Vu Lan", inject description ngắn từ FR-008 vào prompt); đây là enrichment, không phải hard dependency - Genie vẫn hoạt động nếu FR-008 chưa có nội dung đầy đủ. FR-LUNAR-010 cung cấp app shell và session auth để `/api/genie` xác thực userId.

Downstream: FR-LUNAR-020 (freemium monetization) sẽ gate Genie sau entitlement check - endpoint `/api/genie` PHẢI có điểm mở rộng để FR-020 inject `isPremium` check mà không sửa handler chính.

Cross-cutting: PDPL (Law 91/2025, Decree 356/2025) áp dụng cho mọi data flow qua proxy; DEC-LUNAR-154 đảm bảo không có PII đi qua Claude API. `apca-w3` không liên quan ở đây; `GenieChat.tsx` dùng tokens từ FR-LUNAR-009.

---

## §8 - Example payloads

```json
{
  "_comment": "Request từ client đến /api/genie",
  "question": "Rằm tháng Giêng năm nay cúng gì ạ?",
  "context": {
    "lunarDate": "15/1/2025 (Rằm tháng Giêng)",
    "upcomingEvent": "Rằm tháng Giêng",
    "questionType": "goi_y_mam_cung"
  },
  "ttsRequested": true
}
```

```json
{
  "_comment": "Response thành công từ /api/genie",
  "answer": "Rằm tháng Giêng (Tết Nguyên Tiêu) là một trong những Rằm quan trọng nhất trong năm. Mâm cúng thường gồm:\n\n- Hương, hoa tươi (hoa cúc, hoa huệ)\n- Ngũ quả\n- Trà và nước\n- Đồ chay (xôi chay, chè, bánh)\n- Hoặc mặn tùy theo phong tục từng gia đình (gà luộc, xôi)\n\nNhiều gia đình đi chùa vào buổi sáng Rằm để cầu an cho cả năm.\n\n(*) Tham khao theo phong tuc dan gian - co the khac nhau tuy vung mien.",
  "questionType": "goi_y_mam_cung",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "tokenUsage": {
    "inputTokens": 847,
    "outputTokens": 182,
    "cacheReadInputTokens": 712,
    "cacheCreationInputTokens": 0
  }
}
```

```json
{
  "_comment": "Response 429 khi vượt rate-limit",
  "error": "RATE_LIMITED",
  "message": "Ban da su dung 20/20 cau hoi trong hom nay. Thu lai vao ngay mai.",
  "retryAfter": 18432,
  "requestId": "a1b2c3d4-0000-0000-0000-000000000001"
}
```

---

## §9 - Open questions

Đã giải quyết: model Haiku 4.5, proxy pattern, prompt caching marker, rate-limit 20/ngày, TTS client-side, PII policy.

Còn deferred: (a) nâng model lên Sonnet cho câu hỏi phức tạp - theo DEC-LUNAR-151, quyết định này ở operator sau khi đánh giá chất lượng thực tế (PRD Recommendations §7: "chi chuyen sang Sonnet neu chat luong Haiku khong dat khi danh gia thuc te"); (b) streaming SSE - §1 #15 đánh dấu NÊN; triển khai non-stream truoc cho đơn giản, stream là cải tiến slice sau; (c) FR-C05 TTS qua Capacitor native (AVSpeechSynthesizer) - cần FR-LUNAR-013 native bridge, deferred sang P2 slice 5; (d) Batch API của Anthropic (giảm 50% cost) - chỉ phù hợp với workload không real-time (ZNS batch notifications), không áp dụng cho Genie interactive.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| API key vắng mặt trong env | `!process.env.ANTHROPIC_API_KEY` truoc khi gọi | 500 Internal Error (không lộ key name) | Deploy CI fail nếu secret absent |
| API key bị nhúng vào client | grep trong CI pipeline | CI fail hard | Developer sửa truoc merge |
| Claude API 429 (upstream rate limit) | response.status === 429 | 502 `{ retryable: true }` trả về client | Client retry sau 1s; log cảnh báo |
| Claude API 5xx | response.status >= 500 | 502 `{ error: "UPSTREAM_ERROR", retryable: true }` | Client retry 1 lần |
| Rate-limit KV unavailable | VercelKV throw | Fallback sang InMemoryRateLimiter | Log warning; không block request |
| Question > 500 ký tự | `question.length > 500` | 400 `{ error: "INVALID_REQUEST" }` | Client hiển thị "Câu hỏi quá dài" |
| PII trong question | sanitizeQuestion regex | PII thay bằng "[thong tin duoc an]" | Log số lần sanitize (không log content) |
| Auth token hết hạn | session validation fail | 401 `{ error: "AUTH_ERROR" }` | Client redirect đến login |
| Claude trả empty content | `content[0].text === ""` | 502 với message "Empty response" | Retry; log requestId để debug |
| TTS không hỗ trợ trên browser | `!('speechSynthesis' in window)` | Nút TTS ẩn, không có lỗi | Ẩn nút tự động |
| `speechSynthesis.speak` không đọc tiếng Việt | không có `vi-VN` voice | Text hiển thị nhưng không đọc | Hiển thị toast "TTS khong ho tro tieng Viet tren thiet bi nay" |
| Token count vượt max_tokens (1024) | Claude truncate | Response bị cắt, thiếu footer | Tăng max_tokens hoặc rút ngắn system prompt |
| Cache miss lần đầu | `cacheCreationInputTokens > 0` | Chi phí cao hơn lần đầu | Bình thường; cache có từ request tiếp theo |

---

## §11 - Implementation notes

- `ANTHROPIC_API_KEY` PHẢI được set trong Vercel Project Settings -> Environment Variables, KHÔNG trong `.env` commit vào git. CI pipeline NÊN có bước grep toàn bộ source để bắt nếu ai vô tình hardcode (DEC-LUNAR-150).
- Prompt caching của Anthropic có TTL khoảng 5 phút cho `ephemeral`; trong một phiên hỏi-đáp liên tục, gần như mọi request từ thứ hai trở đi sẽ cache hit. `cacheReadInputTokens` trong response cho biết bao nhiêu token đã đọc từ cache - dùng để monitor hiệu quả caching (DEC-LUNAR-152).
- `sanitizeQuestion` cần xử lý cả tên tiếng Việt (có dấu) - dùng regex đơn giản loại bỏ pattern "ho ten" phổ biến chỉ là tầng bảo vệ cơ bản; document rõ là best-effort, không phải PII detection hoàn chỉnh (DEC-LUNAR-154).
- `VercelKVRateLimiter` dùng atomic increment với TTL = giây còn lại đến nửa đêm UTC+7 để reset đúng ngày Việt Nam. Key là `genie:rl:{hashedUserId}:{date}` với `date = YYYY-MM-DD` theo Asia/Ho_Chi_Minh (DEC-LUNAR-153).
- `GenieChat.tsx` NÊN debounce submit button 300ms để tránh double-submit. Loading state là skeleton text bubble, không phải spinner tròn, để giữ cảm giác "đang gõ" phù hợp với persona Genie.
- Khi implement streaming (NÊN - §1 #15), dùng `anthropic.messages.stream()` và return `new Response(stream, { headers: { "Content-Type": "text/event-stream" } })`; GenieChat accumulate chunks vào state.
- `userId` PHẢI được hash (SHA-256) truoc khi dùng làm rate-limit key và truoc khi log; không bao giờ log raw userId hoặc email (DEC-LUNAR-154, DEC-LUNAR-153).
- Footer "Tham khao theo phong tuc dan gian" trong system prompt là instruction cho Claude, không hardcode vào response trong handler - nếu Claude đôi khi không thêm footer, AC #12 sẽ catch; trong trường hợp đó handler CÓ THỂ append footer server-side như failsafe.

*Hết FR-LUNAR-015.*
