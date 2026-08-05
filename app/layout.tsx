import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./providers";
import AppShell from "./components/AppShell";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Kräftskiva",
  description: "Appen för kvällens kräftskiva – utmaningar, foton och topplista!",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kräftskiva",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e1b4b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
