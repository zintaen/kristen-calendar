import type { Metadata } from "next";
import { BottomNav } from "../components/BottomNav";
import { GlobalGenie } from "../components/GlobalGenie";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genie Am Lich",
  description: "Tro ly am lich Viet Nam cua CyberSkill",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#3D1266",
};

import { WidgetCacheProvider } from "../components/WidgetCacheProvider";
import { ConsentGate } from "../components/ConsentGate";
import { RevenueCatInit } from "../components/RevenueCatInit";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 font-sans text-gray-900 antialiased overflow-x-hidden">
        {children}
        <GlobalGenie />
        <BottomNav />
        <WidgetCacheProvider />
        <ConsentGate />
        <RevenueCatInit />
      </body>
    </html>
  );
}
