# EPIC J - documentation (D1-D5)

Report section 10. D1 and D3 run in wave 1 because stale docs actively mislead the agents doing the rest of the work.

---

## D1. Fix the false "stubs" status in README and BUILD-RUNBOOK

Priority P1 | Effort S | Executor: agent

Context: README.md ("The algorithm logic has not been written yet", "the algorithm functions are STUBS") and docs/BUILD-RUNBOOK.md ("harness runs red (21 tests)") describe a pre-implementation state. The core is fully implemented with a green 100k-day sweep; the zalo app consumes it in production code. Any agent following the docs would re-implement finished work.

Steps:
1. Rewrite the README Status section to reflect reality: core implemented, clients built, current phase = production hardening per `docs/improvement/BACKLOG.md`; keep the golden-gate caveat honest until C1 lands (self-consistency sweep green, independent golden table pending).
2. Update BUILD-RUNBOOK's state paragraph the same way; point "what to do next" at the improvement backlog.
3. Add a rule to docs/AGENT-GUIDE.md: any FR or phase completion must update README status in the same change ("docs updated" gate).
4. Cross-link `docs/PRODUCTION-READINESS-REVIEW-2026-07-06.md` and `docs/improvement/` from the README documentation map.

Acceptance criteria:
- [ ] `git grep -n "STUBS\|not been written" README.md docs/BUILD-RUNBOOK.md` returns nothing misleading.
- [ ] README documentation map lists the review and the improvement folder.

---

## D2. Split spec audit from implementation status in the FR manifest

Priority P1 | Effort S | Executor: agent

Context: `docs/feature-requests/lunar/manifest.json` marks all 20 FRs `"status": "PASS", "audit_score": "10/10"`, conflating "spec passed audit" with "code shipped" - FR-016 has stub pages (Z1) and FR-020 placeholder keys (F6).

Steps: add `implementation_status` per FR (`not_started | partial | implemented | verified`) and set honest values from the review (FR-016 partial, FR-020 partial, others per evidence - list your reasoning in the handoff); rename the existing field to `spec_audit` (keep `status` as an alias if other tooling reads it - grep first); update the lunar README legend.

Acceptance criteria:
- [ ] Manifest distinguishes the two dimensions; FR-016 and FR-020 no longer read as fully done.
- [ ] `git grep -rn "manifest.json" docs/ apps/ services/ packages/ zalo/` reviewed for consumers before renaming.

---

## D3. Rename and commit the untracked PRD/SRS

Priority P1 | Effort S | Executor: agent

Context: the foundational PRD/SRS file sits untracked because its filename carries an em dash and combining diacritics (it also violates the repo's own naming convention). Fresh clones are missing the document every FR traces to.

Steps: rename to `docs/PRD-SRS-genie-am-lich.md` (ASCII, hyphens); commit; update the README documentation map reference and any links in docs/feature-requests; verify the content itself is intact (do not reformat the body).

Acceptance criteria:
- [ ] `git status` clean of the octal-escaped filename; the PRD is tracked and linked from README.

Verify: `git ls-files docs/ | grep -i "PRD"`

---

## D4. gitignore playwright-report; add apps/web/.env.example

Priority P2 | Effort S | Executor: agent

Steps: add `playwright-report/` and `test-results/` to .gitignore; `git rm -r --cached apps/web/playwright-report`; create `apps/web/.env.example` documenting NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_GOOGLE_SERVER_CLIENT_ID, NEXT_PUBLIC_APPLE_CLIENT_ID, NEXT_PUBLIC_APPLE_REDIRECT_URI, and the F6 RevenueCat keys, each with a [dev]/[prod] note matching the root .env.example style.

Acceptance criteria:
- [ ] No test artifacts tracked; a new contributor can `cp apps/web/.env.example apps/web/.env.local` and know every var.

---

## D5. DEPLOYMENT.md completions

Priority P1 | Effort S | Depends: S1 | Executor: agent+human

Steps: record the S1 rotation as done (date, keys rotated, who - human supplies); absorb the `.env.docker` tombstone warning text then confirm the file's deletion; document Apple root cert placement (from certs/apple/README.md) as a deploy prerequisite with a failure symptom note ("App Store webhooks 500 until placed"); add the RevenueCat webhook secret setup (S2) and dashboard URL; add the Zalo Mini App id + deploy flow section (Z2); add a release checklist section (gate commands, e2e, iOS smoke test Q7, tag, deploy I6, post-deploy health verification).

Acceptance criteria:
- [ ] DEPLOYMENT.md alone is sufficient to bring up production from a clean VPS, including every external prerequisite and the release checklist.
