# Genie Am Lich (kristen-calendar)

A purple-themed Vietnamese lunar-calendar reminder app by CyberSkill. It computes lunar dates on-device using the Ho Ngoc Duc algorithm (Vietnam time UTC+7, meridian 105E), reminds you of Ram, Mung Mot, death anniversaries, and festivals, explains the meaning and how to prepare for each occasion, and runs on Web/PWA, iOS (via Capacitor), and the Zalo Mini App, with a thin serverless backend for the AI Genie (Claude) and ZNS. This is a full-featured commercial product; the first user and design partner is the founder's wife.

This document is the entry point for both newcomers and agents. Read the whole "Quick start" and "Read in order" sections, then branch off to the work you need to do.

## Status

Full and audited spec, plus a verified P0 runway. The algorithm logic has not been written yet - that is the job of the implement phase.

- 20 feature requests `FR-LUNAR-001..020` in `ready_to_implement` state, each with an 11-section engineering spec and a 10/10 audit file. Total estimate about 209.5 engineering-hours.
- An independent (adversarial) audit pass has run: it found and fixed 2 blockers plus about 13 code-level majors. See `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md`.
- `packages/amlich-core` has been scaffolded: PRD 6.2 constants, data types, golden fixtures, and a wired harness; the algorithm functions are STUBS (they throw "not implemented" errors). Running the harness produces 1 green test (data) out of a total that is red - exactly the go/no-go gate state you want.
- All eight founder decisions are settled (see `docs/feature-requests/BACKLOG.md`); no decision is blocking ship anymore.

## Quick start

Requirements: Node 20 or higher and pnpm 9. iOS needs macOS with Xcode (only when you reach the native widget/watch slice).

```bash
pnpm install                 # install dependencies for the whole workspace
pnpm gate:p0                 # golden harness for amlich-core (P0 gate); currently red because the stubs are not implemented
pnpm --filter @cyberskill/amlich-core typecheck   # must be clean
```

Once P0 is implemented, `pnpm gate:p0` must be 100% green before building any UI.

## Read in order

Depending on what you need, there are two reading paths.

If you are a newcomer who wants to understand the product: read the original PRD/SRS `docs/PRD + SRS - Ung Dung Nhac Am Lich Viet Nam (...).md`, then `docs/feature-requests/lunar/README.md` (catalog of the 20 FRs plus build order and PRD traceability), then `docs/feature-requests/BACKLOG.md` (phasing plus founder decisions).

If you are an agent or a developer about to build: read `docs/feature-requests/lunar/SHIP-READINESS.md` (handoff, read first), then `docs/AGENT-GUIDE.md` (core invariants plus build discipline), then `docs/feature-requests/lunar/CONTRACT.md` (the single API contract), then `docs/BUILD-RUNBOOK.md` (the build order for each slice). When implementing a specific FR, read that FR file's section 3 (API contract) and section 5 (Verification) first.

## Architecture

A shared TypeScript core library, `@cyberskill/amlich-core` (zero-dependency, offline, unit-tested), computes all lunar-calendar logic once and is imported into all three clients. The Web/PWA written in Next.js/React is the base for both the PWA and Capacitor; iOS wraps that same web build with Capacitor, plus a widget and Watch complication written in native Swift in `ios/App`; the Zalo Mini App is written in React plus zmp-ui and zmp-sdk. A thin serverless backend (`services/genie-api`) does only two things: proxy the Claude call (AI Genie) and send ZNS via the Zalo Official Account. Data is stored on-device by default; cloud sync (Supabase) is optional for family sharing and must have consent.

The reason for choosing this architecture: the lunar-calendar logic is the core asset and the highest technical risk, so it is written once and reused 100%; the three clients share the same engine, so dates never drift between platforms.

## Repo structure

