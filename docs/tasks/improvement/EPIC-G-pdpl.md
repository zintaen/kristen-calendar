# EPIC G - PDPL compliance (PD1-PD4)

Report section 7 items P1-P4, renamed PD1-PD4 here to avoid clashing with priority labels. Legal context: Law 91/2025/QH15 (effective 2026-01-01) and implementing Decree 356/2025/ND-CP replaced the Decree 13/2023 regime that TASK-019 was written against. Consent must be specific and informed, silence is not consent, cross-border transfers need an impact assessment filed within 60 days of first transfer. The founder decision already commits to privacy-first plus legal consultation; these tasks make the code match.

---

## PD1. Complete PDPL account deletion

Priority P1 | Effort M | Executor: agent

Context: `handleDeleteAccount` (`api/sync.ts:261-283`) deletes only the caller's reminders. The users row, consent_log, zns_send_log (cleartext phone), genie_action_log, user_push_tokens, and user_entitlements all survive, while the endpoint name promises account deletion.

Steps:
1. Implement full erasure in one service-role transaction: reminders, user_push_tokens, invite tokens owned by the user, users row; anonymize rather than delete where a legal basis requires retention - consent_log (keep the consent history but replace user_id with a tombstone hash and strip IP hashes), entitlement rows needed for financial records (strip to user-id-hash + dates).
2. Also call Supabase Auth admin delete for the auth user (service role, `auth.admin.deleteUser`).
3. Log a deletion receipt (timestamp, categories erased, categories anonymized + legal basis) into a `deletion_log` keyed by tombstone hash, and return it to the caller.
4. Wire the client Settings "Xoa tai khoan" flow to show the receipt and clear local data + consent flags.
5. Tests: after deletion, every table returns zero rows for the old user id; anonymized rows carry no direct identifiers; the auth user cannot sign in.

Acceptance criteria:
- [ ] A deleted account leaves no direct identifiers in any table (test sweeps all seven tables).
- [ ] Deletion receipt produced and shown; DEPLOYMENT.md documents the retention/legal-basis table.

Verify: `pnpm --filter @cyberskill/genie-api test -- delete`

---

## PD2. Enforce consent server-side per purpose

Priority P1 | Effort M | Depends: W5 | Executor: agent

Context: consent gating exists only in clients (`SyncClient` checks flags before calling). The server never checks `consent_log` before sync push/pull, Genie calls, or ZNS sends - under the PDPL the operator carries the burden of proof, and a modified client bypasses everything.

Steps:
1. Add `lib/consent-check.ts`: `requireConsent(userId, purpose)` reading the latest consent_log state per purpose (cache 5 minutes in Redis with invalidation on `/api/consent` writes).
2. Enforce: `cloudSync` on all `/api/sync/*` handlers; `genieAI` on `/api/genie`; `znsReminder` inside the ZNS reminder selection query (S4's DB-driven scan filters on it).
3. Return 403 with a machine-readable code (`CONSENT_REQUIRED`, purpose) so clients can reopen the consent sheet.
4. Tests per purpose: revoked consent -> 403/exclusion; granted -> pass; revocation takes effect within the cache window.

Acceptance criteria:
- [ ] Every purpose-bound endpoint rejects when consent is absent or revoked, independent of client behavior.
- [ ] ZNS cron provably excludes users without znsReminder consent (test).

---

## PD3. Sanitize all reminder types sent to Claude; prepare the CTIA

Priority P1 | Effort M | Executor: agent+human

Context: every Genie call sends user content to Anthropic offshore, but `stripSensitiveFields` fires only for GIO-type reminders; RAM/MUNG_MOT/CUSTOM/FESTIVAL titles (which may carry family names) go out unstripped, and the cross-border gate in `lib/data-minimization.ts` is partial.

Agent steps:
1. Apply `sanitizeQuestion` + `stripSensitiveFields` to the whole `GenieContext` for all reminder types before prompt assembly; extend the PII regexes with tests (Vietnamese names with honorifics, phone formats, addresses).
2. Make the cross-border check purpose-wide: one gate that runs for every outbound Anthropic call, not only GIO; log a per-call transfer record (hashed user id, data categories, destination) to support the impact-assessment dossier.
3. Draft `docs/compliance/CTIA-anthropic.md`: data categories transferred, purpose, safeguards (PII stripping, no raw logging, TLS), retention, recipient (Anthropic, US), volume estimates - a filled skeleton for counsel.

Human steps: legal counsel reviews and files the cross-border dossier per Decree 356/2025 within 60 days of first production transfer; record the filing date in the doc.

Acceptance criteria:
- [ ] Test: a CUSTOM reminder titled with a person's name + phone reaches the prompt builder with both redacted.
- [ ] Transfer log written per Genie call; CTIA skeleton complete for counsel.

---

## PD4. Redact stored phones, retention jobs, export endpoint

Priority P1 | Effort M | Depends: PD1 | Executor: agent

Context: `zns_send_log.phone` is cleartext (the proactive path already writes `phone_redacted` - the main path does not); reminder titles are cleartext at rest; no retention windows exist for consent_log, zns_send_log, genie_action_log; no data-portability endpoint.

Steps:
1. Migration: replace `zns_send_log.phone` with `phone_redacted` (keep last 3 digits) plus a `phone_hash` (salted) for idempotency joins; update the send path and the S5 unique constraint to use the hash.
2. Define retention: zns_send_log 12 months, genie_action_log 12 months, consent_log kept for the life of the account plus statutory period (documented); implement a daily cleanup job (pg_cron in Supabase or a cron route guarded like S4) deleting expired rows.
3. Add `GET /api/export` (auth required): returns the user's reminders, settings-relevant rows, consent history, and entitlement summary as JSON - pairs with the local export in W7.
4. Decide and document whether reminder titles get app-layer encryption at rest; if deferred, record the justification (Supabase disk encryption + RLS) in `docs/compliance/`.

Acceptance criteria:
- [ ] No cleartext full phone number stored anywhere (schema grep + test).
- [ ] Cleanup job proven by test or staging run; retention table documented.
- [ ] Export endpoint returns the documented categories for the authenticated user only.

Verify: `git grep -n "phone TEXT" services/genie-api/supabase/migrations` (only redacted/hashed forms remain in the final schema)
