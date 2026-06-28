---
fr_id: FR-LUNAR-002
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-002 đặc tả can-chi, zodiac Việt Nam, và 24 tiết khí. Phạm vi: 15 điều khoản normative ở §1 (can-chi ngày từ JDN, can-chi năm, can-chi tháng, zodiac VN Mèo/Trâu, zodiacOf, tiết khí qua getSunLongitude độ phân giải 15 độ, bảng 24 tiết với 12 Trung khí, nhất quán Đông chí với getLunarMonth11, pure offline, tietKhiAt, cross-check chỉ độc lập múi giờ, export type, tiếng Việt có dấu, freeze bảng). 6 đoạn §2 rationale. §3 có canChiDay/Year/Month, ZODIAC_VN + zodiacOf, TIET_KHI + tietKhiAt với công thức cụ thể. 14 acceptance criteria. §5 có 2 file test (canchi.test.ts, tietkhi.test.ts) gồm 5 fixture can-chi năm, zodiac VN, chu kỳ liên tục JDN, bound tiết khí, Đông chí. §10 có 12 dòng failure. §11 có 7 note. Map tới PRD FR-A03, FR-A04, 6.3, #8.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Can-chi tính từ lunarDay sẽ sai qua ranh tháng
Resolved: §1 #1/#2, DEC-LUNAR-020 tính từ JDN, AC #6 chu kỳ liên tục, §10 dòng 1, §11 note 1.

### ISS-002 - Dùng con giáp TQ thay vì VN
Thỏ/Bò sai với Mèo/Trâu; Tết 2023 phải là Mèo. Resolved: §1 #5, DEC-LUNAR-021, bảng ZODIAC_VN, AC #4/#5, §10 dòng 2.

### ISS-003 - Tiết khí có thể chia sai độ phân giải
Chia 6 cho 12 giá trị thay vì 24. Resolved: §1 #7, DEC-LUNAR-024 chia 12, AC #8/#10, §10 dòng 4.

### ISS-004 - Đông chí có thể lệch với core
Bảng tiết khí và getLunarMonth11 phải đồng nhất về Đông chí. Resolved: §1 #9, AC #11, §6, §11 note 3, dùng chung SunLongitude.

### ISS-005 - Nguy cơ dùng lunar-typescript chốt giá trị phụ thuộc múi giờ
Resolved: §1 #12, DEC-LUNAR-025, chỉ cross-check can-chi/Trực độc lập múi giờ, disallowed_tools, §10 dòng 7.

### ISS-006 - Can-chi tháng không xoay theo can năm
Can tháng sai làm đầu vào FR-011 sai. Resolved: §1 #4, DEC-LUNAR-022, AC #7, §11 note 5.

## §3 - Resolution

Sau ISS-001..006 đã xử lý: can-chi từ JDN, zodiac VN riêng, tiết khí độ phân giải 15 độ nhất quán với core, Đông chí đồng bộ getLunarMonth11, lunar-typescript chỉ cross-check độc lập múi giờ, can-chi tháng xoay theo can năm. Các bảng tiếng Việt có dấu, freeze. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Readiness pass (2026-06-28, contract alignment + tietKhiStartDiaChi)

Đợt này là TASK A + TASK B: dong bo CONTRACT.md va bo sung ham FR-011 can. Cac thay doi:
- `CanChi` interface trong §3 da loai bo truong `can`/`chi` string (khong co trong CONTRACT.md va scaffold `types.ts`); chi giu `{ canIndex, chiIndex, label }`. Ham canChiDay/Year/Month cap nhat theo.
- Bo sung `canChiLabel(canIndex, chiIndex): string` vao §3 (CONTRACT.md pure helper; da co trong scaffold `src/canchi.ts`). Them §1 #6a, AC #5a, test group "canChiLabel".
- `zodiacOf` sua chu ky: `zodiacOf(chiIndex: number): string` (CONTRACT.md va scaffold). Truoc do FR ghi `zodiacOf(lunarYear)` sai chu ky; cac AC va test da cap nhat dung `(lunarYear + 8) % 12` lam chiIndex.
- Bo sung `tietKhiStartDiaChi(jdn, tz?): number` vao §3 voi spec clause §1 #11a, AC #15-17, va test group "tietKhiStartDiaChi" trong §5 (TASK A: CONTRACT.md da co; scaffold da co stub; FR-011 can de tinh Truc).
- AC #7 va test "thang Gieng": doi tu `.chi === "Dan"` sang `.chiIndex === 2` (phu hop interface moi).
- Test file imports sua: `VN_TIMEZONE` -> `VN_TZ`; import them `tietKhiStartDiaChi` va `canChiLabel`.
- effort_hours: 10 -> 10.5 (bo sung 0.5h cho tietKhiStartDiaChi).
- Sub-task them 1 dong moi cho tietKhiStartDiaChi.

---

## §4 - Independent adversarial pass (2026-06-27, reviewer khác tác giả)

Kiểm bằng tính toán: can-chi năm `(y+6)%10,(y+8)%12` đúng (2025 Ất Tỵ, 2023 Quý Mão, 1984 Giáp Tý, 1985 Ất Sửu, 2021 Tân Sửu); zodiac VN đúng (2023 Mèo, 2021 Trâu); can-chi tháng CAN `(yearCan*2+lunarMonth+1)%10` đúng (Giáp niên tháng Giêng = Bính Dần, tức ngũ hổ độn); chi tháng `(lunarMonth+1)%12` -> tháng 1 = Dần; bảng TIET_KHI khớp longitude (idx 0 Xuân phân, 6 Hạ chí, 12 Thu phân, 18 Đông chí, 21 Lập xuân); §8 payload JD 2460667 = 22/12/2024, tietKhiAt idx 18 = Đông chí isTrungKhi true - đúng. Phần số học SẠCH.

- NIT (Defect D, đã sửa): sub_task ghi `tietKhiAt ... trả ... cung 30 độ` nhưng interface `TietKhi` chỉ có `{index, name, isTrungKhi}` và độ phân giải ở đây là 15 độ (24 tiết), không phải 30 độ. Fix: sửa sub_task sang "trả index 0-23 + tên + cờ isTrungKhi (độ phân giải 15 độ)".

Pre-fix score (độc lập): 9/10. Sau fix: 10/10.

---

*Hết audit FR-LUNAR-002.*
