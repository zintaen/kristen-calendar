import { Capacitor } from '@capacitor/core';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from './supabase-client';

export async function signInWithApple() {
  if (Capacitor.isNativePlatform()) {
    const { response } = await SignInWithApple.authorize({
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.your.app.id',
      redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || 'https://your-app.com/auth/callback',
      scopes: 'email name',
    });

    if (response && response.identityToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: response.identityToken,
      });
      if (error) throw error;
      return data;
    }
    throw new Error('No identity token returned');
  } else {
    // Web fallback
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
    return data;
  }
}

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // Note: requires initialization with clientId on Android/iOS via config or init()
    GoogleAuth.initialize();
    const user = await GoogleAuth.signIn();
    
    if (user.authentication.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: user.authentication.idToken,
      });
      if (error) throw error;
      return data;
    }
    throw new Error('No ID token returned');
  } else {
    // Web fallback
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
    return data;
  }
}
