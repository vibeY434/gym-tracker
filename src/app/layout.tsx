import type { Metadata } from "next";
import "./globals.css";
import { BackToW3yhBadge } from "@/components/cross-shell/back-to-w3yh-badge";
import { CrossShellFooter } from "@/components/cross-shell/cross-shell-footer";

export const metadata: Metadata = {
  title: "Gym Tracker · w3yh.xyz",
  description: "Trainingstagebuch für Geräte, Sätze, Wiederholungen und Gewicht.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link
          rel="stylesheet"
          href="https://w3yh.xyz/cross-shell/cross-shell.css"
        />
      </head>
      <body className="antialiased">
        <BackToW3yhBadge />
        {children}
        <CrossShellFooter appName="Gym Tracker" appDomain="gym.w3yh.xyz" />
      </body>
    </html>
  );
}
