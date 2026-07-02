# LUNAR module - feature request index

_Authored 2026-06-27 with the CyberOS feature-request-author workflow from `docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam ("Genie Âm Lịch" của CyberSkill).md`. 20 full FRs (209.5 engineering-hours), audit 10/10 for all 20._

The `LUNAR` module is the kristen-calendar product, commercial name "Genie Am Lich" by CyberSkill: a Vietnamese lunar-calendar reminder app in a purple palette, computing dates on-device with the Ho Ngoc Duc algorithm (UTC+7, meridian 105 degrees E), running on Web/PWA, iOS via Capacitor, and Zalo Mini App, with a thin serverless backend for the AI Genie (Claude) and ZNS. Each FR traces back to a specific statement in the PRD and is written to the CyberOS 11-section engineering-spec template, with an `*.audit.md` file iterated to 10/10. An independent audit pass (adversarial, run by reviewers who did not write the spec) was performed on 2026-06-27 and corrected the cross-FR defects that self-audit missed; see [`INDEPENDENT-AUDIT-2026-06-27.md`](INDEPENDENT-AUDIT-2026-06-27.md).

## FRs

| FR | Priority | Status | Phase·Slice | Hours | Title |
|---|---|---|---|---:|---|
| [FR-LUNAR-001](FR-LUNAR-001-amlich-core-conversion-engine.md) | MUST | ready_to_implement | P0·1 | 16 | Core lunar engine - port the Ho Ngoc Duc algorithm to TypeScript, convertSolar2Lunar / convertLunar2Solar in Vietnamese time, offline, zero-dependency |
| [FR-LUNAR-002](FR-LUNAR-002-canchi-zodiac-tietkhi.md) | MUST | ready_to_implement | P0·1 | 10.5 | Can-chi, Vietnamese zodiac (Meo/Trau), 24 tiet khi + 12 Trung khi |
| [FR-LUNAR-003](FR-LUNAR-003-validation-golden-fixtures.md) | MUST | ready_to_implement | P0·1 | 14 | Golden validation harness - cross-check the Ho Ngoc Duc calendar 100% for 1900-2199, edge years 1985/2007/2030/2053, round-trip |
| [FR-LUNAR-004](FR-LUNAR-004-reminder-model-recurrence-engine.md) | MUST | ready_to_implement | P1·2 | 12 | Reminder data model + recurrence engine - store the lunar date, auto-generate the solar date each year, leap-month fallback, timezone lock |
| [FR-LUNAR-005](FR-LUNAR-005-local-notifications-rolling-64.md) | MUST | ready_to_implement | P1·2 | 10 | Local notification scheduler - rolling-64 on iOS via @capacitor/local-notifications, deep-link userInfo |
| [FR-LUNAR-006](FR-LUNAR-006-reminder-management.md) | MUST | ready_to_implement | P1·3 | 10 | Reminder management - Ram/Mung Mot toggled separately, enter death anniversaries, custom reminders, lead-time + reminder hour, upcoming list |
| [FR-LUNAR-007](FR-LUNAR-007-month-calendar-grid.md) | MUST | ready_to_implement | P1·3 | 9 | Month calendar grid - large solar date + small lunar date in the corner + can-chi + tiet khi + festival dot, tap to view detail |
| [FR-LUNAR-008](FR-LUNAR-008-festival-ritual-content.md) | MUST | ready_to_implement | P1·3 | 7 | Festival + ritual content - 13 lunar occasions (meaning, offering tray, checklist), a folk-custom reference label |
| [FR-LUNAR-009](FR-LUNAR-009-purple-theme-apca-design-system.md) | MUST | ready_to_implement | P1·2 | 8 | Purple style pack - a purple sub-brand extending the CyberSkill design-system, Be Vietnam Pro, an APCA contrast gate Lc >= 75 |
| [FR-LUNAR-010](FR-LUNAR-010-app-shell-pwa-capacitor.md) | MUST | ready_to_implement | P1·2 | 10 | App shell - Next.js/React PWA + Capacitor iOS wrapper, import amlich-core, on-device storage, routing |
| [FR-LUNAR-011](FR-LUNAR-011-day-quality-hoangdao-truc-28sao.md) | MUST | ready_to_implement | P2·4 | 12 | Day quality - Hoang dao/Hac dao, 12 Truc, 28 stars, Hoang dao hours, computed from can-chi + tiet khi |
| [FR-LUNAR-012](FR-LUNAR-012-good-day-picker.md) | MUST | ready_to_implement | P2·4 | 7 | Good-day picker - choose the type of work (signing a contract, first use of a machine, launch, grand opening), list the Hoang dao days in a range |
| [FR-LUNAR-013](FR-LUNAR-013-ios-widget-watch-glance.md) | SHOULD | ready_to_implement | P2·5 | 12 | iOS glanceable surfaces - WidgetKit widget + Apple Watch complication, native Swift in ios/App |
| [FR-LUNAR-014](FR-LUNAR-014-shareable-purple-cards.md) | SHOULD | ready_to_implement | P2·5 | 6 | Shareable cards - purple-palette cards exported as images ("Today is the Ram of the first lunar month"), share to social networks |
| [FR-LUNAR-015](FR-LUNAR-015-ai-genie-claude-proxy.md) | MUST | ready_to_implement | P2·4 | 14 | AI Genie - serverless Claude proxy (/api/genie), Claude Haiku 4.5, prompt caching, rate-limit, key only on the server |
| [FR-LUNAR-016](FR-LUNAR-016-zalo-mini-app-client.md) | MUST | ready_to_implement | P3·6 | 14 | Zalo Mini App client - React + zmp-ui + zmp-sdk/apis, import amlich-core, zmp Storage, consent getUserInfo/getPhoneNumber |
| [FR-LUNAR-017](FR-LUNAR-017-zns-reminders-zalo-oa.md) | MUST | ready_to_implement | P3·6 | 10 | ZNS reminders - send reminders via Zalo OA, approved template, 06:00-22:00 window, <= 7 days before/after, OA token auto-refresh |
| [FR-LUNAR-018](FR-LUNAR-018-family-sharing-cloud-sync.md) | SHOULD | ready_to_implement | P3·7 | 12 | Family sharing + cloud sync - Supabase/Postgres with RLS, sharedWith, multi-device sync |
| [FR-LUNAR-019](FR-LUNAR-019-pdpl-compliance-consent.md) | MUST | ready_to_implement | P3·7 | 9 | PDPL compliance - Vietnamese privacy policy, granular consent, on-device by default, no cross-border transfer until DPIA |
| [FR-LUNAR-020](FR-LUNAR-020-freemium-monetization.md) | SHOULD | ready_to_implement | P3·7 | 7 | Freemium monetization - basic reminders free, premium for AI Genie / good-day / family, entitlement gating server-side |
| [FR-LUNAR-021](FR-LUNAR-021-proactive-ai-genie-2.md) | MUST | ready_to_implement | P4·8 | 15 | Proactive AI (Genie 2.0) - automatic cron check and smart ZNS push for major occasions |
| [FR-LUNAR-022](FR-LUNAR-022-o2o-commerce-marketplace.md) | SHOULD | ready_to_implement | P4·8 | 10 | O2O Commerce - affiliate links and a UI suggesting offering items/services via Zalo |
| [FR-LUNAR-023](FR-LUNAR-023-apple-ecosystem-integration.md) | MUST | ready_to_implement | P4·9 | 15 | Apple Ecosystem - Siri App Intents, Live Activities / Dynamic Island countdown |
| [FR-LUNAR-024](FR-LUNAR-024-android-expansion-glance.md) | MUST | ready_to_implement | P4·8 | 20 | Android Expansion - Capacitor Android platform, Kotlin Glance Widget |
| [FR-LUNAR-025](FR-LUNAR-025-collaborative-decision-boards.md) | SHOULD | ready_to_implement | P4·9 | 15 | Collaborative Decision Boards - vote on good days via a Zalo/Supabase Realtime link |

