/**
 * Hang so canonical cho thuat toan am lich Ho Ngoc Duc (PRD section 6.2).
 *
 * CANH BAO (PRD 6.2): co BA epoch va HAI synodic constant gan giong nhau, KHONG duoc gop nham.
 * Moi hang so duoi day la mot dai luong rieng, co vai tro rieng. Day la tai san loi cua TASK-LUNAR-001;
 * sai mot hang so la sai toan bo lich.
 *
 * Nguon: PRD + SRS section 6.2; goc Jean Meeus, Astronomical Algorithms (1998).
 */

/** Mui gio Viet Nam, kinh tuyen 105E. Mac dinh cho moi phep tinh (PRD 6.1 rule 5). */
export const VN_TZ = 7.0;

/** IANA timezone id Viet Nam, dung voi Intl.DateTimeFormat (todayInHCM). */
export const VN_TZ_ID = "Asia/Ho_Chi_Minh";

/** Kinh tuyen tham chieu (do). VN = 105E; Trung Quoc = 120E (chi dung de cross-check). */
export const VN_MERIDIAN = 105;

/** Synodic month trung binh dung de index k trong convertSolar2Lunar / getLeapMonthOffset. */
export const SYNODIC_INDEX_K = 29.530588853;

/** Epoch index-k: mean new moon 1/1/1900 dang JD. Dung cho convertSolar2Lunar, getLeapMonthOffset. */
export const EPOCH_INDEX_K = 2415021.076998695;

/** Meeus mean-new-moon epoch, dung BEN TRONG ham NewMoon(k). KHAC EPOCH_INDEX_K. */
export const MEEUS_NEW_MOON_EPOCH = 2415020.75933;

/** He so synodic per-k cua Meeus, dung BEN TRONG NewMoon(k). KHAC SYNODIC_INDEX_K. */
export const MEEUS_SYNODIC_PER_K = 29.53058868;

/** Epoch nguyen (integer) cho getLunarMonth11 - dung dung thiet ke cua Duc, KHONG phai ban thap phan. */
export const LUNAR_MONTH11_EPOCH_INT = 2415021;

/** J2000 epoch trong SunLongitude. */
export const J2000 = 2451545.0;

/** So ngay mot Julian century, dung trong SunLongitude (T = (jdn - J2000) / JULIAN_CENTURY_DAYS). */
export const JULIAN_CENTURY_DAYS = 36525;

/** Mau so cho T trong NewMoon: T = k / T_DIVISOR (Julian centuries tu 1900). */
export const T_DIVISOR = 1236.85;

/** degrees -> radians. */
export const DR = Math.PI / 180;

/**
 * Ranh gioi Julian/Gregorian (JD). Ngay <= 4/10/1582 (Julian) co JD <= GREGORIAN_SWITCH_JD;
 * 15/10/1582 (Gregorian) la ngay ke tiep. LUU Y TASK-LUNAR-001 fix: jdToDate dung `jd >= GREGORIAN_SWITCH_JD`
 * cho nhanh Gregorian (khong phai `>`), de ngay switch 15/10/1582 khong roi nham nhanh Julian.
 */
export const GREGORIAN_SWITCH_JD = 2299161;

/** 10 Can. */
export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"] as const;

/** 12 Chi. */
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"] as const;

/** Con giap theo zodiac VIET NAM: Meo thay Tho (chi Mao), Trau thay Suu/Bo (chi Suu). */
export const ZODIAC_VN = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"] as const;

/** 24 tiet khi (index 0..23). Cac index chan (0,2,...) la Trung khi (Principal Term). */
export const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập"
] as const;
