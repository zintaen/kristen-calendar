---
fr_id: FR-LUNAR-011
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

FR-LUNAR-011 đặc tả module `dayquality` tính chất lượng ngày theo phong thủy dân gian Việt Nam. Phạm vi: 14 điều khoản BCP-14 trong §1 (bao gồm kiểu DayQuality đầy đủ trường, 12 thần trực nhật + 12 Trực + 28 sao + giờ Hoàng đạo, pure function, không network, re-export); 8 lý do thiết kế trong §2; contract TypeScript đầy đủ trong §3 với 5 kiểu chính và 2 hàm public; 15 AC kiểm tra được trong §4; 7 test case cụ thể dùng fake mock trong §5; bảng 15 hàng trong §10. FR map trực tiếp tới PRD FR-E02, FR-E03, PRD §8 (Hoàng đạo/Hắc đạo/Trực/28 sao), và NFR-Offline (không gọi mạng).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Chưa có định nghĩa kiểu chính thức DayQuality

Không có kiểu TS nào thì FR-012 và FR-013 không biết nhận dữ liệu gì. Resolved: §3 định nghĩa đầy đủ `DayQuality`, `GioInfo`, `TrucInfo`, `Sao28Info`, `ThanTrucNhat`, `Truc`, `Sao28`; AC #12 yêu cầu re-export từ index.ts.

### ISS-002 - Base JDN cho 28 sao có thể sai nguồn mà không ai phát hiện

Nếu `BASE_JDN_GIAC` sai, tất cả ngày trong 1900-2199 sai sao. Resolved: DEC-LUNAR-114 yêu cầu lock bằng fixture test (AC #5 chuỗi 28 ngày); §11 yêu cầu comment nguồn đối chiếu cụ thể; §10 hàng thứ 2 nêu rõ kết quả và cách phục hồi.

### ISS-003 - Không có cơ chế đảm bảo disclaimer "tham khảo phong thủy dân gian" có mặt

PRD Caveats nói rõ phải gắn nhãn này nhưng nếu để UI tự thêm thì rất dễ bị bỏ. Resolved: DEC-LUNAR-111 đặt `disclaimer` là `readonly` literal type trong `DayQuality`; AC #3 kiểm tra cho mọi ngày; §2 lý giải tại sao phải ở cấp root.

### ISS-004 - Nguy cơ dùng thư viện thứ ba (lunar-typescript) cho can-chi làm lệch với core

PRD §6.5 cảnh báo lunar-typescript theo chuẩn TQ 120E - dùng nó làm nguồn chính thì can-chi có thể lệch với FR-001 epoch. Resolved: DEC-LUNAR-112 cấm import thứ ba runtime; §1 #7 bắt buộc tính `(jdn + 9) mod 60` từ `jdFromDate` của FR-001; §2 giải thích tại sao.

### ISS-005 - `getMonthDayQualities` chưa được định nghĩa, FR-012 không có API để list ngày Hoàng đạo

Nếu chỉ có `getDayQuality` từng ngày thì FR-012 phải gọi ~30 lần vòng lặp. Resolved: §3 định nghĩa `getMonthDayQualities(year, month): DayQuality[]`; AC #6 kiểm tra nhất quán; AC #11 kiểm tra hiệu năng < 50ms.

### ISS-006 - Chưa có fixture chống khai quá xúc tích cho giờ Hoàng đạo

Nếu bảng GIO_HOANG_DAO_TABLE sai cột mà không có fixture cụ thể thì không phát hiện được. Resolved: AC #2 đảm bảo đúng 6 Hoàng + 6 Hắc mỗi ngày; §8 ví dụ JSON có 12 canh đầy đủ với isHoang flag; test trong §5 kiểm tra AC #2 trực tiếp.

## §3 - Resolution

Sau 6 phát hiện và sửa: kiểu DayQuality có đầy đủ trường với disclaimer literal type, BASE_JDN_GIAC được lock bằng fixture, can-chi ngày tính nhất quán với core, `getMonthDayQualities` có contract rõ, disclaimer ở cấp root, và bảng giờ Hoàng đạo có AC kiểm tra số lượng. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27) - BLOCKER found + fixed

