import type { Metadata } from "next";
import { Fira_Mono, Inter } from "next/font/google";
import "./globals.css";

const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wasit — x402 / MPP conformance testing for Stellar",
  description:
    "Independent conformance tester for x402 and MPP on Stellar. Runs the real payment flow and verifies on-chain settlement, not just response shape.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${firaMono.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
