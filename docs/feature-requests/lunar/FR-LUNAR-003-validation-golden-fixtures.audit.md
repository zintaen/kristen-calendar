---
fr_id: FR-LUNAR-003
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.5/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS > 6 minimum; determinism + verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-003 đặc tả golden validation harness, là go/no-go gate của Phase 0. Phạm vi: 14 điều khoản normative ở §1 (fixture từ JSON không sinh từ engine, 5 mốc Tết 6.6, can-chi + zodiac VN, 1985 nhuận + Tết VN 21/01, VN-vs-China 2007/2030/2053 bằng tz=7 vs tz=8, round-trip sweep đầy đủ 1900-2199, bước nhỏ phủ ranh tháng, ngưỡng go/no-go cứng, fixture tách JSON, log suspect, offline, gate Phase 0, in evidence, fixture mở rộng được). 6 đoạn §2 rationale. §3 mã hóa tet.json (5 dòng bảng 6.6 đầy đủ can-chi năm và zodiac VN) và vn-vs-china.json (1985 + offsetDays 2007/2030/2053). 15 acceptance criteria. §5 có golden.test.ts (vòng qua fixture, VN-vs-China tz=7 vs tz=8) và roundtrip.test.ts (sweep bước 1 ngày, đếm checked, log suspect, 0 mismatch). §10 có 12 dòng failure. §11 có 7 note. Map tới PRD NFR-Accuracy, 6.6, Caveats, Key Findings 2, Phase 0.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Fixture sinh từ chính engine là vòng tự chứng minh
Resolved: §1 #1/#9, DEC-LUNAR-030, fixture ở tet.json/vn-vs-china.json độc lập, AC #13, §10 dòng 1.

### ISS-002 - VN-vs-China không được kiểm đúng cách
Cần gọi tz=7 và tz=8 cho 2007/2030/2053. Resolved: §1 #5, DEC-LUNAR-032, AC #7/#8/#9, §5 vòng offsetDays, §10 dòng 3.

### ISS-003 - Round-trip lấy mẫu bỏ sót ranh tháng
Resolved: §1 #6/#7, DEC-LUNAR-033, sweep bước 1 ngày, AC #10/#11, §11 note 2, §10 dòng 4.

### ISS-004 - Ngưỡng go/no-go bị nới lỏng
Resolved: §1 #8, DEC-LUNAR-031, AC #12 exit code khác 0, disallowed_tools, §10 dòng 2/9.

### ISS-005 - 1985 nhuận và Tết VN không được assert riêng
Resolved: §1 #4, AC #5/#6, §5 tháng 2 nhuận + cửa sổ 21/03..19/04, Tết 21/01/1985.

### ISS-006 - Zodiac VN 2023 có thể lọt (Thỏ thay Mèo)
Resolved: §1 #3, AC #3, fixture dòng 2023 zodiac=Mèo, §8 payload 1.

### ISS-007 - Năm nghi ngờ bị nuốt im lặng
Resolved: §1 #10, DEC-LUNAR-034, log suspect quanh mốc Caveats (28/9/2057), AC #15, §10 dòng 8.

## §3 - Resolution

Sau ISS-001..007 đã xử lý: fixture độc lập từ JSON, VN-vs-China kiểm bằng tz=7 vs tz=8 cho đúng 3 năm thế kỷ 21, round-trip sweep đầy đủ bước 1 ngày phủ hết ranh tháng, ngưỡng go/no-go cứng với exit code, 1985 nhuận và Tết VN assert riêng, zodiac VN 2023 ra Mèo, năm nghi ngờ log suspect. Harness là go/no-go gate Phase 0 và in evidence cho QA. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Readiness pass (2026-06-28, commercial-grade upgrade TASK C)

Day la TASK C: nang cap FR-003 len do chinh xac thuong mai. Li do: round-trip don thuan khong du (tu chung minh); founder yeu cau xac minh do chinh xac tuyet doi so voi nguon vang ngoai engine. Cac thay doi:

Bo sung 4 dieu khoan §1 MUST moi (§1 #15-18) va cac DEC-LUNAR-035..038 tuong ung:
- §1 #15 (DEC-LUNAR-035): absolute ground-truth diff voi gold-1900-2199.json (nguon ngoai, 0 lech la pass).
- §1 #16 (DEC-LUNAR-036): astronomy oracle cross-check bang dev-dependency (astronomy-engine); xac minh xap xi Meeus; >= 95% diem Soc sai lech = 0 ngay.
- §1 #17 (DEC-LUNAR-037): suspect-midnight report - emit moi ngay Soc cach nua dem < 15 phut VN; khong fail test, chi bao cao; 28/9/2057 la watch point.
- §1 #18 (DEC-LUNAR-038): property-based tests - 12/13 thang/nam, nhuan chi trong 13-thang, Dong chi o thang 11, do dai 29-30 ngay, Tet la Soc thu 2 sau Dong chi.

Bo sung 6 AC moi (#16-21) tuong ung va 4 file test sketch day du trong §5 (vitest):
absolute-ground-truth.test.ts, astronomy-oracle.test.ts, suspect-midnight.test.ts, property.test.ts.

Bo sung vao new_files: gold-1900-2199.json va 4 test file moi.
Bo sung huong dan nguon gold-1900-2199.json va con duong "correction table" neu oracle tim thay lech vao §11.
effort_hours: 8 -> 14; sub_tasks tai tong 14.0h voi 4 sub-task moi.
source_decisions: them DEC-LUNAR-035..038.

Khong co thay doi logic cu; phan cu (§1 #1-14, AC #1-15, §5 golden/roundtrip) giu nguyen nhu audit truoc.

---

## §4 - Independent adversarial pass (2026-06-27, reviewer khác tác giả)

CLEAN. Đối chiếu fixture với engine canonical: cả 5 dòng `tet.json` đúng cả solar->lunar lẫn can-chi năm lẫn zodiac VN; `vn-vs-china.json` đúng - 2007 (VN 17/2 vs TQ 18/2), 2030 (VN 02/2 vs TQ 03/2), 2053 (VN 18/2 vs TQ 19/2) mỗi năm lệch đúng 1 ngày khi gọi tz=7 vs tz=8; 1985 tháng 2 nhuận L2S = 21/3/1985 nằm trong cửa sổ [21/3,19/4], Tết VN 1985 = 21/1/1985. Chạy thật round-trip sweep bước 1 ngày 1900-2199: checked = 109,573, mismatches = 0, khớp AC #11 (>109,000) và §8 sweep payload (109573). Không tìm thấy fixture tự chứng minh (tet/vn-vs-china là giá trị độc lập, không sinh từ engine). Không có defect.

Pre-fix score (độc lập): 10/10.

---

*Hết audit FR-LUNAR-003.*
