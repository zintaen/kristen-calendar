import type { DayQuality, GioInfo } from "@cyberskill/amlich-core";
import { getMonthDayQualities } from "@cyberskill/amlich-core";

export type WorkType =
  | "ky-hop-dong"
  | "khai-may"
  | "ra-mat"
  | "khai-truong";

export interface WorkTypeOption {
  value: WorkType;
  label: string;
  icon: string;
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
  { value: "ky-hop-dong",  label: "Ký hợp đồng / biên bản",    icon: "pen-line" },
  { value: "khai-may",     label: "Khai máy / bắt đầu quay",   icon: "clapperboard" },
  { value: "ra-mat",       label: "Ra mắt / premiere",         icon: "star" },
  { value: "khai-truong",  label: "Khai trương / khởi nghiệp", icon: "store" },
];

export interface GoodDayResult extends DayQuality {
  topHoangGio: GioInfo[];
  hasCalendarConflict?: boolean;
  trucMatchesWorkType?: boolean;
}

export interface GoodDayPickerState {
  startDate: Date;
  endDate: Date;
  workType: WorkType;
  results: GoodDayResult[];
  totalGoodDays: number;
  isClamped: boolean;
}

const WORK_TYPE_KEYWORDS: Record<WorkType, string[]> = {
  "ky-hop-dong": ["ky ket", "hop dong", "giao dich"],
  "khai-may": ["khoi cong", "khai truong", "xay dung"], // truc suitableFor has standard words
  "ra-mat": ["ra mat", "nhap hoc", "dinh hon"], 
  "khai-truong": ["khai truong", "giao dich", "mo hang", "nhap tai"],
};

export function filterGoodDays(days: DayQuality[], workType: WorkType): GoodDayResult[] {
  const keywords = WORK_TYPE_KEYWORDS[workType] || [];

  return days
    .filter(d => d.isHoangDao)
    .map(d => {
      const trucMatchesWorkType = d.truc.suitableFor.some(s => 
        keywords.some(kw => s.toLowerCase().includes(kw))
      );

      const topHoangGio = d.gioHoangDao.filter(g => g.isHoang).slice(0, 3);

      return {
        ...d,
        topHoangGio,
        trucMatchesWorkType
      };
    });
}

export function computeGoodDays(startDate: Date, endDate: Date, workType: WorkType): GoodDayPickerState {
  let isClamped = false;
  let end = new Date(endDate.getTime());
  
  const diffTime = Math.abs(end.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 90) {
    isClamped = true;
    end = new Date(startDate.getTime());
    end.setDate(end.getDate() + 90);
  }

  // Iterate over months
  const allDays: DayQuality[] = [];
  const startY = startDate.getFullYear();
  const startM = startDate.getMonth() + 1;
  const endY = end.getFullYear();
  const endM = end.getMonth() + 1;

  let y = startY;
  let m = startM;

  while (y < endY || (y === endY && m <= endM)) {
    const monthDays = getMonthDayQualities(y, m);
    allDays.push(...monthDays);

    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  // Filter within date range
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const daysInRange = allDays.filter(d => d.date >= startStr && d.date <= endStr);
  const results = filterGoodDays(daysInRange, workType);
  results.sort((a, b) => a.date.localeCompare(b.date));

  return {
    startDate,
    endDate: end,
    workType,
    results,
    totalGoodDays: results.length,
    isClamped
  };
}
