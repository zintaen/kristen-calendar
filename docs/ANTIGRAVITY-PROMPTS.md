# Antigravity kickoff prompts - Genie Am Lich

A set of prompts to build the project with Antigravity (or any coding agent), one prompt per slice,
following `docs/BUILD-RUNBOOK.md`. How to use: open one agent session per slice and paste a whole prompt
block (each block is self-contained). Do P0 first, in order, no skipping. After each slice the agent stops
and reports; review the branch, merge, then move to the next slice. The
`[Context]/[Read first]/[Invariants]/[Discipline]` block repeats in every prompt on purpose, so each
session stands alone without the previous session's context.

Each prompt is in English because coding agents read English most precisely; the agent can still read the docs.

---

## P0 - slice 1: core engine (TASK-LUNAR-001, 002, 003)

```text
[Context] You are an autonomous coding agent in the repo kristen-calendar (product "Genie Am Lich", a
Vietnamese lunar-calendar reminder app, built as a full commercial product). Implement to spec; never
redesign or change the spec/CONTRACT to make tests pass.
[Read first] docs/tasks/lunar/SHIP-READINESS.md, docs/AGENT-GUIDE.md,
docs/tasks/lunar/CONTRACT.md (the single API authority), docs/BUILD-RUNBOOK.md. For each task,
read its docs/tasks/lunar/TASK-LUNAR-NNN-*.md section 3 (API) and section 5 (tests) first.
(AGENTS.md at the repo root is the CyberOS memory protocol, NOT a build guide.)
[Invariants] convertSolar2Lunar/convertLunar2Solar return labeled TUPLES (destructure; never read
.year/.month; invalid sentinel [0,0,0] via isInvalidSolar()). Can-chi day: can=(jdn+9)%10,
chi=(jdn+1)%12 (TASK-002 owns); take dia chi from canChiDay(jdn).chiIndex. amlich-core is zero-dependency
and offline; all date math locked to Asia/Ho_Chi_Minh (todayInHCM). Import only names that exist in
CONTRACT.md. The three epochs and two synodic constants in constants.ts are distinct; never conflate.
[Discipline] Work on a dedicated branch dev/p0-core. Run continuously without pausing
(implement -> pnpm --filter @cyberskill/amlich-core typecheck -> pnpm gate:p0 -> fix -> repeat). One
atomic git commit per task when its tests + typecheck are green; do NOT push or merge; do NOT mark an task
done before its gate is green; do NOT skip dependencies. If the spec or CONTRACT is genuinely wrong (not
just inconvenient), STOP and flag the exact clause.

[Task this session] Implement packages/amlich-core for TASK-LUNAR-001, 002, 003 to a fully green gate. The
package is scaffolded (constants, types, fixtures, harness exist; algorithm functions are STUBS that
throw). Fill the stubs in dependency order: jd.ts -> astro.ts -> leap.ts -> convert.ts -> canchi.ts ->
tietkhi.ts, porting the canonical Ho Ngoc Duc algorithm using the EXACT constants already in
src/constants.ts. Run `pnpm install` first.

P0 ACCURACY GATE (TASK-003, the founder's commercial bar):
- Round-trip sweep 1900-2199 (golden-sweep.test.ts) must be 0 mismatch.
- Absolute correctness for 1900-2100 is a HARD gate, verified INDEPENDENTLY of the engine by the
  astronomy-engine oracle test (add astronomy-engine as a devDependency; exact-day match) AND the
  gold-data diff vs test/fixtures/gold-1900-2199.json. The gold file is seeded with the edge years;
  expand it with a dense sampled set from the official Ho Ngoc Duc calculator if you can source it,
  otherwise rely on the astronomy oracle as the absolute check and clearly flag that the gold set
  needs expanding.
- For 2100-2199: within-1-day is acceptable; emit the suspect-midnight report (new moon within ~15 min
  of Asia/Ho_Chi_Minh midnight) and add a small hardcoded correction table ONLY if a discrepancy is
  confirmed. Not gate-blocking.
- Property tests per TASK-003 §5 (12 or 13 months/year, leap only in 13-month years, Dong chi in month 11,
  month length 29/30, Tet = 2nd new moon after winter solstice).
If ANY 1-day mismatch appears in 1900-2100 -> STOP, debug, and do NOT build any UI.

When green: STOP and report which tests pass, the gate output, the suspect-date list (if any), and any
spec issues you flagged. Propose starting P1 slice 2.
```

