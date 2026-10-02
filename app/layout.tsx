import type { Metadata, Viewport } from "next";
import { Lilita_One, M_PLUS_Rounded_1c, Mochiy_Pop_P_One } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/** Chunky game-logo face for the title and numbers. */
const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--nf-logo" });

// Japanese faces are served in unicode-range chunks, so don't preload the whole family.
/** Cute pop face for headings and buttons. */
const mochiy = Mochiy_Pop_P_One({ weight: "400", subsets: ["latin"], preload: false, variable: "--nf-pop" });
/** Rounded face for body text. */
const mplus = M_PLUS_Rounded_1c({ weight: ["500", "700", "800"], subsets: ["latin"], preload: false, variable: "--nf-body" });

export const metadata: Metadata = {
  title: "Bandit Island — 宝箱で学ぶマルチアームド・バンディット",
  description:
    "5つの宝箱とロボットで、探索（Exploration）と活用（Exploitation）のトレードオフを体験できるインタラクティブな3Dシミュレーション。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#86c3ff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d4f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${lilita.variable} ${mochiy.variable} ${mplus.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
