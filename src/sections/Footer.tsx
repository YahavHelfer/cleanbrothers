import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { businessConfig } from "@/config/business";
import { siteFooterBaseline, siteSettingsBaseline } from "@/cms/site/baseline";
import type { SiteFooter, SiteSettings } from "@/cms/site/model";
import { navLinks } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

type FooterProps = { settings?: SiteSettings; content?: SiteFooter;
  links?: ReadonlyArray<{ label: string; href: string }>;
  services?: ReadonlyArray<{ label: string; href: string }>;
  contactReview?: boolean;
};
const baselineServices = [
  { label: "ניקוי ספות", href: "/sofa-cleaning" },
  { label: "ניקוי מזגנים", href: "/air-conditioner-cleaning" },
  { label: "ניקוי חלונות", href: "/window-cleaning" },
];

function FooterLinkGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="hidden sm:block">
        <p className="mb-3 text-sm font-black text-white">{label}</p>
        {children}
      </div>
      <details className="group border-b border-white/10 sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-turquoise [&::-webkit-details-marker]:hidden">
          {label}
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rotate-45 border-b-2 border-r-2 border-turquoise ltr:mr-1 rtl:ml-1 group-open:rotate-[225deg]" />
        </summary>
        <div className="pb-3">{children}</div>
      </details>
    </>
  );
}

export function Footer({ settings = siteSettingsBaseline, content = siteFooterBaseline,
  links = navLinks, services = baselineServices, contactReview = false }: FooterProps) {
  // The dial target stays code/environment owned for call tracking. CMS can
  // change only formatting of the displayed number after digit equivalence.
  const phoneDigits = settings.phoneDisplay.replace(/\D/g, "");
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : "/contact";
  const emailHref = `mailto:${settings.email}`;

  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,_#08131f_0%,_#0b2133_100%)]">
      <div className="section-container pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:py-9 lg:py-10">
        <div className="reveal grid items-start gap-x-3 sm:grid-cols-2 sm:gap-7 lg:grid-cols-[1.15fr_0.72fr_0.82fr_1.15fr] lg:gap-8">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="מעבר לדף הבית של CleanBrothers"
              className="inline-flex rounded-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              <Image
                src="/images/logo/cleanbrothers-logo.png"
                alt="CleanBrothers"
                width={224}
                height={128}
                className="h-12 w-auto object-contain sm:h-16"
                sizes="224px"
              />
            </Link>
            <p className="mt-3 hidden text-sm leading-7 text-white/64 sm:block">
              {content.description}
            </p>
          </div>

          <div className="mb-2 sm:order-3 sm:mb-0">
            <p className="mb-3 hidden text-sm font-black text-white sm:block">יצירת קשר</p>
            {contactReview ? (
              <p className="text-sm text-white/80">קישורי הקשר מושבתים בסביבת הבדיקה.</p>
            ) : <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-start sm:gap-0">
              <a
                href={phoneHref}
                className="inline-flex min-h-11 items-center text-base font-black text-turquoise transition hover:text-white focus:outline-none focus:ring-2 focus:ring-turquoise sm:min-h-0 sm:text-xl"
              >
                <GoogleCallTrackingNumber>{settings.phoneDisplay}</GoogleCallTrackingNumber>
              </a>
              <a
                href={getWhatsAppLink()}
                className="btn-secondary inline-flex min-h-11 px-3 py-2 text-xs sm:order-3 sm:mt-3 sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
              >
                {content.whatsappCtaLabel}
              </a>
              <div className="flex basis-full flex-wrap items-baseline gap-x-3 gap-y-1 sm:block">
                <p className="text-xs text-white/70 sm:text-sm">שעות פעילות: {businessConfig.operatingHoursDisplay}</p>
                <a
                  href={emailHref}
                  className="break-all text-xs font-bold text-white/64 transition hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise sm:mt-1 sm:block sm:text-sm"
                >
                  {settings.email}
                </a>
              </div>
            </div>}
          </div>

          <nav aria-label="קישורי הפוטר" className="sm:order-2">
            <FooterLinkGroup label="ניווט מהיר">
              <div className="grid gap-1.5 text-sm font-semibold text-white/66 sm:gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={`מעבר לעמוד ${link.label}`}
                    className="nav-link-motion rounded-sm focus:outline-none focus:ring-2 focus:ring-turquoise hover:text-turquoise"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </FooterLinkGroup>
            <div className="sm:mt-4">
              <FooterLinkGroup label="שירותים">
                <div className="grid gap-1.5 text-sm font-semibold text-white/66 sm:gap-2">
                  {services.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="nav-link-motion rounded-sm focus:outline-none focus:ring-2 focus:ring-turquoise hover:text-turquoise"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </FooterLinkGroup>
            </div>
          </nav>

          <div className="sm:order-4">
            <FooterLinkGroup label="אזורי שירות">
              <p className="mb-2 text-xs text-white/70">הזמינות משתנה לפי השירות והיישוב.</p>
              <div className="flex max-w-md flex-wrap gap-1 sm:gap-1.5">
                {settings.serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-bold leading-5 text-white/64"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </FooterLinkGroup>
          </div>
        </div>

        <div className="mt-3 pt-1 text-xs text-white/48 sm:mt-7 sm:flex sm:border-t sm:border-white/10 sm:items-center sm:justify-between sm:gap-4 sm:pt-4 sm:text-sm">
          <p>{content.copyright}</p>
          <div className="mt-2 flex flex-wrap gap-3 sm:mt-0">
            {!contactReview && content.legal.filter(link => link.visible).map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="transition hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise"
              >
                {link.label}
              </Link>
            ))}
            <CookiePreferencesButton />
          </div>
          <p className="hidden sm:block">{content.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