---

## P1 - slice 2: foundation (TASK-LUNAR-009, 004, 010, 005)

```text
[Context] You are an autonomous coding agent in the repo kristen-calendar (product "Genie Am Lich", a
Vietnamese lunar-calendar reminder app, full commercial product). Implement to spec; never change the
spec/CONTRACT to pass tests.
[Read first] docs/tasks/lunar/SHIP-READINESS.md, docs/AGENT-GUIDE.md,
docs/tasks/lunar/CONTRACT.md (API authority), docs/BUILD-RUNBOOK.md; for each task read its
docs/tasks/lunar/TASK-LUNAR-NNN-*.md section 3 + section 5 first. (Root AGENTS.md = CyberOS
memory protocol, not a build guide.) Prereq: P0 (amlich-core) is green.
[Invariants] convert* return tuples (destructure; invalid [0,0,0] via isInvalidSolar); can-chi day
can=(jdn+9)%10 chi=(jdn+1)%12, dia chi via canChiDay().chiIndex; amlich-core zero-dep + offline, dates
locked Asia/Ho_Chi_Minh (todayInHCM); import only CONTRACT names; the Reminder type is owned by TASK-004 in
@cyberskill/amlich-core - import it, never redeclare/mirror.
[Discipline] Branch dev/p1-foundation. Run continuously (implement -> typecheck -> test -> fix). One
atomic commit per task when its §4 ACs + §5 tests are green + typecheck clean; never push/merge; never mark
done before gate green; never skip deps; if spec/CONTRACT is genuinely wrong, STOP and flag the clause.
After any change to amlich-core (TASK-004), re-run pnpm gate:p0 to confirm no regression.

[Task this session] Implement, in this order:
- TASK-LUNAR-009 (packages/ui = @cyberskill/genie-ui): purple theme pack. KEEP the CyberSkill base tokens
  (Umber #45210E, Ochre #F4BA17), only OVERRIDE color to purple over warm cream. The APCA Lc>=75 gate via
  apca-w3 must be a real build/test gate that THROWS on a failing pair. Be Vietnam Pro typography.
- TASK-LUNAR-004 (packages/amlich-core): reminder model + recurrence + tz. Match CONTRACT exactly -
  Occurrence is the 8-field shape with gregorianDate as a "YYYY-MM-DD" string + fireAtLocal; implement
  normalizeReminder/validateReminder/isCacheStale/nextOccurrences/mergeAndSort/todayInHCM; leap-month
  fallback REGULAR/SKIP/ASK with fellBack/pendingUserChoice flags; ONCE+SKIP must not infinite-loop.
- TASK-LUNAR-010 (apps/web = genie-web): Next.js/React PWA shell + Capacitor host. Static export; lazy-load
  Capacitor plugins via dynamic import (NO top-level @capacitor import in the web bundle); isCapacitor()
  must be SSG-safe (guard typeof window); on-device storage adapter; import Reminder from amlich-core.
- TASK-LUNAR-005 (apps/web): local notifications with the rolling-64 strategy - removeAllPendingNotification
  Requests then schedule the 64 SOONEST occurrences across all enabled reminders; lead-times create
  multiple notifications counted against the 64 budget; userInfo carries reminderId for deep-link.

When green: STOP and report. Propose P1 slice 3.
```

---

## P1 - slice 3: MVP usable (TASK-LUNAR-008, 007, 006)

