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

    static func newMoon(k: Int) -> Double {
        let T = (Double(k) / 1236.85)
        let T2 = T * T
        let T3 = T2 * T
        let dr = DR
        
        let jd = MEEUS_EPOCH + MEEUS_SYNODIC * Double(k)
               + 0.0001337 * T2
               - 0.000000150 * T3
               + 0.00000000073 * T2 * T2

        let M = 2.5534 + 29.10535608 * Double(k)
              - 0.0000218 * T2
              - 0.00000011 * T3

        let Mprime = 201.5643 + 385.81693528 * Double(k)
                   + 0.0107438 * T2
                   + 0.00001239 * T3
                   - 0.000000058 * T2 * T2

        let F = 160.7108 + 390.67050274 * Double(k)
              - 0.0016341 * T2
              - 0.00000227 * T3
              + 0.000000011 * T2 * T2

        let omega = 124.7746 - 1.5637558 * Double(k)
                  + 0.0020691 * T2
                  + 0.00000215 * T3

        let E = 1.0 - 0.002516 * T - 0.0000074 * T2

        var corr = -0.4284 * E * sin(dr * Mprime)
                 + 0.1717 * E * sin(dr * M)
                 + 0.0118 * E * sin(dr * 2 * Mprime)
                 + 0.0089 * sin(dr * 2 * F)
                 + 0.0086 * E * E * sin(dr * 2 * Mprime)
                 - 0.0076 * E * sin(dr * (Mprime - M))
                 - 0.0074 * E * sin(dr * (Mprime + M))
                 + 0.0066 * E * sin(dr * (Mprime - 2 * F))
                 - 0.0040 * sin(dr * (Mprime + 2 * F))
                 - 0.0020 * E * sin(dr * (M - 2 * F))
                 + 0.0017 * sin(dr * omega)
                 - 0.0015 * E * sin(dr * (2 * Mprime - M))
                 + 0.0014 * E * sin(dr * (2 * Mprime + M))

        let W = 0.00033 * sin(dr * (166.56 + 132.87 * T - 0.009173 * T2))
        return jd + corr + W
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
        let k = Int(floor(Double(a11 - LUNAR_MONTH_11_INT) / SYNODIC_MONTH_K))
        var last = 0
        var arc = 0
        
        var leapMonth = 0
        var i = 1
        
        while i <= 14 {
            let nm = getNewMoonDay(k: k + i)
            arc = getSunLongitude(dayNumber: Double(nm))
            if arc == last && leapMonth == 0 {
                leapMonth = i
            }
            last = arc
            i += 1
        }
        return leapMonth - 1
    }

    static func convertSolar2Lunar(day: Int, month: Int, year: Int) -> (lunarDay: Int, lunarMonth: Int, lunarYear: Int, isLeap: Bool) {
        let dayNumber = jdFromDate(day: day, month: month, year: year)
        var k = Int(floor((Double(dayNumber) - EPOCH_INDEX_K) / SYNODIC_MONTH_K))
        var monthStart = getNewMoonDay(k: k + 1)
        
        if monthStart > dayNumber {
            monthStart = getNewMoonDay(k: k)
        } else {
            k += 1
        }
        
        var a11 = getLunarMonth11(year: year)
        var b11 = a11
        if a11 >= monthStart {
            a11 = getLunarMonth11(year: year - 1)
        } else {
            b11 = getLunarMonth11(year: year + 1)
        }
        
        let lunarDay = dayNumber - monthStart + 1
        var diff = Int(floor((Double(monthStart - a11)) / 29.0))
        var lunarYear = year
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