Bản self-audit ở trên đã BỎ SÓT một blocker. Reviewer độc lập (không viết spec) phát hiện:

- **BLOCKER - Địa chi ngày lệch 8 so với core.** ISS-004 ở trên "giải quyết" bằng cách yêu cầu §1 #7 tính `(jdn + 9) mod 60` rồi lấy địa chi `mod 12`. Nhưng FR-LUNAR-002 (chủ sở hữu can-chi, DEC-LUNAR-020) định nghĩa `chi = (jdn + 1) mod 12`. `(jdn + 9) mod 12` lệch đúng +8 so với `(jdn + 1) mod 12` (kiểm bằng quét: chênh hằng số 8). Vì `THAN_TRUC_NHAT_TABLE`, Trực, và giờ Hoàng đạo đều khóa theo địa chi ngày (PRD §8), TOÀN BỘ output day quality sai và mâu thuẫn với can-chi mà lịch (FR-007 qua FR-002) hiển thị. `can = (jdn + 9) mod 10` thì trùng khớp, nên lỗi chỉ ở địa chi - khó thấy hơn.
  - **Fix đã áp dụng:** DEC-LUNAR-112 viết lại (gọi `canChiDay(jdn)` của FR-002, dùng `chiIndex = (jdn + 1) mod 12`); §1 #7 viết lại; §2 rationale viết lại; §3 contract thêm comment cách lấy can-chi từ core; §6 skeleton sửa công thức; thêm AC #16 (cross-check địa chi với `canChiDay` qua quét 60 ngày) + AC #17 (fixture Tết 2025); thêm 2 test trong §5 import `canChiDay`/`jdFromDate` từ core; thêm 1 hàng §10. Lỗi tương ứng cũng được sửa ở FR-LUNAR-013 (Swift).
  - **Score điều chỉnh (pre-fix, independent): 5/10.** Sau fix: nhất quán với FR-002.

## §5 - Readiness pass (2026-06-28)

Pass thu hai do reviewer doc lap (khong phai author). Bay gio FR da san sang cho agent thuc thi khong co nguon ngu canh:

- **getTietKhiForDate da bi xoa hoan toan.** §1 #3, §1 #7, §6 (skeleton), §7 (dependencies) tat ca da dung ten dung la `tietKhiStartDiaChi(jdn, tz?): number` tu CONTRACT.md. Cong thuc Truc trong §3 comment block la `(canChiDay(jdn).chiIndex - tietKhiStartDiaChi(jdn) + 12) % 12`. Khong con tham chieu nao den `getTietKhiForDate`.
- **Export khop CONTRACT.md.** `getDayQuality(solarDate: Date): DayQuality` va `getMonthDayQualities(year: number, month: number): readonly DayQuality[]` dung ten va chu ky chinh xac theo P2/P3 surface cua CONTRACT.md. `interface DayQuality` va `interface GioInfo` nam trong §3.
- **Bat bien dia chi.** `canChiDay(jdn).chiIndex = (jdn+1)%12` la bat bien xac nhan trong §1 #7, §3 comment, §6; cach tinh sai `(jdn+9)%60%12` bi cam ro rang; AC #16/#17 + 2 test trong §5 bat lo nay.
- **Traceability hoan chinh.** Moi MUST clause trong §1 deu co AC tuong ung trong §4 va test trong §5. `getMonthDayQualities` return type duoc cap nhat sang `readonly DayQuality[]` ca trong §3 lan §1 #14.

**Verdict: PASS. San sang thuc thi.**

*Het audit FR-LUNAR-011.*

*Hết audit FR-LUNAR-011.*
