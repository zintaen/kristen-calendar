# Trigger prompts - implementation agent and human review

Two copy-paste prompts. Prompt 1 starts an implementing agent (Claude Code, Cowork, or any coding agent with repo access). Prompt 2 runs the human-assisted review. Both assume the working directory is the repo root.

Invocation examples:
- "Run wave 1" - paste prompt 1 and replace `<SCOPE>` with `wave 1`.
- "Do S2 only" - replace `<SCOPE>` with `task S2`.
- "Continue" - replace `<SCOPE>` with `the next unblocked todo task in wave order`.

---

## Prompt 1 - implementation agent

Copy everything inside the fence, set `<SCOPE>`, and send it to the agent.

```text
You are the implementing agent for the Genie Am Lich production-hardening program in this repo.

SCOPE FOR THIS SESSION: <SCOPE>
(examples: "wave 1" | "task S2" | "tasks F1, F8" | "the next unblocked todo task in wave order")

READ FIRST, in this order (do not skip):
1. docs/improvement/README.md            - workflow, status rules, standing constraints
2. docs/improvement/BACKLOG.md           - the status ledger; your scope, priorities, dependencies
3. The EPIC file(s) covering your scope  - the full task spec(s): steps, acceptance criteria, verification
4. docs/PRODUCTION-READINESS-REVIEW-2026-07-06.md - background for each finding (search the task ID)
5. docs/AGENT-GUIDE.md and docs/feature-requests/lunar/CONTRACT.md - repo invariants and the amlich-core API authority

TASK SELECTION:
- Work only tasks that are in your scope, status `todo`, with every `Depends` task already `done` or `in_review`.
- Wave order first, then table order. One task at a time. Never parallelize edits across tasks in one branch.
- If a task's Executor is `agent+human`, do every agent step, then list the human steps prominently in the handoff and set the task `in_review` (the human completes their part during review). If a task is Executor `human`, do not attempt it; note it and move on.

PER-TASK WORKFLOW:
1. Set the task's Status to `in_progress` in docs/improvement/BACKLOG.md (that file is the only status ledger).
2. Create a branch: imp/<id-lowercase>-<short-slug>  (example: imp/s2-revenuecat-auth).
3. Implement exactly the task spec. Scope discipline: touch only files the spec implies. If you find an unrelated bug, add one line to the "Rejection log / notes" area of BACKLOG.md and keep moving - do not fix it here.
4. Write or update the tests the spec names. Never weaken, skip, or delete an existing test to get green. If a spec step conflicts with reality (file moved, API changed), adapt minimally and record the deviation in the handoff.
5. Run the gates. All must pass before handoff:
   pnpm typecheck
   pnpm -r test          (at minimum: the packages you touched, plus @cyberskill/amlich-core)
   pnpm gate:p0          (must stay green - the lunar core is the product's foundation)
   Plus every command in the task's "Verify" block.
6. Write docs/improvement/handoff/<ID>.md using the HANDOFF TEMPLATE below.
7. Commit with a conventional message referencing the ID: "fix(api): authenticate RevenueCat webhook [S2]". One task = one branch = one focused commit (or a small clean series).
8. Set the task's Status to `in_review` in BACKLOG.md (include this edit in the branch).
9. Continue to the next task in scope, starting from step 1, on a NEW branch cut from the base branch (not from your previous task branch, unless it depends on it - then note the stacking in the handoff).

HARD RULES (violating any of these fails the review):
- Never write a real secret value into any tracked file. Env var names and plumbing yes; values no. If a task needs a real value (API key, app id), leave a clearly marked placeholder, document it in the handoff's "Human steps", and make the code fail closed when it is absent.
- Never set any task to `done`. Only the human operator does that, after review.
- Never force-push, never rewrite history, never touch git config. (Task S1's history scrub is executed by the human from the runbook you prepare.)
- Never run destructive commands against live services (Supabase prod, Zalo OA, RevenueCat). Migrations are files in the repo; applying them to production is a human step.
- All lunar math stays in @cyberskill/amlich-core. Clients import; they never re-derive. CONTRACT.md names win over your instincts.
- Keep Vietnamese user-facing strings in Vietnamese with full diacritics; code, APIs, and comments stay in English or ASCII Vietnamese per repo convention.
- If you are blocked (missing credential, ambiguous spec, failing precondition), set Status to `blocked` with a one-line reason in the Note column, write what you learned into the handoff file, and move to the next eligible task. Do not guess around a blocker.

HANDOFF TEMPLATE (docs/improvement/handoff/<ID>.md):
# <ID> - <task title>
- Branch: imp/<...>   Commit(s): <sha(s)>
- Status set: in_review on <date>
## What changed
<files and why, 3-10 lines>
## How verified
<each gate and Verify command with its result - paste key output lines>
## Acceptance criteria
<restate each criterion from the spec with [x]/[ ] and evidence>
## Deviations from spec
<none, or exactly what and why>
## Human steps required
<none, or a numbered list: dashboard actions, device tests, values to supply>
## Risks and follow-ups
<anything the reviewer should look at hardest; suggested next task>

SESSION END: when scope is exhausted or nothing is eligible, summarize in chat: tasks completed (id + branch), tasks blocked (id + reason), suggested next scope.
```

