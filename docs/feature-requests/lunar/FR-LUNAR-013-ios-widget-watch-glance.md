---
id: FR-LUNAR-013
title: "iOS glanceable surfaces - WidgetKit home-screen widget (ngày âm + can-chi + giờ Hoàng đạo) và Apple Watch complication, native Swift trong ios/App"
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
  - DEC-LUNAR-130 (WidgetKit và Watch complication BẮT BUỘC viết bằng native Swift/SwiftUI; Capacitor không thể cung cấp surface cho WidgetKit; đây là native target riêng trong Xcode project của ios/App)
  - DEC-LUNAR-131 (dữ liệu chia sẻ giữa web layer và Swift widget qua App Group + UserDefaults suite "group.world.cyberskill.genie"; web layer ghi DayInfoCache, Swift đọc - không có network call trong widget)
  - DEC-LUNAR-132 (Swift side re-implement tính toán âm lịch tối thiểu - chỉ 2 hàm: convertSolar2Lunar và canChiNgay - bằng cùng các hằng số epoch từ PRD §6.2; có thể dùng "baolanlequang/VietnameseLunar-ios" Swift MIT làm tham khảo nhưng phải kiểm lại hằng số)
  - DEC-LUNAR-133 (Watch complication là COULD trong FR này - chỉ build khi WidgetKit widget đã ship và ổn; PRD FR-F02 đánh dấu "tùy chọn"; để gian App Watch là watchOS app riêng, WidgetKit là bước 1)
  - DEC-LUNAR-134 (widget chỉ đọc dữ liệu; KHÔNG ĐƯỢC write UserDefaults hay thay đổi bất kỳ state ứng dụng nào từ trong widget extension; state chỉ do web layer ghi)
  - DEC-LUNAR-135 (thiết kế widget theo 3 kích cỡ systemSmall, systemMedium, systemLarge; Small là bắt buộc; Medium và Large là SHOULD - có thể là stacked layout của Small)
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
  - "gọi URLSession hay bất kỳ network request nào trong widget extension (vi phạm DEC-LUNAR-131 / DEC-LUNAR-134 / NFR-Offline)"
  - "write UserDefaults hay thay đổi state từ widget (vi phạm DEC-LUNAR-134)"
  - "dùng Capacitor bridge để truyền dữ liệu runtime cho widget (Capacitor bridge không chạy trong widget extension process)"
effort_hours: 12
sub_tasks:
  - "2h: LunarCalcSwift.swift - re-implement convertSolar2Lunar và canChiNgay với đúng hằng số từ PRD §6.2; epoch index-k 2415021.076998695, Meeus 2415020.75933, synodic 29.53058868"
  - "1.5h: DayInfoCache.swift - struct DayInfoCache (Codable) và hàm read/write qua App Group UserDefaults suite 'group.world.cyberskill.genie'; DayInfoCacheWriter.swift cho web layer"
  - "1h: widget-cache-writer.ts - ghi DayInfoCache sang App Group storage via Capacitor native bridge khi app mở; gọi LunarCalcTS (FR-011) để lấy DayQuality và mã hóa JSON"
  - "2h: LunarWidget.swift - TimelineProvider: `getTimeline` tạo entries cho 24 giờ (mỗi entry cho 1 giờ do giờ Hoàng đạo đổi theo); `getSnapshot` trả ngày hôm nay từ cache hoặc tính trực tiếp nếu cache stale"
  - "2h: LunarWidgetEntryView.swift - SwiftUI View cho 3 size: systemSmall (ngày âm + can-chi + label Hoàng/Hắc), systemMedium (+giờ Hoàng đạo, +trực), systemLarge (+28 sao, +list canh giờ đầy đủ)"
  - "1.5h: LunarWidgetBundle.swift + Info.plist + Entitlements - App Group, Widget configuration, target setup trong Xcode"
  - "2h: LunarWidgetTests.swift - unit test LunarCalcSwift: fixture 29/01/2025 Tết 2025, Tết 2023-2026, 1985 leap, canChi round-trip"
risk_if_skipped: "FR-F01 widget là một trong những 'wow feature' để truyền thông và là điểm khác biệt khi Persona 3 (Anh Tuấn) so sánh app với các app âm lịch khác. PRD §9 nói rõ WidgetKit phải viết native Swift - đây không thể làm bằng Capacitor hay React Native. Không có widget, người dùng phải mở app để xem can-chi và giờ Hoàng đạo mỗi sáng, giảm retention rõ ràng."
---

