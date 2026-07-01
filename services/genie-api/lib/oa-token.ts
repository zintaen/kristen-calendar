export interface OATokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

// Global in-memory cache for the token pair (since it might be updated by cron)
// In a real multi-instance backend, this must go to Redis/Supabase.
let cachedTokenPair: OATokenPair | null = null;

export async function getOATokenPair(): Promise<OATokenPair> {
  if (cachedTokenPair) return cachedTokenPair;
  return {
    accessToken: process.env.OA_ACCESS_TOKEN || "",
    refreshToken: process.env.OA_REFRESH_TOKEN || "",
    expiresAt: process.env.OA_EXPIRES_AT ? parseInt(process.env.OA_EXPIRES_AT, 10) : 0,
  };
}

export async function refreshOAToken(pair: OATokenPair): Promise<OATokenPair> {
  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_APP_SECRET;
  
  if (!appId || !secret) {
    // If not configured, just mock refresh for tests/dev
    return {
      accessToken: "mock_new_access_token",
      refreshToken: "mock_new_refresh_token",
      expiresAt: Date.now() + 3600 * 1000,
    };
  }

  // Official Zalo OA Refresh Token API
  const response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "secret_key": secret
    },
    body: new URLSearchParams({
      refresh_token: pair.refreshToken,
      app_id: appId,
      grant_type: "refresh_token"
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Zalo OA token refresh failed: ${data.error_name} - ${data.error_description}`);
  }

  const newPair: OATokenPair = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + parseInt(data.expires_in, 10) * 1000,
  };
  
  // Update cache (and should update DB in prod)
  cachedTokenPair = newPair;
  return newPair;
}

export async function ensureFreshToken(): Promise<string> {
  let pair = await getOATokenPair();
  
  // If expires within 10 minutes (600,000 ms), refresh it
  if (pair.expiresAt - Date.now() < 600000) {
    pair = await refreshOAToken(pair);
  }
  
  return pair.accessToken;
}
