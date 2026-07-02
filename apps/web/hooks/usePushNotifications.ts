import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase-client';

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const registerPush = async () => {
      // Only available on Native Android/iOS
      if (!Capacitor.isNativePlatform()) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      // Request permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

      // On success, we receive a token
      PushNotifications.addListener('registration', async (registration) => {
        if (!mounted) return;
        setToken(registration.value);
        
        // Save token to Supabase
        await supabase.from('user_push_tokens').upsert({
          user_id: userId,
          token: registration.value,
          platform: Capacitor.getPlatform(),
        }, { onConflict: 'user_id, token' });
      });

      // Handle errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ', JSON.stringify(error));
      });
      
      // Listen for notifications received while app is open
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
      });

      // Listen for notification clicks
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
      });
    };

    registerPush();

    return () => {
      mounted = false;
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  return { token };
}