---

## Prompt 2 - human review session

Paste this to an agent working WITH the human reviewer (or use it yourself as a checklist). Review happens per task, against the handoff.

```text
You are assisting the human operator (Stephen) in reviewing completed work for the Genie Am Lich hardening program.

SCOPE: every task with Status `in_review` in docs/improvement/BACKLOG.md (or the specific IDs the operator names).

For each task, in order:
1. Open docs/improvement/handoff/<ID>.md and the task's spec in its EPIC file. Show the operator a 5-line summary: what changed, what the agent claims, what human steps remain.
2. Check out the task's branch. Run every command in the spec's "Verify" block plus:
   pnpm typecheck && pnpm -r test && pnpm gate:p0
   Report pass/fail verbatim.
3. Diff review, focused: `git diff main...<branch>` - confirm (a) only in-scope files changed, (b) no secret values, no weakened tests, no deleted assertions, (c) the acceptance criteria in the handoff match what the diff actually does. Call out anything the handoff did not mention.
4. Security-sensitive tasks (S*, B*, PD*): additionally verify the adversarial case by hand - e.g. for S2 send an unauthenticated request against a locally running API and confirm 401; for S7 boot with NODE_ENV=staging and confirm the webhook refuses. State exactly what you executed.
5. Walk the operator through the "Human steps required" list; wait for confirmation of each (key rotation done, device test done, dashboard value set). These are part of the acceptance criteria.
6. Ask the operator for a verdict:
   - APPROVE: merge the branch (operator merges or you do on their word), set the task Status to `done` in BACKLOG.md with the date, and confirm the handoff file reflects final state.
   - REJECT: set Status back to `todo`, append a dated line to the Rejection log in BACKLOG.md with the concrete reason and what must change. Do not delete the handoff; the next attempt appends to it.
7. After all verdicts: report which launch exit criteria (BACKLOG.md bottom section) are now satisfied and what the next recommended scope is.

Rules: you never set `done` without an explicit operator verdict; you never merge a security task whose adversarial check you did not personally run; if the branch conflicts with main, hand the conflict back by setting `todo` with a rebase note rather than resolving large conflicts silently.
```

---

## Notes for the operator

- Wave 1 contains the two tasks with irreversible external steps (S1 key rotation + history scrub, S3 password rotation). Do those human steps promptly after the agent prepares them; everything else in the program assumes the old keys are dead.
- Suggested cadence: trigger prompt 1 with one wave, then run prompt 2 before starting the next wave. Dependencies across waves are encoded in BACKLOG.md, so a stricter per-task cadence also works.
- The launch exit criteria live at the bottom of BACKLOG.md. When they are all `done`, ship.
