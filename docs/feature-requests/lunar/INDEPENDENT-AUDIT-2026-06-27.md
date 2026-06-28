# Independent audit - LUNAR FR corpus - 2026-06-27

Đây là lượt audit độc lập, adversarial, pass thứ hai trên 20 FR của module LUNAR, chạy sau khi authoring qua 5 reviewer riêng biệt theo rubric `feature-request-audit` của CyberOS. Nó bổ sung (không thay thế) file `*.audit.md` self-audit của từng FR. Khác với self-audit, lượt này do các reviewer KHÔNG viết spec thực hiện.

Method: 5 reviewer song song, mỗi reviewer chấm một cụm gắn kết (001-003, 004-006, 007-010, 011-015, 016-020) cùng các FR thượng nguồn của nó để bắt lỗi cross-FR, kiểm cấu trúc 11 mục, traceability §1 MUST -> §4 AC -> §5 test, tính đúng của code/contract sketch, và độ trung thành với PRD. Một lượt sweep symbol cross-cluster do parent chạy (chữ ký hàm convert/canChi, type Reminder, FestivalContent) để bắt lỗi nằm vắt qua ranh giới cụm mà không reviewer đơn lẻ nào thấy.

## Headline

Lượt độc lập tìm ra defect mà self-audit bỏ sót: 2 blocker và khoảng 13 code-level major, cộng vài minor. Toàn bộ blocker và code-level major đã được fix trong spec; minor được fix nếu rẻ, còn lại ghi làm implementation note. Self-audit của tác giả đã lạc quan khi tuyên 10/10 đồng loạt; bản ghi này đính chính và tài liệu hóa cách giải quyết.

Hai nguyên nhân gốc chi phối phần lớn defect:

1. **Tuple-vs-object contract drift với `amlich-core`.** FR-LUNAR-001 trả về labeled tuple `[dd, mm, yy, leap]` cho convert và sentinel `[0, 0, 0]` cho trường hợp invalid. Nhưng FR-007 (grid render), FR-008 (`buildFestivalDateSet`), FR-010 (test mock), FR-016 (`todayLunar`), và FR-017 (`zns-scheduler`) đều tiêu thụ nó như object `.year` / `.month` / `.day`, cho ra `undefined` và `Invalid Date` lúc runtime; sentinel `[0,0,0]` (mảng truthy) bị xử như `null` nên occurrence rác lọt qua. Đây là loại lỗi cross-FR mà self-audit từng FR về mặt cấu trúc không thể thấy.

2. **Can-chi địa chi lệch +8.** FR-LUNAR-002 (owner của can-chi) tính can-chi ngày bằng công thức canonical `can = (jdn + 9) % 10`, `chi = (jdn + 1) % 12`. FR-011 và FR-013 lại suy địa chi bằng `((jdn + 9) % 60) % 12 = (jdn + 9) % 12`, lệch +8 so với FR-002. Vì `THAN_TRUC_NHAT_TABLE`, Trực, và giờ Hoàng đạo đều key theo địa chi, toàn bộ day-quality bị sai và mâu thuẫn với can-chi mà lịch hiển thị. (`can = (jdn+9)%10` tình cờ khớp, che lỗi.)

## Findings and resolution

