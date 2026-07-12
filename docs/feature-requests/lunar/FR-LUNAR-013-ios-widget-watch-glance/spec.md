---
id: FR-LUNAR-013
title: "iOS glanceable surfaces - WidgetKit home-screen widget (lunar date + can-chi + auspicious hours) and Apple Watch complication, native Swift in ios/App"
module: LUNAR
priority: SHOULD
status: ready_to_implement
verify: T
phase: P2
milestone: P2 · slice 5
slice: 5
owner: Stephen Cheng
created: 2026-06-27
shipped: null
memory_chain_hash: null
related_frs: [FR-LUNAR-011]
depends_on: [FR-LUNAR-001, FR-LUNAR-002, FR-LUNAR-011]
blocks: []
source_pages:
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#4 (FR-F01, FR-F02 optional)"
  - "docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam (\"Genie Âm Lịch\" của CyberSkill).md#9 (iOS native target note)"
source_decisions:
  - DEC-LUNAR-130 (WidgetKit and the Watch complication MUST be written in native Swift/SwiftUI; Capacitor cannot provide a surface for WidgetKit; this is a separate native target in the Xcode project of ios/App)
  - DEC-LUNAR-131 (data is shared between the web layer and the Swift widget via App Group + UserDefaults suite "group.world.cyberskill.genie"; the web layer writes DayInfoCache, Swift reads it - no network call in the widget)
  - DEC-LUNAR-132 (the Swift side re-implements the minimum lunar-calendar computation - only 2 functions: convertSolar2Lunar and canChiNgay - using the same epoch constants from PRD §6.2; the Swift MIT library "baolanlequang/VietnameseLunar-ios" MAY be used as a reference, but the constants must be re-checked)
  - DEC-LUNAR-133 (the Watch complication is COULD in this FR - built only after the WidgetKit widget has shipped and is stable; PRD FR-F02 marks it "optional"; standing up a Watch app is a separate watchOS app, WidgetKit is step 1)
  - DEC-LUNAR-134 (the widget only reads data; it MUST NOT write UserDefaults or change any application state from inside the widget extension; state is written only by the web layer)
  - DEC-LUNAR-135 (design the widget in 3 sizes systemSmall, systemMedium, systemLarge; Small is required; Medium and Large are SHOULD - they may be a stacked layout of Small)
language: swift 5.x
service: apps/web/ios/App/
new_files:
  - apps/web/ios/App/LunarWidget/LunarWidgetBundle.swift
  - apps/web/ios/App/LunarWidget/LunarWidget.swift
  - apps/web/ios/App/LunarWidget/LunarWidgetEntryView.swift
  - apps/web/ios/App/LunarWidget/DayInfoCache.swift
  - apps/web/ios/App/LunarWidget/LunarCalcSwift.swift
  - apps/web/ios/App/LunarWidgetTests/LunarWidgetTests.swift
modified_files:
  - apps/web/ios/App/App.xcodeproj/project.pbxproj
  - apps/web/lib/widget-cache-writer.ts
