"use client";

import { usePushNotifications } from "../hooks/usePushNotifications";

export function PushNotificationsInit() {
  // Call the hook to request permissions and save tokens
  usePushNotifications();
  return null;
}
