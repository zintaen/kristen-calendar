import { ConsentFlags, DEFAULT_CONSENT_FLAGS, ConsentType, CONSENT_POLICY_VERSION } from "../../../services/genie-api/lib/consent";
export type { ConsentFlags, ConsentType };

const STORAGE_KEY = "genie_amlich_consent";

export class ConsentStore {
  // Doc consentFlags tu localStorage
  getFlags(): ConsentFlags {
    if (typeof localStorage === "undefined") return { ...DEFAULT_CONSENT_FLAGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONSENT_FLAGS };
    try {
      return JSON.parse(raw) as ConsentFlags;
    } catch {
      return { ...DEFAULT_CONSENT_FLAGS };
    }
  }

  // Cap nhat mot co va luu localStorage
  async setFlag(type: ConsentType, value: boolean): Promise<void> {
    const flags = this.getFlags();
    flags[type] = value;
    
    // Nếu có sự thay đổi từ false -> true, cập nhật policyVersion và timestamp
    // (Trong thực tế người ta thường gọi API grantConsent để đồng bộ)
    if (value) {
      flags.policyVersion = CONSENT_POLICY_VERSION;
      flags.consentedAt = new Date().toISOString();
    }
    
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    }
  }

  // Dong bo len cloud (chi khi cloudSync da duoc cap truoc do)
  async syncToCloud(flags: ConsentFlags, jwt: string, apiUrl: string = "http://localhost:4000"): Promise<void> {
    // Only sync if cloudSync is allowed
    if (!flags.cloudSync) return;

    for (const type of ["cloudSync", "genieAI", "znsReminder", "analyticsUsage"] as ConsentType[]) {
      await fetch(`${apiUrl}/api/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({
          type,
          grant: flags[type],
          policyVersion: flags.policyVersion || CONSENT_POLICY_VERSION
        })
      });
    }
  }

  // Xoa toan bo consent local (khi xoa tai khoan)
  clear(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const consentStore = new ConsentStore();
