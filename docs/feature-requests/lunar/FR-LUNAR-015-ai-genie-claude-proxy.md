---
id: FR-LUNAR-015
title: "AI Genie - serverless Claude proxy (/api/genie), Claude Haiku 4.5, prompt caching, Genie persona, per-user rate limit, key only on the server, optional TTS"
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
  - DEC-LUNAR-150 (ANTHROPIC_API_KEY exists only in the serverless environment variables; MUST NOT be embedded in the client bundle, the client env, or logs; a violation is a P0 security bug)
  - DEC-LUNAR-151 (the default model is claude-haiku-4-5; escalate to claude-sonnet only when real-world accuracy falls below the threshold; this is an operator decision, not auto-escalation)
  - DEC-LUNAR-152 (the Vietnamese-custom system prompt is marked cache_control type "ephemeral" to apply prompt caching; cutting up to 90% of the input token cost for each Q&A)
  - DEC-LUNAR-153 (rate limit: at most 20 requests/user/day on Vercel KV or in-memory; a rate-limit burst returns 429 with a Retry-After header; no client-side bypass allowed)
  - DEC-LUNAR-154 (do not pass the names of the deceased, phone numbers, or personally identifying data out to the Claude API; pass only the lunar date, the occasion name, and the custom question - complying with the PDPL)
  - DEC-LUNAR-155 (TTS is the optional FR-C05: Web Speech API on web, AVSpeechSynthesizer via Capacitor on iOS; the proxy does nothing for TTS - the client handles it on the text response)
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
  - embed ANTHROPIC_API_KEY in any client-side file (violates DEC-LUNAR-150 / FR-C06)
  - log request content containing personally identifying data (violates DEC-LUNAR-154 / NFR-Privacy)
  - automatically escalate the model to Sonnet without operator config (violates DEC-LUNAR-151)
  - pass the names of the deceased or phone numbers to the Claude API (violates DEC-LUNAR-154 / PDPL)
effort_hours: 14
sub_tasks:
  - "1.5h: system-prompt.ts - write the Vietnamese system prompt for the Genie persona, mark cache_control type ephemeral"
  - "2.0h: prompt-builder.ts - buildGenieMessages(ctx, question) adds the lunar-date context + the upcoming occasion; sanitize input (strip PII fields)"
  - "2.0h: api/genie.ts - handler POST /api/genie: authenticate userId, rate-limit check, call the Claude API, return JSON response"
  - "1.5h: rate-limiter.ts - RateLimiter interface + VercelKVRateLimiter impl (20 req/user/day) + InMemoryRateLimiter (test/dev)"
  - "1.5h: genie-client.ts - fetchGenie(request): fetch /api/genie, handle 429/500 errors, retry once on 5xx"
  - "2.0h: GenieChat.tsx - chat bubble UI, input box, loading state, TTS button (Web Speech API optional)"
  - "2.0h: api/genie.test.ts - unit test the handler: rate-limit, key absent, PII stripped, response shape, 429 path"
  - "1.5h: integration smoke test with the Claude API (manual / staging environment)"
risk_if_skipped: "FR-C01..C06 is the entire AI Genie feature group - custom Q&A, offering-tray suggestions, personalized reminders - and is the main reason users pay for premium (FR-LUNAR-020 blocks on this). Without FR-015, FR-LUNAR-020 (freemium monetization) loses its top premium product. In addition, if the API key is embedded in the client (dropping FR-C06), the risk of a key leak is a P0 security issue."
---

## §1 - Description (BCP-14 normative)

The system MUST build a serverless endpoint `/api/genie` as a proxy between the client and the Claude API, keeping the API key entirely on the server, applying the Genie persona, per-user rate limiting, and handling prompt caching. Contract:

