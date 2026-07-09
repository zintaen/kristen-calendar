# EPIC B - functional blockers (F1-F8)

All P0. The product does not work as designed until these close. Report section 2. F7 is split into Z1 + Z2 (EPIC F).

---

## F1. Persist and send the Supabase auth token to the backend

Priority P0 | Effort M | Depends: none | Executor: agent

Context: `lib/genie-client.ts:48`, `lib/entitlement-client.ts:42`, and `components/UpgradePrompt.tsx:38` read `Preferences.get({key:'token'})`, but nothing ever writes that key (verified by grep). Every Genie and entitlement call is anonymous and gets 403. The flagship paid feature is broken end to end.

Steps:
1. Drop the parallel `'token'` store. Create `lib/auth-token.ts` with `getAccessToken()` that calls `supabase.auth.getSession()` and returns `session?.access_token ?? null` (Supabase refreshes internally; enable `persistSession: true` with a Capacitor Preferences storage adapter in `lib/supabase-client.ts` so sessions survive app restarts on native).
2. Replace the three `Preferences.get({key:'token'})` call sites with `getAccessToken()`; send no Authorization header when null instead of `Bearer ` + empty string.
3. Handle 401 responses in `genie-client` and `entitlement-client` by prompting login (route to `/login`).
4. Unit test: mocked session -> header present; no session -> no header; e2e Genie happy path with a stubbed backend asserting the Authorization header (extend `tests/genie.spec.ts`).

Acceptance criteria:
- [ ] Logged-in user's Genie request carries a valid `Authorization: Bearer <jwt>`.
- [ ] Session survives an app restart on native (Preferences-backed storage adapter).
- [ ] No code path sends the literal header `Bearer ` with an empty token.

Verify:
```bash
git grep -n "key: 'token'" apps/web   # empty
pnpm --filter genie-web test
pnpm --filter genie-web exec playwright test tests/genie.spec.ts
```

---

## F2. Add a service worker and offline shell (Serwist)

Priority P0 | Effort L | Depends: none | Executor: agent

Context: apps/web has no service worker at all - no offline shell, no precache, no update flow. The app's core promise is offline lunar math plus reminders.

Steps:
1. Add `@serwist/next` (maintained successor to next-pwa, works with Next 15 and static export). Configure `sw.ts` with: precache of build assets, runtime CacheFirst for fonts and static content, NetworkFirst with cache fallback for the app shell, and no caching of `/api/*`.
2. Register the worker only in production builds; add an update-available toast that calls `skipWaiting` + reload on confirm.
3. Extend `public/manifest.json`: `id`, `scope`, maskable icon, orientation (pairs with W11 but the id/scope belong here).
4. e2e smoke: with the dev server killed after first load, Playwright reloads and the shell plus calendar page still render (offline test via `context.setOffline(true)`).

Acceptance criteria:
- [ ] Lighthouse PWA installability passes (installable, SW active, offline start).
- [ ] Calendar and home routes render offline after first visit; lunar math (on-device) works offline.
- [ ] New deploy shows the update toast; accepting it activates the new version.

Verify:
```bash
pnpm --filter genie-web build && npx serve apps/web/out &
npx lighthouse http://localhost:3000 --only-categories=pwa --chrome-flags="--headless"
```

---

## F3. Implement web notifications or scope web honestly

Priority P0 | Effort M | Depends: F2 | Executor: agent (decision point flagged for human)

Context: `lib/notificationGlue.ts` WebNotificationStub always refuses permission and no-ops all scheduling, silently. Web users believe reminders are set; nothing will ever fire.

Decision for the human reviewer (pick in the handoff): (a) implement best-effort web notifications, or (b) scope reminders to iOS/Zalo and say so in the UI. The spec below implements (a) with honest UX either way.

Steps:
1. Replace the stub with a real `WebNotificationService`: `Notification.requestPermission()`, schedule via the service worker (F2) using a periodic check on activation plus `TimestampTrigger` where available; fall back to firing due notifications on app open.
2. Whichever branch is active, make the UI truthful: when the platform cannot deliver background notifications, the reminder form shows a persistent notice ("Web nhac khi mo app; cai dat iOS hoac Zalo de nhac nen") instead of pretending.
3. Unit tests for permission flows and the on-open catch-up path; extend the planner test to cover the web scheduler.

Acceptance criteria:
- [ ] `requestPermission()` on web reflects the real browser permission, never a hardcoded false.
- [ ] A due reminder fires a visible notification on supported browsers, or the catch-up path shows it on next open.
- [ ] UI copy discloses the delivery limits on web.

Verify:
```bash
pnpm --filter genie-web test -- notificationGlue
```

---

## F4. Add missing iOS calendar usage descriptions

Priority P0 | Effort S | Depends: none | Executor: agent+human

