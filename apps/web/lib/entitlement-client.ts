import { Preferences } from '@capacitor/preferences';
import { config } from "./config";

export type Tier = "free" | "premium" | "family";

export interface FeatureGate {
  genieAI: boolean;
  genieMonthlyQuota: number;
  goodDayPicker: boolean;
  familySharing: boolean;
  maxFamilyMembers: number;
  znsReminder: boolean;
  shareableCards: boolean;
}

export interface EntitlementResponse {
  tier: Tier;
  features: FeatureGate;
  genieUsedThisMonth: number;
  validUntil: string | null;
  trialAvailable: boolean;
  gracePeriodEndsAt: string | null;
}

const FREE_FEATURES: FeatureGate = {
  genieAI: false, genieMonthlyQuota: 0,
  goodDayPicker: false, familySharing: false, maxFamilyMembers: 0,
  znsReminder: false, shareableCards: false,
};

export class EntitlementClient {
  private cache: { data: EntitlementResponse; fetchedAt: number } | null = null;
  private readonly TTL_MS = 60 * 60 * 1000; // Giảm xuống 1h thay vì 24h để cập nhật nhanh hơn

  async get(): Promise<EntitlementResponse> {
    const now = Date.now();
    if (this.cache && (now - this.cache.fetchedAt) < this.TTL_MS) {
      return this.cache.data;
    }

    try {
      const { value } = await Preferences.get({ key: 'token' });
      const token = value || "";
      const res = await fetch(config.getApiUrl("/api/entitlement"), {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch entitlement");
      }

      const data = await res.json() as EntitlementResponse;
      this.cache = { data, fetchedAt: now };
      return data;
    } catch (err) {
      if (this.cache) {
        return this.cache.data;
      }
      
      return {
        tier: "free",
        features: FREE_FEATURES,
        genieUsedThisMonth: 0,
        validUntil: null,
        trialAvailable: true,
        gracePeriodEndsAt: null
      };
    }
  }

  invalidateCache(): void {
    this.cache = null;
  }

  async canUseFeature(feature: keyof FeatureGate): Promise<boolean> {
    const entitlement = await this.get();
    return Boolean(entitlement.features[feature]);
  }
}

// Export singleton
export const entitlementClient = new EntitlementClient();
