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

FR-LUNAR-015 specifies the serverless Claude proxy for the AI Genie. Scope: 15 BCP-14 clauses in §1 (key isolation, model config server-side, prompt caching ephemeral, system prompt Genie persona + footer, GenieContext without PII, rate-limit 20/day + 429, log minimization, 4 questionType covering FR-C01..C04, TTS client-side, GenieChat UI, client override prevention, requestId, streaming SHOULD). §2 has 7 rationale paragraphs (proxy security, Haiku cost, prompt caching 90%, PDPL PII, rate-limit 20/day, TTS on-device, log minimization). §3 defines `GenieRequest`, `GenieResponse`, `GenieErrorResponse`, `SYSTEM_PROMPT_BLOCK` with `cache_control`, `buildGenieMessages`, `sanitizeQuestion`, the `RateLimiter` interface, `VercelKVRateLimiter`, `InMemoryRateLimiter`, `fetchGenie`, and the implementation skeleton. §4 has 15 testable ACs. §5 has 7 deterministic test cases using a mocked Anthropic SDK (no network needed). §10 has 12 failure-mode rows. §11 has 7 implementation notes. Maps to PRD FR-C01..C06, §12 (AI Feature Architecture), Key Findings §7 (Claude Haiku 4.5 pricing).

## §2 - Findings (all resolved during authoring)

### ISS-001 - The API key could be embedded in the client bundle without enforcement
Without a CI gate, a developer could accidentally use `NEXT_PUBLIC_ANTHROPIC_API_KEY` or import it in a client file. Resolved: DEC-LUNAR-150 + §1 #1 + disallowed_tools; AC #1 grep assertion; §11 note on the CI grep step; §10 "API key embedded in client" -> CI fails hard.

### ISS-002 - No mechanism to prevent the client choosing a more expensive model
If the client passes `model: "claude-opus-4"` and the handler does not validate, cost rises uncontrolled. Resolved: DEC-LUNAR-151 + §1 #3, #13 hardcode `claude-haiku-4-5` server-side; AC #14 mock test verifying `lastCallModel`; §5 test "the model in the Claude call is always claude-haiku-4-5".

### ISS-003 - Not applying prompt caching raises input-token cost by 90%
Without `cache_control`, every request resends the whole system prompt, not using Anthropic caching. Resolved: DEC-LUNAR-152 + §1 #4, #5 + `SYSTEM_PROMPT_BLOCK.cache_control`; AC #3 assertion; §5 test "the system prompt block contains cache_control ephemeral"; §11 explains the 5-minute TTL and `cacheReadInputTokens` monitoring.

### ISS-004 - PII (the name of the deceased) could pass through the Claude API, violating PDPL
The question "What offerings for the anniversary of Mrs. Nguyen Thi Mai?" would, without sanitizing, send a personal name outside Vietnam. Resolved: DEC-LUNAR-154 + §1 #6 lists the banned fields; `sanitizeQuestion` in prompt-builder; AC #5 tests PII stripped; §5 "buildGenieMessages removes the deceased's name"; §10 "PII in question" -> replace pattern.

### ISS-005 - The rate-limit has no plan to reset by the Vietnam day (UTC+7)
Resetting by UTC would reset the threshold at 7am Vietnam time, not midnight - users get cut off early or late. Resolved: DEC-LUNAR-153 + §11 "VercelKVRateLimiter TTL = seconds remaining until UTC+7 midnight, date = YYYY-MM-DD by Asia/Ho_Chi_Minh"; AC #4 tests 429 after 20 requests.

### ISS-006 - Unclear whether TTS is handled client-side or by the proxy; AVSpeechSynthesizer needs a native bridge
Without clarity a developer could implement TTS in the handler (adding latency + cost). Resolved: DEC-LUNAR-155 + §1 #11 TTS fully client-side; §3 example comment `speechSynthesis.speak`; AC #11 tests the TTS button is hidden when unsupported; §9 defers AVSpeechSynthesizer -> FR-LUNAR-013 bridge.

### ISS-007 - Production logs could write full `question`/`answer` text, violating PDPL
The framework's default logger (Next.js, Vercel) can log the entire request body. Resolved: §1 #8 specs minimal logging clearly; AC #6 asserts `question`/`answer` are not in the log; DEC-LUNAR-154; §11 hash the userId before logging; §10 row "PII in question" and log policy.

## §3 - Resolution

All 7 technical issues resolved during authoring. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

The independent reviewer checked the security points: `ANTHROPIC_API_KEY` is server-side only (§1 #1, AC #1/#9), the model is not client-overridable (§1 #13, AC #14 + test `lastCallModel`), `cache_control: ephemeral` on the system block (§1 #4, AC #3), PII stripped before calling Claude (§1 #6, `sanitizeQuestion`, AC #5), log minimization (§1 #8, AC #6). NO key-leak path - no blocker. One MINOR fixed: §1 #7 (a normative clause) said only "midnight" without stating the timezone, while §11 states `Asia/Ho_Chi_Minh` (UTC+7) clearly; clarified §1 #7 = an integer number of seconds to UTC+7 midnight, synced with §11. **Independent score (pre-fix): 9/10.**

---

## §5 - Readiness pass (2026-06-28)

A second pass by an independent reviewer.

- **All 4 security MUSTs have an AC + test.** (a) Server-only key (DEC-LUNAR-150): AC #1 (grep 0 results in apps/web/) + AC #9 (client does not import the key) + test "ANTHROPIC_API_KEY does not appear in the response". (b) Model not client-overridable (DEC-LUNAR-151): AC #14 + test `lastCallModel() === 'claude-haiku-4-5'`. (c) PII strip (DEC-LUNAR-154): AC #5 + test `sanitizeQuestion` removes the deceased's name. (d) cache_control ephemeral (DEC-LUNAR-152): AC #3 + test `SYSTEM_PROMPT_BLOCK.cache_control === { type: "ephemeral" }`.
- **DEC ids complete.** DEC-LUNAR-150..155 are all referenced in §1, §4, §5, §11. No clause is missing a DEC id.
- **Rate-limit Retry-After header.** §1 #7 specifies "integer seconds to UTC+7 midnight"; §4 AC #4 tests 429 after 20 requests; §5 test `res.headers.get("Retry-After").toBeTruthy()`; §11 explains the key `genie:rl:{hash}:{date}` by Asia/Ho_Chi_Minh.
- **Complete traceability.** Every MUST clause §1 #1-#14 has a matching AC in §4 and a test in §5.

**Verdict: PASS. Ready for implementation.**

*End of audit FR-LUNAR-015.*

*End of audit FR-LUNAR-015.*
