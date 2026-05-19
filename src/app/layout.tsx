import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Домашний диспетчер еды",
  description: "Семейный планировщик меню, остатков, запасов и покупок.",
  applicationName: "Домашний диспетчер еды",
  appleWebApp: { capable: true, title: "Диспетчер еды", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FAF7EF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
