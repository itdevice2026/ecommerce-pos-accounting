import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Fonts are bundled with the app (no Google Fonts request), so POS terminals
// render correctly on slow or offline connections.

export const metadata: Metadata = {
  title: { default: "POS & Accounting", template: "%s · POS & Accounting" },
  description: "Online store, point of sale, inventory and basic accounting in one system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
