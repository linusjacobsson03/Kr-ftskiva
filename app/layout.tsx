import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import AppShell from "./components/AppShell";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SHARE_DESCRIPTION =
  "Du är inbjuden till en kräftskiva på Brattön, öppna din personliga inbjudan här";

export const metadata: Metadata = {
  title: "Kräftskiva",
  description: SHARE_DESCRIPTION,
  manifest: "/manifest.webmanifest?v=3",
  applicationName: "Kräftskiva",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kräftskiva",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Kräftskiva",
    description: SHARE_DESCRIPTION,
    siteName: "Kräftskiva",
    locale: "sv_SE",
    type: "website",
    images: [
      {
        url: "/og-share.png",
        width: 1024,
        height: 723,
        alt: "It's time for Kräftskiva — 19 september kl 16:00",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kräftskiva",
    description: SHARE_DESCRIPTION,
    images: ["/og-share.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Match invite dark bg so iOS Safari’s URL/search bar blends.
  themeColor: "#0b0d0c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      className={`${fraunces.variable} ${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