```text
[Context] Autonomous coding agent in kristen-calendar (Genie Am Lich, VN lunar reminder app, commercial).
Implement to spec; never change spec/CONTRACT to pass tests.
[Read first] docs/tasks/lunar/SHIP-READINESS.md, docs/AGENT-GUIDE.md,
docs/tasks/lunar/CONTRACT.md (API authority), docs/BUILD-RUNBOOK.md; for each task read its
TASK-LUNAR-NNN-*.md §3 + §5. (Root AGENTS.md = CyberOS memory protocol.) Prereq: P0 + P1 slice 2 green.
[Invariants] convert* return tuples (destructure; invalid [0,0,0] via isInvalidSolar); can-chi
can=(jdn+9)%10 chi=(jdn+1)%12, dia chi via canChiDay().chiIndex; amlich-core offline + zero-dep, dates
Asia/Ho_Chi_Minh (todayInHCM); import only CONTRACT names; Reminder owned by TASK-004.
[Discipline] Branch dev/p1-mvp. Continuous loop (implement -> typecheck -> test -> fix). One atomic commit
per task on green gate; never push/merge; never mark done before gate green; never skip deps; STOP + flag if
spec/CONTRACT genuinely wrong.

[Task this session]
- TASK-LUNAR-008 (packages/content = @cyberskill/genie-content): FestivalContent for the 13 dip from PRD
  section 7. Use the FLAT shape from CONTRACT (lunarDay/lunarMonth as number|null, top-level), a mandatory
  "tham khao phong tuc dan gian" disclaimer on every record, region variants where relevant; Thanh Minh and
  dam gio ca nhan have lunarDay null. buildFestivalDateSet(year) must destructure the convert tuple.
- TASK-LUNAR-007 (apps/web): month calendar grid. Use a one-pass buildMonthGrid (no per-cell convert inside
  the React render loop); SSR/SSG-safe month start-padding computed via Intl Asia/Ho_Chi_Minh (not
  Date.getDay()); use tietKhiAt (NOT getTietKhi) and show a tiet-khi label only on the start day; tap a day
  -> detail. Target render < 100ms.
- TASK-LUNAR-006 (apps/web): reminder management. Ram/Mung Mot monthly toggles; gio entry by lunar date;
  custom reminders; lead-time options {dung ngay, truoc 1/3 ngay, truoc 1 tuan} + notify time; the form must
  SURFACE the leapFallback selector when isLeapMonth, and the upcoming list must show fellBack /
  pendingUserChoice state; upcoming list shows the solar dates.

This slice completes the personal MVP: it should be installable on the wife's iPhone (web/PWA + Capacitor,
on-device, no backend). When green: STOP and report, and note it is ready for real dogfooding. Propose P2 slice 4.
```

---

## P2 - slice 4: day-quality + Genie (TASK-LUNAR-011, 012, 015)

```text
[Context] Autonomous coding agent in kristen-calendar (Genie Am Lich, VN lunar reminder app, commercial).
Implement to spec; never change spec/CONTRACT to pass tests.
[Read first] SHIP-READINESS.md, docs/AGENT-GUIDE.md, CONTRACT.md (API authority), docs/BUILD-RUNBOOK.md;
for each task read its TASK-LUNAR-NNN-*.md §3 + §5. (Root AGENTS.md = CyberOS memory protocol.) Prereq: P0 + P1 green.
[Invariants] convert* tuples; can-chi can=(jdn+9)%10 chi=(jdn+1)%12, dia chi via canChiDay().chiIndex;
amlich-core offline + zero-dep, dates Asia/Ho_Chi_Minh; import only CONTRACT names; Reminder owned by TASK-004.
[Discipline] Branch dev/p2-quality. Continuous loop; one atomic commit per task on green gate; never
push/merge; never mark done before gate green; never skip deps; STOP + flag if spec/CONTRACT genuinely wrong.
After changing amlich-core (TASK-011), re-run pnpm gate:p0.

[Task this session]
- TASK-LUNAR-011 (packages/amlich-core, new dayquality.ts): Hoang dao/Hac dao, 12 Truc, 28 sao, gio Hoang dao.
  CRITICAL: take dia chi from canChiDay(jdn).chiIndex (= (jdn+1)%12); NEVER (jdn+9)%60 then %12. Compute Truc
  using tietKhiStartDiaChi(jdn) from TASK-002. Every result carries the "Tham khao phong thuy dan gian"
  disclaimer. Export getDayQuality / getMonthDayQualities / DayQuality / GioInfo exactly as in CONTRACT.
- TASK-LUNAR-012 (apps/web): good-day picker. CONSUME TASK-011 (getMonthDayQualities); do NOT reimplement folk
  logic. 90-day range clamp. EventKit integration is optional/COULD and must not block the main flow.
- TASK-LUNAR-015 (services/genie-api + apps/web): AI Genie via a serverless Claude proxy. ANTHROPIC_API_KEY is
  server-only and NEVER in the response; the model is hardcoded (claude-haiku-4-5) and not client-overridable;
  cache_control:ephemeral on the system prompt block; strip PII before the Claude call; rate-limit reset at
  UTC+7 midnight; TTS is client-side only.

When green: STOP and report. Propose P2 slice 5.
```

