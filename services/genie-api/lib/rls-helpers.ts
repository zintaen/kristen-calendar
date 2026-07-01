import type { SupabaseClient } from "@supabase/supabase-js";
import type { RemindersUpsertRow } from "../api/sync";

/**
 * rls-helpers.ts
 * Helper functions to execute safe Postgres queries ensuring RLS works.
 */

export async function fetchUserReminders(client: SupabaseClient) {
  const { data, error } = await client
    .from("reminders")
    .select("*");
  if (error) throw error;
  return data;
}

export async function upsertReminders(client: SupabaseClient, reminders: RemindersUpsertRow[]) {
  // Remap camelCase from client to snake_case for DB
  const mapped = reminders.map(r => ({
    id: r.id,
    user_id: r.userId,
    type: r.type,
    title: r.title,
    lunar_day: r.lunarDay,
    lunar_month: r.lunarMonth,
    lunar_year: r.lunarYear,
    is_leap_month: r.isLeapMonth,
    recurrence: r.recurrence,
    lead_times: r.leadTimes,
    notify_time: r.notifyTime,
    channels: r.channels,
    linked_content_id: r.linkedContentId,
    shared_with: r.sharedWith,
    enabled: r.enabled,
    updated_at: r.updatedAt
  }));

  const { data, error } = await client
    .from("reminders")
    .upsert(mapped, { onConflict: "id" })
    .select();

  if (error) throw error;
  return data;
}
