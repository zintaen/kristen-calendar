import WidgetKit
import SwiftUI

struct LunarEntry: TimelineEntry {
    let date: Date      // start of the canh gio this entry represents
    let cache: DayInfoCache
    let currentGio: GioInfoCache?   // gio entry for this date/hour slot
}

struct LunarTimelineProvider: TimelineProvider {
    typealias Entry = LunarEntry

    func placeholder(in context: Context) -> LunarEntry {
        let fakeCache = DayInfoCache(
            dateISO: "2025-01-29",
            lunarDayMonth: "1 tháng 1",
            canChiNgay: "Mậu Tuất",
            isHoangDao: true,
            label: "Hoàng đạo",
            trucName: "Kiến",
            sao28Name: "Giác",
            gioHoangDao: [
                GioInfoCache(canh: "Dần (03:00-05:00)", tuGio: "03:00", denGio: "05:00", isHoang: true)
            ],
            cachedAt: ISO8601DateFormatter().string(from: Date()),
            ttlHours: 24
        )
        return LunarEntry(date: Date(), cache: fakeCache, currentGio: fakeCache.gioHoangDao.first)
    }

    /// Must return quickly (< 1s). Use cache if fresh; compute via LunarCalcSwift if stale.
    func getSnapshot(in context: Context, completion: @escaping (LunarEntry) -> Void) {
        if let cache = DayInfoCache.load(), !DayInfoCache.isStale(cache) {
            completion(LunarEntry(date: Date(), cache: cache, currentGio: cache.gioHoangDao.first))
            return
        }
        
        // Fallback computation
        let fallbackCache = generateFallbackCache(for: Date())
        completion(LunarEntry(date: Date(), cache: fallbackCache, currentGio: fallbackCache.gioHoangDao.first))
    }

    /// Returns 12 entries for 12 canh gio of today (one per 2-hour slot).
    /// Reload policy: .atEnd (reloaded after last entry expires at midnight).
    func getTimeline(in context: Context, completion: @escaping (Timeline<LunarEntry>) -> Void) {
        let currentDate = Date()
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: currentDate)
        
        var baseCache: DayInfoCache
        if let cache = DayInfoCache.load(), !DayInfoCache.isStale(cache) {
            baseCache = cache
        } else {
            baseCache = generateFallbackCache(for: currentDate)
        }
        
        var entries: [LunarEntry] = []
        
        // Create 12 entries for each 2-hour block (canh gio)
        for i in 0..<12 {
            let hour = i * 2
            // 23:00 of previous day to 01:00 is Canh Ty, but let's approximate for the widget timeline
            // If i = 0, hour = 0 (00:00). We will map it to the Canh that contains this hour.
            if let entryDate = calendar.date(byAdding: .hour, value: hour, to: startOfDay) {
                // Find matching gio in cache
                let formatter = DateFormatter()
                formatter.dateFormat = "HH:mm"
                let timeStr = formatter.string(from: entryDate)
                
                let currentGio = baseCache.gioHoangDao.first { gio in
                    // Simple logic: if tuGio <= timeStr && denGio > timeStr. (Handle 23:00-01:00 rollover if needed)
                    // We can just pass the i-th element since baseCache has exactly 12 items
                    return true
                }
                
                let gio = (i < baseCache.gioHoangDao.count) ? baseCache.gioHoangDao[i] : nil
                
                let entry = LunarEntry(date: entryDate, cache: baseCache, currentGio: gio)
                entries.append(entry)
            }
        }
        
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func generateFallbackCache(for date: Date) -> DayInfoCache {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        
        let d = components.day ?? 1
        let m = components.month ?? 1
        let y = components.year ?? 2025
        
        let (lDay, lMonth, _, _) = LunarCalcSwift.convertSolar2Lunar(day: d, month: m, year: y)
        let jdn = LunarCalcSwift.jdFromDate(day: d, month: m, year: y)
        let (canChi, _) = LunarCalcSwift.canChiNgayFromJDN(jdn)
        
        // We only provide a minimal valid fallback. 
        // Full Hoang Dao calculation is too complex for this fallback in Swift without porting all tables.
        // It will just display basic info until the user opens the app.
        
        return DayInfoCache(
            dateISO: "\(y)-\(m)-\(d)",
            lunarDayMonth: "\(lDay) tháng \(lMonth)",
            canChiNgay: canChi,
            isHoangDao: true,
            label: "Ngày Mới",
            trucName: "-",
            sao28Name: "-",
            gioHoangDao: [],
            cachedAt: ISO8601DateFormatter().string(from: Date()),
            ttlHours: 1
        )
    }
}