## §1 - Description (BCP-14 normative)

Tính năng iOS glanceable surfaces PHẢI cung cấp WidgetKit home-screen widget hiển thị ngày âm, can-chi, và giờ Hoàng đạo hôm nay, được viết bằng native Swift/SwiftUI trong Xcode target `LunarWidget` (DEC-LUNAR-130).

1. PHẢI thêm native Swift target `LunarWidget` vào Xcode project `apps/web/ios/App/App.xcodeproj` sử dụng `WidgetKit` framework; target này chạy trong quá trình widget extension riêng biệt, tách biệt hoàn toàn với Capacitor web view (DEC-LUNAR-130).
2. PHẢI cấu hình App Group `group.world.cyberskill.genie` trong cả App target (Capacitor) lẫn Widget target; đây là cơ chế duy nhất để chia sẻ dữ liệu (DEC-LUNAR-131).
3. PHẢI định nghĩa `struct DayInfoCache: Codable` chứa các trường: `dateISO` (String), `lunarDayMonth` (String, e.g. "15 thang 7"), `canChiNgay` (String), `isHoangDao` (Bool), `label` (String), `trucName` (String), `sao28Name` (String), `gioHoangDao` ([GioInfoCache]) với `cachedAt` (Date) và `ttlHours: Int = 24` (DEC-LUNAR-131).
4. PHẢI viết hàm `widget-cache-writer.ts` phía web layer: khi app được open (Capacitor `App.addListener("appStateChange")`), tính `DayQuality` cho ngày hôm nay bằng FR-LUNAR-011, mã hóa JSON, và ghi vào App Group UserDefaults suite `group.world.cyberskill.genie` với key `"dayInfoCache"` (DEC-LUNAR-131).
5. PHẢI viết `DayInfoCache.swift` với hàm `static func load() -> DayInfoCache?` đọc từ `UserDefaults(suiteName: "group.world.cyberskill.genie")` và `static func isStale(_ cache: DayInfoCache) -> Bool` kiểm tra `cachedAt` + `ttlHours` (DEC-LUNAR-131).
6. PHẢI viết `LunarCalcSwift.swift` re-implement 2 hàm tối thiểu - `convertSolar2Lunar` và `canChiNgayFromJDN` - bằng đúng hằng số từ PRD §6.2 (epoch index-k `2415021.076998695`, Meeus epoch `2415020.75933`, synodic Meeus `29.53058868`, integer epoch `2415021`); đúng này cho phép widget tính ngày khi cache stale (DEC-LUNAR-132). `canChiNgayFromJDN` PHẢI dùng đúng offset của FR-LUNAR-002 `canChiDay`: `canIndex = (jdn + 9) % 10` và `diaChiIndex = (jdn + 1) % 12`; KHÔNG ĐƯỢC suy địa chi bằng `(jdn + 9) % 60` rồi `% 12` (cho `(jdn + 9) % 12`, lệch 8 so với core và lệch can-chi mà app/web hiển thị) (DEC-LUNAR-132).
7. PHẢI viết `TimelineProvider` trả về `Timeline<LunarEntry>` với entries theo giờ: mỗi entry có `date` là đầu canh giờ tương ứng, để giờ Hoàng/Hắc đạo được cập nhật theo giờ trong ngày mà không cần mở app (PRD FR-F01).
8. PHẢI viết `LunarWidgetEntryView` với SwiftUI hỗ trợ 3 kích cỡ:
   - `systemSmall` (PHẢI): ngày âm lớn + can-chi + badge "Hoàng đạo" hoặc "Hắc đạo" (màu khác nhau);
   - `systemMedium` (NÊN): thêm `trucName`, top 3 canh giờ Hoàng đạo;
   - `systemLarge` (NÊN): thêm `sao28Name` và list đầy đủ 12 canh giờ với isHoang flag.