| FR | Indep. score (pre-fix) | Severity | Finding | Resolution |
|---|---|---|---|---|
| LUNAR-001 | 7/10 | MAJOR | `jdToDate` dùng `jd > GREGORIAN_SWITCH_JD`; canonical Đức dùng `jd > 2299160`. Tại ngày switch JD 2299161 code đi nhánh Julian, trả 5/10/1582 thay vì 15/10/1582. Round-trip sweep 1900-2199 không chạm tới biên này nên FR-003 vẫn xanh - latent. | Sửa thành `jd >= GREGORIAN_SWITCH_JD` (§3) + test switch-day + §10 row. |
| LUNAR-001 | 7/10 | MAJOR | AC #6 assert `jdFromDate(14,10,1582) === 2299160` - sai số học (đúng phải 2299170; 2299160 là 4/10/1582). Test tương ứng sẽ fail. | Sửa AC #6 thành `jdFromDate(4,10,1582) === 2299160`, ghi rõ 14/10/1582 -> 2299170. |
| LUNAR-002 | 9/10 | NIT | sub_task mô tả `tietKhiAt` trả "cung 30 độ" + field phantom; thực tế trả `{index,name,isTrungKhi}` ở độ phân giải 15 độ. | Sửa mô tả sub_task. Can-chi/zodiac/TIET_KHI xác nhận đúng. |
| LUNAR-003 | 10/10 | CLEAN | Fixtures độc lập (không engine-generated), khớp PRD 6.6 mọi dòng; offset VN/TQ 2007/2030/2053 chính xác; round-trip sweep thật L2S(S2L(d))==d trên 1900-2199 (109573/0). | Không đổi. |
| LUNAR-004 | 8/10 | MAJOR | `Reminder.notificationStyle` bị FR-006 tiêu thụ (§3, AC#11, DEC-065) nhưng type Reminder (owner FR-004) không khai báo - mismatch compile-level. | Thêm `notificationStyle?: NotificationStyle` vào FR-004 §3; FR-006 import thay vì khai lại. |
| LUNAR-004 | 8/10 | MAJOR | `nextOccurrences` signature drift (§1#4 ba tham số vs §3 object form); `count` mơ hồ; ONCE+SKIP lặp vô hạn (lunarYear tăng mãi). | Chốt object form `nextOccurrences(r, opt)`; pin "total = count x leadTimes.length"; thêm `MAX_SKIP_SCAN` + `if(ONCE) break`. |
| LUNAR-005 | 9/10 | MAJOR (latent) | Rolling-64 đúng phần cap 64 + soonest, nhưng `count: enoughFor(horizon,r)` không định nghĩa; nếu count nhỏ hơn số occurrence trong horizon thì im lặng drop notification gần, phá guarantee "64 soonest". | §1#6 thêm điều kiện normative: per-reminder count phải phủ horizonMonths trước khi truncate. |
| LUNAR-006 | 7/10 | MAJOR | Model lộ lựa chọn mà UI không bao giờ surface: FR-004 cho mỗi Reminder policy `leapFallback` (REGULAR/SKIP/ASK) + cờ `fellBack`/`pendingUserChoice`, FR-005 chuyển qua userInfo, nhưng FR-006 (màn duy nhất tạo/sửa GIO) không có selector và không render cờ. | FR-006 §1#2 thêm selector `leapFallback` khi `isLeapMonth`, §1#6 hiển thị trạng thái fallback; thêm field vào ReminderFormProps + UpcomingItem. |
| LUNAR-007 | 5/10 | MAJOR (blocker-level) | §3/§6 import/gọi `getTietKhi` từ amlich-core; FR-002 export `tietKhiAt(jdn,tz)`, không có `getTietKhi` - build vỡ. Cộng tuple-spread `{...lunar}` (convert trả tuple) làm can-chi/zodiac không bao giờ tính; start-padding dùng `getDay()` runtime-TZ (SSG chạy UTC -> sai đầu tuần). | §3/§6 chuyển sang `tietKhiAt`; destructure tuple + `jdFromDate` rồi gọi `canChiDay/tietKhiAt`; `startPaddingFor()` qua Intl Asia/Ho_Chi_Minh. |
| LUNAR-008 | 6/10 | MAJOR | `buildFestivalDateSet` đọc `solar.year/.day/.month` + truyền `false` cho leap; FR-001 trả tuple `[dd,mm,yy]` + leap là `0\|1` -> Set rỗng/sai, phá AC#12/#13; sentinel `[0,0,0]` (mảng truthy) thêm key "0-0-0". AC#6 mâu thuẫn chính §5 test của nó. | Destructure `[dd,mm,yy]`, truyền `0`, filter `dd!==0 && yy===year`; viết lại AC#6 + test cho nhất quán; guard ngày 30/29 Chạp cho Giao thừa. |
| LUNAR-009 | 9/10 | NIT (post-fix 10) | `card-shadow` dùng rgba(93,33,182) trong khi purple-700 là #5B21B6 = rgb(91,33,182). APCA gate được recompute độc lập bằng apca-w3 và xác nhận throw đúng ở purple-400/cream (Lc 50.2 < 75). Umber/Ochre giữ nguyên. | Sửa rgba thành (91,33,182). Gate đúng, không đổi thêm. |
| LUNAR-010 | 7/10 | MAJOR | `import { Preferences }` top-level kéo native plugin vào bundle static-export + JSDOM; `isCapacitor()` dùng `window?.Capacitor` ném ReferenceError dưới SSG; home-route test mock convert như object (false-green trong khi prod đọc tuple). | Lazy `await import` gated `isCapacitor()`; guard `typeof window !== "undefined"`; mock test sửa thành tuple `[1,1,2025,0]`. |
| LUNAR-011 | 5/10 | BLOCKER | Địa chi ngày `(jdn+9)%60 ... %12 = (jdn+9)%12`, lệch +8 so với FR-002 `chi=(jdn+1)%12`. THAN_TRUC_NHAT_TABLE / Trực / giờ Hoàng đạo đều key theo địa chi -> toàn bộ day-quality sai và lệch can-chi của lịch. | Viết lại DEC-112, §1#7, §3, §6 gọi `canChiDay(jdn)` dùng `chiIndex=(jdn+1)%12`; thêm AC#16 (cross-check 60 ngày vs canChiDay) + test. |
| LUNAR-012 | 8.5/10 | MINOR | `DayQuality`/`GioInfo` dùng trong §3 không có import; tiêu thụ FR-011 chưa tường minh trong sketch. | Thêm `import type { DayQuality, GioInfo }` + `getMonthDayQualities` từ amlich-core, comment "consume, not recompute". |
| LUNAR-013 | 6/10 | BLOCKER | Cùng lỗi địa chi +8 trong Swift `canChiNgayFromJDN`. | Sửa §3/§1#6/§6 thành `diaChiIndex=(jdn+1)%12`; thêm AC#15 + XCTest sweep 60 ngày vs core. |
| LUNAR-013 | 6/10 | MAJOR | Fixture sai: test + AC#4 assert pillar NGÀY là "At Ty" - đó là can-chi NĂM (Ất Tỵ). Pillar ngày đúng cho 29/01/2025 theo FR-002 là Mậu Tuất. | Sửa test + AC#4 thành "Mau Tuat"; clarify §1#13 rằng Ất Tỵ là năm. |
| LUNAR-013 | 6/10 | MAJOR | tz inconsistency: helper bỏ tham số tz trong khi convertLunar2Solar truyền VN_TZ; test round-trip tham chiếu hàm không tồn tại trong contract tối thiểu. | Thêm §1#15 (mọi hàm phụ thuộc tz dùng TZ_VN=7.0/105E) + AC#16; đổi tên test thành S2L identity trực tiếp. |
| LUNAR-014 | 8.5/10 | MINOR | Mâu thuẫn APCA nội bộ: §1#5 "mọi cặp Lc>=75" nhưng §5 assert secondary >=60 và §11 đòi watermark Lc>=90 không test. | Hòa giải §1#5 theo ngưỡng size-tiered (primary>=75/secondary>=60/watermark>=90); thêm assert watermark + AC#12. |
| LUNAR-015 | 9/10 | MINOR | §1#7 nói Retry-After "tới nửa đêm" không nêu timezone; §11 đã chốt Asia/Ho_Chi_Minh. Key security (ANTHROPIC_API_KEY server-only, model không client-overridable, cache_control, PII strip) xác nhận sạch, không có đường lộ key. | Clarify §1#7 thành giây tới nửa đêm UTC+7. |
| LUNAR-016 | 8/10 | MAJOR | `todayLunar()` đọc `now.getDate()` theo TZ thiết bị rồi truyền tz=7.0 -> user ở nước ngoài nhận ngày của thiết bị, không phải Việt Nam (vi phạm §1#12). Cộng §5 test đọc `.lunarDay` trên tuple. | Import `todayInHCM()` từ amlich-core lấy ngày HCM trước convert; destructure tuple trong test. |
| LUNAR-017 | 7/10 | MAJOR | `zns-scheduler` tiêu thụ `convertLunar2Solar` sai hai trục: `if(!solarDate)` không bao giờ fire (tuple/sentinel luôn truthy -> occurrence tháng nhuận invalid không bị skip) + `.year/.month/.day` undefined -> Invalid Date. `ngay_duong` re-derive theo TZ server -> off-by-one trên server UTC. | Destructure `[gd,gm,gy]`, check sentinel `gd===0 && gm===0 && gy===0`, build ISO zero-pad; `ngay_duong` từ tuple ICT. |
| LUNAR-018 | 9/10 | CLEAN (code) | RLS enabled + policy owner/member; `shared_with UUID[]` + GIN index; consent-gate trước mọi cloud call; last-write-wins. Field-set khớp FR-004. | Không đổi code. (Minor: prefix migration 0016 trùng FR-017 - renumber khi merge.) |
| LUNAR-019 | 9/10 | MINOR | sub_tasks sum 8.5h vs effort 9 (9 được tham chiếu ở README + manifest + BACKLOG). Legal facts xác nhận đúng PRD (91/2025/QH15 eff 01/01/2026; 356/2025; 5%/10x/3 tỷ; ân hạn 5 năm DPIA/DPO; cá nhân-gia đình miễn trừ). consent granular, ip_hash. | Bump 1 sub_task +0.5h, sum = 9.0h; effort_hours giữ 9. |
| LUNAR-020 | 9/10 | CLEAN (code) | Entitlement enforce server-side (AC#7 chứng minh tamper localStorage vẫn 403); webhook JWS + HMAC verify trước khi grant; atomic quota `ON CONFLICT DO UPDATE`. Không có gate client-trusted. | Không đổi code. |

## Net

- Blockers: 2 (LUNAR-011, LUNAR-013 - can-chi địa chi +8) - đã fix ở cả hai, kèm cross-consistency test vs `canChiDay`.
- Code-level majors: LUNAR-001 (x2), 004 (x2), 005, 006, 007 (x3), 008 (x2), 010 (x3), 013 (x2 ngoài blocker), 016 (x2), 017 (x2) - tất cả đã fix trong spec.
- Minor/NIT: fix nếu rẻ (002, 009, 012, 014, 015, 019 effort); còn lại ghi làm implementation note.
- Catch giá trị nhất: tuple-vs-object drift với amlich-core (sai đồng thời ở 007/008/010/016/017) và can-chi địa chi +8 (011/013). Cả hai là lỗi cross-FR mà self-audit từng FR không cấu trúc nào thấy được; một AC của FR-008 còn mâu thuẫn chính test của nó, và một fixture của FR-013 nhầm can-chi năm với can-chi ngày.

Corpus mạnh hơn rõ rệt sau lượt này. Re-verify cơ học sau fix: 0 reciprocity error, 0 stray typographic char, diacritics đầy đủ, mọi sub_task sum khớp effort, tổng effort vẫn 203h. Một lượt thứ ba không cần thiết trước kickoff; re-audit từng FR nếu scope nó đổi.

## Open items (KHÔNG auto-fix - cần founder/merge quyết)

Đây là quyết định scope hoặc va chạm merge, không phải defect contract của một FR đơn lẻ, nên reviewer ghi lại thay vì sửa:

1. **ZNS MONTHLY recurrence (FR-017).** `SchedulerReminder` không mang `recurrence`; cron tính 1 occurrence/năm, nên nhắc MONTHLY (Rằm/Mùng Một) sẽ KHÔNG tái diễn qua ZNS server-side. Quyết: hỗ trợ MONTHLY server-side (thêm `recurrence` + vòng month-expander) hay scope ZNS chỉ cho ANNUAL/ONCE. Đây là quyết định đáng chốt trước P3 build.
2. **Va chạm số migration P3.** `0016_*.sql` đang bị cả FR-017 và FR-018 dùng trong cùng namespace `services/genie-api/supabase/migrations/`. Renumber khi merge.
3. **Subset Reminder ở client/scheduler (FR-016/017)** bỏ vài field của FR-004 (`recurrence`/`sharedWith`); chấp nhận được nếu tính on-the-fly, nhưng nên mang `recurrence` cho đúng tái diễn.
4. **FR-010 mirror Reminder** khai lại type thiếu `notificationStyle`; khuyến nghị import `Reminder` từ amlich-core thay vì mirror để tránh drift.
5. **Khoảng trống traceability §5** (vài AC chưa có test ghép) ở FR-005/006 và rải rác; bổ sung lúc implementation, không phải defect contract.

## Post-fix scores

001=10, 002=10, 003=10, 004=10, 005=10, 006=10, 007=9, 008=9, 009=10, 010=9, 011=10, 012=10, 013=10, 014=10, 015=10, 016=10, 017=10, 018=10, 019=10, 020=10. Ba FR ở 9/10 (007/008/010) giữ vài deferral implementation-time (Web Worker cho lưới, edge Giao thừa, `generateStaticParams`) - là việc lúc build, không phải defect contract.
