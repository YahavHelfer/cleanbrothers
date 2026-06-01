"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { businessConfig } from "@/config/business";
import { navLinks } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] shadow-[0_8px_24px_rgba(8,19,31,0.05)] backdrop-blur-xl transition duration-300">
      <nav className="section-container flex min-h-[3.1rem] flex-wrap items-center justify-between gap-0.5 py-0.5 lg:grid lg:min-h-[4.5rem] lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:py-1.5">
        <Link
          href="/"
          aria-label="מעבר לדף הבית של CleanBrothers"
          className="flex items-center transition duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-turquoise"
        >
          <Image
            src="/images/logo/cleanbrothers-logo.png"
            alt="CleanBrothers"
            width={260}
            height={148}
            className="h-[2.28rem] w-auto object-contain sm:h-[3.75rem] lg:h-[4.35rem]"
            sizes="(min-width: 1024px) 260px, (min-width: 640px) 220px, 190px"
            priority
          />
        </Link>

        <div className="order-3 relative -mx-4 -mt-0.5 w-[calc(100%+2rem)] sm:order-none sm:mx-0 sm:mt-0 sm:w-auto">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--background)] to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--background)] to-transparent sm:hidden" />

          <div className="flex gap-1 overflow-x-auto px-4 pb-0.5 text-nowrap [scrollbar-width:none] sm:gap-1.5 sm:px-0 sm:pb-1 lg:justify-center lg:gap-2 lg:overflow-visible lg:pb-0">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={`מעבר לעמוד ${link.label}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`nav-link-motion rounded-full border px-2.5 py-1 text-[0.76rem] font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-turquoise sm:px-3.5 sm:py-2 sm:text-sm lg:px-4 ${
                    isActive
                      ? "border-turquoise/55 bg-turquoise/16 text-turquoise-dark shadow-[0_0_0_1px_rgba(39,211,195,0.08),0_8px_24px_rgba(39,211,195,0.16)] dark:text-turquoise"
                      : "border-transparent bg-transparent text-[var(--muted)] hover:border-turquoise/30 hover:bg-turquoise/8 hover:text-turquoise-dark dark:hover:text-turquoise"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:justify-self-end">
          <ThemeToggle />
          <a
            href={getWhatsAppLink()}
            aria-label="פתיחת וואטסאפ לקבלת הצעת מחיר"
            className="btn-primary hidden sm:inline-flex"
          >
            {businessConfig.phoneDisplay}
          </a>
        </div>
      </nav>
    </header>
  );
}