Context: `components/EventKitBridge.ts` requests calendar permission, but `apps/web/ios/App/App/Info.plist` has no `NSCalendarsUsageDescription` / `NSCalendarsFullAccessUsageDescription` (iOS 17+) / `NSCalendarsWriteOnlyAccessUsageDescription`. iOS kills the app with SIGABRT on that code path; App Store review rejects it.

Agent steps: add all three keys to Info.plist with Vietnamese user-facing strings explaining why (adding good-day events to the user's calendar).
Human steps: build in Xcode, tap through the good-day picker calendar connect flow on a device or simulator, confirm the permission sheet appears and no crash.

Acceptance criteria:
- [ ] All three calendar usage keys present with meaningful strings.
- [ ] Manual device test recorded in the handoff (screenshot or note).

Verify:
```bash
/usr/libexec/PlistBuddy -c "Print :NSCalendarsFullAccessUsageDescription" apps/web/ios/App/App/Info.plist
```

---

## F5. Add aps-environment and background task identifiers

Priority P0 | Effort S | Depends: none | Executor: agent+human

Context: `App.entitlements` lacks `aps-environment` while `usePushNotifications.ts` calls `PushNotifications.register()` (registration fails on device); `BGRefresh.swift` registers `world.cyberskill.genieamlich.refresh` but Info.plist lacks `BGTaskSchedulerPermittedIdentifiers` and `UIBackgroundModes` (silent no-op).

Agent steps:
1. Add `aps-environment` (development) to `App.entitlements`; note in the handoff that the release build needs the production value via the provisioning profile.
2. Add to Info.plist: `BGTaskSchedulerPermittedIdentifiers` = [`world.cyberskill.genieamlich.refresh`], `UIBackgroundModes` = [`fetch`, `processing`].

Human steps: enable Push Notifications and Background Modes capabilities in the Apple Developer portal + Xcode signing; verify `PushNotifications.register()` returns a token on device; trigger the BG task in the debugger (`e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"world.cyberskill.genieamlich.refresh"]`).

Acceptance criteria:
- [ ] Entitlement and both Info.plist keys present.
- [ ] Device test: push token received; BG refresh fires in simulation. Recorded in handoff.

---

## F6. Env-driven RevenueCat keys and real appUserID

Priority P0 | Effort M | Depends: F1 | Executor: agent+human

Context: `lib/monetization/IAPService.ts` hardcodes `apiKey: "appl_XXXXX"` / `"goog_XXXXX"` and `appUserID = "local-dev-user"` for every user. IAP cannot work, and all purchases would collapse into one RevenueCat identity.

Agent steps:
1. Read keys from `NEXT_PUBLIC_REVENUECAT_APPLE_KEY` / `NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY` (public SDK keys, safe to expose); add to `.env.example`, Dockerfile args, compose args, and the W1 env validation. When unset, `IAPService.configure()` disables the store UI with a clear log instead of configuring with placeholders.
2. Configure RevenueCat anonymously at launch, then call `Purchases.logIn(supabaseUserId)` after auth and `Purchases.logOut()` on sign-out (subscribe to Supabase auth state changes).
3. Unit test the identity wiring with a mocked Purchases module.

Human steps: create the RevenueCat project apps, paste real public SDK keys into build env, configure the webhook secret from S2, run a sandbox purchase end to end.

Acceptance criteria:
- [ ] No `appl_XXXXX` / `goog_XXXXX` / `local-dev-user` strings in source.
- [ ] appUserID equals the Supabase user id after login (test proves the logIn call).
- [ ] Sandbox purchase reaches `user_entitlements` via the authenticated webhook (handoff evidence).

Verify:
```bash
git grep -n "XXXXX\|local-dev-user" apps/web   # empty
pnpm --filter genie-web test -- IAPService
```

---

## F8. Add error boundaries and not-found pages

Priority P0 | Effort S | Depends: none | Executor: agent

Context: zero `error.tsx`, `not-found.tsx`, or `loading.tsx` under `app/`; no class error boundary. In a static-export app any uncaught render error is a permanent white screen.

Steps:
1. Add root `app/error.tsx` (client component: apology in Vietnamese, "Thu lai" button calling `reset()`, link home) and `app/global-error.tsx` for layout-level crashes.
2. Add `app/not-found.tsx` with navigation back to home.
3. Add `loading.tsx` for the calendar and festival routes (they compute or fetch on entry).
4. Wire the boundary to the error tracker once B13 lands (leave a TODO referencing B13).
5. e2e: a test-only route or forced error asserts the boundary renders and recovery works.

Acceptance criteria:
- [ ] Forced render error shows the boundary, not a white screen; `reset()` recovers.
- [ ] Unknown route shows not-found with working navigation.

Verify:
```bash
pnpm --filter genie-web build
pnpm --filter genie-web exec playwright test
```
