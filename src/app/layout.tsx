import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import LiquidGlassBackgroundClient from "@/components/LiquidGlassBackgroundClient";

export const metadata: Metadata = {
  title: "Maven Arsenal | Professional Pitch Tracking",
  description: "Track your baseball pitching metrics and compare against MLB Statcast data. Get AI-powered development recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LiquidGlassBackgroundClient variant="amber" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
