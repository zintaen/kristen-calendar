export interface RemindersUpsertRow {
  id: string;
  userId: string;
  type: "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
  title: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number | null;
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE";
  leadTimes: number[];
  notifyTime: string;
  channels: ("LOCAL" | "ZNS" | "PUSH")[];
  linkedContentId: string | null;
  sharedWith: string[];
  enabled: boolean;
  updatedAt: string;
}

export interface ConflictRecord {
  reminderId: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  resolvedTo: "local" | "cloud";
  deltaMs: number;
}

export function resolveConflict(
  local: RemindersUpsertRow,
  cloud: RemindersUpsertRow
): { winner: RemindersUpsertRow; conflict: ConflictRecord | null } {
  const localTime = new Date(local.updatedAt).getTime();
  const cloudTime = new Date(cloud.updatedAt).getTime();
  
  const isCloudNewer = cloudTime > localTime;
  const winner = isCloudNewer ? cloud : local;
  const resolvedTo = isCloudNewer ? "cloud" : "local";
  const deltaMs = Math.abs(cloudTime - localTime);

  // Consider it a conflict if cloud overwrote local, OR if they changed very closely (delta < 1000ms)
  const isConflict = isCloudNewer || deltaMs < 1000;

  if (localTime === cloudTime) {
    return { winner: local, conflict: null };
  }

  return {
    winner,
    conflict: isConflict ? {
      reminderId: local.id,
      localUpdatedAt: local.updatedAt,
      cloudUpdatedAt: cloud.updatedAt,
      resolvedTo,
      deltaMs
    } : null
  };
}
