import type { Metadata, Viewport } from "next";
import { Poppins, Rubik_Dirt, Russo_One } from "next/font/google";
import "./globals.css";
import { FORM_META } from "@/lib/form-content";
import OutboxSync from "@/components/OutboxSync";

// Poppins carries over from the 2W form; Rubik Dirt matches the posters' distressed lettering.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });
const dirt = Rubik_Dirt({ subsets: ["latin"], weight: "400", variable: "--font-dirt", display: "swap" });
// Solid display face for titles that must read at a glance.
const russo = Russo_One({ subsets: ["latin"], weight: "400", variable: "--font-russo", display: "swap" });

export const metadata: Metadata = {
  title: { default: FORM_META.title, template: `%s · ${FORM_META.shortTitle}` },
  description: FORM_META.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a0c0f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${dirt.variable} ${russo.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <OutboxSync />
      </body>
    </html>
  );
}
