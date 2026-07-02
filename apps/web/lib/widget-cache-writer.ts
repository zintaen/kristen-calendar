import { App } from "@capacitor/app";
import { getDayQuality, convertSolar2Lunar, todayInHCM } from "@cyberskill/amlich-core";

const APP_GROUP_KEY = "dayInfoCache";
// Canonical App Group container - MUST match DayInfoCache.appGroupSuite and the Siri intents
// (GenieIntents.swift) and the target .entitlements, or the native readers see empty storage.
const APP_GROUP_SUITE = "group.world.cyberskill.genie";

export async function writeWidgetCache(now: Date = new Date()): Promise<void> {
  // DEC-LUNAR-043: derive "today" at Asia/Ho_Chi_Minh, NEVER the device-local calendar day.
  // A device set to a non-VN timezone would otherwise cache the wrong day between VN 00:00-07:00.
  const [d, m, y] = todayInHCM(now);
  // getDayQuality reads UTC getters, so hand it a Date whose UTC calendar day IS the VN day
  // (noon UTC keeps it clear of any drift to an adjacent day).
  const vnDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dq = getDayQuality(vnDate);
  const lunarDate = convertSolar2Lunar(d, m, y);

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
