import type { CapacitorConfig } from "@capacitor/cli";

// MAINXP native shell. Remote mode: the shell loads the live web app, so every
// web deploy updates the mobile app instantly — no store re-submission for UI
// changes. Native capabilities (haptics, notifications, push) are provided by
// the plugins bundled here and reached from the web app via the bridge in
// src/app/components/NativeBridge.tsx (feature-detected, no-op in browsers).
const config: CapacitorConfig = {
  appId: "app.mainxp.mobile",
  appName: "MAINXP",
  webDir: "www", // stub — remote server.url below is what actually loads
  server: {
    url: "https://mainxp.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#faf9f7",
  },
  android: {
    backgroundColor: "#faf9f7",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_bolt",
      iconColor: "#7c3aed",
    },
  },
};

export default config;
