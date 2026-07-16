/**
 * Zalo auth helpers (TASK-LUNAR-016).
 *
 * getUserInfo and getPhoneNumber MUST only be called after explicit consent
 * via ConsentSheet (DEC-LUNAR-163). getPhoneNumber returns a TOKEN, not a
 * real phone number — the server exchanges it via OA API.
 */

export interface ZaloUserInfo {
  id: string;
  name: string;
  avatar: string;
}

/** Fetch Zalo user info. Call ONLY after consent (DEC-LUNAR-163). */
export async function fetchUserInfo(): Promise<ZaloUserInfo> {
  const { getUserInfo } = await import("zmp-sdk/apis");
  const result = await getUserInfo({ avatarType: "large" });
  return {
    id: result.userInfo.id,
    name: result.userInfo.name,
    avatar: result.userInfo.avatar,
  };
}

/**
 * Fetch phone number TOKEN from Zalo.
 * This is NOT the real phone number — the server must exchange
 * this token via OA API to get the actual number.
 * Call ONLY when znsEnabled=true AND phoneGranted=false AND user consented.
 */
export async function fetchPhoneNumber(): Promise<string> {
  const { getPhoneNumber } = await import("zmp-sdk/apis");
  const result = await getPhoneNumber({});
  return result.token || "";
}
