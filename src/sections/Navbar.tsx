"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { navLinks } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function isLinkActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/services") {
      return pathname === "/services" || pathname.endsWith("-cleaning");
    }

    return pathname === href;
  }

  function renderNavLink(link: (typeof navLinks)[number]) {
    const isActive = isLinkActive(link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        aria-label={`מעבר לעמוד ${link.label}`}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setIsMenuOpen(false)}
        className={`nav-link-motion rounded-full border px-3.5 py-2 text-center text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-turquoise lg:px-4 ${
          isActive
            ? "border-turquoise/55 bg-turquoise/16 text-turquoise-dark shadow-[0_0_0_1px_rgba(39,211,195,0.08),0_8px_24px_rgba(39,211,195,0.16)] dark:text-turquoise"
            : "border-transparent bg-transparent text-[var(--muted)] hover:border-turquoise/30 hover:bg-turquoise/8 hover:text-turquoise-dark dark:hover:text-turquoise"
        }`}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] shadow-[0_8px_24px_rgba(8,19,31,0.05)] backdrop-blur-xl transition duration-300">
      <nav className="section-container grid min-h-[3.4rem] grid-cols-[auto_1fr_auto] items-center gap-2 py-1 lg:min-h-[4.5rem] lg:gap-6 lg:py-1.5">
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
            className="h-[2.45rem] w-auto object-contain sm:h-[3.5rem] lg:h-[4.35rem]"
            sizes="(min-width: 1024px) 260px, (min-width: 640px) 220px, 190px"
            priority
          />
        </Link>

        <div className="hidden justify-center gap-2 text-nowrap lg:flex">
          {navLinks.map(renderNavLink)}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 lg:justify-self-end">
          <ThemeToggle />
          <a
            href={getWhatsAppLink()}
            aria-label="פתיחת וואטסאפ לקבלת הצעת מחיר"
            className="btn-primary hidden whitespace-nowrap px-4 text-sm sm:inline-flex lg:px-7 lg:text-base"
          >
            <GoogleCallTrackingNumber />
          </a>
          <button
            type="button"
            aria-label={isMenuOpen ? "סגירת תפריט הניווט" : "פתיחת תפריט הניווט"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--foreground)] transition hover:border-turquoise/45 hover:text-turquoise-dark focus:outline-none focus:ring-2 focus:ring-turquoise lg:hidden"
          >
            <span className="sr-only">{isMenuOpen ? "סגירת תפריט" : "פתיחת תפריט"}</span>
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={`${isMenuOpen ? "grid" : "hidden"} col-span-3 grid-cols-2 gap-2 border-t border-[var(--glass-border)] py-3 sm:grid-cols-3 lg:hidden`}
        >
          {navLinks.map(renderNavLink)}
        </div>
      </nav>
    </header>
  );
}
