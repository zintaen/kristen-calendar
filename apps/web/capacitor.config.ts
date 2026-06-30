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
  },
};

export default config;
