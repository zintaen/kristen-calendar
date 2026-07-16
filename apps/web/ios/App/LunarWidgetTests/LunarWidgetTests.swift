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
        // Day pillar (can-chi NGAY) cho 29/01/2025 theo TASK-002 canChiDay:
        //   can = (jdn + 9) % 10, dia chi = (jdn + 1) % 12 -> "Mau Tuat".
        // (Luu y: PRD 6.6 ghi "At Ty" la can-chi NAM, khong phai can-chi ngay.)
        let jdn = LunarCalcSwift.jdFromDate(day: 29, month: 1, year: 2025)
        let (canChi, diaChiIndex) = LunarCalcSwift.canChiNgayFromJDN(jdn)
        XCTAssertEqual(canChi, "Mau Tuat", "Ngay 29/01/2025 la ngay Mau Tuat (can-chi ngay)")
        XCTAssertEqual(diaChiIndex, (jdn + 1) % 12, "dia chi PHAI = (jdn + 1) % 12, khop TASK-002")
    }

    // AC #16 - dia chi/can-chi PHAI dong nhat voi TASK-LUNAR-002 canChiDay qua quet nhieu ngay.
    // Bat loi lay dia chi bang (jdn + 9) % 60 % 12 (lech 8 so voi core).
    func testCanChi_MatchesCore_60DaySweep() {
        let CAN = ["Giap","At","Binh","Dinh","Mau","Ky","Canh","Tan","Nham","Quy"]
        let CHI = ["Ty","Suu","Dan","Mao","Thin","Ti","Ngo","Mui","Than","Dau","Tuat","Hoi"]
        let startJdn = LunarCalcSwift.jdFromDate(day: 1, month: 1, year: 2025)
        for offset in 0..<60 {
            let jdn = startJdn + offset
            let (canChi, diaChiIndex) = LunarCalcSwift.canChiNgayFromJDN(jdn)
            // gia tri ky vong tu cong thuc core (TASK-002 DEC-LUNAR-020)
            let expectedCan = CAN[(jdn + 9) % 10]
            let expectedChi = CHI[(jdn + 1) % 12]
            XCTAssertEqual(diaChiIndex, (jdn + 1) % 12, "dia chi lech tai jdn=\(jdn)")
            XCTAssertEqual(canChi, "\(expectedCan) \(expectedChi)", "can-chi lech tai jdn=\(jdn)")
        }
    }

    func testConvertSolar2Lunar_Tet2025_Identity() {
        // S2L cho Tet 2025 = (1, 1, 2025, khong nhuan).
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
        UserDefaults(suiteName: DayInfoCache.appGroupSuite)?.removeObject(forKey: DayInfoCache.cacheKey)
        XCTAssertNil(DayInfoCache.load())
    }

    func testIsStale_25HoursOld_ReturnsTrue() {
        let oldDate = Date(timeIntervalSinceNow: -25 * 3600)
        let cache = DayInfoCache(
            dateISO: "2025-01-29", lunarDayMonth: "1 thang 1",
            canChiNgay: "At Ty", isHoangDao: true, label: "Hoang dao",
            trucName: "Khai", sao28Name: "Tinh", gioHoangDao: [],
            cachedAt: ISO8601DateFormatter().string(from: oldDate), ttlHours: 24
        )
        XCTAssertTrue(DayInfoCache.isStale(cache))
    }

    func testIsStale_1HourOld_ReturnsFalse() {
        let recentDate = Date(timeIntervalSinceNow: -3600)
        let cache = DayInfoCache(
            dateISO: "2025-01-29", lunarDayMonth: "1 thang 1",
            canChiNgay: "At Ty", isHoangDao: true, label: "Hoang dao",
            trucName: "Khai", sao28Name: "Tinh", gioHoangDao: [],
            cachedAt: ISO8601DateFormatter().string(from: recentDate), ttlHours: 24
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
