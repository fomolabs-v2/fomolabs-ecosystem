import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { Header, MobileNav } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    "https://" +
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        "fomolabs-ecosystem.vercel.app"),
  ),
  title: {
    default: "FomoLabs — A new perspective on DeFi",
    template: "%s | FomoLabs",
  },
  description:
    "Trade Solana tokens with FOMO DEX. Create tokens, build your profile, and share holder callouts on FOMOLAUNCH.",
  applicationName: "FomoLabs",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FomoLabs",
  },
  icons: { icon: "/brand/icon-192.png", apple: "/brand/icon-192.png" },
  openGraph: {
    title: "FomoLabs — A new perspective on DeFi",
    description:
      "One ecosystem. More possibilities. Explore FOMO DEX and FOMOLAUNCH.",
    images: ["/brand/logo.webp"],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b18",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>
          <Header />
          {children}
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