```
packages/amlich-core/   @cyberskill/amlich-core - lunar core (Ho Ngoc Duc): convert, can-chi, tiet khi,
                        recurrence, day-quality. Zero-dependency, offline. FR-001/002/003/004/011.
packages/content/       @cyberskill/genie-content - content for the 13 lunar occasions (meaning, offerings, checklist). FR-008.
packages/ui/            @cyberskill/genie-ui - purple theme pack, APCA contrast gate, Be Vietnam Pro. FR-009.
apps/web/               genie-web - Next.js/React PWA + Capacitor iOS host; ios/App for the native Swift widget/watch.
                        FR-005 (notification), 006, 007, 010, 012, 013, 014, 015 (UI).
zalo/                   genie-zalo - Zalo Mini App (React + zmp-ui + zmp-sdk). FR-016.
services/genie-api/     @cyberskill/genie-api - serverless TS: Claude proxy, ZNS, sync, PDPL, billing.
                        FR-015, 017, 018, 019, 020.
docs/                   original PRD/SRS, BUILD-RUNBOOK, AGENT-GUIDE, and docs/feature-requests/ (20 FR + audit + spine).
```

Currently only `packages/amlich-core` has been fully scaffolded; the other packages only have a placeholder `package.json` and will be scaffolded when their corresponding slice is reached.

## How to build

Build by phase and slice, in the exact topological order in `docs/feature-requests/lunar/README.md`. Do not skip dependencies.

- P0 - core engine (FR-001..003), do first. This is the highest technical risk and the go/no-go gate: amlich-core must match the Ho Ngoc Duc calendar 100% for the actually-used year range before building any UI.
- P1 - personal MVP (FR-004..010): reminders for Ram/Mung Mot/death anniversaries plus the month calendar plus occasion content, running on Web/PWA plus Capacitor iOS, stored on-device, no backend.
- P2 - advanced experience (FR-011..015): auspicious-day viewing (Hoang dao/Truc/28 stars), the good-day picker, the iOS widget plus Watch, shareable cards, AI Genie.
- P3 - commercialization (FR-016..020): Zalo Mini App, ZNS, family sharing plus cloud sync, PDPL compliance, freemium.

An FR's lifecycle: `ready_to_implement` to `implementing` to `done`. An FR only moves to `done` after passing the gate (every section 4 acceptance criterion passes, every section 5 test is green, typecheck is clean, no golden-rule violations). Do not flip the status arbitrarily. The operator (Stephen) runs the final gate and does the git commit on the real machine.

The P0 accuracy gate (founder decision 3): an exact match with the golden data is a hard gate for 1900-2100 (the range real users touch: past death anniversaries plus the near-future calendar); for 2100-2199 an error of up to 1 day is accepted plus a suspect-day flag plus a correction table if a discrepancy is confirmed, and it does not block the gate. The round-trip sweep is still a hard gate for 1900-2199.

## Golden rules for amlich-core code (a violation is a defect)

These are the invariants the independent audit pass caught bugs on; a build agent must follow them.

1. `CONTRACT.md` is the single API contract. Every import must match the name and signature there. Names that do not exist or get confused: `getTietKhi`, `getTietKhiForDate` - use `tietKhiAt` and `tietKhiStartDiaChi`.
2. `convertSolar2Lunar` and `convertLunar2Solar` return a labeled tuple, not an object. Always destructure (`const [d, m, y, leap] = ...`), do not read `.year` or `.month`. The invalid sentinel is `[0, 0, 0]`; check it with `isInvalidSolar()`, do not check `=== null`.
3. Day can-chi: `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12` (FR-002 is the owner). Day-quality takes the dia chi from `canChiDay(jdn).chiIndex`, do not derive it from `(jdn+9)%60 % 12` (off by 8).
4. The three epochs and two synodic constants in `constants.ts` are separate quantities (PRD 6.2), do not merge them by mistake.
5. The core is offline, zero-dependency, and does not call the network to compute dates. Every calculation is locked to `Asia/Ho_Chi_Minh` even when the device is abroad; use `todayInHCM()`.
6. The `Reminder` type is owned by FR-004 in `@cyberskill/amlich-core`; everywhere else imports it, does not redeclare or mirror it.

