import { registerPlugin } from '@capacitor/core';

export interface LiveActivityPlugin {
  /**
   * Starts a Live Activity countdown on iOS 16.1+
   */
  startCountdown(options: {
    eventId: string;
    eventName: string;
    targetTimestamp: number; // milliseconds since epoch
  }): Promise<{ activityId: string }>;

  /**
   * Ends an active Live Activity
   */
  endCountdown(options: { activityId: string }): Promise<void>;
}

export const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity');