1. MUST place `ANTHROPIC_API_KEY` only in the serverless environment variables (Vercel Environment Variables or equivalent); it MUST NOT appear in any client-side file, JS bundle, or log (DEC-LUNAR-150, FR-C06).
2. MUST receive a `POST /api/genie` request with a `GenieRequest` body (see §3) from an authenticated client; return a `GenieResponse` with the field `answer` being a Vietnamese text string.
3. MUST call the Claude API with the model `claude-haiku-4-5` by default (DEC-LUNAR-151); the model ID MUST be server-side config, not passed up by the client.
4. MUST apply prompt caching to the system prompt by setting `cache_control: { type: "ephemeral" }` on the content block containing the custom system prompt (DEC-LUNAR-152); the goal is to cut up to 90% of the input token cost.
5. MUST build a Vietnamese system prompt shaping the "Genie Am Lich" persona: a warm, respectful voice, standard Vietnamese with correct diacritics, broad knowledge of Full Moon / death anniversaries / festivals / customs; every answer MUST include the footer "Tham khao theo phong tuc dan gian" (DEC-LUNAR-152).
6. MUST receive `context` in the request including: `lunarDate` (the current lunar date), `upcomingEvent` (the name of the upcoming occasion if any), `questionType` (see the §3 enum); it MUST NOT receive or forward any field containing the name of a deceased person, a phone number, or other personal identifier (DEC-LUNAR-154, NFR-Privacy/PDPL).
7. MUST enforce the rate limit: at most 20 requests/userId/day; when the threshold is exceeded, return `429 Too Many Requests` with a `Retry-After` header being the integer number of seconds remaining until midnight in `Asia/Ho_Chi_Minh` (UTC+7) - the same reset point as the rate-limit key in §11 (DEC-LUNAR-153).
8. MUST log at minimum: log only `{ timestamp, userId (hashed), questionType, latencyMs, tokenUsage }`; it MUST NOT log the full text of `question` or `answer` in the production environment (DEC-LUNAR-154, NFR-Privacy/PDPL).
9. MUST return a structured error when the Claude API fails: `{ error: "UPSTREAM_ERROR", retryable: true, message: "..." }` for 5xx; `{ error: "RATE_LIMITED", retryAfter: <s> }` for a 429 from Anthropic (rare).
10. MUST cover FR-C01 (custom Q&A, taboos), FR-C02 (offering-tray suggestions + checklist), FR-C03 (meaning of a lunar-calendar day), FR-C04 (personalized reminders in a warm voice) via the `questionType` enum; each type has its own prompt template in `prompt-builder.ts`.
11. MAY support FR-C05 (TTS): after receiving `answer` from `/api/genie`, the client MUST itself call `window.speechSynthesis.speak()` (Web Speech API) or `AVSpeechSynthesizer` via Capacitor; the proxy does NOT handle TTS (DEC-LUNAR-155).
12. MUST have a `GenieChat` component on the client with: a question input box, a loading spinner, a bubble displaying the answer, a TTS button (optional, SHOULD check `'speechSynthesis' in window` before enabling it).
13. MUST NOT let the client pass `model`, `maxTokens`, or any Claude API parameter to the proxy; all model parameters are server-side config (DEC-LUNAR-151).
14. SHOULD add an `X-Request-Id` header in the response for debugging; it MUST be a server-generated UUID v4, not linked to `userId`.
15. SHOULD stream the response (`stream: true` with the Anthropic SDK) and return `text/event-stream` when the client supports it; the fallback is non-stream JSON if the client does not support SSE.

---

## §2 - Why this design (rationale for humans)

**Why have a proxy instead of calling the Claude API directly from the client?** An API key in the client bundle or in a `NEXT_PUBLIC_*` env is a P0 security hole: anyone inspecting DevTools can obtain the key and use it at will, with the entire cost falling on your account. The proxy keeps the key in the serverless environment variables, never reaching the client (DEC-LUNAR-150, FR-C06).

**Why is Claude Haiku 4.5 the default?** Haiku 4.5 costs $1/$5 per 1M tokens - with a few dozen questions per family per month, the AI cost is under a few thousand VND. Sonnet gives higher quality but at a significantly higher price; the decision to escalate the model MUST be an operator decision after a real-world assessment, not auto-escalation (DEC-LUNAR-151, Key Findings §7).

**Why prompt caching with `cache_control: ephemeral`?** The Vietnamese-custom system prompt is a large block of text (estimated 800-1500 tokens) sent with each request. Anthropic prompt caching lets the KV cache of this block be reused for up to 5 minutes, cutting up to 90% of the input token cost. With continuous questioning in one session, this is a significant saving (DEC-LUNAR-152).

**Why not send the names of the deceased to Claude?** Death anniversaries (for grandparents, deceased relatives) are culturally sensitive data and are sensitive under PDPL Law 91/2025. The proxy MUST strip the PII fields before calling Claude. A user asking about a custom does not need the model to know the specific name of the deceased - "death anniversary" is enough context (DEC-LUNAR-154).

