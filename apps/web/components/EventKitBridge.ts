import { Capacitor, Plugins } from "@capacitor/core";

// Dynamically use Calendar if it exists, otherwise any
const Calendar = (Plugins as any).Calendar;

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
}

let googleAccessToken: string | null = null;

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.body.appendChild(script);
  });
}

export async function requestCalendarPermission(): Promise<"granted" | "denied" | "unavailable"> {
  if (Capacitor.isNativePlatform() && Calendar) {
    try {
      const status = await Calendar.requestCalendarPermissions();
      return status.events === "granted" ? "granted" : "denied";
    } catch (e) {
      console.error("Error requesting calendar permissions", e);
      return "unavailable";
    }
  }
  
  // Web Fallback: Request Google Calendar OAuth Token
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local. Please configure Google OAuth.");
      return "unavailable";
    }

    await loadGoogleScript();

    return new Promise((resolve) => {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        callback: (response: any) => {
          if (response.error !== undefined) {
            console.error("Google OAuth Error:", response);
            resolve("denied");
          } else {
            googleAccessToken = response.access_token;
            resolve("granted");
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  } catch (e) {
    console.error("Error with Google OAuth on Web", e);
    return "unavailable";
  }
}

export async function getCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  if (Capacitor.isNativePlatform() && Calendar) {
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
      console.error("Error fetching native calendar events", e);
      return [];
    }
  }

  // Web Fallback: Fetch from Google Calendar API
  if (!googleAccessToken) {
    console.error("Google access token missing. Please request permissions first.");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.append("timeMin", startDate.toISOString());
    url.searchParams.append("timeMax", endDate.toISOString());
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => {
      // Google calendar returns dateTime (for specific times) or date (for all-day events)
      const start = item.start.dateTime || item.start.date;
      const end = item.end.dateTime || item.end.date;
      return {
        title: item.summary,
        startDate: new Date(start),
        endDate: new Date(end)
      };
    });
  } catch (e) {
    console.error("Error fetching Google Calendar events", e);
    return [];
  }
}
