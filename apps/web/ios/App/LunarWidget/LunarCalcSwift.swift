import Foundation

/// Minimal re-implementation of Ho Ngoc Duc algorithm for widget use.
/// Uses EXACTLY the PRD §6.2 constants; any change MUST be validated against
/// LunarCalcSwift fixtures in LunarWidgetTests.
struct LunarCalcSwift {
    // PRD §6.2 constants - do NOT change without updating test fixtures
    static let SYNODIC_MONTH_K     = 29.530588853
    static let EPOCH_INDEX_K       = 2415021.076998695
    static let MEEUS_EPOCH         = 2415020.75933
    static let MEEUS_SYNODIC       = 29.53058868
    static let LUNAR_MONTH_11_INT  = 2415021
    static let J2000               = 2451545.0
    static let JULIAN_CENTURY      = 36525.0
    static let DR: Double          = Double.pi / 180.0
    static let TZ_VN: Double       = 7.0                 // UTC+7, 105E

    // MARK: - Utilities
    static func jdFromDate(day: Int, month: Int, year: Int) -> Int {
        var a = (14 - month) / 12
        var y = year + 4800 - a
        var m = month + 12 * a - 3
        var jd = day + ((153 * m + 2) / 5) + 365 * y + (y / 4) - (y / 100) + (y / 400) - 32045
        if jd < 2299161 {
            jd = day + ((153 * m + 2) / 5) + 365 * y + (y / 4) - 32083
        }
        return jd
    }

    /// Ho Ngoc Duc / Jean Meeus truncated new-moon series (the EXACT algorithm used by
    /// @cyberskill/amlich-core). Verified day-for-day against the core across 1900-2100.
    /// Do NOT substitute the full Meeus formula - it diverges from the official VN calendar.
    static func newMoon(k: Int) -> Double {
        let T = Double(k) / 1236.85
        let T2 = T * T
        let T3 = T2 * T
        let dr = DR

        var Jd1 = MEEUS_EPOCH + MEEUS_SYNODIC * Double(k) + 0.0001178 * T2 - 0.000000155 * T3
        Jd1 += 0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * dr)

        let M   = 359.2242 + 29.10535608 * Double(k) - 0.0000333 * T2 - 0.00000347 * T3
        let Mpr = 306.0253 + 385.81691806 * Double(k) + 0.0107306 * T2 + 0.00001236 * T3
        let F   = 21.2964 + 390.67050646 * Double(k) - 0.0016528 * T2 - 0.00000239 * T3

        var C1 = (0.1734 - 0.000393 * T) * sin(M * dr) + 0.0021 * sin(2 * dr * M)
        C1 = C1 - 0.4068 * sin(Mpr * dr) + 0.0161 * sin(2 * dr * Mpr)
        C1 = C1 - 0.0004 * sin(3 * dr * Mpr) + 0.0104 * sin(2 * dr * F)
        C1 = C1 - 0.0051 * sin((M + Mpr) * dr) - 0.0074 * sin((M - Mpr) * dr)
        C1 = C1 + 0.0004 * sin((2 * F + M) * dr) - 0.0004 * sin((2 * F - M) * dr)
        C1 = C1 - 0.0006 * sin((2 * F + Mpr) * dr) + 0.0010 * sin((2 * F - Mpr) * dr)
        C1 = C1 + 0.0005 * sin((2 * Mpr + M) * dr)

