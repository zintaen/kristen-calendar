---
fr_id: FR-LUNAR-009
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS >= 6 minimum; DEC-LUNAR-090..094 assigned; APCA Lc>=75/90 gate voi apca-w3; 3-layer token structure; Be Vietnam Pro; warm cream #FDF6EC; base brand Umber/Ochre preserved)
---

## §1 - Verdict summary

FR-LUNAR-009 đặc tả purple style pack là sub-brand extension của CyberSkill design system, là nền tảng thị giác cho toàn bộ "Genie Âm Lịch" UI. Phạm vi: 16 mệnh đề BCP-14 trong §1 (3-layer token, giữ nguyên Umber/Ochre, palette tím đầy đủ, nền kem #FDF6EC, checkApca/assertApca bằng apca-w3, checkWcag song song, test tự động mỗi cặp màu, Be Vietnam Pro, Dynamic Type rem, Typography/Button/Card components, export PURPLE_TOKENS, không !important, Lc 90 body, error color). 7 đoạn rationale §2 giải thích DEC-LUNAR-090..094. §3 có đầy đủ TypeScript type cho 3 lớp tokens (PRIMITIVE/SEMANTIC/COMPONENT), TYPOGRAPHY scale, các hàm checkApca/assertApca/checkWcag/assertWcag21AA trong apca.ts, và 3 React components (Typography, Button, Card). 15 AC trong §4. §5 có 9 unit test cụ thể với assertion |Lc|>=90 cho text-primary, gate "fail" test cho purple-400, và bảo tồn Umber/Ochre. §10 liệt kê 10 failure rows. Ánh xạ tới NFR-Accessibility (APCA Lc>=75/90), NFR-Localization (Be Vietnam Pro, Vietnamese-first), PRD §13 (purple sub-brand, warm earth DNA, không thay thế base brand).

## §2 - Findings (all resolved during authoring)

### ISS-001 - Base brand Umber/Ochre có thể bị ghi đè nếu không có kiểm tra tường minh
Nếu developer override token, brand vi phạm DEC-LUNAR-090. Resolved: §1 #2 KHÔNG ĐƯỢC + DEC-LUNAR-090; §4 AC #2 assert giá trị hex; §5 test "brand-umber = #45210E" và "brand-ochre = #F4BA17"; disallowed_tools ghi rõ cấm.

### ISS-002 - APCA Lc >= 75 không có gate tự động, có thể ship màu tím nhạt làm text
Không có CI check thì developer có thể dùng purple-400 làm text chính - Lc < 75. Resolved: §1 #5 + DEC-LUNAR-091 + hàm assertApca throw Error; §5 test "Tím nhạt (purple-400) trên nền kem KHÔNG đủ tương phản"; §4 AC #8 confirm gate hoạt động.

### ISS-003 - Nền trắng #FFFFFF không phù hợp với DNA "warm earth" CyberSkill
Tím đậm trên trắng đạt APCA thấp hơn tím đậm trên kem. Resolved: §1 #4 + DEC-LUNAR-093 nền kem #FDF6EC; §4 AC #3 assert bg-default != #FFFFFF; §2 rationale giải thích luminance.

### ISS-004 - WCAG 2.x AA không được kiểm tra song song, thiếu rào an toàn pháp lý
Một số tổ chức vẫn yêu cầu WCAG 2.x; chỉ APCA là không đủ. Resolved: §1 #6 + DEC-LUNAR-091 checkWcag/assertWcag21AA; §5 test WCAG AA cho text-primary và button; §4 AC #6 và #7.

### ISS-005 - Typography component dùng đơn vị px cho font-size, phá vỡ Dynamic Type iOS
NFR-Accessibility yêu cầu hỗ trợ Dynamic Type; px khóa cứng kích thước chữ. Resolved: §1 #9 PHẢI dùng rem/em; §5 test regex /rem$/ kiểm tra tất cả fontSizes; §4 AC #10.

### ISS-006 - 3 lớp token không rõ ràng (phẳng hoặc trộn lẫn), khó maintain
Nếu token phẳng thì semantic và primitive lẫn lộn, override sai layer. Resolved: §1 #1 + DEC-LUNAR-094 3 const riêng (PRIMITIVE, SEMANTIC, COMPONENT); §3 tổ chức rõ ràng theo 3 const; §11 note về TypeScript infer.

### ISS-007 - `apca-w3` API dùng sai (truyền hex thay vì rgb array), checkApca trả NaN
`APCAcontrast` nhận `sRGBtoY([r,g,b])` không phải hex string. Resolved: §3 hàm hexToRgbArray chuyển hex -> [r,g,b] trước khi truyền vào sRGBtoY; §6 skeleton ghim đúng API; §10 failure row "sRGBtoY nhận sai type".

## §3 - Resolution

Sau khi xử lý 7 vấn đề trên, FR-LUNAR-009 có 16 mệnh đề BCP-14, 15 AC, 9 unit test bao gồm cả "fail gate" test xác nhận assertApca hoạt động đúng, 10 failure rows, 6 implementation notes. Tất cả DEC-LUNAR-090..094 được tạo và tham chiếu đầy đủ. Score sau self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Pre-fix score: **9/10** - FR cleanest trong bo. Reviewer doc lap da TINH LAI APCA bang cong thuc apca-w3 tham chieu de khong rubber-stamp gate; moi assertion deu dung:

- text-primary #2D0A4E tren cream #FDF6EC: |Lc| = 99.0 -> qua nguong `>= 90` (AC #13, §5). 
- text-secondary #5B21B6 tren cream: |Lc| = 86.7 -> qua `>= 75`. 
- button-text #FDF6EC tren purple-800 #3D1266: |Lc| = 94.8 -> qua `>= 75` (AC #5). 
- purple-400 #A78BFA tren cream: |Lc| = 50.2 < 75 -> `assertApca(...,75)` THROW dung nhu AC #8 / test "gate hoat dong". 
- error #B91C1C tren cream: |Lc| = 77.9 -> qua `>= 75`. 
- WCAG: text-primary 15.47, button 13.25, error 6.03 - deu >= 4.5.

Base brand Umber #45210E / Ochre #F4BA17 giu nguyen lam primitive, chi override mau (AC #2 + test assert). Gate la build/test that, co throw. Defect duy nhat:

- **NIT - card-shadow lech token.** §3 COMPONENT `card-shadow` dung `rgba(93,33,182,...)` = #5D21B6, nhung purple-700 la #5B21B6 = rgb(91,33,182). Fixed: doi sang `rgba(91,33,182,0.08)`.

Khong co BLOCKER/MAJOR. **Post-fix score = 10/10.**

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **No amlich-core imports**: FR-009 khong import bat ky thu gi tu amlich-core (la package design-system, khong phu thuoc amlich). PASS.
- **card-shadow NIT**: `rgba(93,33,182,...)` da duoc sua thanh `rgba(91,33,182,...)` (purple-700 = #5B21B6 = rgb(91,33,182)). Da xac nhan trong §3 COMPONENT. PASS.
- **Traceability Task B**: 16 menh de BCP-14 trong §1, 15 AC trong §4, 9 test trong §5. Moi PHAI co AC tuong ung. DEC-LUNAR-090..094 ton tai va duoc tham chieu day du. PASS.

**Post-alignment score: READY.**

*Hết audit FR-LUNAR-009.*
