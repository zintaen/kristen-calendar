import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "world.cyberskill.genieamlich",
  appName: "Genie Am Lich",
  webDir: "out",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#3D1266",
      sound: "default",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    // @codetrix-studio/capacitor-google-auth declares GoogleAuth as a REQUIRED key in
    // PluginsConfig, so it must be present or the build fails to type-check. serverClientId is
    // the Google OAuth Web client id (public, not a secret); set NEXT_PUBLIC_GOOGLE_SERVER_CLIENT_ID
    // before `npx cap sync` for native Google sign-in to work. The empty fallback keeps the web
    // build green when the id is not set (native login just will not function until it is).
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: process.env.NEXT_PUBLIC_GOOGLE_SERVER_CLIENT_ID ?? "",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
