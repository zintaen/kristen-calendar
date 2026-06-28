# amlich-core public API contract (authoritative)

Đây là hợp đồng API duy nhất cho `@cyberskill/amlich-core` và `@cyberskill/genie-content`. Mọi FR khi viết §3 (API contract) hoặc §5 (test) PHẢI import đúng tên và chữ ký ở đây. Một agent implement FR nào đó chỉ cần đọc FR đó cộng file này là đủ để viết import không gãy. Nguồn sự thật là code thật trong `packages/amlich-core/src/` (đã scaffold, typecheck sạch); file này phản chiếu nó cộng phần các FR P2/P3 sẽ thêm.

Quy tắc: import qua barrel `@cyberskill/amlich-core` (không import theo đường dẫn file nội bộ trong code production; test nội bộ của package có thể import theo `../src/<file>`).

## Tên KHÔNG tồn tại (lỗi hay gặp - đừng import)

- `getTietKhi`, `getTietKhiForDate` -> KHÔNG có. Dùng `tietKhiAt(jdn, tz?)` cho tiết khí của một ngày, và `tietKhiStartDiaChi(jdn, tz?)` cho địa chi ngày bắt đầu tiết (FR-011 tính Trực).
- Đọc `.year` / `.month` / `.day` trên kết quả convert -> SAI. `convertSolar2Lunar` / `convertLunar2Solar` trả LABELED TUPLE, phải destructure.
- So sánh kết quả convertLunar2Solar `=== null` -> SAI. Dùng `isInvalidSolar(s)` (sentinel `[0,0,0]`).

## P0/P1 surface - đã có trong scaffold (ground truth)

```typescript
// --- constants (PRD 6.2) ---
export const VN_TZ = 7.0;
export const VN_TZ_ID = "Asia/Ho_Chi_Minh";
export const VN_MERIDIAN = 105;
export const SYNODIC_INDEX_K = 29.530588853;
export const EPOCH_INDEX_K = 2415021.076998695;
export const MEEUS_NEW_MOON_EPOCH = 2415020.75933;
export const MEEUS_SYNODIC_PER_K = 29.53058868;
export const LUNAR_MONTH11_EPOCH_INT = 2415021;
export const J2000 = 2451545.0;
export const JULIAN_CENTURY_DAYS = 36525;
export const T_DIVISOR = 1236.85;
export const DR = Math.PI / 180;
export const GREGORIAN_SWITCH_JD = 2299161;
export const CAN: readonly string[];        // 10 Can: Giáp..Quý
export const CHI: readonly string[];        // 12 Chi: Tý..Hợi
export const ZODIAC_VN: readonly string[];  // con giáp VN: Mèo (Mão), Trâu (Sửu)
export const TIET_KHI: readonly string[];   // 24 tiết khí, index chẵn = Trung khí

// --- types ---
export type SolarDate = readonly [day: number, month: number, year: number];        // sentinel invalid = [0,0,0]
export type LunarDate = readonly [day: number, month: number, year: number, leap: 0 | 1];
export const INVALID_SOLAR: SolarDate;      // [0,0,0]
export function isInvalidSolar(s: SolarDate): boolean;
export interface CanChi { readonly canIndex: number; readonly chiIndex: number; readonly label: string; }
export interface TietKhi { readonly index: number; readonly name: string; readonly isTrungKhi: boolean; }
export type LeapFallback = "REGULAR" | "SKIP" | "ASK";
export type ReminderChannel = "LOCAL" | "ZNS" | "PUSH";
export type ReminderType = "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
export type Recurrence = "MONTHLY" | "ANNUAL" | "ONCE";
export interface NotificationStyle { readonly tone?: "warm" | "neutral" | "formal"; readonly emoji?: string; readonly imageId?: string; }
export interface Reminder {            // FR-LUNAR-004 la OWNER; moi consumer import type nay, khong redeclare
  readonly id: string; readonly userId: string; readonly type: ReminderType; readonly title: string;
  readonly lunarDay: number; readonly lunarMonth: number; readonly lunarYear: number | null;
  readonly isLeapMonth: boolean; readonly leapFallback: LeapFallback; readonly recurrence: Recurrence;
  readonly leadTimes: readonly number[]; readonly notifyTime: string; readonly channels: readonly ReminderChannel[];
  readonly linkedContentId?: string; readonly sharedWith?: readonly string[];
  readonly notificationStyle?: NotificationStyle; readonly enabled: boolean;
}
export interface Occurrence {          // FR-LUNAR-004 section 3 - 8 fields, gregorianDate la STRING
  readonly reminderId: string; readonly gregorianDate: string;  // "YYYY-MM-DD"
  readonly lunarLabel: string; readonly leadDays: number; readonly fireAtLocal: string; // "YYYY-MM-DDTHH:mm:00+07:00"
  readonly fellBack: boolean; readonly dayClamped: boolean; readonly pendingUserChoice: boolean;
}
export interface RecurrenceOptions { readonly fromYear: number; readonly count: number; readonly engineVersion: string; }
export interface OccurrenceCache { readonly reminderId: string; readonly gregorianDate: string; readonly lunarLabel: string; readonly computedAt: string; readonly engineVersion: string; }
export interface ValidationError { readonly field: string; readonly code: string; readonly message: string; }

// --- functions (jd / astro / leap / convert) ---
export function jdFromDate(dd: number, mm: number, yy: number): number;
export function jdToDate(jd: number): SolarDate;                                  // dung jd >= GREGORIAN_SWITCH_JD cho nhanh Gregorian
export function NewMoon(k: number): number;
export function SunLongitude(jdn: number): number;
export function getSunLongitude(dayNumber: number, tz?: number): number;
export function getNewMoonDay(k: number, tz?: number): number;
export function getLunarMonth11(yy: number, tz?: number): number;
export function getLeapMonthOffset(a11: number, tz?: number): number;
export function convertSolar2Lunar(dd: number, mm: number, yy: number, tz?: number): LunarDate;   // tuple
export function convertLunar2Solar(lunarDay: number, lunarMonth: number, lunarYear: number, leap: 0 | 1, tz?: number): SolarDate; // tuple, sentinel [0,0,0]

// --- can-chi / tiet khi ---
export function canChiLabel(canIndex: number, chiIndex: number): string;          // pure helper (data)
export function canChiDay(jdn: number): CanChi;                                    // can=(jdn+9)%10, chi=(jdn+1)%12  (SOURCE OF TRUTH)
export function canChiMonth(lunarMonth: number, lunarYear: number): CanChi;
export function canChiYear(lunarYear: number): CanChi;
export function zodiacOf(chiIndex: number): string;                                // pure helper (data)
export function tietKhiAt(jdn: number, tz?: number): TietKhi;                      // tiet khi cua MOT ngay (do phan giai 15 do)
export function tietKhiStartDiaChi(jdn: number, tz?: number): number;              // dia chi (0..11) ngay bat dau tiet -> FR-011 tinh Truc

// --- reminder / recurrence / tz (FR-LUNAR-004) ---
export function validateReminder(r: Reminder): ValidationError[];
export function normalizeReminder(r: Partial<Reminder>): Reminder;
export function isCacheStale(c: OccurrenceCache, engineVersion: string): boolean;
export function nextOccurrences(reminder: Reminder, opt: RecurrenceOptions): readonly Occurrence[];
export function mergeAndSort(all: readonly Occurrence[]): readonly Occurrence[];   // sort theo fireAtLocal -> FR-005 cat 64 dau
export function todayInHCM(now?: Date): SolarDate;                                 // "hom nay" theo gio VN (tuple), KHONG phu thuoc TZ thiet bi
```

