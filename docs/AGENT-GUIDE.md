# AGENT-GUIDE - build guide for the Genie Am Lich project (kristen-calendar)

> Important note: the file `AGENTS.md` at the repo root is RESERVED for the CyberOS Layer-1 Memory Protocol (activating the BRAIN / `.cyberos-memory/`) - it is the file Stephen drops in to enable memory, not a build guide. THIS file (`docs/AGENT-GUIDE.md`) is the project's own build guide. An agent working in this repo follows BOTH: `AGENTS.md` for the memory protocol, `docs/AGENT-GUIDE.md` for core invariants, build discipline, and writing conventions.

Guide for coding agents and developers working in this repo. Read it all before editing code.

## Product

CyberSkill's Genie Am Lich: a Vietnamese lunar-calendar reminder app in a purple palette, computing dates on-device with the Ho Ngoc Duc algorithm (Vietnamese time UTC+7, meridian 105 degrees E). Runs on Web/PWA, iOS via Capacitor, and Zalo Mini App, plus a thin serverless backend for the AI Genie (Claude) and ZNS. It starts as a personal product for the founder's wife and expands into a commercial one.

## Source of truth

The entire spec lives in `docs/feature-requests/`: 20 feature requests `FR-LUNAR-001..020` (each an 11-section engineering-spec with a sibling `*.audit.md`), a `lunar/README.md` (index + build order + PRD traceability), `lunar/manifest.json` (machine-readable), `lunar/INDEPENDENT-AUDIT-2026-06-27.md` (independent audit), and `BACKLOG.md`. The original PRD/SRS is at `docs/PRD + SRS — ...md`. When implementing an FR, read that spec's section 3 (API contract) and section 5 (Verification) first.

## Monorepo layout

```
packages/amlich-core/   # FR-001/002/003/004 - TS, zero-dependency, offline, unit-tested. LOI CUA SAN PHAM.
packages/content/       # FR-008 - FestivalContent tinh (13 dip)
packages/ui/            # FR-009 - purple theme pack, APCA gate, Be Vietnam Pro
apps/web/               # FR-010 shell, 006/007/012/014/015 UI - Next.js/React PWA + Capacitor (ios/App: 005 notif, 013 widget Swift)
zalo/                   # FR-016 - Zalo Mini App (React + zmp-ui + zmp-sdk)
services/genie-api/     # FR-015 Claude proxy, 017 ZNS, 018 sync, 019 PDPL, 020 billing - serverless TS
```

Only `packages/amlich-core/` is scaffolded (constants + types + golden fixtures + harness, the algorithm functions are STUBs). The other packages currently have only a `package.json` placeholder; scaffold them when their slice arrives.

## Commands

```bash
pnpm install
pnpm --filter @cyberskill/amlich-core test      # golden harness (P0 gate)
pnpm --filter @cyberskill/amlich-core typecheck
pnpm -r build
```

## Build discipline (read carefully)

1. Follow `docs/BUILD-RUNBOOK.md`: build per slice, in the topological order in `lunar/README.md`.
2. P0 before everything. Implement `amlich-core` (001/002/003) until the golden harness is 100% green over the range 1900-2199 including the edge years 1985/2007/2030/2053. This is the go/no-go threshold: if any year is off, stop, debug, do not yet build UI. The highest technical risk is here.
3. An FR moves to `done` only after it passes the gate (tests green + typecheck + review). Do not flip status on your own. The operator (Stephen) runs the final gate and does the git commit on the real machine.

## amlich-core invariants (common errors, caught by the independent audit)

- `convertSolar2Lunar` / `convertLunar2Solar` return a LABELED TUPLE (`[d, m, y, leap]` / `[d, m, y]`), NOT an object. Every consumer MUST destructure the tuple, MUST NOT read `.year` / `.month` (yields undefined -> Invalid Date).
- convertLunar2Solar returns the sentinel `[0, 0, 0]` when invalid; check it with `isInvalidSolar()`, NOT with `=== null`.
- Can-chi of the day: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (FR-002 is the owner). Day-quality (FR-011/013) MUST take the dia chi from `canChiDay(jdn).chiIndex`, MUST NOT derive it from `(jdn+9)%60 % 12` (off by +8).
- The three epochs and two synodic constants in `constants.ts` are distinct quantities, MUST NOT be conflated (PRD 6.2).
- Core MUST NOT call the network to compute a date (NFR-Offline). Every computation is locked to `Asia/Ho_Chi_Minh` / tz=7 even when the device is abroad; use `todayInHCM()` instead of the device's/server's local date.

## Writing conventions (per Stephen's standard)

Vietnamese prose with diacritics; technical terms, APIs, and code stay in English. In prose, use only standard keyboard characters: straight quotes (" and '), a hyphen (-) for every dash, three periods (...) for an ellipsis. Do not emit an em dash, an en dash, or a curly quote. No emojis. Keep formatting minimal.

## Links

- Build order + PRD traceability: `docs/feature-requests/lunar/README.md`
- Backlog + founder decisions (locked): `docs/feature-requests/BACKLOG.md`
- Independent audit (defects fixed + open items): `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md`
- Per-slice build runbook: `docs/BUILD-RUNBOOK.md`