## Founder decisions (settled 2026-06-28)

Full commercial go; self-port amlich-core; accuracy hard gate 1900-2100 (flag plus correction 2100-2199); Capacitor for v1 (widget and watch still native Swift); ZNS starting via a distributor; Genie uses Claude Haiku 4.5; PDPL privacy-first plus legal consultation; ZNS supports MONTHLY. Details and rationale in `docs/feature-requests/BACKLOG.md`.

## Conventions

Package naming: reusable core has no prefix (`@cyberskill/amlich-core`); product packages have a genie prefix (`@cyberskill/genie-content`, `@cyberskill/genie-ui`, `@cyberskill/genie-api`); apps use plain names (`genie-web`, `genie-zalo`).

Two agent-guidance files, two different purposes: `AGENTS.md` at the repo root is reserved for the CyberOS Layer-1 Memory Protocol (activating BRAIN at `.cyberos-memory/`); `docs/AGENT-GUIDE.md` is the project's own build guide. An agent in this repo follows both - AGENTS.md for the memory protocol, AGENT-GUIDE for the build invariants.

Documentation writing convention: Vietnamese prose with full diacritics; technical terms, APIs, and code stay in English; use only standard keyboard characters in prose (straight quotes, hyphen for dashes, three periods for the ellipsis); no em dash, en dash, or curly quotes.

## Documentation map

- `docs/PRD + SRS - ...md` - the foundation document (product + software requirements), the source of every FR.
- `docs/feature-requests/lunar/README.md` - catalog of the 20 FRs, topological build order, dependency edges, PRD traceability.
- `docs/feature-requests/lunar/SHIP-READINESS.md` - handoff for the implementing agent; read first when building.
- `docs/feature-requests/lunar/CONTRACT.md` - the amlich-core and content API contract (the authority for every import).
- `docs/feature-requests/lunar/INDEPENDENT-AUDIT-2026-06-27.md` - fixed defects plus open items.
- `docs/feature-requests/lunar/manifest.json` - machine-readable status of the 20 FRs.
- `docs/feature-requests/BACKLOG.md` - phasing, headline metrics, founder decisions.
- `docs/AGENT-GUIDE.md` - core invariants, build discipline, writing conventions.
- `docs/BUILD-RUNBOOK.md` - the build order for each slice plus gate commands.
- `docs/DEPLOYMENT.md` - Deployment guide, external account requirements (Claude, Zalo), environment configuration and RevenueCat (In-app purchase).
- `docs/DEVELOPMENT.md` - Local setup and development guide.
- `AGENTS.md` (repo root, set by Stephen) - CyberOS BRAIN/memory protocol.

## Glossary (for newcomers)

Am lich: the lunar calendar (based on the moon's cycle). Duong lich: the solar calendar (the everyday calendar). Ram: the 15th lunar day (full moon). Mung Mot: the 1st lunar day (start of the month). Death anniversary (gio): the day to remember a deceased person, counted by the lunar date. Leap month (thang nhuan): a lunar month that repeats in a 13-month year. Can-chi: the sexagenary counting system (10 Can plus 12 Chi), for example Giap Ty. Tiet khi: the 24 seasonal markers in a year; Dong chi always falls in the 11th lunar month. Hoang dao / Hac dao: auspicious / inauspicious days by custom. Truc and the Twenty-eight Mansions (28 stars): folk day-selection factors. Tet, Vu Lan, Doan Ngo, Trung Thu: lunar festival occasions.

Ho Ngoc Duc algorithm: the standard way to compute the Vietnamese lunar calendar, based on Jean Meeus's astronomical formulas. PWA: Progressive Web App. Capacitor: wraps a web app into a native app. Zalo Mini App: an app that runs inside Zalo. ZNS (Zalo Notification Service): a channel for sending notifications via a Zalo Official Account (OA). PDPL: Vietnam's Personal Data Protection Law.
