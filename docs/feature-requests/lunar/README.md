# LUNAR module - feature request index

_Soạn 2026-06-27 bằng workflow feature-request-author của CyberOS từ `docs/PRD + SRS — Ứng Dụng Nhắc Âm Lịch Việt Nam ("Genie Âm Lịch" của CyberSkill).md`. 20 FR đầy đủ (209.5 engineering-hours), audit 10/10 cho cả 20._

Module `LUNAR` là sản phẩm kristen-calendar, tên thương mại "Genie Âm Lịch" của CyberSkill: một ứng dụng nhắc âm lịch Việt Nam tông tím, tính ngày on-device theo thuật toán Hồ Ngọc Đức (UTC+7, kinh tuyến 105°E), chạy trên Web/PWA, iOS qua Capacitor, và Zalo Mini App, với một serverless backend mỏng cho AI Genie (Claude) và ZNS. Mỗi FR truy về một mệnh đề cụ thể trong PRD và được viết theo template engineering-spec 11 mục của CyberOS, kèm một file `*.audit.md` lặp tới 10/10. Một lượt audit độc lập (adversarial, do reviewer không viết spec chạy) đã được thực hiện ngày 2026-06-27 và đính chính các defect cross-FR mà self-audit bỏ sót; xem [`INDEPENDENT-AUDIT-2026-06-27.md`](INDEPENDENT-AUDIT-2026-06-27.md).

## FRs

