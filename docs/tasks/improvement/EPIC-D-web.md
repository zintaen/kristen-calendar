# EPIC D - web app (W1-W12)

apps/web. Report section 4.

---

## W1. Remove localhost fallbacks; fail builds on missing env

Priority P1 | Effort S | Executor: agent

Context: `lib/config.ts:4` falls back to `http://localhost:3000`; `lib/supabase-client.ts:4-5` falls back to a local URL and a fake anon key. A production build with missing NEXT_PUBLIC vars ships silently broken.

Steps: create `lib/env.ts` exporting validated values; in `next.config.ts`, when `NODE_ENV=production`, throw at build time if `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset; delete the fallbacks (dev keeps localhost defaults only when `NODE_ENV=development`). Add `apps/web/.env.example` (also D4).

Acceptance criteria:
- [ ] `NODE_ENV=production pnpm --filter genie-web build` without env fails with a named-var error.
- [ ] No hardcoded localhost or example key remains in `lib/`.

Verify: `git grep -n "localhost:54321\|examplekey" apps/web/lib`

---

## W2. Use todayInHCM() for the calendar today highlight

Priority P1 | Effort S | Executor: agent

Context: `components/CalendarGrid.tsx:29` uses device-local `new Date()`, breaking the repo's DEC-LUNAR-043 rule; users abroad see the wrong day highlighted for up to 7 hours a day.

Steps: compute `const [d,m,y] = todayInHCM()` and pass numbers into `buildMonthGrid`; adjust `lib/calendarData.ts` `isToday` comparison to compare against those numbers instead of a Date; unit test with a mocked TZ (mirror the TZ-tamper tests in amlich-core).

Acceptance criteria:
- [ ] Grid "today" matches VN date under `TZ=America/Los_Angeles` in tests.
- [ ] `git grep -n "new Date()" apps/web/components/CalendarGrid.tsx` is empty.

---

## W3. Surface reminder validation errors in the form

Priority P1 | Effort S | Executor: agent

Context: `app/reminders/page.tsx:41` discards the `{errors}` result from `globalReminderStore.upsert()`; the form closes as if saved. The form itself only checks title.

Steps: make `upsert` outcomes explicit at the call site: on errors, keep the form open and render field-level messages (map store error codes to Vietnamese strings); enforce input constraints in `ReminderForm.tsx` (day 1-30, month 1-12, numeric parsing with clamps); disable Save while invalid. Unit test the store mapping; e2e covers it in Q2.

Acceptance criteria:
- [ ] Saving day=45 shows an inline error, form stays open, nothing persisted.
- [ ] Valid save closes the form and the reminder appears in the list.

---

## W4. Fix notification id collision risk in the scheduler

Priority P1 | Effort S | Executor: agent

Context: `lib/notifications/scheduler.ts:28` does `parseInt(hash.substring(0,9))` on the planner's string hash; truncation invites collisions and Capacitor dedupes by id, silently dropping one notification.

Steps: replace with a proper 31-bit FNV-1a (or djb2) over the full `reminderId|date|leadDays` string, mask to positive int32; add a collision test across a large synthetic plan (10k occurrences, assert unique ids or acceptably handled duplicates); document that ids are stable across replans (needed for cancel).

Acceptance criteria:
- [ ] Collision test green; ids stable for identical inputs; cancel-by-id still works.

---

## W5. Move shared consent code into a workspace package

Priority P2 | Effort M | Executor: agent

Context: `lib/consent-store.ts:1` and `components/ConsentGate.tsx:6` import from `../../../services/genie-api/lib/consent`, reaching from the client bundle into backend source.

Steps: create `packages/shared` (`@cyberskill/genie-shared`) holding consent types, `CONSENT_POLICY_VERSION`, and purpose constants; update both apps and the API to import from it; forbid the cross-boundary pattern with an ESLint `no-restricted-imports` rule (`**/services/genie-api/**` from apps, and vice versa).

Acceptance criteria:
- [ ] No import path crosses app/service boundaries; lint rule proves it.
- [ ] Typecheck and tests green in web, api, zalo.

---

## W6. Unify consent storage with the storage abstraction

Priority P2 | Effort S | Depends: W5 | Executor: agent

Context: consent flags live in raw localStorage while reminders use the Capacitor Preferences abstraction, so consent behaves differently on native.

Steps: route `consent-store` reads/writes through `lib/storage.ts`; one-time migration reads the legacy localStorage key and rewrites it; test both fresh and migrated paths.

Acceptance criteria:
- [ ] Consent persists via Preferences on native; legacy values survive the migration.

---

## W7. Version stored data; add export/import

Priority P1 | Effort M | Executor: agent

Context: `lib/storage.ts` JSON-parses a raw blob with no schema version; any future Reminder change corrupts installs. No backup or device-move path exists (also a PDPL portability answer, see PD4).

Steps: wrap stored payloads as `{schemaVersion: 1, data}`; add a migration ladder (`migrations[from] -> to`) applied on read; defensive parse (corrupt JSON -> backup the raw string under a recovery key, start clean, notify the user); add Settings actions "Xuat du lieu" (share/download JSON) and "Nhap du lieu" (file picker, validate with the same schema, merge or replace with confirm). Unit tests: v0->v1 migration, corrupt blob recovery, export/import round-trip.

Acceptance criteria:
- [ ] Old-format data loads through the migration with no loss (test).
- [ ] Export then import on a clean profile reproduces identical reminders and settings.

---

## W8. Lazy-load Genie chat; dedupe font loading

Priority P2 | Effort S | Executor: agent

Context: `GlobalGenie` statically imports `GenieChat` (react-markdown + remark-gfm) in the root layout - every page pays for the chat bundle. Be Vietnam Pro loads twice (layout link tag + `FontFace` fetch in `lib/card-renderer.ts:59`), and the page uses raw Google Fonts links instead of `next/font`.

Steps: `next/dynamic(() => import("./GenieChat"), {ssr:false})` loaded on first FAB open with a small spinner; switch layout fonts to `next/font/google` (Be Vietnam Pro 400/500/600/700, `display: swap`); have the card renderer check `document.fonts.check("700 16px 'Be Vietnam Pro'")` before fetching its own FontFace. Record bundle-size before/after in the handoff (`next build` output).

Acceptance criteria:
- [ ] Home route first-load JS drops (numbers in handoff); chat opens correctly after lazy load.
- [ ] Single font pipeline; share card renders with the correct face offline (F2 caches it).

---

## W9. Security headers via Caddy

Priority P1 | Effort S | Depends: I2 | Executor: agent

Context: static export cannot set headers from next.config; Caddy sets none. Ownership decision: headers live in the Caddyfile (see I2 for the concrete block). This task tracks the app-side inputs.

Steps: define the CSP inventory from the app side: `default-src 'self'`; `connect-src` self + Supabase URL + API origin + fonts.gstatic.com; `img-src` self data: + affiliate image hosts; `style-src` self 'unsafe-inline' (Tailwind inline styles) - tighten later; `font-src` self + fonts.gstatic.com; frame-ancestors 'none'. Deliver as a documented header block inside `deploy/Caddyfile` (I2 applies it) and verify no console CSP violations across all routes in a Playwright pass.

Acceptance criteria:
- [ ] All routes load with CSP enforced, zero violation reports in the e2e sweep.
- [ ] securityheaders.com grade A or explanation recorded.

---

## W10. Interaction accessibility pass

Priority P1 | Effort M | Executor: agent

Context: 2 of ~23 client components use any aria attribute; `DayCell` and `GoodDayList` are clickable divs with no role/tabIndex/keyboard handler; bottom sheets do not trap or restore focus; nav lacks aria-current; several inputs lack labels.

Steps: convert clickable divs to `<button>` (or role="button" + tabIndex + Enter/Space handlers) in `DayCell`, `GoodDayList`; give DayCell an aria-label ("15 thang 6 am lich, ngay Hoang Dao..."); add `aria-current="page"` in BottomNav; focus-trap + focus-restore + Escape-close in `DayDetailPanel` and `ShareCardSheet` (small util, no new dep); `htmlFor`/id pairs on all form fields; run `@axe-core/playwright` on home, calendar, reminders, settings and fix criticals.

Acceptance criteria:
- [ ] Keyboard-only: open a day, read details, close, add a reminder - all reachable.
- [ ] axe scan: zero critical/serious violations on the four core routes (test in CI).

---

## W11. UX polish: toasts, loading states, dark mode, manifest

Priority P2 | Effort M | Executor: agent

Steps: replace every `alert()` (store page, polls, good-day picker, EventKitBridge) with a small toast component consistent with genie-ui tokens; give `settings/page.tsx` a spinner instead of `return null`; add `React.memo` to `DayCell`; dark mode - add `darkMode: "media"` (or class strategy) with token variants from genie-ui and a `theme_color` media variant in metadata; manifest.json - add `screenshots`, `orientation: "portrait"`, maskable icon purpose (id/scope handled in F2).

Acceptance criteria:
- [ ] `git grep -n "alert(" apps/web` returns nothing outside tests.
- [ ] Dark-mode snapshot passes APCA checks for the token pairs used (extend the existing apca tests).

---

## W12. tsconfig target and path alias cleanup

Priority P2 | Effort S | Executor: agent

Context: `target: "es5"` in a React 19/Next 15 app is vestigial; the `@/*` alias is defined but unused (code uses relative paths).

Steps: bump target/lib to ES2022; either adopt `@/*` everywhere via a codemod or delete the alias (pick adopt - shorter imports, less churn later); verify build and tests.

Acceptance criteria:
- [ ] Build output unchanged functionally; typecheck green; one import style across the app.
