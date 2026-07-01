export const CONSENT_POLICY_VERSION = "1.0.0";

export interface ConsentFlags {
  cloudSync: boolean;       // FR-018 Supabase sync
  genieAI: boolean;         // FR-015 Claude proxy
  znsReminder: boolean;     // FR-017 ZNS
  analyticsUsage: boolean;  // thu thap du lieu su dung tong hop
  consentedAt: string | null;       // ISO 8601, null neu chua consent
  policyVersion: string | null;     // semver cua chinh sach tai thoi diem consent
}

export const DEFAULT_CONSENT_FLAGS: ConsentFlags = {
  cloudSync: false,
  genieAI: false,
  znsReminder: false,
  analyticsUsage: false,
  consentedAt: null,
  policyVersion: null,
};

export type ConsentType = keyof Omit<ConsentFlags, "consentedAt" | "policyVersion">;

// Cap consent cho mot loai xu ly cu the
export function grantConsent(
  flags: ConsentFlags,
  type: ConsentType,
  policyVersion: string
): ConsentFlags {
  return {
    ...flags,
    [type]: true,
    policyVersion,
    consentedAt: new Date().toISOString()
  };
}

// Thu hoi consent cho mot loai, khong anh huong loai khac
export function revokeConsent(
  flags: ConsentFlags,
  type: ConsentType
): ConsentFlags {
  return {
    ...flags,
    [type]: false
  };
}

// Kiem tra mot loai xu ly co duoc phep khong
export function hasConsent(flags: ConsentFlags, type: ConsentType): boolean {
  return flags[type] === true;
}

// Lay version chinh sach hien tai
export function getCurrentPolicyVersion(): string {
  return CONSENT_POLICY_VERSION;
}
