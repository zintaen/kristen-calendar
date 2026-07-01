export type ReminderType = "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
export type ReminderChannel = "ZNS";

export interface ZaloReminder {
  id: string;
  type: ReminderType;
  title: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear?: number;       // undefined = lặp lại hàng năm/hàng tháng tùy recurrence
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE";
  leadTimes: number[];      // số ngày trước: [0] = đúng ngày, [1] = trước 1 ngày, v.v.
  notifyTime: string;       // "HH:MM" theo Asia/Ho_Chi_Minh
  channels: ReminderChannel[];
  linkedContentId?: string;
  enabled: boolean;
}

export interface ZaloSettings {
  znsEnabled: boolean;
  displayName?: string;     // lấy từ getUserInfo, lưu local
  phone?: string;           // token từ getPhoneNumber - server đổi lấy số thực
  consentFlags: {
    userInfoGranted: boolean;
    phoneGranted: boolean;
  };
}

export interface StorageData {
  settings: ZaloSettings;
  reminders: ZaloReminder[];
}

export interface UpcomingOccurrence {
  reminderId: string;
  reminderTitle: string;
  solarDate: string;        // "YYYY-MM-DD"
  lunarLabel: string;       // ví dụ "15/7 Ất Tỵ (nhuận)"
  daysUntil: number;
}

export const DEFAULT_SETTINGS: ZaloSettings = {
  znsEnabled: false,
  consentFlags: {
    userInfoGranted: false,
    phoneGranted: false,
  },
};

export const DEFAULT_STORAGE: StorageData = {
  settings: DEFAULT_SETTINGS,
  reminders: [],
};
