import Image from "next/image";
import Link from "next/link";
import { businessConfig } from "@/config/business";
import { navLinks } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,_#08131f_0%,_#0b2133_100%)]">
      <div className="section-container py-8 sm:py-9 lg:py-10">
        <div className="reveal grid items-start gap-7 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.72fr_0.82fr_1.15fr] lg:gap-8">
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
                className="h-14 w-auto object-contain sm:h-16"
                sizes="224px"
              />
            </Link>
            <p className="mt-3 text-sm leading-7 text-white/64">
              ניקוי ספות, מזרנים, שטיחים, ריפודים ורכבים עד בית הלקוח עם שירות
              מקצועי, נעים וברור.
            </p>
          </div>

          <nav aria-label="ניווט מהיר">
            <p className="mb-3 text-sm font-black text-white">ניווט מהיר</p>
            <div className="grid gap-2 text-sm font-semibold text-white/66">
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
            <p className="mb-3 text-sm font-black text-white">יצירת קשר</p>
            <a
              href={getWhatsAppLink()}
              aria-label="פתיחת וואטסאפ ליצירת קשר עם CleanBrothers"
              className="text-xl font-black text-turquoise transition hover:text-white focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              {businessConfig.phoneDisplay}
            </a>
            <div className="mt-3">
              <a
                href={getWhatsAppLink()}
                aria-label="שליחת תמונה בוואטסאפ וקבלת מחיר מ-CleanBrothers"
                className="btn-secondary inline-flex"
              >
                שלחו תמונה וקבלו מחיר
              </a>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-black text-white">אזורי שירות</p>
            <div className="flex max-w-md flex-wrap gap-1.5">
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

        <div className="mt-7 border-t border-white/10 pt-4 text-xs text-white/48 sm:flex sm:items-center sm:justify-between sm:text-sm">
          <p>© CleanBrothers כל הזכויות שמורות</p>
          <p className="mt-1 sm:mt-0">ניקוי ריפודים מקצועי בבית הלקוח</p>
        </div>
      </div>
    </footer>
  );
}
