---
fr_id: FR-LUNAR-001
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-001 đặc tả core lunar engine. Phạm vi: 18 điều khoản normative ở §1 (convertSolar2Lunar / convertLunar2Solar hai chiều 1900-2199, 105E với tz=7.0, tháng nhuận theo "không chứa Trung khí", jdFromDate với switch 2299161, NewMoon Meeus, SunLongitude J2000, ba epoch tách bạch, hai synodic constant tách vai trò, offline zero-dependency, < 5ms, freeze hằng số, jdToDate + lunarLeap 0|1). 7 đoạn §2 rationale. §3 port nguyên vẹn jdFromDate, jdToDate, NewMoon, SunLongitude, getSunLongitude, getNewMoonDay, getLunarMonth11, getLeapMonthOffset, convertSolar2Lunar, convertLunar2Solar với đúng hằng số PRD 6.2. 16 acceptance criteria. §5 có 7 nhóm test vitest gồm 5 fixture Tết, switch Julian/Gregorian, round-trip sweep 1900-2199, 1985 nhuận, bound getSunLongitude, hiệu năng, sentinel nhuận. §10 có 13 dòng failure. §11 có 8 note. Map tới PRD FR-A01, FR-A02, FR-A06, NFR-Offline, NFR-Performance, Lunar spec 6.1-6.5.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Ba epoch dễ bị dùng lẫn
2415021.076998695, 2415020.75933, 2415021 gần giống nhau và dễ gộp nhầm. Resolved: §1 #11/#12, DEC-LUNAR-011, hằng số tách bạch ở §3 với JSDoc, §10 dòng 1, §11 note 1.

### ISS-002 - Hai synodic constant có thể bị gộp
29.530588853 (index-k) và 29.53058868 (Meeus per-k) phục vụ hai vai trò. Resolved: §1 #6, DEC-LUNAR-013, §3 SYNODIC_INDEX_K vs MEEUS_SYNODIC, §10 dòng 2, §11 note 2.

### ISS-003 - Sai múi giờ làm lịch theo TQ
Hard-code 120E hoặc UTC+8 làm 1985 và 2007/2030/2053 sai. Resolved: §1 #3, DEC-LUNAR-010, VN_TIMEZONE = 7.0, AC #11, §10 dòng 3.

### ISS-004 - Off-by-one khi suy k
Ngày đầu tháng có thể lệch 1 nếu không lùi getNewMoonDay(k). Resolved: §1 #1, §6 ghim thứ tự suy k, round-trip sweep AC #5, §11 note 7.

### ISS-005 - Nhuận không khớp trong L2S không có đường ra
convertLunar2Solar với cờ nhuận sai năm cần sentinel. Resolved: §1 #2, AC #16, trả về [0,0,0], §8 payload 3, §10 dòng 8 (FR-LUNAR-004 áp fallback).

### ISS-006 - Cam kết offline và zero-dependency chưa có guard
Resolved: §1 #13/#14, DEC-LUNAR-012, AC #13 deps rỗng + AC #15 không network, disallowed_tools.

### ISS-007 - Hằng số có thể bị sửa im lặng lúc runtime
Resolved: §1 #16, DEC-LUNAR-016 freeze, AC #12 gán lại ném/vô hiệu, §11 note 8.

## §3 - Resolution

Tất cả 7 quan ngại có học đã xử lý: ba epoch và hai synodic tách bạch có JSDoc, múi giờ khóa 105E, off-by-one chặn bằng round-trip sweep, sentinel nhuận nối sang FR-LUNAR-004, offline và zero-dependency có guard test, hằng số freeze. Các hàm port nguyên vẹn từ canonical Hồ Ngọc Đức với đúng từng hằng số PRD 6.2. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Readiness pass (2026-06-28, contract alignment)

Đợt này là TASK A (contract alignment): đồng bộ §3 API với CONTRACT.md và scaffold thực tế (`src/constants.ts`, `src/types.ts`). Các thay đổi:
- Ten hang so da doi: `VN_TIMEZONE` -> `VN_TZ`; `MEEUS_EPOCH` -> `MEEUS_NEW_MOON_EPOCH`; `MEEUS_SYNODIC` -> `MEEUS_SYNODIC_PER_K`; `LUNAR_MONTH11_INT` -> `LUNAR_MONTH11_EPOCH_INT`; `JULIAN_CENTURY` -> `JULIAN_CENTURY_DAYS`. Tat ca ten moi khop chinh xac scaffold va CONTRACT.md.
- Bo sung `INVALID_SOLAR: SolarDate` va `isInvalidSolar(s): boolean` vao §3 (CONTRACT.md yeu cau; da co trong scaffold `src/types.ts`). Them §1 #17 (MUST), AC #17, va test group "INVALID_SOLAR / isInvalidSolar" vao §5.
- Them `VN_TZ_ID`, `VN_MERIDIAN`, `T_DIVISOR` vao §3 cho du CONTRACT surface.
- SolarDate va LunarDate da thanh `readonly` tuple nhu scaffold.
- §11 notes: cap nhat ten hang so trong prose.
- Khong co thay doi logic hoac so hoc; chi dong bo ten voi nguon su that la scaffold.

---

## §4 - Independent adversarial pass (2026-06-27, reviewer khác tác giả)

Chạy lại engine canonical (jdFromDate/jdToDate/NewMoon/SunLongitude/convertSolar2Lunar/convertLunar2Solar) đối chiếu từng hằng số PRD 6.2 và toàn bộ fixture. Phần số học SẠCH: 5 mốc Tết khớp hai chiều, VN-vs-China 2007/2030/2053 lệch đúng 1 ngày, 1985 nhuận tháng 2 + Tết VN 21/01/1985, và round-trip sweep 1900-2199 (109,573 ngày) 0 mismatch. Nhưng tìm thấy 2 MAJOR + 1 MINOR ở biên/truy vết mà self-audit và round-trip sweep không chạm tới:

- MAJOR (Defect B, đã sửa): §3 `jdToDate` dùng guard `jd > GREGORIAN_SWITCH_JD` trong khi canonical Đức dùng `jd > 2299160`. Đúng ngày switch JD 2299161 bị đẩy sang nhánh Julian -> `jdToDate(2299161)` trả 5/10/1582 thay vì 15/10/1582. Sweep 1900-2199 không bắt được vì mọi JDN của dải >> biên. Fix: đổi sang `jd >= GREGORIAN_SWITCH_JD` + thêm test ngày switch ở §5 + dòng §10.
- MAJOR (Defect A, đã sửa): AC #6 khẳng định `jdFromDate(14, 10, 1582) === 2299160` - SAI, hàm trả 2299170 (14/10/1582 dưới biên nên rơi vào nhánh Julian; Julian và Gregorian lệch 10 ngày tại 1582). JD 2299160 thực chất là 4/10/1582 (Julian). Fix: AC #6 đổi assertion sang `jdFromDate(4, 10, 1582) === 2299160` và ghi chú 14/10 -> 2299170.
- MINOR (Defect C, đã sửa): AC #12 trích `DEC-LUNAR-016` nhưng `source_decisions` chỉ có 010-015; quyết định freeze nằm ở DEC-LUNAR-011 (§1 #16). Fix: đổi trích dẫn AC #12 sang DEC-LUNAR-011. (Frontmatter giữ nguyên theo rule biên tập.)

Pre-fix score (độc lập): 7/10. Sau fix: phần số học và biên đều đúng, có test phủ biên switch.

---

*Hết audit FR-LUNAR-001.*