        let deltat: Double
        if T < -11 {
            deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
        } else {
            deltat = -0.000278 + 0.000265 * T + 0.000262 * T2
        }
        return Jd1 + C1 - deltat
    }

    static func sunLongitude(jdn: Double) -> Double {
        let T = (jdn - J2000) / JULIAN_CENTURY
        let T2 = T * T
        let dr = DR
        
        let M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2
        let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
        
        let dl = (1.914600 - 0.004817 * T - 0.000014 * T2) * sin(dr * M)
                 + (0.019993 - 0.000101 * T) * sin(dr * 2 * M)
                 + 0.000290 * sin(dr * 3 * M)
        
        var L = L0 + dl
        L = L.truncatingRemainder(dividingBy: 360.0)
        if L < 0 { L += 360.0 }
        return L * dr
    }

    static func getNewMoonDay(k: Int) -> Int {
        return Int(floor(newMoon(k: k) + 0.5 + TZ_VN / 24.0))
    }

    static func getSunLongitude(dayNumber: Double) -> Int {
        return Int(floor(sunLongitude(jdn: dayNumber - 0.5 - TZ_VN / 24.0) / Double.pi * 6.0))
    }

    static func getLunarMonth11(year: Int) -> Int {
        let off = jdFromDate(day: 31, month: 12, year: year) - LUNAR_MONTH_11_INT
        var k = Int(floor(Double(off) / SYNODIC_MONTH_K))
        var nm = getNewMoonDay(k: k)
        let sunLong = getSunLongitude(dayNumber: Double(nm))
        
        if sunLong >= 9 {
            nm = getNewMoonDay(k: k - 1)
        }
        return nm
    }

    static func getLeapMonthOffset(a11: Int) -> Int {
        // Canonical Ho Ngoc Duc: seed k from EPOCH_INDEX_K + 0.5, pre-seed arc BEFORE the
        // loop (i = 1 is the month after lunar month 11), exit when two consecutive months
        // carry the same major solar term. Verified against amlich-core across 1900-2100.
        let k = Int(floor((Double(a11) - EPOCH_INDEX_K) / SYNODIC_MONTH_K + 0.5))
        var i = 1
        var arc = getSunLongitude(dayNumber: Double(getNewMoonDay(k: k + i)))
        var last = 0
        repeat {
            last = arc
            i += 1
            arc = getSunLongitude(dayNumber: Double(getNewMoonDay(k: k + i)))
        } while arc != last && i < 14
        return i - 1
    }

    static func convertSolar2Lunar(day: Int, month: Int, year: Int) -> (lunarDay: Int, lunarMonth: Int, lunarYear: Int, isLeap: Bool) {
        let dayNumber = jdFromDate(day: day, month: month, year: year)
        let k = Int(floor((Double(dayNumber) - EPOCH_INDEX_K) / SYNODIC_MONTH_K))
        var monthStart = getNewMoonDay(k: k + 1)
        if monthStart > dayNumber {
            monthStart = getNewMoonDay(k: k)
        }

        // lunarYear MUST be seeded inside the branch (yy vs yy+1). A date after the
        // winter-solstice month-11 new moon belongs to the NEXT lunar year (yy+1); the
        // month-11/12 correction below then subtracts 1 back where appropriate. Hardcoding
        // year here silently shifts the displayed lunar year by 1 for Nov/Dec dates.
        var a11 = getLunarMonth11(year: year)
        var b11 = a11
        var lunarYear: Int
        if a11 >= monthStart {
            lunarYear = year
            a11 = getLunarMonth11(year: year - 1)
        } else {
            lunarYear = year + 1
            b11 = getLunarMonth11(year: year + 1)
        }

        let lunarDay = dayNumber - monthStart + 1
        let diff = Int(floor((Double(monthStart - a11)) / 29.0))
        var lunarMonth = diff + 11
        var isLeap = false
        
        if b11 - a11 > 365 {
            let leapMonthDiff = getLeapMonthOffset(a11: a11)
            if diff >= leapMonthDiff {
                lunarMonth = diff + 10
                if diff == leapMonthDiff {
                    isLeap = true
                }
            }
        }
        
        if lunarMonth > 12 {
            lunarMonth -= 12
        }
        if lunarMonth >= 11 && diff < 4 {
            lunarYear -= 1
        }
        
        return (lunarDay, lunarMonth, lunarYear, isLeap)
    }

    static func canChiNgayFromJDN(_ jdn: Int) -> (canChi: String, diaChiIndex: Int) {
        let CAN = ["Giap", "At", "Binh", "Dinh", "Mau", "Ky", "Canh", "Tan", "Nham", "Quy"]
        let CHI = ["Ty", "Suu", "Dan", "Mao", "Thin", "Ti", "Ngo", "Mui", "Than", "Dau", "Tuat", "Hoi"]
        
        let canIndex = (jdn + 9) % 10
        let diaChiIndex = (jdn + 1) % 12
        
        return ("\(CAN[canIndex]) \(CHI[diaChiIndex])", diaChiIndex)
    }
}
