import type { RemindersUpsertRow } from "../api/sync";

// Loai bo truong nhay cam truoc khi gui den AI hoac ghi log
export function stripSensitiveFields(
  reminder: RemindersUpsertRow
): Omit<RemindersUpsertRow, "title"> & { titleRedacted: true } {
  const { title: _removed, ...rest } = reminder;
  return { ...rest, titleRedacted: true as const };
}

export interface CrossBorderCheckResult {
  allowed: boolean;
  reason: string;
  dpiaPending: boolean;
}

export function checkCrossBorderTransfer(
  dataType: "gio_reminder" | "user_profile" | "analytics_aggregate" | string,
  destination: "sg-ap-southeast-1" | "us-east-1" | "eu-west-1" | string
): CrossBorderCheckResult {
  const sensitiveTypes = ["gio_reminder", "user_profile"];
  const vnDomestic = ["vn-hanoi-1"]; // placeholder cho Supabase VN khi co
  
  if (sensitiveTypes.includes(dataType) && !vnDomestic.includes(destination)) {
    return { allowed: false, reason: "DPIA chua co cho du lieu nhay cam", dpiaPending: true };
  }
  return { allowed: true, reason: "ok", dpiaPending: false };
}
