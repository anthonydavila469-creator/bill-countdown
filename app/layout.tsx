import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "Duezo — Never Miss a Bill Payment Again",
    template: "%s | Duezo",
  },
  description: "Track every bill with beautiful countdown cards and smart bill import. Smart reminders, calendar view, and spending analytics. Free to start.",
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
    description: "Simple bill tracking with countdown timers. No bank login required. Know exactly when every bill is due.",
    siteName: "Duezo",
    images: [
      {
        url: "/og-duezo-v2.png",
        width: 1200,
        height: 630,
        alt: "Duezo — Bill Tracking Made Beautiful",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Duezo — Never Miss a Bill Payment Again",
    description: "Simple bill tracking with countdown timers. No bank login required. Know exactly when every bill is due.",
    images: ["/og-duezo-v2.png"],
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
    { media: "(prefers-color-scheme: dark)", color: "#0F0A1E" },
    { media: "(prefers-color-scheme: light)", color: "#8B5CF6" },
  ],
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Duezo',
  url: 'https://duezo.app',
  logo: 'https://duezo.app/logo-transparent-64.png',
  description:
    'AI-powered bill tracking app with countdown cards, smart reminders, and Quick Add bill import. Free forever.',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@duezo.app',
    contactType: 'customer support',
  },
  sameAs: [],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className="antialiased bg-[#0F0A1E]"
        style={{
          ['--font-geist-sans' as string]: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          ['--font-geist-mono' as string]: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        }}
      >
        <ThemeProvider>
          <SubscriptionProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
