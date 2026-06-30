export interface ScheduleOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra: { reminderId: string };
}

export interface NotificationService {
  requestPermission(): Promise<boolean>;
  scheduleNotification(opts: ScheduleOptions): Promise<void>;
  scheduleMany(opts: ScheduleOptions[]): Promise<void>;
  cancelAllPending(): Promise<void>;
}

export class WebNotificationStub implements NotificationService {
  async requestPermission() { return false; }
  async scheduleNotification(_: ScheduleOptions) { /* no-op */ }
  async scheduleMany(_: ScheduleOptions[]) { /* no-op */ }
  async cancelAllPending() { /* no-op */ }
}

export class CapacitorNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  async scheduleNotification(opts: ScheduleOptions): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        schedule: { at: opts.scheduleAt },
        extra: opts.extra,
      }]
    });
  }
  async scheduleMany(opts: ScheduleOptions[]): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: opts.map(opt => ({
        id: opt.id,
        title: opt.title,
        body: opt.body,
        schedule: { at: opt.scheduleAt },
        extra: opt.extra,
      }))
    });
  }
  async cancelAllPending(): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  }
}

export function createNotificationService(): NotificationService {
  const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
  if (isCapacitor) {
    return new CapacitorNotificationService();
  }
  return new WebNotificationStub();
}