**Why the 20 req/user/day rate limit?** For a typical family, 20 questions/day is more than enough. This limit protects against abuse (scraping, bots), keeps the Claude cost predictable, and is the basis for distinguishing free vs premium tiers in FR-LUNAR-020 (DEC-LUNAR-153).

**Why is TTS handled on the client?** The Web Speech API and AVSpeechSynthesizer are on-device, free, and support Vietnamese well on iOS/Android. Doing TTS through the server would add latency, add cost, and complicate audio streaming. Having the client process the text response and read it itself is much simpler and more effective (DEC-LUNAR-155).

**Why log minimization?** Logging the entire question and answer would violate the PDPL if the question contains implicit personal information (a relative's name, a specific death-anniversary date). Logging only metadata (timestamp, type, latency, token count) is enough to debug and monitor without creating legal risk (DEC-LUNAR-154, NFR-Privacy/PDPL).

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

1. `ANTHROPIC_API_KEY` does not appear in any `.js`, `.ts`, or `.tsx` file in `apps/web/`; grep returns 0 results.
2. `POST /api/genie` with a valid body returns `200` with a `GenieResponse` containing a non-empty Vietnamese string `answer`.
3. The system prompt MUST contain `cache_control: { type: "ephemeral" }` on the custom text block; checked with a unit test inspecting `BuiltMessages`.
4. When more than 20 requests are made with the same `userId` in one day, the 21st request returns `429` with a `Retry-After` header value > 0.
5. A request containing the field `tenNguoiMat: "Nguyen Van A"` in the body is stripped before being sent to Claude; a unit test verifies `buildGenieMessages` does not contain this string in its output.
6. `question` and `answer` do not appear in the production log; only `{ timestamp, userIdHash, questionType, latencyMs, tokenUsage }` is logged.
7. The response always contains the field `requestId` as a UUID v4; two different requests MUST have different `requestId` values.
8. The handler returns `502` with `{ error: "UPSTREAM_ERROR", retryable: true }` when the Claude API returns 5xx.
9. `client-side test`: `genie-client.ts` does not import `ANTHROPIC_API_KEY` or any `ANTHROPIC_*` environment variable.
10. The `GenieChat` component displays a loading spinner while waiting for the response; the spinner disappears when there is an `answer`.
11. The TTS button appears only when `'speechSynthesis' in window` is true; clicking the button calls `window.speechSynthesis.speak` with `lang = "vi-VN"`.
12. The `answer` at the end of each response ends with or contains the string "Tham khao theo phong tuc dan gian" (the footer from the system prompt, DEC-LUNAR-152).
13. The handler rejects the request if `question.length > 500`; returns `400 { error: "INVALID_REQUEST" }`.
14. The model calling Claude is `claude-haiku-4-5`; this value is server-side config, the client cannot override it (DEC-LUNAR-151).
15. The `genie.test.ts` test suite passes fully without a real network (using a mock Anthropic SDK).

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

The full contract is in §3. Two points to pin down:

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

Upstream: FR-LUNAR-008 provides the `FestivalContent` database - `prompt-builder.ts` MAY read the static content of the upcoming occasion to add context for Genie (for example: if upcomingEvent is "Vu Lan", inject a short description from FR-008 into the prompt); this is enrichment, not a hard dependency - Genie still works if FR-008 does not have full content yet. FR-LUNAR-010 provides the app shell and session auth for `/api/genie` to authenticate the userId.

Downstream: FR-LUNAR-020 (freemium monetization) will gate Genie behind an entitlement check - the `/api/genie` endpoint MUST have an extension point so FR-020 can inject an `isPremium` check without editing the main handler.

Cross-cutting: the PDPL (Law 91/2025, Decree 356/2025) applies to every data flow through the proxy; DEC-LUNAR-154 ensures no PII goes through the Claude API. `apca-w3` is not relevant here; `GenieChat.tsx` uses the tokens from FR-LUNAR-009.

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

Resolved: the Haiku 4.5 model, the proxy pattern, the prompt-caching marker, the 20/day rate limit, client-side TTS, the PII policy.

Still deferred: (a) escalating the model to Sonnet for complex questions - per DEC-LUNAR-151, this decision rests with the operator after assessing real-world quality (PRD Recommendations §7: "switch to Sonnet only if Haiku quality falls short in a real-world assessment"); (b) SSE streaming - §1 #15 marks it SHOULD; ship non-stream first for simplicity, streaming is a later-slice improvement; (c) FR-C05 TTS via Capacitor native (AVSpeechSynthesizer) - needs the FR-LUNAR-013 native bridge, deferred to P2 slice 5; (d) Anthropic's Batch API (50% cost reduction) - only suits non-real-time workloads (ZNS batch notifications), not applicable to the interactive Genie.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| API key absent from the env | `!process.env.ANTHROPIC_API_KEY` before the call | 500 Internal Error (does not leak the key name) | Fail the deploy CI if the secret is absent |
| API key embedded in the client | grep in the CI pipeline | CI fails hard | Developer fixes it before merge |
| Claude API 429 (upstream rate limit) | response.status === 429 | 502 `{ retryable: true }` returned to the client | Client retries after 1s; log a warning |
| Claude API 5xx | response.status >= 500 | 502 `{ error: "UPSTREAM_ERROR", retryable: true }` | Client retries once |
| Rate-limit KV unavailable | VercelKV throws | Fall back to InMemoryRateLimiter | Log a warning; do not block the request |
| Question > 500 characters | `question.length > 500` | 400 `{ error: "INVALID_REQUEST" }` | Client shows "Question too long" |
| PII in the question | sanitizeQuestion regex | PII replaced with "[thong tin duoc an]" | Log the number of sanitizations (do not log content) |
| Auth token expired | session validation fails | 401 `{ error: "AUTH_ERROR" }` | Client redirects to login |
| Claude returns empty content | `content[0].text === ""` | 502 with the message "Empty response" | Retry; log the requestId to debug |
| TTS unsupported in the browser | `!('speechSynthesis' in window)` | TTS button hidden, no error | Hide the button automatically |
| `speechSynthesis.speak` does not read Vietnamese | no `vi-VN` voice | Text displays but is not read | Show a toast "TTS khong ho tro tieng Viet tren thiet bi nay" |
| Token count exceeds max_tokens (1024) | Claude truncates | Response is cut, missing the footer | Increase max_tokens or shorten the system prompt |
| Cache miss on the first call | `cacheCreationInputTokens > 0` | Higher cost on the first call | Normal; the cache is present from the next request |

---

## §11 - Implementation notes

- `ANTHROPIC_API_KEY` MUST be set in Vercel Project Settings -> Environment Variables, NOT in a `.env` committed to git. The CI pipeline SHOULD have a step that greps the entire source to catch anyone who accidentally hardcodes it (DEC-LUNAR-150).
- Anthropic prompt caching has a TTL of about 5 minutes for `ephemeral`; in a continuous Q&A session, nearly every request from the second onward will be a cache hit. `cacheReadInputTokens` in the response indicates how many tokens were read from the cache - use it to monitor caching effectiveness (DEC-LUNAR-152).
- `sanitizeQuestion` needs to handle Vietnamese names (with diacritics) too - using a simple regex to remove common "full name" patterns is only a basic protection layer; document clearly that it is best-effort, not complete PII detection (DEC-LUNAR-154).
- `VercelKVRateLimiter` uses an atomic increment with TTL = the seconds remaining until midnight UTC+7 to reset on the correct Vietnam day. The key is `genie:rl:{hashedUserId}:{date}` with `date = YYYY-MM-DD` in Asia/Ho_Chi_Minh (DEC-LUNAR-153).
- `GenieChat.tsx` SHOULD debounce the submit button by 300ms to avoid double-submit. The loading state is a skeleton text bubble, not a round spinner, to keep the "typing" feel that suits the Genie persona.
- When implementing streaming (SHOULD - §1 #15), use `anthropic.messages.stream()` and return `new Response(stream, { headers: { "Content-Type": "text/event-stream" } })`; GenieChat accumulates the chunks into state.
- `userId` MUST be hashed (SHA-256) before being used as a rate-limit key and before logging; never log the raw userId or email (DEC-LUNAR-154, DEC-LUNAR-153).
- The footer "Tham khao theo phong tuc dan gian" in the system prompt is an instruction for Claude, not hardcoded into the response in the handler - if Claude sometimes fails to add the footer, AC #12 will catch it; in that case the handler MAY append the footer server-side as a failsafe.

*End of FR-LUNAR-015.*
