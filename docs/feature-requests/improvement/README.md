# Improvement program - how this folder works

Source: `docs/PRODUCTION-READINESS-REVIEW-2026-07-06.md` (the review). Every task here traces back to a numbered finding in that report. Goal: close all blockers and majors so Genie Am Lich can ship to production.

## Files

- `BACKLOG.md` - the single status ledger. Every task, its priority, wave, dependencies, executor, and status. Status lives ONLY here; task spec files never carry status.
- `EPIC-A-security.md` .. `EPIC-J-docs.md` - detailed task specs. Each task has context, exact files, implementation steps, acceptance criteria, verification commands, and notes for the human reviewer.
- `PROMPT.md` - copy-paste prompts: one to trigger an implementing agent, one to run the human review. Use these when starting a work session.
- `handoff/` - one markdown file per completed task, written by the implementing agent, read by the human reviewer.

## Task ID scheme

IDs keep the review's numbering so findings and tasks stay 1:1.

| Prefix | Epic | Report section |
|---|---|---|
| S | A - security blockers | 1 |
| F | B - functional blockers | 2 |
| B | C - backend hardening | 3 |
| W | D - web app | 4 |
| C | E - core packages | 5 |
| Z | F - Zalo Mini App | 6 |
| PD | G - PDPL (report items P1-P4, renamed PD1-PD4 to avoid clashing with priority labels) | 7 |
| I | H - infra and CI/CD | 8 |
| Q | I - testing | 9 |
| D | J - documentation | 10 |

Note: F7 from the review is split into Z1 + Z2. Z5 from the review is merged into I1.

## Priorities and waves

- P0 = blocker. Product is insecure or broken without it. All S and F tasks.
- P1 = major. Required before public launch.
- P2 = hardening. Strongly recommended, can land right after launch.

Waves define execution order (from review section 11). Finish a wave before starting the next unless a task is blocked; dependencies in BACKLOG.md always win over wave order.

## Status lifecycle

`todo -> in_progress -> in_review -> done` (plus `blocked` with a note).

Rules, matching the repo's existing FR discipline:

1. The implementing agent may set `in_progress`, `in_review`, and `blocked`. Only the human operator (Stephen) sets `done`, after review.
2. One task = one branch (`imp/<id>-<slug>`) = one focused commit or PR. No drive-by changes outside the task's file list without a note in the handoff.
3. A task moves to `in_review` only when every acceptance criterion is met and every verification command passes locally.
4. The agent writes `handoff/<ID>.md` before setting `in_review` (template in PROMPT.md).
5. Rejected review: human sets status back to `todo` and appends a rejection note in the backlog row; the agent picks it up again with that note as added context.

## Executor field

- `agent` - an AI agent can complete it end to end in the repo.
- `human` - requires actions outside the repo (dashboards, key rotation, force-push, App Store portal).
- `agent+human` - agent prepares everything in-repo; human performs the external step. The task spec says exactly who does what.

## Standing constraints for all tasks

- Follow `docs/AGENT-GUIDE.md` and the golden rules in the root `README.md`; `docs/feature-requests/lunar/CONTRACT.md` remains the API authority for amlich-core imports.
- Never write real secret values into any tracked file. Env plumbing yes, values no.
- Never weaken a failing test to pass a gate. Fix the code or flag the task blocked.
- All lunar math stays in `@cyberskill/amlich-core`; clients import, never re-derive.
- Keep the workspace typecheck clean: `pnpm typecheck` must pass before any handoff.
