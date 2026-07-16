---
fr_id: TASK-LUNAR-019
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; DEC-LUNAR-190..195 range; PDPL legal facts + consent granularity + data minimization rules applied)
---

## §1 - Verdict summary

TASK-LUNAR-019 specifies the PDPL compliance layer (Law No. 91/2025/QH15, effective 01/01/2026, Decree 356/2025/ND-CP dated 31/12/2025). Scope: 14 normative clauses in §1 (distinguish the personal/family exemption from the commercial edition, Vietnamese privacy policy, 4 independent granular `consentFlags`, consent_log with an audit trail, revocation stops `SyncClient` immediately, `stripSensitiveFields()` for death anniversaries, explicit `checkCrossBorderTransfer()`, no dark patterns, `policy_version` semver). 6 §2 paragraphs explaining the design decisions. §3 has the full TypeScript interfaces - `ConsentFlags`, `ConsentStore`, `ConsentModal` props, `stripSensitiveFields()`, `checkCrossBorderTransfer()` - and migration SQL 0018 with an RLS policy. 15 testable ACs. §5 has 3 test groups: consent granularity, data-minimization, and ConsentModal no-dark-pattern. §8 provides the SQL migration, a sample JSON payload, and the localStorage schema. §10 has 10 failure rows. §11 has 8 implementation notes. Maps to PRD #5 (NFR-Privacy/PDPL), Key Findings 8 (PDPL legal), Recommendations 6, Caveats (unclear PDPL points).

## §2 - Findings (all resolved during authoring)

### ISS-001 - No clear distinction between the personal edition (exempt) and the commercial edition (not exempt)
Applying PDPL to the personal MVP edition too makes the app needlessly complex; not applying it to the commercial edition breaks the law. Resolved: §1 #1 describes the personal/family exemption clearly; DEC-LUNAR-191; AC #15 checks the MVP edition runs without showing the ConsentModal; §9 explains the exemption conditions clearly.

### ISS-002 - A single "Agree to all" checkbox is not specific enough under PDPL article 11
"Personal, family processing" is exempt but "analytics, marketing, cross-border" are not. Resolved: §1 #3 defines 4 independent granular flags; DEC-LUNAR-193; §3 `ConsentFlags` interface; AC #5 tests that revoking one flag does not affect another; 3 granularity unit tests in §5.

### ISS-003 - The name of the deceased could leak into the Claude prompt
`api/genie.ts` could pass the raw `reminder.title` (e.g. "Anniversary of grandmother Nguyen Thi X") into the system prompt - sensitive data sent to Claude (Anthropic, US). Resolved: §1 #6 `stripSensitiveFields()` required before sending to the AI; DEC-LUNAR-192; §3 a pure function; AC #9 + AC #12 unit test mocking the genie handler; §7 cross-cutting states TASK-015 MUST call this function.

### ISS-004 - Transferring data to Singapore without a DPIA is a cross-border PDPL violation
Supabase `ap-southeast-1` (Singapore) is "abroad" - sending the deceased's data there without a DPIA can be fined 5% of revenue. Resolved: §1 #7, #8 `checkCrossBorderTransfer()` explicit function; DEC-LUNAR-192, DEC-LUNAR-194; §3 `CrossBorderCheckResult`; AC #10 tests gio_reminder -> us-east-1 is blocked; §9 notes the DPIA is a still-deferred issue.

### ISS-005 - Storing the raw IP in the consent log violates PDPL data minimization
Storing the raw IP in the log collects more data than needed; the IP itself is personal data requiring consent. Resolved: §1 #4 stores `ip_hash` SHA-256, not the raw IP; §3 `ConsentLogEntry.ipHash: string`; migration 0018 has only an `ip_hash TEXT` column; §11 notes the hash formula with a SALT.

### ISS-006 - A dark pattern in the ConsentModal invalidates the "voluntary" nature of consent
A pre-checked box or an "Agree" button more prominent than "Decline" is a dark pattern; PDPL article 11 requires it to be voluntary. Resolved: §1 #10 describes the no-dark-pattern rules fully; §3 states them in the `ConsentModal` props comment; AC #2 snapshot test checks unchecked; §5 has 2 ConsentModal tests; §11 notes the Vietnamese accessibility requirement.

### ISS-007 - No mechanism to detect when policy_version increases and consent must be re-requested
When PDPL is amended and the policy updates, existing users still use the old version without knowing. Resolved: §1 #12 stores `policy_version` semver with each consent event; DEC-LUNAR-195; §3 `CONSENT_POLICY_VERSION` constant; AC #14 tests detecting the old version and re-showing the modal; §11 guides version bumping (major/minor/patch).

## §3 - Resolution

All 7 substantive concerns handled: the exemption is clearly distinguished (ISS-001), 4 independent granular flags (ISS-002), `stripSensitiveFields()` required before Claude (ISS-003), explicit `checkCrossBorderTransfer()` (ISS-004), ip_hash instead of the raw IP (ISS-005), no dark pattern with a test (ISS-006), policy_version semver with automatic detection (ISS-007). **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §3b - Independent adversarial pass (2026-06-27)

The independent reviewer checked PDPL legal fidelity against PRD Key Findings 8 and the effort arithmetic. Pre-fix independent: 9/10. The legal facts match exactly: Law 91/2025/QH15 effective 01/01/2026; Decree 356/2025/ND-CP replaces 13/2023; a 5%-of-revenue fine (cross-border), 10x illegal gain (data trading), a cap of 3 billion VND; a 5-year grace period for DPIA/DPO but consent applies immediately; the personal/family exemption; the death anniversary = sensitive data (minimize, do not sell, no cross-border before DPIA) - matches the PRD. Consent granular, unchecked-by-default, `ip_hash` not the raw IP - all correct.

- MINOR (fixed) - sub_tasks arithmetic: 7 sub_tasks sum to 8.5h but `effort_hours: 9` (the value 9 is referenced in README line 29 + manifest.json + BACKLOG). Bumped the PrivacyPolicy.tsx sub_task 1.0h -> 1.5h (reasonable: the content must list the data types + purpose + retention + rights + CyberSkill contact); total hours = 9.0h; `effort_hours` kept at 9. Post-fix: 10/10.

## §4 - Readiness pass (2026-06-28)

Traceability changes:

1. New AC #16: "NEVER share consentFlags with a third party" - the §1 #13 clause previously had no direct AC; AC #16 and 2 tests in §5 `describe("consent isolation - do not share with a third party")` added.
2. PDPL legal facts confirmed: Law 91/2025/QH15 effective 01/01/2026; Decree 356/2025/ND-CP; fines 5%/10x/3 billion VND; a 5-year grace period for DPIA/DPO; personal/family exemption; consent applies immediately - all match PRD Key Findings 8, no change needed.
3. The remaining MUST clauses (§1 #2 privacy policy, §1 #4 ip_hash, §1 #5 revocation -> stop SyncClient, §1 #8 checkCrossBorderTransfer, §1 #9 GET/DELETE API, §1 #10 no dark pattern, §1 #11 on-device, §1 #12 policy_version, §1 #14 PrivacyPolicy.tsx) - all have matching ACs (re-confirmed map: AC #13, #6, #4, #10/#11, #7/#8, #2, #3/#4, #14, #13).

Frontmatter ids/depends_on/blocks/DEC-ids/effort_hours unchanged. Ready for handoff without further context.

*End of audit TASK-LUNAR-019.*
