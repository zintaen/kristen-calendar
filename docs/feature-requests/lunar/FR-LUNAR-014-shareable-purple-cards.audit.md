---
fr_id: FR-LUNAR-014
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; APCA determinism + Web Share fallback verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-014 đặc tả tính năng thiệp chia sẻ tông tím. Phạm vi: 13 mệnh đề BCP-14 trong §1 (Canvas 2D 1080px, font loading, APCA gate, hai template, Web Share API, fallback download, preview 360px, CardData từ layer trên, họa tiết thuần Canvas). §2 có 6 đoạn rationale giải thích lý do chọn Canvas 2D, kích thuoc 1080px, APCA compile-time, Web Share, và tách CardData. §3 định nghĩa `CardData`, `CardTheme`, `CARD_THEMES`, `drawCard`, `loadCardFont`, `exportCardBlob`, `shareCard`. §4 có 13 AC kiểm tra được. §5 có 5 test case bằng vitest/jest dùng node-canvas và calcAPCA. §10 có 10 hàng failure modes. §11 có 7 ghi chú implementation. Map tới PRD FR-F03 và §13 (shareable cards, APCA Lc >= 75, Be Vietnam Pro).

## §2 - Findings (all resolved during authoring)

### ISS-001 - html2canvas/DOM-to-image cho kết quả font render không ổn định
Tên thư viện html2canvas thường bị CORS khi canvas chứa ảnh ngoài, font không khớp với render thật của browser. Resolved: DEC-LUNAR-140 + §1 #1 bắt buộc Canvas 2D API; disallowed_tools ghi rõ.

### ISS-002 - APCA có thể bị vi phạm âm thầm khi đổi token màu
Không có gate compile-time thi màu tím nhạt trên trắng có thể pass WCAG AA nhưng fail APCA Lc. Resolved: DEC-LUNAR-141 + §1 #5 assertion bằng apca-w3 trong test suite; AC #3, #4 asserting >= 75; §5 loop qua tất cả CARD_THEMES.

### ISS-003 - Web Share API Level 2 (file sharing) không khả dụng trên desktop browser
Không có fallback thi người dùng desktop bị kẹt, không tải được ảnh. Resolved: DEC-LUNAR-142 + §1 #8 fallback download qua `<a download>`; AC #7; test "shareCard downloads when canShare unavailable".

### ISS-004 - Font "Be Vietnam Pro" có thể chưa load khi drawCard chạy
Canvas vẽ text truoc khi font sẵn sàng thi fallback sang sans-serif không có thông báo, card ra font sai. Resolved: §1 #4 load font truoc, timeout 3s, fallback + log; AC #10; test "drawCard runs with fallback font when load fails".

### ISS-005 - CardData tính lại trong renderer tạo coupling vòng với amlich-core
Renderer kéo dependency vào amlich-core thi không test độc lập. Resolved: DEC-LUNAR-143 + §1 #11 bắt buộc nhận CardData đã tính; disallowed_tools ghi rõ; AC #11 assert không network call.

### ISS-006 - Card kích thuoc không rõ; preview vs export có thể bị nhầm
Không rõ canvas thật 1080px hay preview 360px là file share. Resolved: §1 #2, #9 tách rõ canvas 1080px export vs preview 360px CSS scale; AC #1, #8 test cả hai; §3 hai component riêng biệt ShareCard và ShareCardSheet.

## §3 - Resolution

Tất cả 6 vấn de kỹ thuật đã giải quyết trong quá trình soạn thảo. **Score = 10/10.** Sẵn sàng transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

Reviewer độc lập xác nhận FR-014 nhận `CardData` từ DayInfo của FR-007 (DEC-LUNAR-143), không tính lại - đúng. Một MINOR (mâu thuẫn nội bộ APCA) đã sửa: §1 #5 ghi "mọi cặp text/nền PHẢI Lc >= 75" nhưng §5 test lại assert secondary ở >= 60, và §11 yêu cầu watermark Lc >= 90 mà không có test. Đã đồng bộ: §1 #5 nêu ngưỡng theo cỡ chữ (primary >= 75, secondary >= 60, watermark >= 90); thêm `apcaLc.watermark` vào `CardRenderResult`; thêm assertion watermark >= 90 trong §5 và AC #12; cập nhật ví dụ payload. **Score độc lập (pre-fix): 8.5/10.**

---

## §5 - Readiness pass (2026-06-28)

Pass thu hai do reviewer doc lap.

- **AC #14 them moi.** §1 #11 (PHAI nhan CardData tu layer tren, KHONG tinh lai DayInfo) truoc day chi co AC #11 (no-network) lam bao ve gian tiep. Da them AC #14 va test `card-renderer khong re-import amlich-core` kiem tra static exports khong chua symbol tu amlich-core (DEC-LUNAR-143).
- **APCA thresholds nhat quan.** §1 #5 chia nguong theo co chu (primary >= 75, secondary >= 60, watermark >= 90); §4 AC #3/#4/#12; §5 test loop CARD_THEMES va watermark assertion - tat ca da khop sau independent pass truoc.
- **Traceability hoan chinh.** Moi MUST clause §1 #1-#11 co AC tuong ung. §1 #12/#13 la SHOULD/COULD; khong yeu cau AC day du.

**Verdict: PASS. San sang thuc thi.**

*Het audit FR-LUNAR-014.*

*Hết audit FR-LUNAR-014.*
