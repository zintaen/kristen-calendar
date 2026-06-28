# Build runbook - Genie Âm Lịch

Thứ tự build từng slice cho 20 FR (`FR-LUNAR-001..020`). Mỗi slice: implement các FR của nó cho tới khi test xanh + typecheck sạch, rồi mới sang slice sau. Thứ tự suy từ `depends_on` (xem `feature-requests/lunar/README.md` mục Build order). Tổng ước tính 209.5 engineering-hours.

## Trạng thái hiện tại

`packages/amlich-core/` đã scaffold: constants (PRD 6.2) và types đầy đủ và đúng, golden fixtures (PRD 6.6) và harness đã wired, các hàm thuật toán là STUB (throw). Typecheck sạch; harness chạy đỏ (21 test) chờ implement, 1 test pure-helper xanh. Các package khác mới có `package.json` placeholder.

## Lệnh gate

```bash
pnpm install
pnpm --filter @cyberskill/amlich-core typecheck   # phai sach
pnpm --filter @cyberskill/amlich-core test        # P0 gate: phai xanh 100%
```

## P0 - slice 1: core engine (FR-001, 002, 003) - LÀM TRƯỚC

Rủi ro kỹ thuật cao nhất. Implement trong `packages/amlich-core/src/`, điền các stub theo thứ tự phụ thuộc:

1. `jd.ts` - jdFromDate, jdToDate (nhớ fix audit: jdToDate dùng `jd >= GREGORIAN_SWITCH_JD`).
2. `astro.ts` - NewMoon (dùng MEEUS_NEW_MOON_EPOCH + MEEUS_SYNODIC_PER_K), SunLongitude, getSunLongitude, getNewMoonDay.
3. `leap.ts` - getLunarMonth11 (dùng LUNAR_MONTH11_EPOCH_INT), getLeapMonthOffset.
4. `convert.ts` - convertSolar2Lunar, convertLunar2Solar (dùng EPOCH_INDEX_K + SYNODIC_INDEX_K; trả tuple; sentinel `[0,0,0]`).
5. `canchi.ts` - canChiDay (can=(jdn+9)%10, chi=(jdn+1)%12), canChiMonth (ngũ hổ độn), canChiYear.
6. `tietkhi.ts` - tietKhiAt (độ phân giải 15 độ).

Gate go/no-go (FR-003): `pnpm --filter @cyberskill/amlich-core test` xanh 100%, gồm `golden-sweep.test.ts` (round-trip 1900-2199, mismatches = 0), `convert.test.ts` (6 fixture Tết + lệch VN/TQ 2007/2030/2053 + thang 2 nhuận 1985), `canchi.test.ts` (địa chi = (jdn+1)%12). Lệch bất kỳ năm nào -> dừng, debug, CHƯA xây UI.

Founder decisions đã chốt (xem BACKLOG): tự port amlich-core; accuracy hard gate 1900-2100, 2100-2199 flag + correction table (DEC-LUNAR-039).

## P1 - MVP cá nhân (FR-004..010)

- slice 2: FR-009 (purple theme + APCA gate, `packages/ui`), FR-004 (recurrence + Reminder model, mở rộng `amlich-core`), FR-010 (app shell Next.js/Capacitor, `apps/web`), FR-005 (local notifications rolling-64).
- slice 3: FR-008 (FestivalContent, `packages/content`), FR-007 (calendar grid), FR-006 (reminder management UI).

Founder decisions đã chốt: go thương mại đầy đủ; Capacitor cho v1 (widget/watch native Swift). Tiêu chí MVP: vợ dùng đều >= 1 chu kỳ Rằm/Mùng Một, không bỏ lỡ nhắc nào.

## P2 - trải nghiệm nâng cao (FR-011..015)

- slice 4: FR-011 (day-quality, mở rộng `amlich-core`; nhớ địa chi = (jdn+1)%12), FR-012 (good-day picker), FR-015 (AI Genie proxy, `services/genie-api`).
- slice 5: FR-013 (iOS widget + watch, native Swift trong `apps/web/ios/App`; port amlich tối thiểu khớp constants PRD 6.2), FR-014 (shareable cards).

## P3 - thương mại hóa (FR-016..020)

- slice 6: FR-016 (Zalo Mini App, `zalo/`), FR-017 (ZNS, `services/genie-api`).
- slice 7: FR-018 (family sharing + Supabase sync), FR-019 (PDPL compliance), FR-020 (freemium).

Migration Supabase đã được phân số tránh va chạm: 0016-0017 cho FR-018, 0018 cho FR-017, 0019 cho FR-019, 0020 cho FR-020.

Founder decisions đã chốt: ZNS khởi đầu qua distributor; Genie Claude Haiku 4.5; PDPL tham vấn pháp lý; ZNS hỗ trợ MONTHLY (FR-017 đã có recurrence + month-expander).

## Open items từ independent audit (xem INDEPENDENT-AUDIT-2026-06-27.md)

- FR-017 ZNS MONTHLY recurrence: đã chốt hỗ trợ MONTHLY (founder decision 8); FR-017 đã có recurrence + month-expander.
- §5 test traceability: vài AC ở FR-005/006 đã được bổ sung test; rà thêm khi implement.
- FR-010 đã chuyển sang import `Reminder` từ amlich-core (không mirror).

## Nguyên tắc xuyên suốt

Đọc `docs/AGENT-GUIDE.md` cho invariant của core và quy ước viết. Một FR chỉ `done` sau khi qua gate; operator chạy gate cuối và git commit. Build theo slice, không nhảy cóc dependency.
