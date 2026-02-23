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
  title: {
    default: "Duezo — Never Miss a Bill Payment Again",
    template: "%s | Duezo",
  },
  description: "Track every bill with beautiful countdown cards and AI-powered email sync. Smart reminders, calendar view, and spending analytics. Free to start.",
  keywords: ["bill tracker", "bill reminders", "payment due dates", "bill countdown", "finance app", "budget tracker", "recurring bills", "autopay tracker"],
  authors: [{ name: "Duezo" }],
  creator: "Duezo",
  metadataBase: new URL("https://duezo.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Duezo",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    url: "https://duezo.app",
    title: "Duezo — Never Miss a Bill Payment Again",
    description: "Beautiful countdown cards + AI email sync. Track every bill, get smart reminders, and never pay late again.",
    siteName: "Duezo",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Duezo — Bill Tracking Made Beautiful",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Duezo — Never Miss a Bill Payment Again",
    description: "Beautiful countdown cards + AI email sync. Track every bill, get smart reminders, and never pay late again.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://duezo.app",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
    { media: "(prefers-color-scheme: light)", color: "#8B5CF6" },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#08080c]`}
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
