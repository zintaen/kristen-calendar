export interface DeepLink { 
  route: "/reminder/:id"; 
  reminderId: string; 
  occurrenceDate: string; 
}

export function parseDeepLink(userInfo: Record<string, unknown>): DeepLink | null {
  if (typeof userInfo.reminderId === "string" && typeof userInfo.occurrenceDate === "string") {
    return {
      route: "/reminder/:id",
      reminderId: userInfo.reminderId,
      occurrenceDate: userInfo.occurrenceDate
    };
  }
  return null;
}
