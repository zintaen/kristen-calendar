# SHIP-READINESS - handoff for the implementing agent (read first)

This document is for the agent (or developer) who will ship the LUNAR module's tasks. It assumes you do NOT have the conversational context that produced this corpus. Read this file, then `docs/AGENT-GUIDE.md`, then `CONTRACT.md`, and that is enough to begin. (`AGENTS.md` at the repo root is the CyberOS memory protocol, not a build guide.)

## Status

20 tasks `TASK-LUNAR-001..020` at `ready_to_implement`, audit 10/10, past one independent audit pass (`INDEPENDENT-AUDIT-2026-06-27.md`) and one hardening pass for handoff (aligning the API contract + traceability + self-sufficiency). Total ~209.5 engineering-hours. `packages/amlich-core` is scaffolded and verified to run (the golden harness is red as planned, awaiting implementation). No algorithm logic has been written yet; that is your job.

## Golden rules (a violation is a defect)

1. `CONTRACT.md` is the single API contract for `@cyberskill/amlich-core` and `@cyberskill/genie-content`. Every import must match the name + signature there. Do not invent names (for example `getTietKhi`, `getTietKhiForDate` do NOT exist; use `tietKhiAt` / `tietKhiStartDiaChi`).
2. `convertSolar2Lunar` / `convertLunar2Solar` return a LABELED TUPLE. Always destructure (`const [d, m, y, leap] = ...`), do NOT read `.year` / `.month`. The invalid sentinel is `[0, 0, 0]`; check it with `isInvalidSolar()`, NOT `=== null`.
3. Can-chi of the day: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (TASK-002 is the owner). Day-quality (TASK-011/013) takes the dia chi from `canChiDay(jdn).chiIndex`, NOT from `(jdn+9)%60 % 12`.
4. The three epochs and two synodic constants in `constants.ts` are distinct quantities (PRD 6.2). Core is offline, zero-dependency. Every computation is locked to `Asia/Ho_Chi_Minh` (tz=7), even when the device is abroad; use `todayInHCM()`.
5. The Reminder type is owned by TASK-004 in `@cyberskill/amlich-core`; everywhere else imports it, does NOT redeclare/mirror.

## Ship order

Per `docs/BUILD-RUNBOOK.md` (slice order) and the `README.md` Build order section (topological). An task moves to `done` only after it passes the gate; do NOT flip status on your own. The operator (Stephen) runs the final gate and does the git commit on the real machine.

## Definition of "done" for each task

1. Every §4 Acceptance Criterion passes.
2. Every §5 test is green; `pnpm --filter <package> typecheck` is clean.
3. No violation of the golden rules above; imports match `CONTRACT.md`.
4. For P0 (TASK-003): the commercial accuracy gate is green (see the section below).

## P0 is the gate - do it first, no leapfrogging

TASK-001/002/003 (`packages/amlich-core`) is the highest technical risk and the core asset. Implement per the runbook (jd, astro, leap, convert, canchi, tietkhi) until `pnpm gate:p0` is 100% green.

The commercial accuracy gate (TASK-003, per the founder's request to verify accuracy at a commercial level) has four layers beyond the round-trip:

1. Round-trip 1900-2199 (`golden-sweep.test.ts`), mismatches = 0.
2. Absolute cross-check against the golden source (`gold-1900-2199.json` taken from the official Ho Ngoc Duc calculator for the edge years + samples) - an absolute match, not just round-trip.
3. Astronomical cross-check with `astronomy-engine` (dev-dependency, core stays zero-dep): compare the assigned date against the real New Moon/tiet khi point, catching the 1-day risk when the New Moon is near midnight.
4. A suspect-day report (New Moon within ~15 minutes around VN midnight) for manual inspection; the HKO marker ~28/9/2057 is a point to watch. Property tests: 12/13 months per year, leap month only in a 13-month year, winter solstice in month 11, month length 29/30.

Commercial threshold (founder decision 3): a hard gate on absolute match with the golden data for 1900-2100 (the range real users touch); for 2100-2199 accept within 1 day plus a flag plus a correction table, and do not block the gate; the round-trip stays a hard 1900-2199. If a cross-check layer finds a wrong year in 1900-2100: do NOT rewrite the algorithm into something complex; add a small hardcoded correction table for that exact date (keeping core offline/zero-dep). Any year off in 1900-2100 -> stop, debug, do NOT yet build UI.

## Founder decisions - locked (see BACKLOG)

All locked 2026-06-28; no decision blocks shipping any longer. Summary: go full commercial; self-port amlich-core; accuracy hard gate 1900-2100 (flag + correction 2100-2199); Capacitor for v1 (widget/watch native Swift); ZNS starting via a distributor; Genie uses Claude Haiku 4.5; PDPL privacy-first + legal consultation; ZNS supports MONTHLY.


## Do not

- Do not run `ship-tasks` past the gate, do not flip status `done` while tests are not green.
- Do not read `.year`/`.month` on a convert result; do not redeclare core types; do not import a name not in `CONTRACT.md`.
- Do not let core call the network or depend on the device TZ.
- Do not git commit from the sandbox - leave that to the operator on the machine.

## Document map

- `docs/AGENT-GUIDE.md` - core invariants, build discipline, writing conventions. (`AGENTS.md` at the repo root is for the CyberOS BRAIN/memory protocol.)
- `CONTRACT.md` (same directory) - the amlich-core + content API contract (authority).
- `docs/BUILD-RUNBOOK.md` - build order per slice + gate commands.
- `README.md` (same directory) - the 20-FR catalog, build order, PRD traceability.
- `INDEPENDENT-AUDIT-2026-06-27.md` - defects fixed + open items.
- `BACKLOG.md` (parent directory) - founder decisions, phasing.
- `manifest.json` - machine-readable status.
