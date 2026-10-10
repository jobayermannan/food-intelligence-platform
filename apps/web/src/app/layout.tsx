import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import "./globals.css";
export const metadata: Metadata = {title: {default:"Food Intelligence Platform",template:"%s · Food Intelligence"},description:"Connect your inventory, sales and waste. Make better food-business decisions.",robots:{index:false,follow:false}};
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="en"><body><SessionProvider>{children}</SessionProvider></body></html>; }
