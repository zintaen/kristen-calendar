/**
 * TASK-LUNAR-004 - recurrence engine. Sinh Occurrence (ngay duong) tu Reminder (ngay am),
 * goi convertLunar2Solar doc lap cho tung nam am (DEC-LUNAR-041, KHONG noi suy), ap fallback
 * thang nhuan (DEC-LUNAR-042), clamp ngay thieu, va khoa moi phep tinh ve Asia/Ho_Chi_Minh.
 *
 * QUY TAC VANG (§11): moi so sanh/tinh ngay dung so nguyen JD hoac chuoi ISO. KHONG duoc
 * `new Date(str).getDate()` vi no doc theo TZ runtime -> lech 1 ngay khi server khong o UTC+7.
 */
import type { Occurrence, Reminder, RecurrenceOptions } from "./types.js";
import { isInvalidSolar } from "./types.js";
import { convertLunar2Solar, convertSolar2Lunar } from "./convert.js";
import { jdFromDate, jdToDate } from "./jd.js";
import { getNewMoonDay } from "./astro.js";
import { getLunarMonth11, getLeapMonthOffset } from "./leap.js";
import { canChiYear } from "./canchi.js";
import { EPOCH_INDEX_K, SYNODIC_INDEX_K, VN_TZ } from "./constants.js";

