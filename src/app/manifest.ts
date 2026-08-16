import type { MetadataRoute } from "next";

// Web App Manifest: makes "Add to Home Screen" install MAINXP as a standalone
// app (own icon, full-screen, no browser chrome) on Android and iOS.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MAINXP",
    short_name: "MAINXP",
    description: "Ta vie est la quête principale.",
    start_url: "/today",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#7c3aed",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
