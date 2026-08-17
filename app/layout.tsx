import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lilla Brattön",
  description: "Du är inbjuden till en personalaktivitet på Lilla Brattön.",
  manifest: "/manifest.webmanifest?v=2",
  applicationName: "Lilla Brattön",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lilla Brattön",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Lilla Brattön",
    description: "Du är inbjuden till en personalaktivitet på Lilla Brattön.",
    siteName: "Lilla Brattön",
    locale: "sv_SE",
    type: "website",
    images: [
      {
        url: "/og-share.png",
        width: 1200,
        height: 630,
        alt: "Lilla Brattön",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lilla Brattön",
    description: "Du är inbjuden till en personalaktivitet på Lilla Brattön.",
    images: ["/og-share.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Match page bg so iOS Safari’s URL/search bar blends instead of a hard edge.
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
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
