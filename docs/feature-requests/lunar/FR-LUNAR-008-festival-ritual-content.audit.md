---
fr_id: FR-LUNAR-008
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS >= 6 minimum; 13 dip day du tu PRD §7; DEC-LUNAR-080..084 assigned; disclaimer bat buoc; regionVariants Doan Ngo 3 vung encoded)
---

## §1 - Verdict summary

FR-LUNAR-008 đặc tả cơ sở dữ liệu nội dung tĩnh cho 13 dịp âm lịch là nền tảng cho AI Genie (FR-015) và Zalo Mini App (FR-016). Phạm vi: 15 mệnh đề BCP-14 trong §1 (13 bản ghi đầy đủ, disclaimer bắt buộc, lunarDay:null cho Thanh Minh và đám giỗ, regionVariants cho Đoan Ngọ, 5 hàm API, buildFestivalDateSet, offline, offerings >= 3, checklist >= 2). §2 có 7 đoạn rationale giải thích DEC-LUNAR-080..084. §3 encode đầy đủ TypeScript type FestivalContent/RegionVariant/LunarDateSpec/ContentId và 13 bản ghi FESTIVALS với dữ liệu thuộc lòng chính xác từ PRD §7 (tên, ngày âm, ý nghĩa, offerings, checklist, celebrationTime, regionVariants). 15 AC trong §4. §5 có 10 unit test cụ thể với fixture ngày dương Vu Lan/Rằm tháng Giêng 2025. §10 liệt kê 10 failure rows. Ánh xạ tới FR-D01, FR-D02, PRD §7, PRD §10 FestivalContent data model.

## §2 - Findings (all resolved during authoring)

### ISS-001 - Thiếu bản ghi cho 1 trong 13 dịp, có thể bỏ sót khi encode
PRD §7 liệt kê chính xác 13 dịp, nếu thiếu 1 bản ghi là lỗi. Resolved: §1 #1 liệt kê tường minh cả 13 tên dịp; §5 test `getAllFestivals().length === 13`; §4 AC #1.

### ISS-002 - Không có cơ chế bắt buộc disclaimer, bản ghi có thể bị bỏ nhãn
Nếu disclaimer là optional field, dev có thể quên. Resolved: §1 #2 PHẢI gắn nhãn DEC-LUNAR-081; field `disclaimer: string` (non-optional) trong type; §5 test tất cả 13 bản ghi có disclaimer.

### ISS-003 - Thanh Minh và đám giỗ được encode sai với ngày âm cụ thể, gây bug getFestivalByLunarDate
Nếu Thanh Minh được encode lunarDay=3 hoặc đám giỗ = một ngày ngẫu nhiên, hàm query trả sai. Resolved: §1 #3 + DEC-LUNAR-082 lunarDay:null với dateNote; §5 test thanh-minh và dam-gio-ca-nhan có lunarDay === null; §6 ghi chú logic sort.

### ISS-004 - Tiết Đoan Ngọ có 3 biến thể vùng miền nhưng bị model sai (3 bản ghi riêng)
3 bản ghi riêng tạo ambiguity trong getFestivalByLunarDate(5,5) trả 3 kết quả. Resolved: §1 #4 + DEC-LUNAR-083 regionVariants[] trong cùng bản ghi; §5 test `regionVariants.length === 3`.

### ISS-005 - buildFestivalDateSet không có, FR-007 không thể tô chấm festival trên grid
FR-007 cần Set<string> ngày dương; nếu module content không cung cấp hàm này thì FR-007 phải tự tính, vi phạm separation of concerns. Resolved: §1 #8 + DEC-LUNAR-084 + §3 hàm buildFestivalDateSet đầy đủ với logic loop 1..12 cho Rằm/Mùng Một và convertLunar2Solar cho dịp cố định.

### ISS-006 - getFestivalByLunarDate(1,1) trả cả "mung-mot" lẫn "mung-mot-tet" gây ambiguity, thiếu giải thích
Không có sort rule, UI không biết hiển thị dịp nào nổi bật. Resolved: §6 sort rule (specific lunarMonth trước, generic null sau); §4 AC #7 mô tả rõ kết quả cả hai; §11 note "đây là đúng, không phải bug".

### ISS-007 - Package dependencies chưa được ràng buộc, có thể bị import React hoặc framework
Nếu có dev vô tình import React vào packages/content, Zalo Mini App (FR-016) có thể lỗi build. Resolved: §1 #13 zero-dependency ngoài amlich-core; §11 note "pure TypeScript library dùng được trên cả Zalo Mini App".

