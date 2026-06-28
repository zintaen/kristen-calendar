---
fr_id: FR-LUNAR-010
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

FR-LUNAR-010 đặc tả app shell là nền móng kỹ thuật cho toàn bộ Phase 1 MVP, bao gồm Next.js/React PWA static export, Capacitor iOS wrapper, on-device storage layer, routing 5 route, và glue cho local notifications. Phạm vi: 16 mệnh đề BCP-14 trong §1 (Next.js App Router, 5 route chính, storage CRUD, adapter pattern localStorage/@capacitor/preferences, notificationGlue stub, capacitor.config.ts với bundle ID chính xác, output: "export", manifest.json, bottom nav, home route ngày âm, Be Vietnam Pro, build pass, offline, không API server Phase 1). 7 đoạn rationale §2 giải thích DEC-LUNAR-100..104. §3 có đầy đủ TypeScript interface cho Reminder/UserSettings/NotificationService, export hàm storage, CapacitorConfig, NextConfig, layout.tsx excerpt, và manifest.json content. 15 AC trong §4. §5 có 8 unit test cụ thể cho storage CRUD, notificationGlue stub, và home route render với mock date 2025-01-29. §10 liệt kê 12 failure rows bao gồm race condition, generateStaticParams, permission flow, API key exclusion. Ánh xạ tới PRD §9 (System Architecture), §14 (Phase 1 roadmap).

## §2 - Findings (all resolved during authoring)

### ISS-001 - `output: "export"` xung đột với Next.js API routes sẽ block Phase 2
Nếu không ghi rõ ràng buộc này sẽ bị phát hiện muộn. Resolved: §1 #7 ghi rõ không dùng API routes trong Phase 1; §9 deferred note về thay đổi sang hybrid mode khi Phase 2; §10 failure row đầu tiên.

### ISS-002 - localStorage bị xóa trên iOS, mất hết dữ liệu người dùng
iOS có thể purge localStorage khi thiết bị thiếu dung lượng. Resolved: §1 #4 storage adapter dùng @capacitor/preferences trên iOS; §6 skeleton storageGet/storageSet adapter; §10 failure row "localStorage bị xóa khi iOS thiếu dung lượng".

### ISS-003 - notificationGlue.ts import @capacitor/local-notifications trực tiếp, crash trên web/JSDOM
Test và web build lỗi nếu Capacitor package được import unconditionally. Resolved: §1 #5 + DEC-LUNAR-103 stub pattern; WebNotificationStub cho web; createNotificationService() factory; §5 test "WebNotificationStub là no-op".

### ISS-004 - Bundle ID chưa được quyết định, khó thay đổi sau khi tạo App Store record
App Store Connect khóa bundle ID sau khi tạo. Resolved: §1 #6 + DEC-LUNAR-103 `appId: "world.cyberskill.genieamlich"` trong capacitor.config.ts; §5 test assert appId; §4 AC #7.

### ISS-005 - Dynamic route /festival/[id] cần generateStaticParams() cho static export, nếu quên là 404
Next.js `output: "export"` yêu cầu pre-render mỗi tham số động. Resolved: §11 note "quên generateStaticParams() làm build lỗi hoặc trang 404"; §4 AC #2 kiểm tra route /festival/vu-lan render đúng; disallowed note implicitly guards this.

### ISS-006 - Capacitor requestPermissions() không được gọi trước schedule(), gây silent fail trên iOS
Lỗi thường gặp nhất với Capacitor notifications. Resolved: §1 #5 interface có requestPermission() riêng; §11 note "PHẢI gọi requestPermission() trước"; §10 failure row "createNotificationService() trả sai loại" và dependency note.

### ISS-007 - API key có thể bị commit vào build output (Claude key, ZNS token)
Static export có thể có .env.local bị bundle. Resolved: §1 #14 KHÔNG ĐƯỢC lưu dữ liệu lên server; §4 AC #15 grep kiểm tra build output; disallowed_tools cấm nhúng API key vào client code; §10 failure row "API key lộ trong build output".

## §3 - Resolution

Sau khi xử lý 7 vấn đề trên, FR-LUNAR-010 có 16 mệnh đề BCP-14, 15 AC, 8 unit test bao gồm storage CRUD round-trip và home route render với mock date, 12 failure rows, 7 implementation notes. Tất cả DEC-LUNAR-100..104 được tạo và tham chiếu đầy đủ. Score sau self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Pre-fix score: **7/10**. static export + storage adapter + no-server Phase 1 + bundle ID + manifest + API-key grep deu dung. Hai van de:

- **MAJOR - storage.ts static-import "@capacitor/preferences" o top level.** §3 line 111 `import { Preferences } from "@capacitor/preferences"` la unconditional, ngay ca tren web/static-export/JSDOM. Day chinh la loi ISS-003 da fix cho notificationGlue nhung BO SOT cho storage: keo plugin native vao web bundle va bat test phai resolve mot package chi chay iOS, vo tinh than DEC-LUNAR-103 (thin shell, stub tren web). §5 test chi mock localStorage, khong mock Preferences, nhung module van import no luc load. Fixed: bo static import; them `getPreferences()` dung `await import("@capacitor/preferences")` (lazy) chi chay khi `isCapacitor()`; §6 storageGet/storageSet doi theo.
- **MAJOR - isCapacitor() nem ReferenceError duoi SSG.** §3 cu: `typeof (window as any)?.Capacitor !== "undefined"`. Optional chaining KHONG cuu mot global chua khai bao - `window?.x` van nem ReferenceError khi `window` khong ton tai (static-export prerender). §11 note 1 mo ta check dung nhung §3 ship check sai -> contract crash luc build. Fixed: §3 doi sang `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()`, khop §11.

MINOR (ghi nhan): `/festival/[id]` can `generateStaticParams()` cho `output: "export"`; da co §11 note + AC #2 nhung chua encode ham trong §3 contract - implementation-time, khong block. **Post-fix score = 9/10.**

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **import type { Reminder } from "@cyberskill/amlich-core"**: §3 da co dung dang nay. Shell KHONG redeclare Reminder. `export type { Reminder }` re-export chinh xac. PASS.
- **Lazy Capacitor import**: §3 va §6 da dung `async function getPreferences() { const mod = await import("@capacitor/preferences"); ... }` (khong co static import o top level). PASS.
- **isCapacitor()**: §3 dung `typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()` - khop §11. PASS.
- **testReminder.leapFallback**: Da them truong `leapFallback: "REGULAR"` vao testReminder trong §5 (truong bat buoc cua Reminder theo CONTRACT.md / FR-LUNAR-004). Truoc do thieu truong nay gay TypeScript error khi compile test.
- **Traceability Task B**: 16 menh de trong §1 (14 PHAI + 2 NEN). 15 AC trong §4 cover tat ca 14 PHAI. 8 test trong §5. DEC-LUNAR-100..104 ton tai va duoc tham chieu. PASS.

**Post-alignment score: READY.**

*Hết audit FR-LUNAR-010.*