## P2/P3 surface - các FR sẽ THÊM khi tới slice (chưa scaffold, nhưng tên + chữ ký chốt ở đây)

```typescript
// FR-LUNAR-011 them vao @cyberskill/amlich-core (file dayquality.ts):
export interface GioInfo { readonly canhGio: string; readonly isHoang: boolean; /* ... */ }
export interface DayQuality {
  readonly solarDate: string; readonly canChiNgay: string; readonly isHoangDao: boolean;
  readonly truc: string; readonly sao28: string; readonly gioHoangDao: readonly GioInfo[];
  readonly disclaimer: string;   // "Tham khao phong thuy dan gian"
}
export function getDayQuality(solarDate: Date): DayQuality;
export function getMonthDayQualities(year: number, month: number): readonly DayQuality[];
// Truc PHAI dung tietKhiStartDiaChi (FR-002); dia chi PHAI lay tu canChiDay(jdn).chiIndex (KHONG (jdn+9)%60%12).

// FR-LUNAR-008 = package rieng @cyberskill/genie-content (packages/content):
export interface FestivalContent {
  readonly id: string; readonly name: string; readonly lunarDay: number | null; readonly lunarMonth: number | null;
  readonly meaning: string; readonly offerings: readonly string[]; readonly checklist: readonly string[];
  readonly regionVariants?: readonly { readonly region: "BAC" | "TRUNG" | "NAM"; readonly note: string }[];
  readonly disclaimer: string;   // "Tham khao phong tuc dan gian"
}
export const FESTIVALS: readonly FestivalContent[];                                // 13 dip (PRD section 7)
export function getFestivalByLunarDate(lunarDay: number, lunarMonth: number): readonly FestivalContent[];
export function buildFestivalDateSet(year: number): Set<string>;                  // "dd-mm-yyyy" duong -> FR-007 cham le
```

## Producer / consumer map (mỗi cạnh phải khớp tên + chữ ký ở trên)

| Symbol | Producer FR | Consumer FR |
|---|---|---|
| convertSolar2Lunar / convertLunar2Solar / jdFromDate / jdToDate | 001 | 003, 004, 007, 013(port Swift), 016, 017 |
| canChiDay / canChiMonth / canChiYear / zodiacOf / tietKhiAt | 002 | 007, 011 |
| tietKhiStartDiaChi | 002 | 011 |
| Reminder / validateReminder / normalizeReminder / Occurrence / nextOccurrences / mergeAndSort / OccurrenceCache / isCacheStale | 004 | 005, 006, 010, 016, 017, 018 |
| todayInHCM | 004 | 016, 017 |
| getDayQuality / getMonthDayQualities / DayQuality / GioInfo | 011 | 012 |
| FestivalContent / getFestivalByLunarDate / buildFestivalDateSet | 008 | 006, 007, 015, 016 |

Bất biến: can-chi ngày `can=(jdn+9)%10`, `chi=(jdn+1)%12` (FR-002 owner); convert trả tuple + sentinel `[0,0,0]`; ba epoch và hai synodic constant tách bạch (PRD 6.2); core offline, mọi tính toán khóa `Asia/Ho_Chi_Minh`.
