import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { ToastProvider } from "@/components/ui/toast";
import { UpgradeModal } from "@/components/upgrade-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BillCountdown - Never Miss a Bill Payment",
  description: "Track bill due dates with beautiful countdown cards and AI-powered email sync. Never miss a payment again.",
  keywords: ["bills", "payments", "finance", "countdown", "reminders", "budget"],
  authors: [{ name: "BillCountdown" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BillCountdown",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "BillCountdown - Never Miss a Bill Payment",
    description: "Track bill due dates with beautiful countdown cards and AI-powered email sync.",
    siteName: "BillCountdown",
  },
  twitter: {
    card: "summary_large_image",
    title: "BillCountdown - Never Miss a Bill Payment",
    description: "Track bill due dates with beautiful countdown cards and AI-powered email sync.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SubscriptionProvider>
            <ToastProvider>{children}</ToastProvider>
            <UpgradeModal />
          </SubscriptionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
