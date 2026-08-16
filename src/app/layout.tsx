import type { Metadata } from "next";
import { Geist, Unbounded } from "next/font/google";
import "./globals.css";
import { NativeBridge } from "./components/NativeBridge";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Display face: Unbounded — geometric, expanded, unmistakably game-premium.
// Used for identity moments only (wordmark, headings, big numerals); Geist
// carries all reading text.
const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MAINXP", template: "%s · MAINXP" },
  description: "Your life is the Main Quest.",
  // Personal product, pre-launch — keep it out of search engines for now.
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS: launch from the home-screen icon as a standalone app.
  appleWebApp: { capable: true, title: "MAINXP", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-mxp-bg text-mxp-ink">
        <NativeBridge />
        <div className="mxp-shell mx-auto min-h-screen w-full max-w-md border-x border-mxp-line">
          {children}
        </div>
      </body>
    </html>
  );
}