---

## P2 - slice 5: glanceable surfaces + cards (TASK-LUNAR-013, 014)

```text
[Context] Autonomous coding agent in kristen-calendar (Genie Am Lich, VN lunar reminder app, commercial).
Implement to spec; never change spec/CONTRACT to pass tests.
[Read first] SHIP-READINESS.md, docs/AGENT-GUIDE.md, CONTRACT.md, docs/BUILD-RUNBOOK.md; for each task read its
TASK-LUNAR-NNN-*.md §3 + §5. (Root AGENTS.md = CyberOS memory protocol.) Prereq: P0 + P1 + P2 slice 4 green.
[Invariants] convert* tuples; can-chi can=(jdn+9)%10 chi=(jdn+1)%12, dia chi via canChiDay().chiIndex;
dates Asia/Ho_Chi_Minh; import only CONTRACT names.
[Discipline] Branch dev/p2-surfaces. Continuous loop; one atomic commit per task on green; never push/merge;
never mark done before gate green; STOP + flag if spec genuinely wrong.

[Task this session]
- TASK-LUNAR-013 (apps/web/ios/App, native Swift): WidgetKit home-screen widget + Apple Watch complication
  showing today's lunar date, can-chi, and gio Hoang dao. Native SwiftUI is required. Port the minimal lunar
  calc to Swift (LunarCalcSwift) using the EXACT PRD 6.2 epoch constants; dia chi = (jdn+1)%12; share data
  from the web layer via an App Group; keep tz=7 consistent across all functions. NOTE the day-pillar fixture:
  29/01/2025 day pillar is Mau Tuat (At Ty is the YEAR can-chi, not the day). XCTest must cover this.
- TASK-LUNAR-014 (apps/web): shareable purple cards. Render a 1080x1080 canvas image ("Hom nay Ram thang Gieng"
  etc.); text must pass APCA per the theme thresholds; consume the already-computed DayInfo without recompute;
  Web Share API with an <a download> fallback.

When green: STOP and report. Propose P3 slice 6. (At this point the personal experience is feature-complete.)
```

---

## P3 - slice 6: Zalo + ZNS (TASK-LUNAR-016, 017)

```text
[Context] Autonomous coding agent in kristen-calendar (Genie Am Lich, VN lunar reminder app, commercial).
Implement to spec; never change spec/CONTRACT to pass tests.
[Read first] SHIP-READINESS.md, docs/AGENT-GUIDE.md, CONTRACT.md, docs/BUILD-RUNBOOK.md; for each task read its
TASK-LUNAR-NNN-*.md §3 + §5. (Root AGENTS.md = CyberOS memory protocol.) Prereq: P0 + P1 + P2 green.
[Invariants] convert* tuples (destructure; invalid via isInvalidSolar, sentinel [0,0,0] - never ===null);
dates Asia/Ho_Chi_Minh (todayInHCM); import only CONTRACT names; Reminder owned by TASK-004.
[Discipline] Branch dev/p3-zalo. Continuous loop; one atomic commit per task on green; never push/merge;
never mark done before gate green; STOP + flag if spec genuinely wrong.

[Task this session]
- TASK-LUNAR-016 (zalo = genie-zalo): Zalo Mini App client. Call zmp.init() first; import @cyberskill/amlich-core
  for all calendar math; todayInHCM() returns a TUPLE - destructure it; require a consent sheet before
  getUserInfo/getPhoneNumber; getPhoneNumber returns a TOKEN (the server exchanges it, do not treat it as a
  real number); the Mini App cannot push natively so reminders go via ZNS; carry recurrence on the stored
  reminder; store only settings + reminder list in zmp Storage and compute days on-the-fly.
- TASK-LUNAR-017 (services/genie-api): ZNS reminders via Zalo OA. Approved template only (<=400 chars, >=1
  personalization param, no pure-ad content); send window 06:00-22:00 checked in Asia/Ho_Chi_Minh (NOT server
  UTC); <=7 days before/after the event; OA token auto-refresh; idempotency via zns_send_log to avoid
  double-billing on cron retry; CRON_SECRET auth; SchedulerReminder MUST carry recurrence + a month-expander so
  MONTHLY reminders (Ram/Mung Mot) recur each month. Migration 0018_zns_send_log.sql. Start via a distributor
  (e.g. VietGuys) per the founder decision.

When green: STOP and report. Propose P3 slice 7.
```

