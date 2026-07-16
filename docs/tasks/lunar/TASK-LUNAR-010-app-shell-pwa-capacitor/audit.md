---
fr_id: TASK-LUNAR-010
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS >= 6 minimum; DEC-LUNAR-100..104 assigned; static export + Capacitor thin wrapper; storage adapter pattern; notificationGlue stub; bundle ID world.cyberskill.genieamlich; PWA manifest; API key exclusion)
---

## §1 - Verdict summary

TASK-LUNAR-010 specifies the app shell, the technical foundation for the whole Phase 1 MVP, including the Next.js/React PWA static export, the Capacitor iOS wrapper, the on-device storage layer, 5-route routing, and the glue for local notifications. Scope: 16 BCP-14 clauses in §1 (Next.js App Router, 5 main routes, storage CRUD, adapter pattern localStorage/@capacitor/preferences, notificationGlue stub, capacitor.config.ts with the exact bundle ID, output: "export", manifest.json, bottom nav, home route lunar date, Be Vietnam Pro, build pass, offline, no API server in Phase 1). 7 rationale paragraphs in §2 explaining DEC-LUNAR-100..104. §3 has the full TypeScript interfaces for Reminder/UserSettings/NotificationService, exported storage functions, CapacitorConfig, NextConfig, a layout.tsx excerpt, and the manifest.json content. 15 ACs in §4. §5 has 8 concrete unit tests for storage CRUD, the notificationGlue stub, and the home route render with a mock date 2025-01-29. §10 lists 12 failure rows including race condition, generateStaticParams, permission flow, API key exclusion. Maps to PRD §9 (System Architecture), §14 (Phase 1 roadmap).

## §2 - Findings (all resolved during authoring)

### ISS-001 - `output: "export"` conflicts with Next.js API routes and would block Phase 2
If this constraint is not stated clearly it will be discovered late. Resolved: §1 #7 states clearly no API routes in Phase 1; §9 deferred note on switching to hybrid mode in Phase 2; the first §10 failure row.

### ISS-002 - localStorage is cleared on iOS, losing all user data
iOS can purge localStorage when the device is low on space. Resolved: §1 #4 the storage adapter uses @capacitor/preferences on iOS; §6 skeleton storageGet/storageSet adapter; §10 failure row "localStorage cleared when iOS is low on space".

### ISS-003 - notificationGlue.ts imports @capacitor/local-notifications directly, crashing on web/JSDOM
Tests and the web build fail if the Capacitor package is imported unconditionally. Resolved: §1 #5 + DEC-LUNAR-103 stub pattern; WebNotificationStub for web; createNotificationService() factory; §5 test "WebNotificationStub is a no-op".

### ISS-004 - Bundle ID not decided, hard to change after creating the App Store record
App Store Connect locks the bundle ID after creation. Resolved: §1 #6 + DEC-LUNAR-103 `appId: "world.cyberskill.genieamlich"` in capacitor.config.ts; §5 test asserting appId; §4 AC #7.

### ISS-005 - The dynamic route /festival/[id] needs generateStaticParams() for static export, or it 404s if forgotten
Next.js `output: "export"` requires pre-rendering every dynamic parameter. Resolved: §11 note "forgetting generateStaticParams() breaks the build or 404s the page"; §4 AC #2 checks the /festival/vu-lan route renders correctly; the disallowed note implicitly guards this.

### ISS-006 - Capacitor requestPermissions() not called before schedule(), causing a silent fail on iOS
The most common bug with Capacitor notifications. Resolved: §1 #5 the interface has a separate requestPermission(); §11 note "MUST call requestPermission() first"; §10 failure row "createNotificationService() returns the wrong type" and the dependency note.

### ISS-007 - An API key could be committed into the build output (Claude key, ZNS token)
A static export can bundle .env.local. Resolved: §1 #14 MUST NOT store data on a server; §4 AC #15 greps the build output; disallowed_tools bans embedding API keys in client code; §10 failure row "API key leaked in the build output".

## §3 - Resolution

After handling the 7 issues above, TASK-LUNAR-010 has 16 BCP-14 clauses, 15 ACs, 8 unit tests including a storage CRUD round-trip and a home route render with a mock date, 12 failure rows, 7 implementation notes. All of DEC-LUNAR-100..104 are created and fully referenced. Score after self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Pre-fix score: **7/10**. static export + storage adapter + no-server Phase 1 + bundle ID + manifest + API-key grep are all correct. Two issues:

- **MAJOR - storage.ts static-imports "@capacitor/preferences" at the top level.** §3 line 111 `import { Preferences } from "@capacitor/preferences"` is unconditional, even on web/static-export/JSDOM. This is exactly the ISS-003 bug fixed for notificationGlue but MISSED for storage: it pulls the native plugin into the web bundle and forces tests to resolve a package that only runs on iOS, inadvertently violating DEC-LUNAR-103 (thin shell, stub on web). The §5 test only mocks localStorage, not Preferences, but the module still imports it at load time. Fixed: removed the static import; added `getPreferences()` using `await import("@capacitor/preferences")` (lazy) only when `isCapacitor()`; §6 storageGet/storageSet updated accordingly.
- **MAJOR - isCapacitor() throws ReferenceError under SSG.** §3 old: `typeof (window as any)?.Capacitor !== "undefined"`. Optional chaining does NOT save an undeclared global - `window?.x` still throws ReferenceError when `window` does not exist (static-export prerender). §11 note 1 describes the correct check but §3 shipped the wrong check -> a contract crash at build. Fixed: §3 changed to `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()`, matching §11.

MINOR (recorded): `/festival/[id]` needs `generateStaticParams()` for `output: "export"`; the §11 note + AC #2 exist but the function is not yet encoded in the §3 contract - implementation-time, not blocking. **Post-fix score = 9/10.**

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **import type { Reminder } from "@cyberskill/amlich-core"**: §3 already has this form. The shell does NOT redeclare Reminder. `export type { Reminder }` re-exports correctly. PASS.
- **Lazy Capacitor import**: §3 and §6 already use `async function getPreferences() { const mod = await import("@capacitor/preferences"); ... }` (no static import at the top level). PASS.
- **isCapacitor()**: §3 uses `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()` - matching §11. PASS.
- **testReminder.leapFallback**: Added the field `leapFallback: "REGULAR"` to testReminder in §5 (a required Reminder field per CONTRACT.md / TASK-LUNAR-004). Previously the missing field caused a TypeScript error when compiling the test.
- **Traceability Task B**: 16 clauses in §1 (14 MUST + 2 SHOULD). 15 ACs in §4 cover all 14 MUSTs. 8 tests in §5. DEC-LUNAR-100..104 exist and are referenced. PASS.

**Post-alignment score: READY.**

*End of audit TASK-LUNAR-010.*
