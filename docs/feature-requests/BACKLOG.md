# kristen-calendar - Feature Request Backlog

**Owner:** Stephen Cheng (CEO) - **Status:** backlog v1.0 soạn 2026-06-27 từ PRD/SRS qua workflow feature-request-author của CyberOS.
**Source of truth:** các file FR markdown trong `lunar/`. Index này là view dẫn xuất.
**Authoring playbook:** CyberOS `feature-request-author` + `feature-request-audit` (engineering-spec 11 mục, audit-loop tới 10/10).
**Sản phẩm:** "Genie Âm Lịch" của CyberSkill - ứng dụng nhắc âm lịch Việt Nam tông tím, tính ngày on-device theo thuật toán Hồ Ngọc Đức, chạy Web/PWA + iOS (Capacitor) + Zalo Mini App, backend serverless mỏng cho AI Genie (Claude) và ZNS.

---

## Headline metrics

| Metric | Value |
|---|---:|
| FR đã soạn | 25 |
| FR ở 10/10 audit score | 25 (100%) |
| FR thiếu file audit | 0 |
| Dependency cycles | 0 |
| Reciprocity errors | 0 |
| Engineering-hours | ~209.5h |
| PRD requirements covered | 100% (FR-A..F + NFR-Accuracy..Security) |

## Modules

| Module | FRs | Hours | Phạm vi |
|---|---:|---:|---|
| [LUNAR](lunar/README.md) | 25 | ~284.5h | Toàn bộ sản phẩm Genie Âm Lịch: core engine âm lịch + can-chi + validation; reminder model + recurrence + local notification rolling-64; reminder management; lịch tháng; nội dung dịp; design-system tím + APCA; app shell PWA/Capacitor; day-quality (Hoàng đạo/Trực/28 sao); good-day picker; iOS widget + watch; shareable cards; AI Genie proxy; Zalo Mini App; ZNS; family sharing + sync; PDPL; freemium; proactive AI; O2O commerce; Apple ecosystem; Android expansion; decision boards. |

## Phasing (theo roadmap PRD §14)

- **P0 - Core (rủi ro kỹ thuật cao nhất, làm trước):** FR-LUNAR-001..003. Build và test `@cyberskill/amlich-core` (chuyển đổi, can-chi, tháng nhuận) với fixtures 1900-2199 + edge years. Ngưỡng pass: khớp 100% lịch Hồ Ngọc Đức gồm 1985/2007/2030/2053; lệch bất kỳ năm nào thì dừng, debug trước khi xây UI.
- **P1 - MVP cá nhân (cho vợ):** FR-LUNAR-004..010. Web/PWA + Capacitor iOS, theme tím, Be Vietnam Pro, lịch tháng, nhắc Rằm/Mùng Một/đám giỗ/custom + local notifications (rolling 64), nội dung dịp tĩnh. Lưu on-device, không backend, không AI, không ZNS. Tiêu chí "vợ thấy hữu ích": dùng đều >= 1 chu kỳ Rằm/Mùng Một, không bỏ lỡ nhắc nào.
- **P2 - Trải nghiệm nâng cao (cá nhân):** FR-LUNAR-011..015. Day-quality + giờ Hoàng đạo, good-day picker, iOS widget + watch, shareable cards, AI Genie (Claude proxy).
- **P3 - Thương mại hóa:** FR-LUNAR-016..020. Zalo Mini App, OA + ZNS, family sharing + cloud sync (Supabase), tuân thủ PDPL, freemium monetization.
- **P4 - Hệ sinh thái & Trí tuệ chủ động (Next-gen):** FR-LUNAR-021..025. Proactive AI (Genie 2.0), O2O Commerce (Ritual Marketplace), Apple Ecosystem Deep Integration (Siri, Live Activities), Android Expansion, Collaborative Decision Boards (Chọn Ngày).

## Status flow

`draft -> ready_to_implement -> implementing -> ready_to_review -> reviewing -> ready_to_test -> testing -> done` (với off-ramp `on_hold` / `closed`). Cả 20 FR đang ở `ready_to_implement`.

