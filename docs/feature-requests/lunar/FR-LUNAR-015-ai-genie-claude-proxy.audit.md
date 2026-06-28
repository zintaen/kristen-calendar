---
fr_id: FR-LUNAR-015
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS >= 6 minimum; key-isolation + PII-flow + rate-limit determinism + prompt-caching verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-015 đặc tả serverless Claude proxy cho AI Genie. Phạm vi: 15 mệnh đề BCP-14 trong §1 (key isolation, model config server-side, prompt caching ephemeral, system prompt persona Genie + footer, GenieContext sans PII, rate-limit 20/ngày + 429, log minimization, 4 questionType covers FR-C01..C04, TTS client-side, GenieChat UI, client override prevention, requestId, streaming NÊN). §2 có 7 đoạn rationale (proxy security, Haiku cost, prompt caching 90%, PDPL PII, rate-limit 20/ngày, TTS on-device, log minimization). §3 định nghĩa `GenieRequest`, `GenieResponse`, `GenieErrorResponse`, `SYSTEM_PROMPT_BLOCK` với `cache_control`, `buildGenieMessages`, `sanitizeQuestion`, `RateLimiter` interface, `VercelKVRateLimiter`, `InMemoryRateLimiter`, `fetchGenie`, và implementation skeleton. §4 có 15 AC kiểm tra được. §5 có 7 test case deterministic dùng mock Anthropic SDK (không cần network). §10 có 12 hàng failure modes. §11 có 7 ghi chú implementation. Map tới PRD FR-C01..C06, §12 (AI Feature Architecture), Key Findings §7 (Claude Haiku 4.5 pricing).

## §2 - Findings (all resolved during authoring)

### ISS-001 - API key có thể bị nhúng vào client bundle nếu không có enforcement
Không có gate CI thi developer có thể vô tình dùng `NEXT_PUBLIC_ANTHROPIC_API_KEY` hoặc import trong file client. Resolved: DEC-LUNAR-150 + §1 #1 + disallowed_tools; AC #1 grep assertion; §11 ghi chú CI grep step; §10 "API key bi nhung vao client" -> CI fail hard.

### ISS-002 - Không có cơ chế ngăn client chọn model đắt tiền hơn
Nếu client truyền `model: "claude-opus-4"` và handler không validate, chi phí tăng không kiểm soát. Resolved: DEC-LUNAR-151 + §1 #3, #13 hardcode `claude-haiku-4-5` server-side; AC #14 test mock verify `lastCallModel`; §5 test "model trong Claude call luon la claude-haiku-4-5".

### ISS-003 - Prompt caching không được áp dụng thi chi phí input token tăng 90%
Thiếu `cache_control` thi mỗi request gửi lại toàn bộ system prompt, không tận dụng Anthropic caching. Resolved: DEC-LUNAR-152 + §1 #4, #5 + `SYSTEM_PROMPT_BLOCK.cache_control`; AC #3 assertion; §5 test "system prompt block chua cache_control ephemeral"; §11 giải thích TTL 5 phút và `cacheReadInputTokens` monitoring.

### ISS-004 - PII (tên người đã mất) có thể đi qua Claude API vi phạm PDPL
Câu hỏi "Giỗ bà Nguyễn Thị Mai cúng gì?" nếu không sanitize sẽ gửi tên cá nhân ra ngoài Việt Nam. Resolved: DEC-LUNAR-154 + §1 #6 liệt kê field bị cấm; `sanitizeQuestion` trong prompt-builder; AC #5 test PII stripped; §5 "buildGenieMessages loai bo ten nguoi da mat"; §10 "PII trong question" -> replace pattern.

### ISS-005 - Rate-limit không có kế hoạch reset theo ngày Việt Nam (UTC+7)
Nếu reset theo UTC thi ngưỡng reset lúc 7h sáng Việt Nam, không phải nửa đêm - người dùng bị cắt sớm hoặc muộn. Resolved: DEC-LUNAR-153 + §11 "VercelKVRateLimiter TTL = giay con lai den nua dem UTC+7, date = YYYY-MM-DD theo Asia/Ho_Chi_Minh"; AC #4 test 429 sau 20 requests.

### ISS-006 - TTS không rõ phía client hay proxy xử lý; AVSpeechSynthesizer cần native bridge
Không rõ ràng thi developer có thể implement TTS trong handler (gây latency + cost). Resolved: DEC-LUNAR-155 + §1 #11 TTS hoàn toàn client-side; §3 comment ví dụ `speechSynthesis.speak`; AC #11 test nút TTS ẩn khi không hỗ trợ; §9 deferred AVSpeechSynthesizer -> FR-LUNAR-013 bridge.

### ISS-007 - Log production có thể ghi `question`/`answer` full text, vi phạm PDPL
Logger mặc định của framework (Next.js, Vercel) có thể log toàn bộ request body. Resolved: §1 #8 spec log tối thiểu rõ ràng; AC #6 assert `question`/`answer` không trong log; DEC-LUNAR-154; §11 hash userId truoc khi log; §10 hàng "PII trong question" và log policy.

## §3 - Resolution

Tất cả 7 vấn de kỹ thuật đã giải quyết trong quá trình soạn thảo. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

Reviewer độc lập kiểm các điểm bảo mật: `ANTHROPIC_API_KEY` chỉ server-side (§1 #1, AC #1/#9), model không client-override (§1 #13, AC #14 + test `lastCallModel`), `cache_control: ephemeral` trên system block (§1 #4, AC #3), PII strip truoc khi gọi Claude (§1 #6, `sanitizeQuestion`, AC #5), log minimization (§1 #8, AC #6). KHÔNG có đường rò key - không blocker. Một MINOR đã sửa: §1 #7 (clause normative) chỉ nói "nửa đêm" mà không nêu múi giờ, trong khi §11 nêu rõ `Asia/Ho_Chi_Minh` (UTC+7); đã làm rõ §1 #7 = số nguyên giây đến nửa đêm UTC+7, đồng bộ với §11. **Score độc lập (pre-fix): 9/10.**

---

## §5 - Readiness pass (2026-06-28)

Pass thu hai do reviewer doc lap.

- **4 bao mat MUST deu co AC + test.** (a) Server-only key (DEC-LUNAR-150): AC #1 (grep 0 ket qua trong apps/web/) + AC #9 (client khong import key) + test "ANTHROPIC_API_KEY khong xuat hien trong response". (b) Model khong client-overridable (DEC-LUNAR-151): AC #14 + test `lastCallModel() === 'claude-haiku-4-5'`. (c) PII strip (DEC-LUNAR-154): AC #5 + test `sanitizeQuestion` loai bo ten nguoi da mat. (d) cache_control ephemeral (DEC-LUNAR-152): AC #3 + test `SYSTEM_PROMPT_BLOCK.cache_control === { type: "ephemeral" }`.
- **DEC ids dau day du.** DEC-LUNAR-150..155 tat ca duoc tham chieu trong §1, §4, §5, §11. Khong co clause nao thieu DEC id.
- **Rate-limit Retry-After header.** §1 #7 xac dinh ro "so nguyen giay den nua dem UTC+7"; §4 AC #4 test 429 sau 20 requests; §5 test `res.headers.get("Retry-After").toBeTruthy()`; §11 giai thich key `genie:rl:{hash}:{date}` theo Asia/Ho_Chi_Minh.
- **Traceability hoan chinh.** Moi MUST clause §1 #1-#14 co AC tuong ung trong §4 va test trong §5.

**Verdict: PASS. San sang thuc thi.**

*Het audit FR-LUNAR-015.*

*Hết audit FR-LUNAR-015.*
