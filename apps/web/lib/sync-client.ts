import { RemindersUpsertRow } from "./conflict-resolver";
import { consentStore } from "./consent-store";

export interface SyncClientOptions {
  userJwt: string;
  deviceId: string;
  apiUrl?: string;
  onConflict?: (reminderId: string) => void;
}

export interface SyncPullResponse {
  reminders: RemindersUpsertRow[];
  serverTime: string;
  conflictsLogged: number;
}

export class SyncClient {
  private userJwt: string;
  private deviceId: string;
  private apiUrl: string;
  private onConflict?: (reminderId: string) => void;
  private pushTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingPush: RemindersUpsertRow[] = [];

  constructor(options: SyncClientOptions) {
    this.userJwt = options.userJwt;
    this.deviceId = options.deviceId;
    this.apiUrl = options.apiUrl || "http://localhost:4000";
    this.onConflict = options.onConflict;
  }

  private hasCloudConsent(): boolean {
    return consentStore.getFlags().cloudSync;
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        
        // Don't retry client errors
        if (res.status >= 400 && res.status < 500) {
          const errorData = await res.json().catch(() => ({}));
          const err: any = new Error(errorData.error || `Lỗi ${res.status}`);
          if (res.status === 403 && errorData.error === "Feature not allowed for this tier") {
            err.code = "FEATURE_NOT_ALLOWED";
          } else if (res.status === 422 && errorData.error === "Max family members reached") {
            err.code = "MAX_FAMILY_MEMBERS";
          } else if (res.status === 403 && errorData.error === "feature_not_allowed") {
            err.code = "FEATURE_NOT_ALLOWED";
          }
          throw err;
        }
      } catch (err: any) {
        // If it's our thrown custom error, bubble it up immediately without retry
        if (err.code) throw err;
        
        if (i === retries - 1) throw err;
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 30000);
    }
    throw new Error("Fetch failed after retries");
  }

  async push(reminders: RemindersUpsertRow[]): Promise<void> {
    if (!this.hasCloudConsent()) return;

    // Update pending push queue
    const pendingIds = new Set(this.pendingPush.map(r => r.id));
    for (const r of reminders) {
      if (!pendingIds.has(r.id)) {
        this.pendingPush.push(r);
        pendingIds.add(r.id);
      } else {
        const idx = this.pendingPush.findIndex(p => p.id === r.id);
        if (new Date(r.updatedAt).getTime() > new Date(this.pendingPush[idx].updatedAt).getTime()) {
          this.pendingPush[idx] = r;
        }
      }
    }

    if (this.pushTimeout) clearTimeout(this.pushTimeout);
    
    return new Promise((resolve, reject) => {
      this.pushTimeout = setTimeout(async () => {
        try {
          const toPush = [...this.pendingPush];
          this.pendingPush = [];
          
          await this.fetchWithRetry(`${this.apiUrl}/api/sync/push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.userJwt}`
            },
            body: JSON.stringify({ reminders: toPush, deviceId: this.deviceId })
          });
          
          // Assuming clear occurrence cache happens elsewhere or via event
          // emit("sync_success")
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 2000); // 2000ms debounce
    });
  }

  async pull(): Promise<SyncPullResponse | null> {
    if (!this.hasCloudConsent()) return null;

    const res = await this.fetchWithRetry(`${this.apiUrl}/api/sync/pull`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.userJwt}`
      }
    });

    return (await res.json()) as SyncPullResponse;
  }

  async share(reminderId: string, action: "add" | "remove", targetUserId: string): Promise<void> {
    if (!this.hasCloudConsent()) return;

    await this.fetchWithRetry(`${this.apiUrl}/api/sync/share`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.userJwt}`
      },
      body: JSON.stringify({ reminderId, action, targetUserId })
    });
  }

  async createInvite(reminderId: string): Promise<{ token: string; expiresAt: string } | null> {
    if (!this.hasCloudConsent()) return null;

    const res = await this.fetchWithRetry(`${this.apiUrl}/api/sync/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.userJwt}`
      },
      body: JSON.stringify({ reminderId })
    });

    return await res.json();
  }

  async deleteCloudData(): Promise<void> {
    if (!this.hasCloudConsent()) return;

    await this.fetchWithRetry(`${this.apiUrl}/api/sync/account`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${this.userJwt}`
      }
    });
  }
}