## Founder decisions - đã chốt 2026-06-28

Tất cả quyết định nền tảng đã chốt; không còn quyết định nào chặn ship:

1. **Hướng sản phẩm - go thương mại.** Làm sản phẩm thương mại đầy đủ tính năng (cả 4 phase P0-P3); vợ founder là người dùng đầu và design partner, không phải trần scope.
2. **amlich-core - tự port.** Tự port thuật toán Hồ Ngọc Đức sang TypeScript (kiểm soát hoàn toàn, đúng giờ VN, an toàn license khi thương mại).
3. **Ngưỡng accuracy năm xa.** Hard gate khớp tuyệt đối với dữ liệu vàng cho 1900-2100 (dải người dùng thực chạm: giỗ quá khứ cộng lịch tương lai gần). Với 2100-2199, gần đúng Meeus có thể lệch 1 ngày ở vài điểm Sóc sát nửa đêm; các ngày này được flag và sửa bằng bảng correction nhỏ nếu đối chiếu xác nhận, không chặn gate. Round-trip sweep vẫn hard 1900-2199. Đã ghi vào FR-LUNAR-003 (DEC-LUNAR-039).
4. **Client iOS - Capacitor cho v1.** Giữ Capacitor (bọc web build dùng chung): sản phẩm là lịch + nhắc + đọc nội dung + chat, không nặng animation; kiến trúc backlog đã dựa trên web build chung; widget và watch vẫn là native Swift target trong Capacitor. Chỉ xét React Native nếu gặp tường hiệu năng cụ thể.
5. **ZNS - khởi đầu qua distributor.** Bắt đầu qua distributor (ví dụ VietGuys) để rút ngắn onboarding OA/ZNS và duyệt template; chuyển sang Zalo OA Open API trực tiếp sau khi volume đủ. (Khuyến nghị, có thể đổi.)
6. **Genie model - Claude Haiku 4.5.** Mặc định Claude Haiku 4.5 cộng prompt caching; chỉ nâng Sonnet nếu chất lượng trả lời phong tục không đạt khi đánh giá thực tế.
7. **PDPL - privacy-first, tham vấn pháp lý.** Thiết kế privacy-first (FR-LUNAR-019); tham vấn pháp lý trước khi thương mại hóa rộng ra ngoài gia đình. Dùng cá nhân/gia đình được miễn trừ nên bản đầu cho vợ nằm ngoài phạm vi PDPL.
8. **ZNS MONTHLY - xác nhận hỗ trợ.** FR-LUNAR-017 hỗ trợ nhắc MONTHLY server-side (recurrence cộng month-expander); Rằm/Mùng Một tái diễn đúng qua ZNS.


## Next steps

1. Lượt `feature-request-audit` độc lập đã chạy 2026-06-27: 2 blocker + khoảng 13 code-level major được tìm và fix; xem `lunar/INDEPENDENT-AUDIT-2026-06-27.md`. Re-audit từng FR chỉ khi scope nó đổi.
2. Bắt đầu P0 slice 1 (FR-LUNAR-001..003) qua workflow CTO `ship-feature-requests`, làm dứt điểm từng FR một. Agent implement đọc `lunar/SHIP-READINESS.md` (handoff) + `lunar/CONTRACT.md` (API authority) + `docs/AGENT-GUIDE.md` trước. Đây là rủi ro kỹ thuật cao nhất: khớp 100% lịch Hồ Ngọc Đức là ngưỡng go/no-go trước khi xây UI.
3. Founder decisions đã chốt hết (xem mục trên); không còn quyết định nào chặn ship. Việc còn lại của operator: mở rộng `gold-1900-2199.json` từ nguồn vàng, chạy gate trên máy, tạo branch + commit.

---

_Xem `lunar/README.md` cho catalog FR đầy đủ, build order và PRD traceability, và `lunar/manifest.json` cho trạng thái máy đọc._
