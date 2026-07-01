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
    return "unavailable";
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
    return [];
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