9. PHẢI sử dụng màu sắc phù hợp với purple theme (FR-LUNAR-009): nền kem âm, chữ tím đậm, badge Hoàng đạo màu vàng/xanh, badge Hắc đạo màu xám/đỏ nhạt - đảm bảo tương phản đủ đọc trong WidgetKit rendering context (DEC-LUNAR-131).
10. KHÔNG ĐƯỢC gọi `URLSession`, `URLRequest`, hay bất kỳ network API nào từ bên trong widget extension process; mọi dữ liệu phải đến từ App Group cache hoặc `LunarCalcSwift` local (DEC-LUNAR-131, NFR-Offline).
11. KHÔNG ĐƯỢC gọi `UserDefaults.standard.set(...)` hay ghi bất kỳ state nào từ widget; widget chỉ đọc (DEC-LUNAR-134).
12. NÊN implement Watch complication (COULD) bằng watchOS 2 `CLKComplicationDataSource` hoặc WidgetKit for watchOS (watchOS 9+): cho phép widget nhỏ hiển thị ngày âm + can-chi trên Watch face; đây là optional target `LunarWatchWidget` (DEC-LUNAR-133).
13. PHẢI viết `LunarWidgetTests` dùng `XCTest` kiểm tra `LunarCalcSwift` với fixture từ PRD §6.6: 29/01/2025 là 1/1 năm Ất Tỵ (can-chi NĂM; can-chi NGAY là Mậu Tuất), Tết 2024/2023, năm nhuận 1985 tháng 2. (Contract tối thiểu chỉ có `convertSolar2Lunar`, không có `convertLunar2Solar`, nên kiểm tra S2L trực tiếp trên các fixture thay vì round-trip L2S(S2L).)
14. PHẢI có `getSnapshot()` trong `TimelineProvider` trả về snapshot nhanh (< 1s) khi hệ thống xem trước widget; snapshot dùng cache nếu có, nếu không dùng `LunarCalcSwift` tính trực tiếp cho `Date()`.
15. PHẢI giữ múi giờ nhất quán trong `LunarCalcSwift`: mọi hàm phụ thuộc múi giờ (`getNewMoonDay`, `getSunLongitude`, `getLunarMonth11`, `getLeapMonthOffset`, `convertSolar2Lunar`) PHẢI dùng đúng một hằng số `TZ_VN = 7.0` (105E) bên trong; KHÔNG ĐƯỢC để một hàm nhận `tz` còn hàm khác bỏ qua, vì lệch quy ước múi giờ làm sai ngày Sóc/tháng 11/tháng nhuận (DEC-LUNAR-130/132, PRD 6.1 rule 5, FR-LUNAR-001 DEC-LUNAR-010).
16. PHẢI có XCTest khẳng định địa chi/can-chi của `canChiNgayFromJDN` đồng nhất với FR-LUNAR-002 `canChiDay` trên một quét nhiều ngày (>= 60 ngày): với mỗi JDN, `diaChiIndex == (jdn + 1) % 12` và `canChi` khớp nhãn can-chi của core; đây là lưới bắt lỗi địa chi lệch 8 do `(jdn + 9) % 60` (DEC-LUNAR-132).

---

## §2 - Why this design (rationale for humans)

**Tại sao bắt buộc viết bằng native Swift/SwiftUI (DEC-LUNAR-130)?** WidgetKit chỉ có thể dùng SwiftUI; không có Swift bridge nào từ Capacitor vào widget extension process. Đây là giới hạn của Apple, không phải của Capacitor. PRD §9 xác nhận điều này: "Widget iOS (WidgetKit) và Watch complication phải viết native Swift trong một thư mục ios/App (Capacitor cho phép thêm native target)". Capacitor vẫn quản lý app chính; widget là extension target chạy process riêng.

**Tại sao dùng App Group UserDefaults để chia sẻ dữ liệu (DEC-LUNAR-131)?** Có 3 cách: (1) App Group UserDefaults - nhanh, đơn giản, phù hợp với payload nhỏ; (2) App Group File (plist/json) - phức tạp hơn nhưng tương tự; (3) CloudKit - cần mạng. Option 1 là đúng nhất cho dữ liệu < 10KB như DayInfoCache. Ghi từ TypeScript qua Capacitor bridge khi app open, widget đọc khi render - luồng dữ liệu 1 chiều, sạch.

**Tại sao re-implement `LunarCalcSwift` thay vì chỉ dùng cache (DEC-LUNAR-132)?** Cache có TTL 24 giờ. Nếu người dùng chưa mở app trong 24 giờ (e.g. đi ngủ lúc 23:00, thức dậy lúc 7:00 ngày hôm sau), cache đã stale. Với `LunarCalcSwift` widget có thể tính toán trực tiếp - là fallback sạch. PRD §6.2 cung cấp đủ hằng số - re-implement 2 hàm là ~100 dòng Swift, không đáng sợ.

