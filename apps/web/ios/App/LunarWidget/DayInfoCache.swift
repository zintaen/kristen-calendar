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
    let cachedAt: String // Stored as ISO8601 string from JS
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
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let cachedDate = formatter.date(from: cache.cachedAt) ?? ISO8601DateFormatter().date(from: cache.cachedAt) else {
            return true // Fallback to stale if unparseable
        }
        
        let age = Date().timeIntervalSince(cachedDate) / 3600.0
        return age > Double(cache.ttlHours)
    }
}