allowed_tools:
  - file_read: apps/web/ios/App/**
  - file_write: apps/web/ios/App/LunarWidget/**, apps/web/ios/App/LunarWidgetTests/**
  - bash: cd apps/web/ios/App && xcodebuild test -scheme LunarWidgetTests -destination "platform=iOS Simulator,name=iPhone 16"
disallowed_tools:
  - "call URLSession or any network request in the widget extension (violates DEC-LUNAR-131 / DEC-LUNAR-134 / NFR-Offline)"
  - "write UserDefaults or change state from the widget (violates DEC-LUNAR-134)"
  - "use the Capacitor bridge to pass runtime data to the widget (the Capacitor bridge does not run in the widget extension process)"
effort_hours: 12
sub_tasks:
  - "2h: LunarCalcSwift.swift - re-implement convertSolar2Lunar and canChiNgay with the exact constants from PRD §6.2; epoch index-k 2415021.076998695, Meeus 2415020.75933, synodic 29.53058868"
  - "1.5h: DayInfoCache.swift - struct DayInfoCache (Codable) and read/write functions via App Group UserDefaults suite 'group.world.cyberskill.genie'; DayInfoCacheWriter.swift for the web layer"
  - "1h: widget-cache-writer.ts - write DayInfoCache to App Group storage via the Capacitor native bridge when the app opens; call LunarCalcTS (FR-011) to get DayQuality and encode it to JSON"
  - "2h: LunarWidget.swift - TimelineProvider: `getTimeline` creates entries for 24 hours (one entry per hour because the auspicious hours change hourly); `getSnapshot` returns today from cache or computes directly if the cache is stale"
  - "2h: LunarWidgetEntryView.swift - SwiftUI View for 3 sizes: systemSmall (lunar date + can-chi + Hoang/Hac label), systemMedium (+auspicious hours, +truc), systemLarge (+28 sao, +full list of gio)"
  - "1.5h: LunarWidgetBundle.swift + Info.plist + Entitlements - App Group, Widget configuration, target setup in Xcode"
  - "2h: LunarWidgetTests.swift - unit test LunarCalcSwift: fixture 29/01/2025 Tet 2025, Tet 2023-2026, 1985 leap, canChi round-trip"
risk_if_skipped: "The FR-F01 widget is one of the 'wow features' for marketing and a differentiator when Persona 3 (Anh Tuan) compares the app with other lunar-calendar apps. PRD §9 states plainly that WidgetKit must be written in native Swift - this cannot be done with Capacitor or React Native. Without the widget, users must open the app to see the can-chi and auspicious hours every morning, clearly reducing retention."
---

## §1 - Description (BCP-14 normative)

The iOS glanceable surfaces feature MUST provide a WidgetKit home-screen widget showing today's lunar date, can-chi, and auspicious hours, written in native Swift/SwiftUI in the Xcode target `LunarWidget` (DEC-LUNAR-130).

1. MUST add the native Swift target `LunarWidget` to the Xcode project `apps/web/ios/App/App.xcodeproj` using the `WidgetKit` framework; this target runs in a separate widget extension process, fully separate from the Capacitor web view (DEC-LUNAR-130).
2. MUST configure the App Group `group.world.cyberskill.genie` in both the App target (Capacitor) and the Widget target; this is the only mechanism for sharing data (DEC-LUNAR-131).
3. MUST define `struct DayInfoCache: Codable` containing the fields: `dateISO` (String), `lunarDayMonth` (String, e.g. "15 thang 7"), `canChiNgay` (String), `isHoangDao` (Bool), `label` (String), `trucName` (String), `sao28Name` (String), `gioHoangDao` ([GioInfoCache]) with `cachedAt` (Date) and `ttlHours: Int = 24` (DEC-LUNAR-131).
4. MUST write the `widget-cache-writer.ts` function on the web layer: when the app is opened (Capacitor `App.addListener("appStateChange")`), compute `DayQuality` for today using FR-LUNAR-011, encode it to JSON, and write it into the App Group UserDefaults suite `group.world.cyberskill.genie` with the key `"dayInfoCache"` (DEC-LUNAR-131).
5. MUST write `DayInfoCache.swift` with the function `static func load() -> DayInfoCache?` that reads from `UserDefaults(suiteName: "group.world.cyberskill.genie")` and `static func isStale(_ cache: DayInfoCache) -> Bool` that checks `cachedAt` + `ttlHours` (DEC-LUNAR-131).
6. MUST write `LunarCalcSwift.swift` re-implementing the 2 minimum functions - `convertSolar2Lunar` and `canChiNgayFromJDN` - with the exact constants from PRD §6.2 (epoch index-k `2415021.076998695`, Meeus epoch `2415020.75933`, Meeus synodic `29.53058868`, integer epoch `2415021`); this correctness lets the widget compute the day when the cache is stale (DEC-LUNAR-132). `canChiNgayFromJDN` MUST use the exact offsets of FR-LUNAR-002 `canChiDay`: `canIndex = (jdn + 9) % 10` and `diaChiIndex = (jdn + 1) % 12`; MUST NOT derive the earthly branch by `(jdn + 9) % 60` then `% 12` (which gives `(jdn + 9) % 12`, off by 8 relative to core and off from the can-chi the app/web displays) (DEC-LUNAR-132).
7. MUST write a `TimelineProvider` returning `Timeline<LunarEntry>` with hourly entries: each entry's `date` is the start of the corresponding gio, so the auspicious/inauspicious hours update by the hour during the day without opening the app (PRD FR-F01).
8. MUST write `LunarWidgetEntryView` with SwiftUI supporting 3 sizes:
   - `systemSmall` (MUST): large lunar date + can-chi + a "Hoang dao" or "Hac dao" badge (different colors);
   - `systemMedium` (SHOULD): add `trucName`, the top 3 auspicious hours;
   - `systemLarge` (SHOULD): add `sao28Name` and the full list of 12 gio with an isHoang flag.
9. MUST use colors consistent with the purple theme (FR-LUNAR-009): cream background, deep purple text, a yellow/green Hoang dao badge, a gray/light-red Hac dao badge - ensuring enough contrast to be legible in the WidgetKit rendering context (DEC-LUNAR-131).
10. MUST NOT call `URLSession`, `URLRequest`, or any network API from inside the widget extension process; all data must come from the App Group cache or local `LunarCalcSwift` (DEC-LUNAR-131, NFR-Offline).
11. MUST NOT call `UserDefaults.standard.set(...)` or write any state from the widget; the widget only reads (DEC-LUNAR-134).
12. SHOULD implement the Watch complication (COULD) with watchOS 2 `CLKComplicationDataSource` or WidgetKit for watchOS (watchOS 9+): letting a small widget display the lunar date + can-chi on the Watch face; this is the optional target `LunarWatchWidget` (DEC-LUNAR-133).
13. MUST write `LunarWidgetTests` using `XCTest` to check `LunarCalcSwift` with the fixtures from PRD §6.6: 29/01/2025 is 1/1 of Year At Ty (the YEAR can-chi; the DAY can-chi is Mau Tuat), Tet 2024/2023, leap year 1985 month 2. (The minimum contract only has `convertSolar2Lunar`, not `convertLunar2Solar`, so check S2L directly on the fixtures instead of a round-trip L2S(S2L).)
14. MUST have `getSnapshot()` in the `TimelineProvider` returning a fast snapshot (< 1s) when the system previews the widget; the snapshot uses the cache if available, otherwise computes directly for `Date()` with `LunarCalcSwift`.
15. MUST keep the timezone consistent within `LunarCalcSwift`: every timezone-dependent function (`getNewMoonDay`, `getSunLongitude`, `getLunarMonth11`, `getLeapMonthOffset`, `convertSolar2Lunar`) MUST use exactly one constant `TZ_VN = 7.0` (105E) internally; MUST NOT have one function take `tz` while another ignores it, because a timezone-convention mismatch corrupts the new-moon day / month 11 / leap month (DEC-LUNAR-130/132, PRD 6.1 rule 5, FR-LUNAR-001 DEC-LUNAR-010).
16. MUST have an XCTest asserting that the earthly branch / can-chi of `canChiNgayFromJDN` is consistent with FR-LUNAR-002 `canChiDay` across a multi-day scan (>= 60 days): for each JDN, `diaChiIndex == (jdn + 1) % 12` and `canChi` matches core's can-chi label; this is the safety net that catches the earthly-branch off-by-8 caused by `(jdn + 9) % 60` (DEC-LUNAR-132).

---

## §2 - Why this design (rationale for humans)

**Why require writing it in native Swift/SwiftUI (DEC-LUNAR-130)?** WidgetKit can only use SwiftUI; there is no Swift bridge from Capacitor into the widget extension process. This is an Apple limitation, not a Capacitor one. PRD §9 confirms this: "The iOS widget (WidgetKit) and the Watch complication must be written in native Swift within an ios/App folder (Capacitor allows adding a native target)." Capacitor still manages the main app; the widget is an extension target running its own process.

**Why use App Group UserDefaults to share data (DEC-LUNAR-131)?** There are 3 ways: (1) App Group UserDefaults - fast, simple, suited to a small payload; (2) App Group File (plist/json) - more complex but similar; (3) CloudKit - needs the network. Option 1 is best for data < 10KB such as DayInfoCache. Writing from TypeScript via the Capacitor bridge when the app opens, and the widget reading when it renders - a clean one-way data flow.

**Why re-implement `LunarCalcSwift` instead of only using the cache (DEC-LUNAR-132)?** The cache has a 24-hour TTL. If the user has not opened the app in 24 hours (e.g. goes to sleep at 23:00, wakes at 7:00 the next day), the cache is stale. With `LunarCalcSwift` the widget can compute directly - a clean fallback. PRD §6.2 provides all the constants - re-implementing 2 functions is ~100 lines of Swift, nothing scary.

**Why is the Watch complication COULD (DEC-LUNAR-133)?** PRD FR-F02 marks it "optional." The WidgetKit widget is a clear deliverable (FR-F01 MUST); the Watch adds complexity: it needs a separate watchOS target, watch-extension distribution setup, and testing on a real Watch device (the simulator is incomplete). Shipping the iOS widget first, gathering feedback, then deciding whether the Watch is needed is the better path.

**Why does the widget only read and not write (DEC-LUNAR-134)?** The widget extension runs a different process from the app. If the widget writes UserDefaults while the app also writes, it can cause a race condition. More importantly: WidgetKit timeline refresh can call the widget at any time; if the widget wrote state, that state could change while the user is in the main app. Keeping the widget read-only is the safest.

**Why does the timeline have hourly entries (§1 #7)?** The auspicious hours change every 2 hours. With only 1 entry/day the widget would show the same auspicious hour from 23:00 the previous day until 22:59 the next day - wrong. Creating 12 entries (one per gio) with `date` at the start of each gio lets WidgetKit automatically display the appropriate entry for the current hour.

**Why test Swift with `XCTest` against PRD §6.6 fixtures (§1 #13)?** `LunarCalcSwift` is a re-implementation - the risk of a small error is higher than a TypeScript port. Peer fixtures from PRD §6.6 (Tet 2023-2026, 1985 leap) are the fastest way to check that the Swift epoch constants match the TypeScript core. If the two sides give different results for the same fixture, the bug is caught immediately.

**Why must `getSnapshot()` be fast (§1 #14)?** iOS calls `getSnapshot()` when the user adds the widget to the screen or when the system previews it. If it is slow > 1-2s, the system cancels the call and shows a blank placeholder. The snapshot must fast-path: read the cache if available, compute directly otherwise (< 100ms with LunarCalcSwift).

---

## §3 - API contract

```swift
// apps/web/ios/App/LunarWidget/LunarCalcSwift.swift

import Foundation

/// Minimal re-implementation of Ho Ngoc Duc algorithm for widget use.
/// Uses EXACTLY the PRD §6.2 constants; any change MUST be validated against
/// LunarCalcSwift fixtures in LunarWidgetTests.
struct LunarCalcSwift {
    // PRD §6.2 constants - do NOT change without updating test fixtures
    static let SYNODIC_MONTH_K     = 29.530588853       // index-k synodic
    static let EPOCH_INDEX_K       = 2415021.076998695   // epoch for index-k
    static let MEEUS_EPOCH         = 2415020.75933       // NewMoon inner epoch
    static let MEEUS_SYNODIC       = 29.53058868         // NewMoon inner synodic
    static let LUNAR_MONTH_11_INT  = 2415021             // getLunarMonth11 integer epoch
    static let J2000               = 2451545.0
    static let JULIAN_CENTURY      = 36525.0
    static let DR: Double          = Double.pi / 180.0
    static let TZ_VN: Double       = 7.0                 // UTC+7, 105E

    // tz nhat quan: MOI ham duoi day hardcode TZ_VN (= 7.0, 105E) ben trong
    // (ung getNewMoonDay/getSunLongitude voi + tz/24 = + TZ_VN/24). KHONG nhan tz lam tham so
    // o ham nay nhung nhan ngam o ham khac - giu tat ca cung mot quy uoc (DEC-LUNAR-132, PRD 6.2).
    static func jdFromDate(day: Int, month: Int, year: Int) -> Int
    static func newMoon(k: Int) -> Double      // JD of kth new moon (Meeus)
    static func sunLongitude(jdn: Double) -> Double
    static func getNewMoonDay(k: Int) -> Int                 // dung TZ_VN noi bo: floor(newMoon(k) + 0.5 + TZ_VN/24)
    static func getSunLongitude(dayNumber: Double) -> Int    // dung TZ_VN noi bo: floor(sunLongitude(dayNumber - 0.5 - TZ_VN/24)/PI*6)
    static func getLunarMonth11(year: Int) -> Int            // dung TZ_VN noi bo
    static func getLeapMonthOffset(a11: Int) -> Int          // dung TZ_VN noi bo
    static func convertSolar2Lunar(day: Int, month: Int, year: Int) -> (lunarDay: Int, lunarMonth: Int, lunarYear: Int, isLeap: Bool)  // dung TZ_VN noi bo
    static func canChiNgayFromJDN(_ jdn: Int) -> (canChi: String, diaChiIndex: Int)
        // PHAI khop FR-LUNAR-002 canChiDay: canIndex = (jdn + 9) % 10, diaChiIndex = (jdn + 1) % 12.
        // KHONG dung (jdn + 9) % 60 roi % 12 (cho (jdn + 9) % 12, lech 8 so voi core).
}
```

```swift
// apps/web/ios/App/LunarWidget/DayInfoCache.swift

import Foundation
import WidgetKit

struct GioInfoCache: Codable {
    let canh: String           // e.g. "Dan (03:00-05:00)"
    let tuGio: String          // e.g. "03:00"
    let denGio: String         // e.g. "05:00"
    let isHoang: Bool
}

struct DayInfoCache: Codable {
    let dateISO: String        // "YYYY-MM-DD"
    let lunarDayMonth: String  // e.g. "1 thang 1" (Tet)
    let canChiNgay: String     // e.g. "At Ty"
    let isHoangDao: Bool
    let label: String          // "Hoang dao" | "Hac dao"
    let trucName: String
    let sao28Name: String
    let gioHoangDao: [GioInfoCache]   // 12 canh
    let cachedAt: Date
    let ttlHours: Int

    static let appGroupSuite = "group.world.cyberskill.genie"
    static let cacheKey      = "dayInfoCache"

    static func load() -> DayInfoCache? {
        guard let defaults = UserDefaults(suiteName: appGroupSuite),
              let data = defaults.data(forKey: cacheKey)
        else { return nil }
        return try? JSONDecoder().decode(DayInfoCache.self, from: data)
    }

    static func isStale(_ cache: DayInfoCache) -> Bool {
        let age = Date().timeIntervalSince(cache.cachedAt) / 3600.0
        return age > Double(cache.ttlHours)
    }
}
```

```swift
// apps/web/ios/App/LunarWidget/LunarWidget.swift

import WidgetKit
import SwiftUI

struct LunarEntry: TimelineEntry {
    let date: Date      // start of the canh gio this entry represents
    let cache: DayInfoCache
    let currentGio: GioInfoCache?   // gio entry for this date/hour slot
}

struct LunarTimelineProvider: TimelineProvider {
    typealias Entry = LunarEntry

    func placeholder(in context: Context) -> LunarEntry

    /// Must return quickly (< 1s). Use cache if fresh; compute via LunarCalcSwift if stale.
    func getSnapshot(in context: Context, completion: @escaping (LunarEntry) -> Void)

    /// Returns 12 entries for 12 canh gio of today (one per 2-hour slot).
    /// Reload policy: .atEnd (reloaded after last entry expires at midnight).
    func getTimeline(in context: Context, completion: @escaping (Timeline<LunarEntry>) -> Void)
}

@main
struct LunarWidgetBundle: WidgetBundle {
    var body: some Widget {
        LunarWidgetSmall()
        // LunarWatchWidget() - COULD: add when watchOS target is built
    }
}

struct LunarWidgetSmall: Widget {
    static let kind = "LunarWidgetSmall"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: LunarTimelineProvider()) { entry in
            LunarWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Genie Am Lich")
        .description("Ngay am, can-chi, gio Hoang dao")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

```swift
// apps/web/ios/App/LunarWidget/LunarWidgetEntryView.swift (SwiftUI)

import SwiftUI
import WidgetKit

struct LunarWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: LunarEntry

    var body: some View {
        switch family {
        case .systemSmall: SmallView(entry: entry)
        case .systemMedium: MediumView(entry: entry)
        case .systemLarge: LargeView(entry: entry)
        default: SmallView(entry: entry)
        }
    }
}
// SmallView: VStack { Text(lunarDayMonth).large, Text(canChiNgay), HoangDaoBadge }
// MediumView: SmallView + HStack(top3HoangGio) + Text(trucName)
// LargeView:  MediumView + Text(sao28Name) + List(all 12 gioHoangDao)
```

```typescript
// apps/web/lib/widget-cache-writer.ts

import { App } from "@capacitor/app";
import { getDayQuality } from "@cyberskill/amlich-core";

const APP_GROUP_KEY = "dayInfoCache";

export async function writeWidgetCache(date: Date = new Date()): Promise<void> {
  const dq = getDayQuality(date);
  const cache = {
    dateISO:       dq.date,
    lunarDayMonth: `${dq.lunarDay} thang ${dq.lunarMonth}`,
    canChiNgay:    dq.canChiNgay,
    isHoangDao:    dq.isHoangDao,
    label:         dq.label,
    trucName:      dq.truc.name,
    sao28Name:     dq.sao28.name,
    gioHoangDao:   dq.gioHoangDao,
    cachedAt:      new Date().toISOString(),
    ttlHours:      24,
  };
  // Write to App Group via Capacitor native bridge plugin
  await (window as any).Capacitor?.nativeCallback?.("AppGroupStorage", "write", {
    suite: "group.world.cyberskill.genie",
    key:   APP_GROUP_KEY,
    value: JSON.stringify(cache),
  });
}

export function registerWidgetCacheWriter(): void {
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) writeWidgetCache().catch(console.error);
  });
}
```

---

## §4 - Acceptance criteria

1. The `LunarWidget` target builds successfully with `xcodebuild build -scheme LunarWidget` with no warning or error.
2. `LunarWidgetTests` with the 29/01/2025 fixture: `LunarCalcSwift.convertSolar2Lunar(day: 29, month: 1, year: 2025)` returns `(1, 1, 2025, false)` (day 1 month 1 At Ty) - matching the TypeScript core.
3. `LunarWidgetTests` with the 1985 leap-year fixture: `LunarCalcSwift.convertSolar2Lunar(day: 21, month: 3, year: 1985)` returns leap month 2 correctly.
4. `LunarCalcSwift.canChiNgayFromJDN` returns `"Mau Tuat"` (the DAY can-chi) for the JDN corresponding to 29/01/2025, and `diaChiIndex == (jdn + 1) % 12`; it MUST NOT return "At Ty" (that is the YEAR can-chi, not the day) - it must match `canChiDay` of FR-LUNAR-002.
5. `DayInfoCache.load()` returns `nil` if the App Group has no data yet (no crash).
6. `DayInfoCache.isStale()` returns `true` if `cachedAt` is 25 hours ago (TTL = 24).
7. The widget's `getTimeline` creates exactly 12 `LunarEntry`, each entry's `date` spaced 2 hours apart (canh gio), reload policy `.atEnd` at 24:00.
8. `getSnapshot` completes in < 1 second (measured with XCTest `measure`).
9. The widget does not call `URLSession.shared.dataTask` or any network API (verified with a mock URLProtocol in the test or by code review).
10. The widget does not call `UserDefaults.standard.set(...)` (verified by code review; only reads via the suite).
11. The `systemSmall` view displays exactly 3 elements: `lunarDayMonth`, `canChiNgay`, and a "Hoang dao"/"Hac dao" badge - checked with `ViewInspector` or a snapshot test.
12. `widget-cache-writer.ts` writes data when `appStateChange.isActive === true` and does NOT write when `isActive === false`.
13. The `LunarWidget` bundle is registered in `App.xcodeproj` with the App Group entitlement `group.world.cyberskill.genie`.
14. TypeScript `writeWidgetCache` produces valid JSON: `JSON.parse(output)` does not throw, the required fields are present.
15. `canChiNgayFromJDN` is consistent with FR-LUNAR-002 `canChiDay` across a scan of >= 60 consecutive days: `diaChiIndex == (jdn + 1) % 12` and `canChi` matches `"<Can> <Chi>"` from the core formula for every day (test `testCanChi_MatchesCore_60DaySweep`).
16. `LunarCalcSwift` uses `TZ_VN = 7.0` consistently for every timezone-dependent function; no function uses a different tz or ignores tz (code review + the Tet/1985 fixtures still passing as evidence).

---

## §5 - Verification

```swift
// apps/web/ios/App/LunarWidgetTests/LunarWidgetTests.swift
import XCTest
@testable import LunarWidget

final class LunarCalcSwiftTests: XCTestCase {

    // PRD §6.6 fixture: Tet 2025
    func testConvertSolar_Tet2025() {
        let result = LunarCalcSwift.convertSolar2Lunar(day: 29, month: 1, year: 2025)
        XCTAssertEqual(result.lunarDay,   1)
        XCTAssertEqual(result.lunarMonth, 1)
        XCTAssertEqual(result.lunarYear,  2025)
        XCTAssertFalse(result.isLeap, "Tet 2025 khong phai thang nhuan")
    }

    // PRD §6.6 fixture: Tet 2023 - nam Meo
    func testConvertSolar_Tet2023() {
        let result = LunarCalcSwift.convertSolar2Lunar(day: 22, month: 1, year: 2023)
        XCTAssertEqual(result.lunarDay,   1)
        XCTAssertEqual(result.lunarMonth, 1)
        XCTAssertEqual(result.lunarYear,  2023)
    }

    // PRD §6.6 fixture: 1985 leap month 2
    func testConvertSolar_1985LeapMonth() {
        // 21/03/1985 -> thang 2 nhuan nam At Suu
        let result = LunarCalcSwift.convertSolar2Lunar(day: 21, month: 3, year: 1985)
        XCTAssertEqual(result.lunarMonth, 2)
        XCTAssertTrue(result.isLeap, "Thang 2 nhuan 1985 phai duoc nhan biet")
    }

    // PRD §6.6 fixture: VN/TQ offset 2007
    func testConvertSolar_2007VNOffset() {
        // Tet 2007 VN: 17/02/2007
        let vnResult = LunarCalcSwift.convertSolar2Lunar(day: 17, month: 2, year: 2007)
        XCTAssertEqual(vnResult.lunarDay, 1, "Tet VN 2007 phai la 1/1 AM")
        // 18/02/2007 khong phai Tet theo lich VN
        let day18 = LunarCalcSwift.convertSolar2Lunar(day: 18, month: 2, year: 2007)
        XCTAssertNotEqual(day18.lunarDay, 1, "18/02/2007 la ngay 2 AM theo lich VN")
    }

    func testCanChiNgay_Tet2025() {
        // Day pillar (can-chi NGAY) cho 29/01/2025 theo FR-002 canChiDay:
        //   can = (jdn + 9) % 10, dia chi = (jdn + 1) % 12 -> "Mau Tuat".
        // (Luu y: PRD 6.6 ghi "At Ty" la can-chi NAM, khong phai can-chi ngay.)
        let jdn = LunarCalcSwift.jdFromDate(day: 29, month: 1, year: 2025)
        let (canChi, diaChiIndex) = LunarCalcSwift.canChiNgayFromJDN(jdn)
        XCTAssertEqual(canChi, "Mau Tuat", "Ngay 29/01/2025 la ngay Mau Tuat (can-chi ngay)")
        XCTAssertEqual(diaChiIndex, (jdn + 1) % 12, "dia chi PHAI = (jdn + 1) % 12, khop FR-002")
    }

    // AC #16 - dia chi/can-chi PHAI dong nhat voi FR-LUNAR-002 canChiDay qua quet nhieu ngay.
    // Bat loi lay dia chi bang (jdn + 9) % 60 % 12 (lech 8 so voi core).
    func testCanChi_MatchesCore_60DaySweep() {
        let CAN = ["Giap","At","Binh","Dinh","Mau","Ky","Canh","Tan","Nham","Quy"]
        let CHI = ["Ty","Suu","Dan","Mao","Thin","Ti","Ngo","Mui","Than","Dau","Tuat","Hoi"]
        let startJdn = LunarCalcSwift.jdFromDate(day: 1, month: 1, year: 2025)
        for offset in 0..<60 {
            let jdn = startJdn + offset
            let (canChi, diaChiIndex) = LunarCalcSwift.canChiNgayFromJDN(jdn)
            // gia tri ky vong tu cong thuc core (FR-002 DEC-LUNAR-020)
            let expectedCan = CAN[(jdn + 9) % 10]
            let expectedChi = CHI[(jdn + 1) % 12]
            XCTAssertEqual(diaChiIndex, (jdn + 1) % 12, "dia chi lech tai jdn=\(jdn)")
            XCTAssertEqual(canChi, "\(expectedCan) \(expectedChi)", "can-chi lech tai jdn=\(jdn)")
        }
    }

    func testConvertSolar2Lunar_Tet2025_Identity() {
        // S2L cho Tet 2025 = (1, 1, 2025, khong nhuan). (Khong co convertLunar2Solar trong
        // LunarCalcSwift toi thieu, nen kiem tra S2L truc tiep thay vi round-trip L2S(S2L).)
        let (ld, lm, ly, isLeap) = LunarCalcSwift.convertSolar2Lunar(day: 29, month: 1, year: 2025)
        XCTAssertEqual(ld, 1); XCTAssertEqual(lm, 1); XCTAssertEqual(ly, 2025); XCTAssertFalse(isLeap)
        // Verify epoch constants are not swapped
        XCTAssertEqual(LunarCalcSwift.EPOCH_INDEX_K, 2415021.076998695, accuracy: 1e-9)
        XCTAssertEqual(LunarCalcSwift.MEEUS_EPOCH,   2415020.75933,      accuracy: 1e-9)
    }
}

final class DayInfoCacheTests: XCTestCase {

    func testLoad_WhenNoCacheExists_ReturnsNil() {
        // Clear App Group suite in test environment
        UserDefaults(suiteName: "group.world.cyberskill.genie.test")?.removeObject(forKey: "dayInfoCache")
        XCTAssertNil(DayInfoCache.load())
    }

    func testIsStale_25HoursOld_ReturnsTrue() {
        let oldDate = Date(timeIntervalSinceNow: -25 * 3600)
        let cache = DayInfoCache(
            dateISO: "2025-01-29", lunarDayMonth: "1 thang 1",
            canChiNgay: "At Ty", isHoangDao: true, label: "Hoang dao",
            trucName: "Khai", sao28Name: "Tinh", gioHoangDao: [],
            cachedAt: oldDate, ttlHours: 24
        )
        XCTAssertTrue(DayInfoCache.isStale(cache))
    }

    func testIsStale_1HourOld_ReturnsFalse() {
        let recentDate = Date(timeIntervalSinceNow: -3600)
        let cache = DayInfoCache(
            dateISO: "2025-01-29", lunarDayMonth: "1 thang 1",
            canChiNgay: "At Ty", isHoangDao: true, label: "Hoang dao",
            trucName: "Khai", sao28Name: "Tinh", gioHoangDao: [],
            cachedAt: recentDate, ttlHours: 24
        )
        XCTAssertFalse(DayInfoCache.isStale(cache))
    }
}

final class TimelineTests: XCTestCase {

    func testGetTimeline_Creates12Entries() {
        let provider = LunarTimelineProvider()
        let expectation = self.expectation(description: "getTimeline")
        provider.getTimeline(in: .init(), completion: { timeline in
            XCTAssertEqual(timeline.entries.count, 12, "12 canh gio trong 1 ngay")
            XCTAssertEqual(timeline.policy, .atEnd)
            expectation.fulfill()
        })
        wait(for: [expectation], timeout: 3.0)
    }

    func testGetSnapshot_CompletesUnder1Second() {
        let provider = LunarTimelineProvider()
        measure {
            let exp = self.expectation(description: "snapshot")
            provider.getSnapshot(in: .init()) { _ in exp.fulfill() }
            wait(for: [exp], timeout: 1.0)
        }
    }
}
```

---

## §6 - Implementation skeleton

Swift side: `LunarCalcSwift.convertSolar2Lunar` is a direct port from TypeScript - the same `jdFromDate`, `NewMoon(k)`, `SunLongitude(jdn)`, `getLunarMonth11`, `getLeapMonthOffset` formulas, and all use `TZ_VN = 7.0` (105E) internally (no function deviates from the timezone convention). Constants are copied verbatim from PRD §6.2 - nothing changed. `canChiNgayFromJDN` MUST use `canIndex = (jdn + 9) % 10` and `diaChiIndex = (jdn + 1) % 12` - the exact offsets of FR-LUNAR-002 `canChiDay`; do NOT use `(jdn + 9) % 60` then `% 12` (off by 8). `getTimeline` creates `startOfDay(for: Date())`, loops 12 times (0, 2, 4, ... 22 hours), each step creating a `LunarEntry` with `date = startOfDay + i*2h` and `currentGio = cache.gioHoangDao[i]`.

TypeScript side: `widget-cache-writer.ts` needs a native Capacitor plugin `AppGroupStorage` to write into the App Group. If this plugin does not exist yet, a simple iOS native plugin (one `write(suite, key, value)` function) can be written in `ios/App/App/AppGroupStoragePlugin.swift`.

The hardest point: TTL synchronization. If the user has not opened the app in 24+ hours, the cache is stale and the widget must compute with `LunarCalcSwift`. The `getTimeline` fallback function should combine: try to read the cache first, if stale compute directly and write it back to the cache.

---

## §7 - Dependencies

Upstream: FR-LUNAR-001 is the provider of the epoch constants and the original algorithm (LunarCalcSwift is ported from it). FR-LUNAR-002 provides the `canChi` logic that LunarCalcSwift must re-implement. FR-LUNAR-011 is the source that computes `DayQuality` for `widget-cache-writer.ts` on the TypeScript side.

Downstream: FR-LUNAR-013 does not block any other FR.

Cross-cutting: the App Group ID `group.world.cyberskill.genie` must be registered with the Apple Developer portal in the Capabilities of both the App target and the Widget target. The purple theme (FR-009) should apply to the SwiftUI views - an Asset Catalog color set can be used instead of importing the TS tokens.

---

## §8 - Example payloads

```json
{
  "dateISO":       "2025-01-29",
  "lunarDayMonth": "1 thang 1",
  "canChiNgay":    "At Suu",
  "isHoangDao":    true,
  "label":         "Hoang dao",
  "trucName":      "Khai",
  "sao28Name":     "Tinh",
  "gioHoangDao": [
    { "canh": "Ty (23:00-01:00)",   "tuGio": "23:00", "denGio": "01:00", "isHoang": true  },
    { "canh": "Suu (01:00-03:00)",  "tuGio": "01:00", "denGio": "03:00", "isHoang": false },
    { "canh": "Dan (03:00-05:00)",  "tuGio": "03:00", "denGio": "05:00", "isHoang": true  },
    { "canh": "Meo (05:00-07:00)",  "tuGio": "05:00", "denGio": "07:00", "isHoang": false },
    { "canh": "Thin (07:00-09:00)", "tuGio": "07:00", "denGio": "09:00", "isHoang": true  },
    { "canh": "Ti (09:00-11:00)",   "tuGio": "09:00", "denGio": "11:00", "isHoang": false },
    { "canh": "Ngo (11:00-13:00)",  "tuGio": "11:00", "denGio": "13:00", "isHoang": true  },
    { "canh": "Mui (13:00-15:00)",  "tuGio": "13:00", "denGio": "15:00", "isHoang": false },
    { "canh": "Than (15:00-17:00)", "tuGio": "15:00", "denGio": "17:00", "isHoang": true  },
    { "canh": "Dau (17:00-19:00)",  "tuGio": "17:00", "denGio": "19:00", "isHoang": false },
    { "canh": "Tuat (19:00-21:00)", "tuGio": "19:00", "denGio": "21:00", "isHoang": true  },
    { "canh": "Hoi (21:00-23:00)",  "tuGio": "21:00", "denGio": "23:00", "isHoang": false }
  ],
  "cachedAt": "2025-01-29T06:30:00.000Z",
  "ttlHours": 24
}
```

---

## §9 - Open questions

Resolved:
- "Which lunar-calendar library does Swift use?" -> DEC-LUNAR-132: re-implement from the PRD §6.2 constants + reference "baolanlequang/VietnameseLunar-ios" MIT.
- "Is the Watch SHOULD or COULD?" -> DEC-LUNAR-133: COULD.
- "By what mechanism is data shared?" -> DEC-LUNAR-131: App Group UserDefaults.

Remaining (defer):
- `AppGroupStoragePlugin` (a native Capacitor plugin) must be written new or an existing plugin found (e.g. `capacitor-community/app-groups`). If no plugin exists yet, ~50 lines of Swift are needed and it must be registered with Capacitor in `AppDelegate`. This is an implementation detail, not a design decision.
- Widget configuration (whether the user can choose the widget size or view multiple widgets) - defer to Phase 3.
- Interactive widget (iOS 17+ `Button` in the widget to dismiss a reminder) - defer; Phase 1 only displays read-only.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Wrong LunarCalcSwift epoch constant | XCTest AC #2 (Tet 2025 fixture) | Test fails, build blocked | Check the copy from PRD §6.2 |
| Earthly branch taken as `(jdn+9)%60 % 12` (off by 8 relative to core) | XCTest AC #15 (`testCanChi_MatchesCore_60DaySweep`) | Widget can-chi off from the app/calendar can-chi | Use `(jdn + 1) % 12` for the earthly branch (matches FR-002) |
| Timezone-convention mismatch across LunarCalc functions | Tet/1985 fixtures fail + AC #16 code review | New-moon day / month 11 / leap month wrong | Every function uses `TZ_VN = 7.0` internally |
| 1985 leap month wrong in Swift | XCTest AC #3 | Test fails | Debug `getLeapMonthOffset` in Swift |
| Wrong or unassigned App Group ID | Widget returns nil cache + potential crash | Widget blank | Check the Developer portal Capabilities |
| Cache stale, LunarCalcSwift fallback slow | XCTest AC #8 measure | Widget shows a placeholder | Profile the fallback path |
| widget-cache-writer.ts does not write | Cache nil, widget uses the LunarCalcSwift fallback | OK but slower | Debug AppGroupStoragePlugin |
| Widget calls URLSession | Code review / AC #9 | App Store policy violation | Remove the code, use local data |
| Widget writes UserDefaults.standard | Code review / AC #10 | Race condition with the main app | Replace with read-only |
| Timeline has fewer than 12 entries | XCTest AC #7 | Auspicious hours do not change | Fix the loop |
| getSnapshot slow > 1s | XCTest AC #8 measure | Blank placeholder | Fast-path cache first |
| JSON from TypeScript not parseable in Swift | JSONDecoder error, nil result | Widget falls back to LunarCalcSwift | Check that field names are consistent |
| AppGroupStoragePlugin not registered | JavaScript silent fail | Cache is not written | Register the plugin in AppDelegate |
| WidgetKit target missing from project.pbxproj | Build fails | Cannot test | Add the target via the Xcode GUI + commit pbxproj |
| Missing purple Asset Catalog color | Widget uses default colors (white/gray) | Inconsistent UX | Add the color set to Assets.xcassets |

---

## §11 - Implementation notes

- The epoch constants in `LunarCalcSwift` are the most important: one wrong digit means a wrong lunar date for every user every morning. Comment the source clearly ("PRD §6.2, confirmed from Ho Ngoc Duc canonical source"). The XCTest fixture is the protection.
- `LunarTimelineProvider.getTimeline` should configure the `.atEnd` reload policy (not "after X minutes") because the entries cover the 12 gio until the end of the day; after midnight the system automatically reloads for the new day.
- App Group writes from TypeScript are async; `registerWidgetCacheWriter` should call it inside `capacitor.addListener("appStateChange")` with error handling (catch and log, do not throw - if the write fails the widget still works via the fallback).
- `systemSmall` is the required size because it is the most common widget size. Medium/Large should use the `.containerBackground` modifier (iOS 17+) for compatibility.
- A SwiftUI `Link` in the widget lets the user tap to open the app at a specific screen (e.g. the good-day picker). Use `widgetURL(URL(string: "genieamlich://day-detail")!)` at the widget level and handle the URL in the Capacitor AppDelegate.
- `LunarWidgetTests` runs in a simulator without a real App Group; mock `UserDefaults` with an injected suite in the test to avoid depending on the App Group.
- Watch complication (COULD): if the decision is to build it, WidgetKit for watchOS (watchOS 9+) uses the same `StaticConfiguration` API - `LunarCalcSwift.swift` and `DayInfoCache.swift` can be reused verbatim, only a new SwiftUI view for the watch-face family (`.accessoryCircular`, `.accessoryRectangular`) is needed.

*End of FR-LUNAR-013.*