## Build order (topological)

Derived from `depends_on`. Each FR is buildable once its upstream FRs are `done`.

1. **Layer 0 (no dependencies):** FR-LUNAR-001, FR-LUNAR-009
2. **Layer 1:** FR-LUNAR-002 (->001), FR-LUNAR-004 (->001), FR-LUNAR-008 (->001), FR-LUNAR-010 (->001,009)
3. **Layer 2:** FR-LUNAR-003 (->001,002), FR-LUNAR-007 (->001,002,010), FR-LUNAR-011 (->002), FR-LUNAR-005 (->004,010), FR-LUNAR-016 (->004,008,009), FR-LUNAR-018 (->004)
4. **Layer 3:** FR-LUNAR-006 (->004,005,010), FR-LUNAR-012 (->010,011), FR-LUNAR-013 (->001,002,011), FR-LUNAR-014 (->007,009), FR-LUNAR-015 (->008,010), FR-LUNAR-017 (->004,016), FR-LUNAR-019 (->016,018)
5. **Layer 4:** FR-LUNAR-020 (->015,018), FR-LUNAR-021 (->015,017), FR-LUNAR-022 (->010,016), FR-LUNAR-024 (->010)
6. **Layer 5:** FR-LUNAR-023 (->013), FR-LUNAR-025 (->012,018)

