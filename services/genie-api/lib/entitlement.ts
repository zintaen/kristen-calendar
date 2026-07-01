import { getServiceSupabaseClient } from "./supabase";

export type Tier = "free" | "premium" | "family";

export interface EntitlementRecord {
  userId: string;
  tier: Tier;
  validUntil: string | null;    // null = vinh vien
  source: "app_store" | "zalo_pay" | "manual" | "trial";
  trialUsed: boolean;
  updatedAt: string;
}

export interface FeatureGate {
  genieAI: boolean;
  genieMonthlyQuota: number;
  goodDayPicker: boolean;
  familySharing: boolean;
  maxFamilyMembers: number;
  znsReminder: boolean;
  shareableCards: boolean;
}

export const TIER_FEATURES: Record<Tier, FeatureGate> = {
  free: {
    genieAI: false, genieMonthlyQuota: 0,
    goodDayPicker: false, familySharing: false, maxFamilyMembers: 0,
    znsReminder: false, shareableCards: false,
  },
  premium: {
    genieAI: true, genieMonthlyQuota: 50,
    goodDayPicker: true, familySharing: false, maxFamilyMembers: 0,
    znsReminder: true, shareableCards: true,
  },
  family: {
    genieAI: true, genieMonthlyQuota: 100,
    goodDayPicker: true, familySharing: true, maxFamilyMembers: 10,
    znsReminder: true, shareableCards: true,
  },
};

export async function getEntitlement(userId: string, dbClient?: any): Promise<EntitlementRecord> {
  const serviceClient = dbClient || getServiceSupabaseClient();
  const { data: row } = await serviceClient
    .from("user_entitlements")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (row) {
    let currentTier = row.tier as Tier;
    const validUntil = row.valid_until;
    
    // Graceful downgrade 
    if (validUntil && new Date(validUntil).getTime() < Date.now()) {
      currentTier = "free";
    }

    return {
      userId: row.user_id,
      tier: currentTier,
      validUntil: validUntil,
      source: row.source,
      trialUsed: row.trial_used,
      updatedAt: row.updated_at
    };
  }

  // Khong co record => Free
  return {
    userId,
    tier: "free",
    validUntil: null,
    source: "manual",
    trialUsed: false,
    updatedAt: new Date().toISOString()
  };
}

export function isFeatureAllowed(tier: Tier, feature: keyof FeatureGate): boolean {
  return Boolean(TIER_FEATURES[tier][feature]);
}
