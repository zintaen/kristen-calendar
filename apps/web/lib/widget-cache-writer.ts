import { App } from "@capacitor/app";
import { getDayQuality, convertSolar2Lunar } from "@cyberskill/amlich-core";

const APP_GROUP_KEY = "dayInfoCache";

export async function writeWidgetCache(date: Date = new Date()): Promise<void> {
  // Compute Day Quality from amlich-core
  const dq = getDayQuality(date);
  const lunarDate = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
  
  // Create cache payload matching DayInfoCache Swift struct
  const cache = {
    dateISO:       dq.date,
    lunarDayMonth: `${lunarDate[0]} tháng ${lunarDate[1]}`,
    canChiNgay:    dq.canChiNgay,
    isHoangDao:    dq.isHoangDao,
    label:         dq.label,
    trucName:      dq.truc.name,
    sao28Name:     dq.sao28.name,
    gioHoangDao:   dq.gioHoangDao,
    cachedAt:      new Date().toISOString(), // Swift parses this via ISO8601DateFormatter
    ttlHours:      24,
  };
  
  // Write to App Group via Capacitor native bridge plugin
  try {
    const Capacitor = (window as any).Capacitor;
    if (Capacitor?.Plugins?.AppGroupStorage) {
        await Capacitor.Plugins.AppGroupStorage.write({
            suite: "group.world.cyberskill.genie",
            key:   APP_GROUP_KEY,
            value: JSON.stringify(cache),
        });
    } else {
        // Fallback or log if plugin isn't registered (e.g. on web)
        console.warn("AppGroupStorage plugin not available. Skipping widget cache write.");
    }
  } catch (error) {
    console.error("Failed to write widget cache:", error);
  }
}

export function registerWidgetCacheWriter(): void {
  // Ensure we write to cache whenever app becomes active
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
        writeWidgetCache().catch(console.error);
    }
  });
}
