# kristen-calendar - Feature Request Backlog

**Owner:** Stephen Cheng (CEO) - **Status:** backlog v1.0 authored 2026-06-27 from the PRD/SRS via the CyberOS feature-request-author workflow.
**Source of truth:** the FR markdown files in `lunar/`. This index is a derived view.
**Authoring playbook:** CyberOS `feature-request-author` + `feature-request-audit` (11-section engineering-spec, audit-loop to 10/10).
**Product:** "Genie Am Lich" by CyberSkill - a Vietnamese lunar-calendar reminder app in a purple palette, computing dates on-device with the Ho Ngoc Duc algorithm, running on Web/PWA + iOS (Capacitor) + Zalo Mini App, with a thin serverless backend for the AI Genie (Claude) and ZNS.

---

## Headline metrics

| Metric | Value |
|---|---:|
| FRs authored | 25 |
| FRs at 10/10 audit score | 25 (100%) |
| FRs missing an audit file | 0 |
| Dependency cycles | 0 |
| Reciprocity errors | 0 |
| Engineering-hours | ~209.5h |
| PRD requirements covered | 100% (FR-A..F + NFR-Accuracy..Security) |

## Modules

| Module | FRs | Hours | Scope |
|---|---:|---:|---|
| [LUNAR](lunar/README.md) | 25 | ~284.5h | The entire Genie Am Lich product: lunar core engine + can-chi + validation; reminder model + recurrence + local notification rolling-64; reminder management; month calendar; occasion content; purple design-system + APCA; PWA/Capacitor app shell; day-quality (Hoang dao/Truc/28 stars); good-day picker; iOS widget + watch; shareable cards; AI Genie proxy; Zalo Mini App; ZNS; family sharing + sync; PDPL; freemium; proactive AI; O2O commerce; Apple ecosystem; Android expansion; decision boards. |

## Phasing (per PRD roadmap §14)

- **P0 - Core (highest technical risk, do first):** FR-LUNAR-001..003. Build and test `@cyberskill/amlich-core` (conversion, can-chi, leap month) with fixtures 1900-2199 + edge years. Pass threshold: match the Ho Ngoc Duc calendar 100%, including 1985/2007/2030/2053; if any year is off, stop and debug before building UI.
- **P1 - Personal MVP (for the wife):** FR-LUNAR-004..010. Web/PWA + Capacitor iOS, purple theme, Be Vietnam Pro, month calendar, Ram/Mung Mot/death-anniversary/custom reminders + local notifications (rolling 64), static occasion content. Store on-device, no backend, no AI, no ZNS. "Wife finds it useful" criterion: uses it steadily for >= 1 Ram/Mung Mot cycle, misses no reminder.
- **P2 - Advanced experience (personal):** FR-LUNAR-011..015. Day-quality + Hoang dao hours, good-day picker, iOS widget + watch, shareable cards, AI Genie (Claude proxy).
- **P3 - Commercialization:** FR-LUNAR-016..020. Zalo Mini App, OA + ZNS, family sharing + cloud sync (Supabase), PDPL compliance, freemium monetization.
- **P4 - Ecosystem & Proactive Intelligence (Next-gen):** FR-LUNAR-021..025. Proactive AI (Genie 2.0), O2O Commerce (Ritual Marketplace), Apple Ecosystem Deep Integration (Siri, Live Activities), Android Expansion, Collaborative Decision Boards (Choose the Day).

## Status flow

`draft -> ready_to_implement -> implementing -> ready_to_review -> reviewing -> ready_to_test -> testing -> done` (with off-ramps `on_hold` / `closed`). All 20 FRs are at `ready_to_implement`.

## Founder decisions - locked 2026-06-28

All foundational decisions are locked; no decision blocks shipping any longer:

1. **Product direction - go commercial.** Build a full-featured commercial product (all 4 phases P0-P3); the founder's wife is the first user and design partner, not a scope ceiling.
2. **amlich-core - self-port.** Self-port the Ho Ngoc Duc algorithm to TypeScript (full control, correct VN time, license-safe for commercial use).
3. **Accuracy threshold for far years.** Hard gate on absolute match with the golden data for 1900-2100 (the range real users touch: past death anniversaries plus the near-future calendar). For 2100-2199, the Meeus approximation MAY be off by 1 day at a few New Moon points near midnight; these dates are flagged and fixed with a small correction table if cross-checking confirms, and do not block the gate. The round-trip sweep remains a hard 1900-2199. Recorded in FR-LUNAR-003 (DEC-LUNAR-039).
4. **iOS client - Capacitor for v1.** Keep Capacitor (wrapping the shared web build): the product is calendar + reminders + reading content + chat, not animation-heavy; the backlog architecture is already based on the shared web build; the widget and watch remain a native Swift target inside Capacitor. Consider React Native only if a specific performance wall is hit.
5. **ZNS - start via a distributor.** Start via a distributor (for example VietGuys) to shorten OA/ZNS onboarding and template approval; move to the Zalo OA Open API directly once volume is sufficient. (Recommendation, MAY change.)
6. **Genie model - Claude Haiku 4.5.** Default to Claude Haiku 4.5 plus prompt caching; upgrade to Sonnet only if the quality of custom-answers is not met under real evaluation.
7. **PDPL - privacy-first, legal consultation.** Design privacy-first (FR-LUNAR-019); consult legal before commercializing widely beyond the family. Personal/family use is exempt, so the first build for the wife is outside PDPL scope.
8. **ZNS MONTHLY - support confirmed.** FR-LUNAR-017 supports MONTHLY server-side reminders (recurrence plus month-expander); Ram/Mung Mot recur correctly via ZNS.


## Next steps

1. An independent `feature-request-audit` pass ran 2026-06-27: 2 blockers + about 13 code-level majors were found and fixed; see `lunar/INDEPENDENT-AUDIT-2026-06-27.md`. Re-audit an individual FR only when its scope changes.
2. Start P0 slice 1 (FR-LUNAR-001..003) via the CTO `ship-feature-requests` workflow, completing one FR at a time. The implementing agent reads `lunar/SHIP-READINESS.md` (handoff) + `lunar/CONTRACT.md` (API authority) + `docs/AGENT-GUIDE.md` first. This is the highest technical risk: matching the Ho Ngoc Duc calendar 100% is the go/no-go threshold before building UI.
3. Founder decisions are all locked (see the section above); no decision blocks shipping any longer. What remains for the operator: expand `gold-1900-2199.json` from the golden source, run the gate on the machine, create a branch + commit.

---

_See `lunar/README.md` for the full FR catalog, build order, and PRD traceability, and `lunar/manifest.json` for machine-readable status._

## Conventions (CyberOS)

One backlog for both classes: rows are `- [status] FR-ID-slug - title`;
`class: improvement` rows carry an `(improvement)` suffix, product rows are untagged.
FR frontmatter `status` is the record of truth; this file is the index.

- improvement programs: see `improvement/` (moved from `docs/improvement/`; class: improvement work - convert items to FRs on pickup)
