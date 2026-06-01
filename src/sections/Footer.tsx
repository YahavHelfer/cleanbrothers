import Image from "next/image";
import Link from "next/link";
import { businessConfig } from "@/config/business";
import { navLinks } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

const legalLinks = [
  { label: "מדיניות פרטיות", href: "/privacy-policy" },
  { label: "הצהרת נגישות", href: "/accessibility-statement" },
];

export function Footer() {
  const phoneDigits = businessConfig.phoneDisplay.replace(/\D/g, "");
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : "/contact";
  const emailHref = `mailto:${businessConfig.email}`;

  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,_#08131f_0%,_#0b2133_100%)]">
      <div className="section-container pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-7 sm:py-9 lg:py-10">
        <div className="reveal grid items-start gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-[1.15fr_0.72fr_0.82fr_1.15fr] lg:gap-8">
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
            <p className="mt-2 text-sm leading-6 text-white/64 sm:mt-3 sm:leading-7">
              ניקוי ספות, מזרנים, שטיחים, ריפודים ורכבים עד בית הלקוח עם שירות
              מקצועי, נעים וברור.
            </p>
          </div>

          <nav aria-label="ניווט מהיר">
            <p className="mb-2 text-sm font-black text-white sm:mb-3">ניווט מהיר</p>
            <div className="grid gap-1.5 text-sm font-semibold text-white/66 sm:gap-2">
              {navLinks.map((link) => (
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
          </nav>

          <div>
            <p className="mb-2 text-sm font-black text-white sm:mb-3">יצירת קשר</p>
            <a
              href={phoneHref}
              aria-label="חיוג ל-CleanBrothers"
              className="text-lg font-black text-turquoise transition hover:text-white focus:outline-none focus:ring-2 focus:ring-turquoise sm:text-xl"
            >
              {businessConfig.phoneDisplay}
            </a>
            <a
              href={emailHref}
              aria-label="שליחת אימייל ל-CleanBrothers"
              className="mt-1 block text-xs font-bold text-white/64 transition hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise sm:text-sm"
            >
              {businessConfig.email}
            </a>
            <div className="mt-2 sm:mt-3">
              <a
                href={getWhatsAppLink()}
                aria-label="שליחת תמונה בוואטסאפ וקבלת מחיר מ-CleanBrothers"
                className="btn-secondary inline-flex min-h-10 px-4 py-2 text-xs sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
              >
                שלחו תמונה וקבלו מחיר
              </a>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-white sm:mb-3">אזורי שירות</p>
            <div className="flex max-w-md flex-wrap gap-1 sm:gap-1.5">
              {businessConfig.serviceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-bold leading-5 text-white/64"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-3 text-xs text-white/48 sm:mt-7 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:pt-4 sm:text-sm">
          <p>© CleanBrothers כל הזכויות שמורות</p>
          <div className="mt-2 flex flex-wrap gap-3 sm:mt-0">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mt-1 sm:mt-0">ניקוי ריפודים מקצועי בבית הלקוח</p>
        </div>
      </div>
    </footer>
  );
}