The highest technical risk sits in Layer 0-1 (core engine + can-chi + recurrence). The PRD requires building and testing FR-001..003 first: if any year in 1900-2199 or the edge years 1985/2007/2030/2053 is off, stop, debug, do not yet build UI.

## Dependency edges (reciprocal)

```
001 -> blocks: 002, 003, 004, 007, 008, 010, 013
002 -> blocks: 003, 007, 011, 013
004 -> blocks: 005, 006, 016, 017, 018
005 -> blocks: 006
007 -> blocks: 014
008 -> blocks: 015, 016
009 -> blocks: 010, 014, 016
010 -> blocks: 005, 006, 007, 012, 015
011 -> blocks: 012, 013
015 -> blocks: 020
016 -> blocks: 017, 019
018 -> blocks: 019, 020
```

Each `blocks` edge above is the exact inverse of a downstream `depends_on` edge (coherence-checked 2026-06-27, reciprocity errors = 0, no cycle).

## PRD traceability

| PRD requirement | Covered by |
|---|---|
| FR-A01 (solar <-> lunar), FR-A02 (leap month), FR-A06 (offline) | FR-LUNAR-001 |
| FR-A03 (can-chi, VN zodiac), FR-A04 (24 tiet khi, 12 Trung khi) | FR-LUNAR-002 |
| FR-A05 (month calendar grid) | FR-LUNAR-007 |
| FR-B01 (Ram/Mung Mot), FR-B03 (custom), FR-B04 (lead-time), FR-B07 (upcoming list), FR-F05 (tone) | FR-LUNAR-006 |
| FR-B02 (recurring death anniversary), FR-B06 (timezone lock) | FR-LUNAR-004 |
| FR-B05 (rolling-64 local notification) | FR-LUNAR-005 |
| FR-B08 (ZNS) | FR-LUNAR-017 |
| FR-C01..C06 (AI Genie, proxy, TTS) | FR-LUNAR-015 |
| FR-D01, FR-D02 (occasion content + link) | FR-LUNAR-008 |
| FR-E01 (good-day picker), FR-E04 (EventKit, optional) | FR-LUNAR-012 |
| FR-E02, FR-E03 (Hoang dao/Truc/28 stars/Hoang dao hours) | FR-LUNAR-011 |
| FR-F01 (iOS widget), FR-F02 (Watch complication, optional) | FR-LUNAR-013 |
| FR-F03 (shareable cards) | FR-LUNAR-014 |
| FR-F04 (family sharing) | FR-LUNAR-018 |
| NFR-Accuracy | FR-LUNAR-003 |
| NFR-Offline | FR-LUNAR-001 |
| NFR-Performance | FR-LUNAR-001, FR-LUNAR-007 |
| NFR-Accessibility, NFR-Localization | FR-LUNAR-009 |
| NFR-Privacy/PDPL | FR-LUNAR-019 |
| NFR-Security (key only on the server, OA token, HTTPS) | FR-LUNAR-015, FR-LUNAR-017, FR-LUNAR-019 |
| §9 System Architecture (web + iOS clients) | FR-LUNAR-010 |
| §9 System Architecture (Zalo client) | FR-LUNAR-016 |
| §14 Phase 3 monetization, §15 Success Metrics | FR-LUNAR-020 |

Every functional and non-functional requirement in the PRD maps to at least one LUNAR FR.

## Conventions

- File: `FR-LUNAR-{NNN}-{slug}.md` with a sibling `FR-LUNAR-{NNN}-{slug}.audit.md`.
- Status enum: `draft | ready_to_implement | implementing | ready_to_review | reviewing | ready_to_test | testing | done | on_hold | closed`.
- All 20 FRs at `score_post_revision: 10/10` and `ready_to_implement`.
- DEC-LUNAR-NNN: each FR owns a range of 10 ids (001 -> 010-019, 002 -> 020-029, ...); a decision is introduced inline in `source_decisions` and then referenced in §1/§2.
- Language: Vietnamese prose with diacritics, technical terms and code kept in English; standard keyboard characters (straight quotes, hyphen, ...); the only exception is the middle dot · in the `milestone` field.
- Total effort: 209.5 engineering-hours (16 MUST + 4 SHOULD).

_This index is a derived view; the FR markdown files are the source of truth. See `manifest.json` for machine-readable status and BACKLOG in the parent directory._
