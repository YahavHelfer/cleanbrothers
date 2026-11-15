import { isWebsiteChatEnabled } from "@/lib/website-chat/config";
import { isSiteReview } from "@/lib/site-review";
import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import { AccessibilityControls } from "@/components/AccessibilityControls";
import { BusinessEventTracker } from "@/components/BusinessEventTracker";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { JsonLd } from "@/components/JsonLd";
import { MarketingAttributionTracker } from "@/components/MarketingAttributionTracker";
import { MetaPixel } from "@/components/MetaPixel";
import { ScrollProgress } from "@/components/ScrollProgress";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { businessConfig } from "@/config/business";
import { getPublicSiteChrome } from "@/cms/site/public-source";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";
import { PublicCampaigns } from "@/cms/promotions/PublicCampaigns";
import { getGoogleConsentBootstrapScript } from "@/lib/consent";
import { GOOGLE_CALL_CONVERSION_NUMBER_CLASS } from "@/lib/google-call-tracking";
import { buildMetadata } from "@/lib/seo";
import {
  buildLocalBusinessJsonLd,
} from "@/lib/structured-data";
import { Footer } from "@/sections/Footer";
import { Navbar } from "@/sections/Navbar";
import "../globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const metaPixelId =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1356088816405959";
const googleAdsId = "AW-18271875274";
const googleAdsPhoneConversionId =
  "AW-18271875274/71I-CKLxmOMcEMrh2ohE";
const googleAdsPhoneConversionNumber = "0559577731";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.siteUrl),
  ...buildMetadata({
    title:
      "CleanBrothers | ניקיון מקצועי לבית, לעסק ולרכב",
    description:
      "CleanBrothers מספקים ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק באזור המרכז.",
  }),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chrome = await getPublicSiteChrome();
  const globalPromotion = await getPublicActivePromotion("global", "site");
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <JsonLd id="cleanbrothers-local-business-jsonld" data={buildLocalBusinessJsonLd(chrome.settings)} />
      </head>
      <body className="flex min-h-full flex-col">
        <Script id="google-consent-defaults" strategy="beforeInteractive">
          {getGoogleConsentBootstrapScript()}
        </Script>
        {!isSiteReview() && <GoogleAdsTag
          adsId={googleAdsId}
          phoneConversionId={googleAdsPhoneConversionId}
          phoneConversionNumber={googleAdsPhoneConversionNumber}
          phoneConversionCssClass={GOOGLE_CALL_CONVERSION_NUMBER_CLASS}
        />}
        {!isSiteReview() && <BusinessEventTracker />}
        {!isSiteReview() && <MarketingAttributionTracker />}
        {!isSiteReview() && <MetaPixel pixelId={metaPixelId} />}
        <a className="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
        <ScrollProgress />
        <Navbar links={chrome.navLinks} />
        <CookieConsent />
        {globalPromotion && <PublicScheduledPromotion active={globalPromotion} />}
        <PublicCampaigns />
        <main id="main-content" className="flex-1 bg-background text-foreground">
          {children}
        </main>
        <Footer settings={chrome.settings} content={chrome.footer} links={chrome.navLinks}
          services={chrome.featuredServiceLinks} />
        <AccessibilityControls />
        <WhatsAppButton chatEnabled={isWebsiteChatEnabled()} />
      </body>
    </html>
  );
}