---

## P3 - slice 7: family + PDPL + freemium (TASK-LUNAR-018, 019, 020)

```text
[Context] Autonomous coding agent in kristen-calendar (Genie Am Lich, VN lunar reminder app, commercial).
Implement to spec; never change spec/CONTRACT to pass tests.
[Read first] SHIP-READINESS.md, docs/AGENT-GUIDE.md, CONTRACT.md, docs/BUILD-RUNBOOK.md; for each task read its
TASK-LUNAR-NNN-*.md §3 + §5. (Root AGENTS.md = CyberOS memory protocol.) Prereq: P0 + P1 + P2 + P3 slice 6 green.
[Invariants] dates Asia/Ho_Chi_Minh; import only CONTRACT names; Reminder owned by TASK-004.
[Discipline] Branch dev/p3-commerce. Continuous loop; one atomic commit per task on green; never push/merge;
never mark done before gate green; STOP + flag if spec genuinely wrong.

[Task this session]
- TASK-LUNAR-018 (services/genie-api): family sharing + cloud sync on Supabase/Postgres. RLS ENABLED with
  owner/member policies; shared_with as UUID[] with a GIN index; a consent gate before ANY cloud call;
  last-write-wins conflict resolution on updated_at; single-use JWT invite tokens; migrations
  0016_family_sharing_schema.sql + 0017_family_sharing_rls.sql; a DELETE /api/sync/account endpoint for PDPL
  right-to-erasure.
- TASK-LUNAR-019 (services/genie-api): PDPL compliance. Vietnamese privacy policy; granular consent flags,
  unchecked by default, no dark patterns; stripSensitiveFields() before any Claude call; an explicit
  checkCrossBorderTransfer() gate; store ip_hash (SHA-256), never raw IP; policy_version (semver) to detect
  re-consent; migration 0019_consent_log.sql. Personal/family use is PDPL-exempt - the machinery stays dormant
  until use goes beyond family.
- TASK-LUNAR-020 (services/genie-api): freemium. Entitlement enforced SERVER-SIDE (a tampered client must still
  get 403); verify the payment webhook signature (App Store JWS / Zalo Pay HMAC) BEFORE granting; atomic quota
  increment via ON CONFLICT DO UPDATE; cache entitlement in memory (not localStorage); migration
  0020_entitlements.sql.

When green: STOP and report. The product is now feature-complete across all 4 phases; summarize the full
test/gate status and any spec issues flagged across the build.
```

---

## General notes

- The optional v2 items are already folded into the tasks: Apple Watch complication (in TASK-013), EventKit
  (TASK-012), TTS (TASK-015). No separate prompt is needed.
- After each slice: review the branch, merge into the integration branch, then move to the next slice.
  Do not let the agent push or merge on its own.
- If a slice is too large for one session, split it per task (one task per session) by keeping the
  [Context]/[Read first]/[Invariants]/[Discipline] block and reducing [Task] to a single task.
- The only decisions left open at build time: the gold-data source for TASK-003 (expand gold-1900-2199.json)
  and registering the Zalo OA plus submitting the ZNS template (do this early because approval takes time).
