import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { AccessibilityControls } from "@/components/AccessibilityControls";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { JsonLd } from "@/components/JsonLd";
import { MarketingAttributionTracker } from "@/components/MarketingAttributionTracker";
import { MetaPixel } from "@/components/MetaPixel";
import { ScrollProgress } from "@/components/ScrollProgress";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";
import {
  faqJsonLd,
  localBusinessJsonLd,
  serviceJsonLd,
} from "@/lib/structured-data";
import { Footer } from "@/sections/Footer";
import { Navbar } from "@/sections/Navbar";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const metaPixelId =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1356088816405959";
const googleAdsId = "AW-18271875274";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.siteUrl),
  ...buildMetadata({
    title:
      "CleanBrothers | ניקוי ספות, ריפודים ומזגנים בבית הלקוח במרכז",
    description:
      "CleanBrothers מספקים ניקוי ספות, ריפודים, מזרנים, שטיחים, ריפודי רכב וניקוי מזגנים בבית הלקוח בראש העין, פתח תקווה, הוד השרון, כפר סבא, רמת גן, גבעתיים ותל אביב.",
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <JsonLd id="cleanbrothers-local-business-jsonld" data={localBusinessJsonLd} />
        <JsonLd id="cleanbrothers-service-jsonld" data={serviceJsonLd} />
        <JsonLd id="cleanbrothers-faq-jsonld" data={faqJsonLd} />
      </head>
      <body className="flex min-h-full flex-col">
        <GoogleAdsTag adsId={googleAdsId} />
        <MarketingAttributionTracker />
        <MetaPixel pixelId={metaPixelId} />
        <ScrollProgress />
        <Navbar />
        <main className="flex-1 bg-background text-foreground motion-safe:animate-[page-enter_420ms_ease-out_both]">
          {children}
        </main>
        <Footer />
        <AccessibilityControls />
        <WhatsAppButton />
        <CookieConsent />
      </body>
    </html>
  );
}
