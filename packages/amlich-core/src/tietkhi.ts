import { VN_TZ } from "./constants.js";
import type { TietKhi } from "./types.js";

/**
 * STUB - chua implement. FR-LUNAR-002 section 3.
 *
 * Tiet khi tai jdn o do phan giai 15 do: tietKhiIndex = INT(SunLongitude(jdn - 0.5 - tz/24) / PI * 12) -> 0..23.
 * index chan la Trung khi. PHAI dung cung dau vao `jdn - 0.5 - tz/24` voi getSunLongitude cua FR-001
 * de nhat quan ve Dong chi.
 */
export function tietKhiAt(jdn: number, tz: number = VN_TZ): TietKhi {
  void jdn; void tz;
  throw new Error("amlich-core: tietKhiAt chua implement - xem FR-LUNAR-002 section 3");
}

/**
 * STUB - dia chi (0..11) cua ngay BAT DAU tiet (节) dang quan chua jdn. FR-LUNAR-002 section 3 la owner.
 * FR-LUNAR-011 dung de tinh Truc: (diaChiNgay - tietKhiStartDiaChi + 12) % 12 -> index trong TRUC_NAMES.
 * Tinh tu tietKhiAt + lui ve ngay bat dau tiet, roi canChiDay(ngay do).chiIndex.
 */
export function tietKhiStartDiaChi(jdn: number, tz: number = VN_TZ): number {
  void jdn; void tz;
  throw new Error("amlich-core: tietKhiStartDiaChi chua implement - xem FR-LUNAR-002 section 3");
}
