# Build runbook - Genie Am Lich

Per-slice build order for the 20 FRs (`FR-LUNAR-001..020`). Each slice: implement its FRs until tests are green + typecheck is clean, then move to the next slice. The order is derived from `depends_on` (see the `feature-requests/lunar/README.md` Build order section). Total estimate 209.5 engineering-hours.

## Current status

`packages/amlich-core/` is scaffolded: the constants (PRD 6.2) and types are complete and correct, the golden fixtures (PRD 6.6) and harness are wired, the algorithm functions are STUBs (throw). Typecheck is clean; the harness runs red (21 tests) awaiting implementation, 1 pure-helper test green. The other packages only have a `package.json` placeholder.

## Gate commands

```bash
pnpm install
pnpm --filter @cyberskill/amlich-core typecheck   # phai sach
pnpm --filter @cyberskill/amlich-core test        # P0 gate: phai xanh 100%
```

## P0 - slice 1: core engine (FR-001, 002, 003) - DO FIRST

The highest technical risk. Implement in `packages/amlich-core/src/`, filling the stubs in dependency order:

1. `jd.ts` - jdFromDate, jdToDate (remember the audit fix: jdToDate uses `jd >= GREGORIAN_SWITCH_JD`).
2. `astro.ts` - NewMoon (using MEEUS_NEW_MOON_EPOCH + MEEUS_SYNODIC_PER_K), SunLongitude, getSunLongitude, getNewMoonDay.
3. `leap.ts` - getLunarMonth11 (using LUNAR_MONTH11_EPOCH_INT), getLeapMonthOffset.
4. `convert.ts` - convertSolar2Lunar, convertLunar2Solar (using EPOCH_INDEX_K + SYNODIC_INDEX_K; return a tuple; sentinel `[0,0,0]`).
5. `canchi.ts` - canChiDay (can=(jdn+9)%10, chi=(jdn+1)%12), canChiMonth (ngu ho don), canChiYear.
6. `tietkhi.ts` - tietKhiAt (15-degree resolution).

Go/no-go gate (FR-003): `pnpm --filter @cyberskill/amlich-core test` is 100% green, including `golden-sweep.test.ts` (round-trip 1900-2199, mismatches = 0), `convert.test.ts` (6 Tet fixtures + the VN/TQ offset for 2007/2030/2053 + the leap month 2 of 1985), `canchi.test.ts` (dia chi = (jdn+1)%12). Any year off -> stop, debug, do NOT yet build UI.

Founder decisions are locked (see BACKLOG): self-port amlich-core; accuracy hard gate 1900-2100, 2100-2199 flag + correction table (DEC-LUNAR-039).

## P1 - personal MVP (FR-004..010)

- slice 2: FR-009 (purple theme + APCA gate, `packages/ui`), FR-004 (recurrence + Reminder model, extending `amlich-core`), FR-010 (app shell Next.js/Capacitor, `apps/web`), FR-005 (local notifications rolling-64).
- slice 3: FR-008 (FestivalContent, `packages/content`), FR-007 (calendar grid), FR-006 (reminder management UI).

Founder decisions are locked: go full commercial; Capacitor for v1 (widget/watch native Swift). MVP criterion: the wife uses it steadily for >= 1 Ram/Mung Mot cycle, misses no reminder.

## P2 - advanced experience (FR-011..015)

- slice 4: FR-011 (day-quality, extending `amlich-core`; remember dia chi = (jdn+1)%12), FR-012 (good-day picker), FR-015 (AI Genie proxy, `services/genie-api`).
- slice 5: FR-013 (iOS widget + watch, native Swift in `apps/web/ios/App`; a minimal amlich port matching the PRD 6.2 constants), FR-014 (shareable cards).

## P3 - commercialization (FR-016..020)

- slice 6: FR-016 (Zalo Mini App, `zalo/`), FR-017 (ZNS, `services/genie-api`).
- slice 7: FR-018 (family sharing + Supabase sync), FR-019 (PDPL compliance), FR-020 (freemium).

The Supabase migrations are numbered to avoid collisions: 0016-0017 for FR-018, 0018 for FR-017, 0019 for FR-019, 0020 for FR-020.

Founder decisions are locked: ZNS starting via a distributor; Genie Claude Haiku 4.5; PDPL legal consultation; ZNS supports MONTHLY (FR-017 already has recurrence + month-expander).

## Open items from the independent audit (see INDEPENDENT-AUDIT-2026-06-27.md)

- FR-017 ZNS MONTHLY recurrence: MONTHLY support is locked (founder decision 8); FR-017 already has recurrence + month-expander.
- §5 test traceability: a few ACs in FR-005/006 have had tests added; check further during implementation.
- FR-010 now imports `Reminder` from amlich-core (no mirror).

## Principles throughout

Read `docs/AGENT-GUIDE.md` for the core invariants and writing conventions. An FR is `done` only after it passes the gate; the operator runs the final gate and does the git commit. Build per slice, no leapfrogging dependencies.
