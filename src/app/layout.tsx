import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Display face: Bricolage Grotesque — characterful, slightly game-y, still premium.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MAINXP", template: "%s · MAINXP" },
  description: "Your life is the Main Quest.",
  // Personal product, pre-launch — keep it out of search engines for now.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-mxp-bg text-mxp-ink">
        <div className="mxp-shell mx-auto min-h-screen w-full max-w-md border-x border-mxp-line">
          {children}
        </div>
      </body>
    </html>
  );
}