**Tại sao Watch complication là COULD (DEC-LUNAR-133)?** PRD FR-F02 ghi "tùy chọn". WidgetKit widget là deliverable rõ ràng (FR-F01 MUST); Watch là phức tạp thêm: cần watchOS target riêng, cài đặt phân phối watch extension, và test trên thiết bị Watch (simulator không đầy đủ). Ship widget iOS trước, thu thập feedback, rồi quyết định có cần Watch không là hơn.

**Tại sao widget chỉ đọc, không ghi (DEC-LUNAR-134)?** Widget extension chạy process khác với app. Nếu widget ghi UserDefaults mà app cũng ghi, có thể gây race condition. Quan trọng hơn: WidgetKit timeline refresh có thể gọi widget bất kỳ lúc nào; nếu widget ghi state thì state có thể bị thay đổi khi người dùng đang dùng app chính. Giữ widget là read-only là an toàn nhất.

**Tại sao timeline có entries theo giờ (§1 #7)?** Giờ Hoàng đạo thay đổi mỗi 2 giờ. Nếu chỉ có 1 entry/ngày thì widget hiển thị cùng một giờ Hoàng đạo từ 23:00 hôm trước đến 22:59 hôm sau - sai. Tạo 12 entries (mỗi canh 1 entry) với `date` là đầu canh giờ WidgetKit tự động hiển thị entry phù hợp theo giờ hiện tại.

**Tại sao test Swift bằng `XCTest` với fixture PRD §6.6 (§1 #13)?** `LunarCalcSwift` là re-implementation - nguy cơ lỗi nhỏ cao hơn port TypeScript. Fixture cùng cấp PRD §6.6 (Tết 2023-2026, 1985 leap) là có thể kiểm tra nhanh nhất rằng hằng số epoch Swift đồng nhất với TypeScript core. Nếu 2 phía cho kết quả khác nhau với cùng fixture, bug phát hiện ngay.

**Tại sao `getSnapshot()` phải nhanh (§1 #14)?** Hệ thống iOS gọi `getSnapshot()` khi người dùng thêm widget vào màn hình hoặc khi system xem trước. Nếu chậm > 1-2s, system hủy call và hiển thị placeholder trắng. Snapshot phải fast-path: đọc cache nếu có, tính trực tiếp nếu không (< 100ms với LunarCalcSwift).

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

1. `LunarWidget` target build thành công bằng `xcodebuild build -scheme LunarWidget` không có warning hoặc error.
2. `LunarWidgetTests` với fixture 29/01/2025: `LunarCalcSwift.convertSolar2Lunar(day: 29, month: 1, year: 2025)` trả về `(1, 1, 2025, false)` (ngày 1 tháng 1 Ất Tỵ) - khớp với TypeScript core.
3. `LunarWidgetTests` với fixture 1985 năm nhuận: `LunarCalcSwift.convertSolar2Lunar(day: 21, month: 3, year: 1985)` trả về tháng 2 nhuận đúng.
4. `LunarCalcSwift.canChiNgayFromJDN` trả về `"Mau Tuat"` (can-chi NGAY) cho JDN tương ứng ngày 29/01/2025, và `diaChiIndex == (jdn + 1) % 12`; KHÔNG được trả "At Ty" (đó là can-chi NĂM, không phải ngày) - phải khớp `canChiDay` của FR-LUNAR-002.
5. `DayInfoCache.load()` trả về `nil` nếu App Group chưa có data (không crash).
6. `DayInfoCache.isStale()` trả về `true` nếu `cachedAt` là 25 giờ trước (TTL = 24).
7. Widget `getTimeline` tạo đúng 12 `LunarEntry`, mỗi entry có `date` cách nhau 2 giờ (canh giờ), reload policy là `.atEnd` vào 24:00.
8. `getSnapshot` hoàn thành trong < 1 giây (đo bằng XCTest `measure`).
9. Widget không gọi `URLSession.shared.dataTask` hay bất kỳ network API nào (verified bằng mock URLProtocol trong test hoặc code review).
10. Widget không gọi `UserDefaults.standard.set(...)` (verified bằng code review; chỉ đọc qua suite).
11. `systemSmall` view hiển thị đúng 3 element: `lunarDayMonth`, `canChiNgay`, và badge "Hoàng đạo"/"Hắc đạo" - kiểm tra bằng `ViewInspector` hoặc snapshot test.
12. `widget-cache-writer.ts` ghi dữ liệu khi `appStateChange.isActive === true` và KHÔNG ghi khi `isActive === false`.
13. `LunarWidget` bundle được đăng ký trong `App.xcodeproj` với App Group entitlement `group.world.cyberskill.genie`.
14. TypeScript `writeWidgetCache` tạo JSON hợp lệ: `JSON.parse(output)` không throw, các trường bắt buộc có mặt.
15. `canChiNgayFromJDN` đồng nhất với FR-LUNAR-002 `canChiDay` qua quét >= 60 ngày liên tiếp: `diaChiIndex == (jdn + 1) % 12` và `canChi` khớp `"<Can> <Chi>"` từ công thức core cho mọi ngày (test `testCanChi_MatchesCore_60DaySweep`).
16. `LunarCalcSwift` dùng nhất quán `TZ_VN = 7.0` cho mọi hàm phụ thuộc múi giờ; không hàm nào dùng tz khác hoặc bỏ qua tz (code review + fixture Tết/1985 vẫn đúng làm bằng chứng).

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

Swift side: `LunarCalcSwift.convertSolar2Lunar` là port thẳng từ TypeScript - cùng công thức `jdFromDate`, `NewMoon(k)`, `SunLongitude(jdn)`, `getLunarMonth11`, `getLeapMonthOffset`, và đều dùng `TZ_VN = 7.0` (105E) nội bộ (không hàm nào lệch quy ước múi giờ). Constants copy nguyên từ PRD §6.2 - không đổi gì. `canChiNgayFromJDN` PHẢI dùng `canIndex = (jdn + 9) % 10` và `diaChiIndex = (jdn + 1) % 12` - đúng offset của FR-LUNAR-002 `canChiDay`; KHÔNG dùng `(jdn + 9) % 60` rồi `% 12` (lệch 8). `getTimeline` tạo `startOfDay(for: Date())`, lặp 12 lần (0, 2, 4, ... 22 giờ), mỗi bước tạo `LunarEntry` với `date = startOfDay + i*2h` và `currentGio = cache.gioHoangDao[i]`.

TypeScript side: `widget-cache-writer.ts` cần một Capacitor plugin native `AppGroupStorage` để ghi vào App Group. Nếu chưa có plugin này, có thể viết iOS native plugin đơn giản (1 hàm `write(suite, key, value)`) trong `ios/App/App/AppGroupStoragePlugin.swift`.

Điểm khó nhất: đồng bộ TTL. Nếu người dùng chưa mở app trong 24+ giờ, cache stale và widget phải tính bằng `LunarCalcSwift`. Hàm fallback `getTimeline` nên kết hợp: thử đọc cache trước, nếu stale thì tính trực tiếp, ghi lại vào cache.

---

## §7 - Dependencies

Upstream: FR-LUNAR-001 là nhà cung cấp hằng số epoch và thuật toán gốc (LunarCalcSwift port từ đây). FR-LUNAR-002 cung cấp `canChi` logic mà LunarCalcSwift phải re-implement. FR-LUNAR-011 là nguồn tính `DayQuality` cho `widget-cache-writer.ts` phía TypeScript.

Downstream: FR-LUNAR-013 không block FR nào khác.

Cross-cutting: App Group ID `group.world.cyberskill.genie` phải được đăng ký với Apple Developer portal trong Capabilities của cả App target và Widget target. Purple theme (FR-009) nên được áp dụng cho SwiftUI views - có thể dùng Asset Catalog color set thay vì import token TS.

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

Đã giải quyết:
- "Swift dùng thư viện âm lịch nào?" -> DEC-LUNAR-132: re-implement từ hằng số PRD §6.2 + tham khảo "baolanlequang/VietnameseLunar-ios" MIT.
- "Watch là SHOULD hay COULD?" -> DEC-LUNAR-133: COULD.
- "Chia sẻ dữ liệu qua cơ chế nào?" -> DEC-LUNAR-131: App Group UserDefaults.

Còn lại (defer):
- `AppGroupStoragePlugin` (Capacitor plugin native) phải được viết mới hoặc tìm plugin có sẵn (e.g. `capacitor-community/app-groups`). Nếu chưa có plugin, cần viết ~50 dòng Swift và register với Capacitor trong `AppDelegate`. Đây là implementation detail, không phải design decision.
- Widget configuration (người dùng có thể chọn widget size hay có thể xem nhiều widget không) - defer đến Phase 3.
- Interactive widget (iOS 17+ `Button` trong widget để tắt nhắc) - defer; Phase 1 chỉ hiển thị read-only.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Hằng số epoch LunarCalcSwift sai | XCTest AC #2 (Tết 2025 fixture) | Test fail, build block | Kiểm tra copy từ PRD §6.2 |
| Địa chi lấy bằng `(jdn+9)%60 % 12` (lệch 8 so với core) | XCTest AC #15 (`testCanChi_MatchesCore_60DaySweep`) | Can-chi widget lệch can-chi app/lịch | Dùng `(jdn + 1) % 12` cho địa chi (khớp FR-002) |
| Lệch quy ước múi giờ giữa các hàm LunarCalc | Fixture Tết/1985 fail + AC #16 code review | Ngày Sóc/tháng 11/nhuận sai | Mọi hàm dùng `TZ_VN = 7.0` nội bộ |
| 1985 leap month sai Swift | XCTest AC #3 | Test fail | Debug `getLeapMonthOffset` Swift |
| App Group ID sai hoặc chưa cấp | Widget trả nil cache + crash potential | Widget blank | Kiểm tra Developer portal Capabilities |
| Cache stale, LunarCalcSwift fallback chậm | XCTest AC #8 measure | Widget placeholder hiển thị | Profile fallback path |
| widget-cache-writer.ts không ghi | Cache nil, widget dùng LunarCalcSwift fallback | OK nhưng tốc độ chậm | Debug AppGroupStoragePlugin |
| Widget gọi URLSession | Code review / AC #9 | Vi phạm policy App Store | Xóa code, dùng local data |
| Widget ghi UserDefaults.standard | Code review / AC #10 | Race condition với app chính | Thay bằng read-only |
| Timeline không đủ 12 entries | XCTest AC #7 | Giờ Hoàng đạo không đổi | Fix vòng lặp |
| getSnapshot chậm > 1s | XCTest AC #8 measure | Placeholder blank | Fast-path cache first |
| JSON từ TypeScript không parse được ở Swift | JSONDecoder error, nil result | Widget fallback về LunarCalcSwift | Kiểm tra field names đồng nhất |
| AppGroupStoragePlugin chưa được register | JavaScript silent fail | Cache không được ghi | Thêm plugin đăng ký vào AppDelegate |
| WidgetKit target không có trong project.pbxproj | Build fail | Không thể test | Thêm target bằng Xcode GUI + commit pbxproj |
| Purple color Asset Catalog thiếu | Widget màu mặc định (trắng/xám) | UX không đồng nhất | Thêm color set vào Assets.xcassets |

---

## §11 - Implementation notes

- Hằng số epoch trong `LunarCalcSwift` là quan trọng nhất: sai 1 chữ số là sai ngày âm cho mọi người dùng mọi sáng. Comment mô tả rõ nguồn ("PRD §6.2, confirmed from Ho Ngoc Duc canonical source"). XCTest fixture là bảo vệ.
- `LunarTimelineProvider.getTimeline` nên cấu hình `.atEnd` reload policy (không phải sau X phút) vì entries bao gồm 12 canh giờ đến hết ngày; sau nửa đêm hệ thống tự động reload cho ngày mới.
- Viết App Group writes từ TypeScript là async; `registerWidgetCacheWriter` nên gọi trong `capacitor.addListener("appStateChange")` với error handling (catch và log, không throw - nếu ghi lỗi widget vẫn hoạt động bằng fallback).
- `systemSmall` là kích cỡ bắt buộc vì là kích cỡ widget phổ biến nhất. Medium/Large nên dùng `.containerBackground` modifier (iOS 17+) để tương thích.
- SwiftUI `Link` trong widget cho phép người dùng tap vào mở app đến màn hình cụ thể (e.g. good-day picker). Dùng `widgetURL(URL(string: "genieamlich://day-detail")!)` ở cấp widget và xử lý URL trong Capacitor AppDelegate.
- `LunarWidgetTests` chạy trong simulator không có App Group thật; mock `UserDefaults` bằng injected suite trong test để tránh phụ thuộc App Group.
- Watch complication (COULD): nếu quyết định build, WidgetKit for watchOS (watchOS 9+) dùng cùng `StaticConfiguration` API - có thể tái sử dụng `LunarCalcSwift.swift` và `DayInfoCache.swift` nguyên xi, chỉ cần view SwiftUI mới cho watch face family (`.accessoryCircular`, `.accessoryRectangular`).

*Hết FR-LUNAR-013.*