| FR | Priority | Status | Phase·Slice | Hours | Title |
|---|---|---|---|---:|---|
| [FR-LUNAR-001](FR-LUNAR-001-amlich-core-conversion-engine.md) | MUST | ready_to_implement | P0·1 | 16 | Core lunar engine - port thuật toán Hồ Ngọc Đức sang TypeScript, convertSolar2Lunar / convertLunar2Solar theo giờ Việt Nam, offline, zero-dependency |
| [FR-LUNAR-002](FR-LUNAR-002-canchi-zodiac-tietkhi.md) | MUST | ready_to_implement | P0·1 | 10.5 | Can-chi, zodiac Việt Nam (Mèo/Trâu), 24 tiết khí + 12 Trung khí |
| [FR-LUNAR-003](FR-LUNAR-003-validation-golden-fixtures.md) | MUST | ready_to_implement | P0·1 | 14 | Golden validation harness - đối chiếu 100% lịch Hồ Ngọc Đức 1900-2199, edge years 1985/2007/2030/2053, round-trip |
| [FR-LUNAR-004](FR-LUNAR-004-reminder-model-recurrence-engine.md) | MUST | ready_to_implement | P1·2 | 12 | Reminder data model + recurrence engine - lưu ngày âm, tự sinh ngày dương mỗi năm, fallback tháng nhuận, khóa timezone |
| [FR-LUNAR-005](FR-LUNAR-005-local-notifications-rolling-64.md) | MUST | ready_to_implement | P1·2 | 10 | Local notification scheduler - rolling-64 trên iOS qua @capacitor/local-notifications, deep-link userInfo |
| [FR-LUNAR-006](FR-LUNAR-006-reminder-management.md) | MUST | ready_to_implement | P1·3 | 10 | Reminder management - Rằm/Mùng Một bật/tắt riêng, nhập giỗ, custom reminder, lead-time + giờ nhắc, danh sách sắp tới |
| [FR-LUNAR-007](FR-LUNAR-007-month-calendar-grid.md) | MUST | ready_to_implement | P1·3 | 9 | Month calendar grid - ngày dương lớn + ngày âm nhỏ góc + can-chi + tiết khí + chấm lễ, chạm để xem chi tiết |
| [FR-LUNAR-008](FR-LUNAR-008-festival-ritual-content.md) | MUST | ready_to_implement | P1·3 | 7 | Festival + ritual content - 13 dịp âm lịch (ý nghĩa, mâm cúng, checklist), nhãn tham khảo phong tục dân gian |
| [FR-LUNAR-009](FR-LUNAR-009-purple-theme-apca-design-system.md) | MUST | ready_to_implement | P1·2 | 8 | Purple style pack - sub-brand tím mở rộng design-system CyberSkill, Be Vietnam Pro, cổng tương phản APCA Lc >= 75 |
| [FR-LUNAR-010](FR-LUNAR-010-app-shell-pwa-capacitor.md) | MUST | ready_to_implement | P1·2 | 10 | App shell - Next.js/React PWA + Capacitor iOS wrapper, import amlich-core, on-device storage, routing |
| [FR-LUNAR-011](FR-LUNAR-011-day-quality-hoangdao-truc-28sao.md) | MUST | ready_to_implement | P2·4 | 12 | Day quality - Hoàng đạo/Hắc đạo, 12 Trực, 28 sao, giờ Hoàng đạo, tính từ can-chi + tiết khí |
| [FR-LUNAR-012](FR-LUNAR-012-good-day-picker.md) | MUST | ready_to_implement | P2·4 | 7 | Good-day picker - chọn loại việc (ký hợp đồng, khai máy, ra mắt, khai trương), liệt kê ngày Hoàng đạo trong khoảng |
| [FR-LUNAR-013](FR-LUNAR-013-ios-widget-watch-glance.md) | SHOULD | ready_to_implement | P2·5 | 12 | iOS glanceable surfaces - WidgetKit widget + Apple Watch complication, native Swift trong ios/App |
| [FR-LUNAR-014](FR-LUNAR-014-shareable-purple-cards.md) | SHOULD | ready_to_implement | P2·5 | 6 | Shareable cards - thiệp tông tím export ảnh ("Hôm nay Rằm tháng Giêng"), chia sẻ mạng xã hội |
| [FR-LUNAR-015](FR-LUNAR-015-ai-genie-claude-proxy.md) | MUST | ready_to_implement | P2·4 | 14 | AI Genie - serverless Claude proxy (/api/genie), Claude Haiku 4.5, prompt caching, rate-limit, key chỉ ở server |
| [FR-LUNAR-016](FR-LUNAR-016-zalo-mini-app-client.md) | MUST | ready_to_implement | P3·6 | 14 | Zalo Mini App client - React + zmp-ui + zmp-sdk/apis, import amlich-core, zmp Storage, consent getUserInfo/getPhoneNumber |
| [FR-LUNAR-017](FR-LUNAR-017-zns-reminders-zalo-oa.md) | MUST | ready_to_implement | P3·6 | 10 | ZNS reminders - gửi nhắc qua Zalo OA, template đã duyệt, khung 06:00-22:00, <= 7 ngày trước/sau, OA token auto-refresh |
| [FR-LUNAR-018](FR-LUNAR-018-family-sharing-cloud-sync.md) | SHOULD | ready_to_implement | P3·7 | 12 | Family sharing + cloud sync - Supabase/Postgres với RLS, sharedWith, đồng bộ đa thiết bị |
| [FR-LUNAR-019](FR-LUNAR-019-pdpl-compliance-consent.md) | MUST | ready_to_implement | P3·7 | 9 | PDPL compliance - privacy policy tiếng Việt, consent granular, mặc định on-device, không chuyển xuyên biên giới khi chưa DPIA |
| [FR-LUNAR-020](FR-LUNAR-020-freemium-monetization.md) | SHOULD | ready_to_implement | P3·7 | 7 | Freemium monetization - nhắc cơ bản free, premium cho AI Genie / good-day / family, entitlement gating server-side |
| [FR-LUNAR-021](FR-LUNAR-021-proactive-ai-genie-2.md) | MUST | ready_to_implement | P4·8 | 15 | Proactive AI (Genie 2.0) - tự động cron check và push ZNS thông minh cho dịp lớn |
| [FR-LUNAR-022](FR-LUNAR-022-o2o-commerce-marketplace.md) | SHOULD | ready_to_implement | P4·8 | 10 | O2O Commerce - affiliate links và UI gợi ý đồ cúng/dịch vụ qua Zalo |
| [FR-LUNAR-023](FR-LUNAR-023-apple-ecosystem-integration.md) | MUST | ready_to_implement | P4·9 | 15 | Apple Ecosystem - Siri App Intents, Live Activities / Dynamic Island countdown |
| [FR-LUNAR-024](FR-LUNAR-024-android-expansion-glance.md) | MUST | ready_to_implement | P4·8 | 20 | Android Expansion - Capacitor Android platform, Kotlin Glance Widget |
| [FR-LUNAR-025](FR-LUNAR-025-collaborative-decision-boards.md) | SHOULD | ready_to_implement | P4·9 | 15 | Collaborative Decision Boards - vote ngày tốt qua link Zalo/Supabase Realtime |

## Build order (topological)

Suy ra từ `depends_on`. Mỗi FR buildable khi các FR thượng nguồn đã `done`.

1. **Layer 0 (không phụ thuộc):** FR-LUNAR-001, FR-LUNAR-009
2. **Layer 1:** FR-LUNAR-002 (->001), FR-LUNAR-004 (->001), FR-LUNAR-008 (->001), FR-LUNAR-010 (->001,009)
3. **Layer 2:** FR-LUNAR-003 (->001,002), FR-LUNAR-007 (->001,002,010), FR-LUNAR-011 (->002), FR-LUNAR-005 (->004,010), FR-LUNAR-016 (->004,008,009), FR-LUNAR-018 (->004)
4. **Layer 3:** FR-LUNAR-006 (->004,005,010), FR-LUNAR-012 (->010,011), FR-LUNAR-013 (->001,002,011), FR-LUNAR-014 (->007,009), FR-LUNAR-015 (->008,010), FR-LUNAR-017 (->004,016), FR-LUNAR-019 (->016,018)
5. **Layer 4:** FR-LUNAR-020 (->015,018), FR-LUNAR-021 (->015,017), FR-LUNAR-022 (->010,016), FR-LUNAR-024 (->010)
6. **Layer 5:** FR-LUNAR-023 (->013), FR-LUNAR-025 (->012,018)

