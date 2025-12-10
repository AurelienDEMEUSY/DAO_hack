import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletProvider";
import { AnchorProvider } from "@/contexts/AnchorProvider";
import { Navbar } from "@/components/dao/Navbar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hand-e DAO - Reputation-Based Governance",
  description: "Solana-based DAO with reputation governance through attendance and peer review",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          <AnchorProvider>
            <div className="min-h-screen bg-white">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
            <Toaster />
          </AnchorProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
