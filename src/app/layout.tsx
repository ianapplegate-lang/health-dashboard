import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Health Dashboard — Ian Applegate",
  description: "Personal health and fitness dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Health", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="antialiased">
        <body>
          {children}
          <RegisterSW />
        </body>
      </html>
    </ClerkProvider>
  );
}
