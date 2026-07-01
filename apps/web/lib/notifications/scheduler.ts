import type { Reminder } from "@cyberskill/amlich-core";
import { planSchedule, type SchedulePlan } from "./planner";
import { createNotificationService, type NotificationService } from "../notificationGlue";

export interface RescheduleResult { 
  permission: string; 
  plan: SchedulePlan; 
}

export async function reschedule(
  adapter: NotificationService,
  reminders: Reminder[],
  nowUtcMs: number,
  engineVersion: string,
): Promise<RescheduleResult> {
  const hasPermission = await adapter.requestPermission();
  const plan = planSchedule(reminders, nowUtcMs, { engineVersion });

  if (!hasPermission) {
    return { permission: "denied", plan };
  }

  await adapter.cancelAllPending();
  
  if (plan.notifications.length > 0) {
    await adapter.scheduleMany(
      plan.notifications.map(n => ({
        id: parseInt(n.id.substring(0, 9), 10) || 0, // Ensure numeric ID within 32-bit limits
        title: n.title,
        body: n.body,
        scheduleAt: new Date(n.fireAtLocal),
        extra: n.userInfo
      }))
    );
  }

  return { permission: "granted", plan };
}

export async function getPlanDiagnostics(
  reminders: Reminder[], 
  nowUtcMs: number, 
  engineVersion: string
): Promise<SchedulePlan["diagnostics"]> {
  const plan = planSchedule(reminders, nowUtcMs, { engineVersion });
  return plan.diagnostics;
}
