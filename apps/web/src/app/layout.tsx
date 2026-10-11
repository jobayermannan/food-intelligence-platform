import type { Metadata } from "next";
import Script from "next/script";
import { SessionProvider } from "@/components/session";
import { themeStorageKey } from "@/lib/theme";
import "./globals.css";
export const metadata: Metadata = {title: {default:"Food Intelligence Platform",template:"%s · Food Intelligence"},description:"Connect your inventory, sales and waste. Make better food-business decisions.",robots:{index:false,follow:false}};
const themeScript = `try { var saved = localStorage.getItem(${JSON.stringify(themeStorageKey)}); document.documentElement.dataset.theme = saved === "midnight" || saved === "graphite" || saved === "obsidian" ? saved : "obsidian"; } catch (_) { document.documentElement.dataset.theme = "obsidian"; }`;
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="en" suppressHydrationWarning><body><Script id="restore-theme" strategy="beforeInteractive">{themeScript}</Script><SessionProvider>{children}</SessionProvider></body></html>; }
