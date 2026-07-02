import { Capacitor, Plugins } from "@capacitor/core";

// Dynamically use Calendar if it exists, otherwise any
const Calendar = (Plugins as any).Calendar;

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
}

export async function requestCalendarPermission(): Promise<"granted" | "denied" | "unavailable"> {
  if (!Capacitor.isNativePlatform() || !Calendar) {
    // Fallback cho Web: Luôn cho phép (Mock)
    return "granted";
  }
  
  try {
    const status = await Calendar.requestCalendarPermissions();
    return status.events === "granted" ? "granted" : "denied";
  } catch (e) {
    console.error("Error requesting calendar permissions", e);
    return "unavailable";
  }
}

export async function getCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  if (!Capacitor.isNativePlatform() || !Calendar) {
    // Fallback cho Web: Trả về một vài sự kiện giả lập để test tính năng tránh ngày bận
    console.log("Mocking calendar events for web...");
    return [
      {
        title: "Mock: Họp công ty",
        startDate: new Date(startDate.getTime() + 1000 * 60 * 60 * 10), // +10h
        endDate: new Date(startDate.getTime() + 1000 * 60 * 60 * 12),   // +12h
      },
      {
        title: "Mock: Gặp khách hàng",
        startDate: new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 2), // +2 days
        endDate: new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2),
      }
    ];
  }

  try {
    const result = await Calendar.findEvent({
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });
    
    return (result.events || []).map((e: any) => ({
      title: e.title,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate)
    }));
  } catch (e) {
    console.error("Error fetching calendar events", e);
    return [];
  }
}