/** Guard chong quet vo han khi leapFallback=SKIP gap nhieu nam lien tiep khong co thang nhuan. */
const MAX_SKIP_SCAN = 30;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function iso(d: number, m: number, y: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * So thang nhuan (1..12) cua "span" chua thang am `lunarMonth` trong `lunarYear`, hoac null neu
 * span do khong co thang nhuan. Sao chep dung logic nhanh cua convertLunar2Solar (month<11 dung
 * span [year-1, year]; month>=11 dung span [year, year+1]) de nhat quan tuyet doi voi TASK-LUNAR-001.
 */
function leapMonthForSpan(lunarMonth: number, lunarYear: number): number | null {
  const a11 = lunarMonth < 11 ? getLunarMonth11(lunarYear - 1, VN_TZ) : getLunarMonth11(lunarYear, VN_TZ);
  const b11 = lunarMonth < 11 ? getLunarMonth11(lunarYear, VN_TZ) : getLunarMonth11(lunarYear + 1, VN_TZ);
  if (b11 - a11 <= 365) return null;
  const leapOff = getLeapMonthOffset(a11, VN_TZ);
  let lm = leapOff - 2;
  if (lm < 0) lm += 12;
  return lm;
}

/** Do dai (29 hoac 30) cua thang am (lunarMonth, lunarYear, leap) tinh bang khoang cach 2 diem Soc. */
function getMonthLength(lunarMonth: number, lunarYear: number, leap: 0 | 1): number {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, VN_TZ);
    b11 = getLunarMonth11(lunarYear, VN_TZ);
  } else {
    a11 = getLunarMonth11(lunarYear, VN_TZ);
    b11 = getLunarMonth11(lunarYear + 1, VN_TZ);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, VN_TZ);
    if (leap !== 0 || off >= leapOff) off += 1;
  }
  const k = Math.floor(0.5 + (a11 - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
  return getNewMoonDay(k + off + 1, VN_TZ) - getNewMoonDay(k + off, VN_TZ);
}

interface Resolved {
  readonly month: number;
  readonly isLeap: boolean;
  readonly fellBack: boolean;
  readonly pendingUserChoice: boolean;
  readonly skip: boolean;
}

/** Ap chinh sach fallback thang nhuan cho mot nam am dich (DEC-LUNAR-042). */
function resolveLeap(r: Reminder, targetYear: number): Resolved {
  if (!r.isLeapMonth) {
    return { month: r.lunarMonth, isLeap: false, fellBack: false, pendingUserChoice: false, skip: false };
  }
  const lm = leapMonthForSpan(r.lunarMonth, targetYear);
  if (lm === r.lunarMonth) {
    // Nam dich co dung thang nhuan da nhap.
    return { month: r.lunarMonth, isLeap: true, fellBack: false, pendingUserChoice: false, skip: false };
  }
  // Nam dich KHONG co thang nhuan do -> theo leapFallback.
  if (r.leapFallback === "SKIP") {
    return { month: r.lunarMonth, isLeap: false, fellBack: false, pendingUserChoice: false, skip: true };
  }
  if (r.leapFallback === "ASK") {
    return { month: r.lunarMonth, isLeap: false, fellBack: false, pendingUserChoice: true, skip: false };
  }
  // REGULAR (mac dinh): cung thang thuong tuong ung, danh dau fellBack.
  return { month: r.lunarMonth, isLeap: false, fellBack: true, pendingUserChoice: false, skip: false };
}

function makeOccurrence(
  r: Reminder,
  gd: number,
  gm: number,
  gy: number,
  lead: number,
  lunarLabel: string,
  fellBack: boolean,
  dayClamped: boolean,
  pendingUserChoice: boolean,
): Occurrence {
  const jdOcc = jdFromDate(gd, gm, gy);
  const [fd, fm, fy] = jdToDate(jdOcc - lead); // TZ-independent: lui lead ngay trong khong gian JD
  const notifyTime = r.notifyTime || "07:00";
  return {
    reminderId: r.id,
    gregorianDate: iso(gd, gm, gy),
    lunarLabel,
    leadDays: lead,
    fireAtLocal: `${iso(fd, fm, fy)}T${notifyTime}:00+07:00`,
    fellBack,
    dayClamped,
    pendingUserChoice,
  };
}

function annualLabel(day: number, month: number, isLeap: boolean, lunarYear: number): string {
  return `${day}/${month}${isLeap ? " (nhuận)" : ""} ${canChiYear(lunarYear).label}`;
}

/** Sinh cac occurrence sap toi cho mot Reminder, da nhan lead-time (§1 #4, tong = count * leadTimes.length). */
export function nextOccurrences(r: Reminder, opt: RecurrenceOptions): readonly Occurrence[] {
  const out: Occurrence[] = [];
  const leadTimes = r.leadTimes && r.leadTimes.length > 0 ? r.leadTimes : [0];

  if (r.recurrence === "MONTHLY") {
    // Lap lunarDay moi thang am; di theo diem Soc lien tiep nen bao gom ca thang nhuan (12-13/nam, AC #3).
    const startJd = jdFromDate(1, 1, opt.fromYear);
    const k0 = Math.floor((startJd - EPOCH_INDEX_K) / SYNODIC_INDEX_K);
    let produced = 0;
    for (let i = 0; produced < opt.count && i < opt.count + 24; i++) {
      const monthStart = getNewMoonDay(k0 + i, VN_TZ);
      const monthLen = getNewMoonDay(k0 + i + 1, VN_TZ) - monthStart;
      const day = Math.min(r.lunarDay, monthLen);
      const dayClamped = day < r.lunarDay;
      const jdOcc = monthStart + day - 1;
      if (jdOcc < startJd) continue; // bo cac thang truoc moc fromYear
      const [gd, gm, gy] = jdToDate(jdOcc);
      const [ld, lm, ly, leap] = convertSolar2Lunar(gd, gm, gy, VN_TZ);
      const lunarLabel = `${ld}/${lm}${leap ? " (nhuận)" : ""} ${canChiYear(ly).label}`;
      for (const lead of leadTimes) {
        out.push(makeOccurrence(r, gd, gm, gy, lead, lunarLabel, false, dayClamped, false));
      }
      produced++;
    }
    return out;
  }

  // ANNUAL / ONCE: quet tung nam am, goi engine doc lap (DEC-LUNAR-041).
  let targetLunarYear = opt.fromYear;
  let produced = 0;
  let scanned = 0;
  while (produced < opt.count && scanned < opt.count + MAX_SKIP_SCAN) {
    scanned++;
    const ty = r.recurrence === "ONCE" ? (r.lunarYear ?? opt.fromYear) : targetLunarYear;
    const res = resolveLeap(r, ty);
    if (res.skip) {
      if (r.recurrence === "ONCE") break;
      targetLunarYear++;
      continue;
    }
    const monthLen = getMonthLength(res.month, ty, res.isLeap ? 1 : 0);
    const day = Math.min(r.lunarDay, monthLen);
    const dayClamped = day < r.lunarDay;
    const solar = convertLunar2Solar(day, res.month, ty, res.isLeap ? 1 : 0, VN_TZ);
    if (isInvalidSolar(solar)) {
      if (r.recurrence === "ONCE") break;
      targetLunarYear++;
      continue;
    }
    const [gd, gm, gy] = solar;
    const lunarLabel = annualLabel(day, res.month, res.isLeap, ty);
    for (const lead of leadTimes) {
      out.push(makeOccurrence(r, gd, gm, gy, lead, lunarLabel, res.fellBack, dayClamped, res.pendingUserChoice));
    }
    produced++;
    if (r.recurrence === "ONCE") break;
    targetLunarYear++;
  }
  return out;
}

/** Gop occurrence cua nhieu Reminder, sort tang dan theo fireAtLocal (chuoi ISO). TASK-LUNAR-005 cat 64 dau. */
export function mergeAndSort(all: readonly Occurrence[]): readonly Occurrence[] {
  return [...all].sort((a, b) => (a.fireAtLocal < b.fireAtLocal ? -1 : a.fireAtLocal > b.fireAtLocal ? 1 : 0));
}