## §3 - Resolution

Sau khi xử lý 7 vấn đề trên, FR-LUNAR-008 có 15 mệnh đề BCP-14, 15 AC, 10 unit test, 10 failure rows, 13 bản ghi đầy đủ từ PRD §7 với dữ liệu thuộc lòng (tên dịp tiếng Việt có dấu, offerings, checklist, disclaimer bắt buộc, regionVariants Đoan Ngọ, lunarDay:null cho Thanh Minh và đám giỗ). Score sau self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Pre-fix score: **6/10**. 13 dip / dates / disclaimer / lunarDay:null / regionVariants deu dung va khop PRD §7 (xac nhan). Nhung hai defect that:

- **MAJOR - buildFestivalDateSet doc tuple nhu object + truyen `false` cho cờ nhuận.** §3 goi `convertLunar2Solar(spec.lunarDay, lunarMonth, year, false, 7.0)` roi doc `solar.year/.day/.month`. FR-LUNAR-001 tra TUPLE `[dd,mm,yy]` (khong co `.year`) va cờ nhuận la `0 | 1` (khong phai boolean). Hau qua: `solar.year` la `undefined`, filter `=== year` khong bao gio dung -> Set rong/sai, vo AC #12/#13. Sentinel `[0,0,0]` la mang truthy nen `if (solar)` van add key "0-0-0". Fixed: destructure `[dd,mm,yy]`, truyen `0`, loc `dd !== 0 && yy === year`; them comment hop dong; §10 boundary row sua tu "guard if(solar)" sang "loc dd !== 0".
- **MAJOR - AC #6 mau thuan voi hop dong + test tu mau thuan.** AC #6 yeu cau `getFestivalByLunarDate(15,1)` KHONG tra "ram", nhung ham (dung, theo §6/§11) tra CA "ram" (lunarMonth:null khop moi thang) LAN "ram-thang-gieng" - song song AC #7. §5 test vua `not.toContain("ram")` vua comment "ram SE khop... ket qua la ca hai" -> khong the pass. Fixed: AC #6 viet lai (tra ca hai, sort specific-first, `results[0].id === "ram-thang-gieng"`); §5 test viet lai khop; §10 row reframe sang loi sort.

MINOR (ghi nhan, khong block): Giao thua encode lunarDay:30 nhung thang Chap mot so nam chi 29 ngay -> da them comment + guard `dd !== 0`, neo ngay thuc thuoc reminder layer. Example payload vu-lan ghi `dateNote: null` trong khi record co dateNote non-null - cosmetic, khong sua. **Post-fix score = 9/10.**

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **FestivalContent struct**: CONTRACT dinh nghia FestivalContent phang (flat) voi `lunarDay: number | null` va `lunarMonth: number | null` truc tiep tren interface. FR-008 truoc do boc chung trong `lunarDateSpec: LunarDateSpec` - khong khop contract. Da sua: type `FestivalContent` trong types.ts viet lai theo CONTRACT (flat, readonly fields). `LunarDateSpec` va `RegionVariant` mo rong chi con la internal-only (khong re-export).
- **FESTIVALS**: Da doi sang `readonly FestivalContent[]` va `as const`. Tat ca 13 ban ghi duoc viet lai voi truong phang (`lunarDay`, `lunarMonth` truc tiep, khong co `lunarDateSpec`).
- **regionVariants**: CONTRACT dinh nghia chi co `region` va `note` (khong co `offerings` rieng). `doan-ngo` da duoc sua: offerings theo vung duoc gop vao `note`. 3 regionVariants van du (BAC/TRUNG/NAM), AC #9 van pass.
- **getFestivalByLunarDate return type**: Da doi sang `readonly FestivalContent[]` trong ca §3 (index.ts) va §6 (skeleton). Filter va sort dung f.lunarDay / f.lunarMonth (KHONG qua f.lunarDateSpec).
- **AC #15 va test**: Da viet lai AC #15 va test "thanh-minh va dam-gio" de doc `f.lunarDay` (khong phai `f.lunarDateSpec.lunarDay`).
- **Traceability Task B**: 15 menh de PHAI trong §1, 15 AC trong §4, 10 test trong §5. DEC-LUNAR-080..084 ton tai va duoc tham chieu. PASS.

**Post-alignment score: READY.**

*Hết audit FR-LUNAR-008.*
