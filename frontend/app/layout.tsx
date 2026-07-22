import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";

import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["500", "700", "900"] });
const rajdhani = Rajdhani({ subsets: ["latin"], variable: "--font-rajdhani", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ATLAS Command",
  description: "Fully local military-style AI command system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${rajdhani.variable} font-body bg-void text-ghost antialiased`}>
        {children}
      </body>
    </html>
  );
}