Rủi ro kỹ thuật cao nhất nằm ở Layer 0-1 (core engine + can-chi + recurrence). PRD yêu cầu làm và test FR-001..003 trước tiên: nếu lệch bất kỳ năm nào trong 1900-2199 hoặc các năm edge 1985/2007/2030/2053 thì dừng, debug, chưa xây UI.

## Dependency edges (reciprocal)

```
001 -> blocks: 002, 003, 004, 007, 008, 010, 013
002 -> blocks: 003, 007, 011, 013
004 -> blocks: 005, 006, 016, 017, 018
005 -> blocks: 006
007 -> blocks: 014
008 -> blocks: 015, 016
009 -> blocks: 010, 014, 016
010 -> blocks: 005, 006, 007, 012, 015
011 -> blocks: 012, 013
015 -> blocks: 020
016 -> blocks: 017, 019
018 -> blocks: 019, 020
```

Mỗi cạnh `blocks` trên là nghịch đảo chính xác của một cạnh `depends_on` ở hạ nguồn (coherence-checked 2026-06-27, reciprocity errors = 0, không có cycle).

## PRD traceability

| PRD requirement | Covered by |
|---|---|
| FR-A01 (solar <-> lunar), FR-A02 (tháng nhuận), FR-A06 (offline) | FR-LUNAR-001 |
| FR-A03 (can-chi, zodiac VN), FR-A04 (24 tiết khí, 12 Trung khí) | FR-LUNAR-002 |
| FR-A05 (lịch tháng grid) | FR-LUNAR-007 |
| FR-B01 (Rằm/Mùng Một), FR-B03 (custom), FR-B04 (lead-time), FR-B07 (danh sách sắp tới), FR-F05 (tông giọng) | FR-LUNAR-006 |
| FR-B02 (giỗ tái diễn), FR-B06 (timezone lock) | FR-LUNAR-004 |
| FR-B05 (rolling-64 local notification) | FR-LUNAR-005 |
| FR-B08 (ZNS) | FR-LUNAR-017 |
| FR-C01..C06 (AI Genie, proxy, TTS) | FR-LUNAR-015 |
| FR-D01, FR-D02 (nội dung dịp + link) | FR-LUNAR-008 |
| FR-E01 (good-day picker), FR-E04 (EventKit, tùy chọn) | FR-LUNAR-012 |
| FR-E02, FR-E03 (Hoàng đạo/Trực/28 sao/giờ Hoàng đạo) | FR-LUNAR-011 |
| FR-F01 (iOS widget), FR-F02 (Watch complication, tùy chọn) | FR-LUNAR-013 |
| FR-F03 (shareable cards) | FR-LUNAR-014 |
| FR-F04 (family sharing) | FR-LUNAR-018 |
| NFR-Accuracy | FR-LUNAR-003 |
| NFR-Offline | FR-LUNAR-001 |
| NFR-Performance | FR-LUNAR-001, FR-LUNAR-007 |
| NFR-Accessibility, NFR-Localization | FR-LUNAR-009 |
| NFR-Privacy/PDPL | FR-LUNAR-019 |
| NFR-Security (key chỉ ở server, OA token, HTTPS) | FR-LUNAR-015, FR-LUNAR-017, FR-LUNAR-019 |
| §9 System Architecture (web + iOS clients) | FR-LUNAR-010 |
| §9 System Architecture (Zalo client) | FR-LUNAR-016 |
| §14 Phase 3 monetization, §15 Success Metrics | FR-LUNAR-020 |

Mọi functional và non-functional requirement của PRD đều map tới ít nhất một LUNAR FR.

## Conventions

- File: `FR-LUNAR-{NNN}-{slug}.md` kèm một sibling `FR-LUNAR-{NNN}-{slug}.audit.md`.
- Status enum: `draft | ready_to_implement | implementing | ready_to_review | reviewing | ready_to_test | testing | done | on_hold | closed`.
- Cả 20 FR ở `score_post_revision: 10/10` và `ready_to_implement`.
- DEC-LUNAR-NNN: mỗi FR sở hữu một dải 10 id (001 -> 010-019, 002 -> 020-029, ...); decision được giới thiệu inline trong `source_decisions` rồi tham chiếu trong §1/§2.
- Ngôn ngữ: prose tiếng Việt có dấu, thuật ngữ kỹ thuật và code giữ tiếng Anh; ký tự bàn phím chuẩn (straight quotes, hyphen, ...); ngoại lệ duy nhất là dấu chấm giữa · trong trường `milestone`.
- Tổng effort: 209.5 engineering-hours (16 MUST + 4 SHOULD).

_Index này là view dẫn xuất; các file FR markdown là source of truth. Xem `manifest.json` cho trạng thái máy đọc và BACKLOG ở thư mục cha._
