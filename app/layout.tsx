import type { Metadata, Viewport } from "next";
import { Fraunces, Zen_Maru_Gothic } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});

// Japanese glyphs are served in unicode-range chunks, so don't preload the whole family.
const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-zen-maru",
});

export const metadata: Metadata = {
  title: "Bandit Island — 宝箱で学ぶマルチアームド・バンディット",
  description:
    "5つの宝箱とロボットで、探索（Exploration）と活用（Exploitation）のトレードオフを体験できるインタラクティブな3Dシミュレーション。",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ebdd" },
    { media: "(prefers-color-scheme: dark)", color: "#161a29" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${fraunces.variable} ${zenMaru.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
