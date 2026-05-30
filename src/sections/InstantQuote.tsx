"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { getWhatsAppLink } from "@/lib/whatsapp";

const cleaningTypes = [
  "ניקוי ספות",
  "ניקוי מזרנים",
  "ניקוי ריפודי רכב",
  "ניקוי מזגנים",
  "ניקוי שטיחים",
];

const itemCounts = ["פריט אחד", "2-3 פריטים", "4+ פריטים"];

const serviceAreas = [
  "פתח תקווה",
  "ראש העין",
  "רמת גן",
  "גבעת שמואל",
  "תל אביב",
  "אזור אחר",
];

function QuoteIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16V8a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8M8 13h5M15.5 15.8l1.2 1.2 2-2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.5 7.5h3l1.2-1.8h4.6l1.2 1.8h3A2.5 2.5 0 0 1 21 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V10a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function OptionButton({
  children,
  isActive,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-black transition duration-300 focus:outline-none focus:ring-2 focus:ring-turquoise sm:px-4 ${
        isActive
          ? "border-turquoise bg-turquoise text-navy shadow-[0_12px_26px_rgba(39,211,195,0.2)]"
          : "border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:border-turquoise/45 hover:bg-turquoise/10 hover:text-turquoise-dark"
      }`}
    >
      {children}
    </button>
  );
}

export function InstantQuote() {
  const [cleaningType, setCleaningType] = useState(cleaningTypes[0]);
  const [itemCount, setItemCount] = useState(itemCounts[0]);
  const [area, setArea] = useState(serviceAreas[0]);

  const whatsAppMessage = useMemo(
    () =>
      [
        "היי CleanBrothers, אשמח לקבל הצעת מחיר לפי תמונה.",
        `סוג ניקוי: ${cleaningType}`,
        `כמה פריטים: ${itemCount}`,
        `אזור בארץ: ${area}`,
        "אני מצרף/ת תמונה בהודעה הבאה.",
      ].join("\n"),
    [area, cleaningType, itemCount],
  );

  return (
    <section className="reveal theme-section-clean relative overflow-hidden py-9 sm:py-16 lg:py-18">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch lg:gap-6">
          <div className="card-lift reveal rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/14 text-turquoise-dark ring-1 ring-turquoise/22">
              <QuoteIcon />
            </span>
            <p className="text-xs font-black text-turquoise-dark sm:text-sm">
              הצעת מחיר מהירה
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)] sm:text-4xl">
              קבלו כיוון למחיר בוואטסאפ
            </h2>
            <p className="mt-3 text-sm leading-7 theme-muted sm:text-base sm:leading-8">
              בוחרים סוג ניקוי, כמות ואזור, ואז שולחים תמונה. אנחנו חוזרים עם
              הערכת מחיר ברורה לפי מה שרואים בתמונה.
            </p>

            <div className="mt-5 rounded-[1.25rem] border border-turquoise/18 bg-turquoise/8 p-4 sm:mt-7">
              <div className="flex items-center gap-2 text-sm font-black text-[var(--foreground)]">
                <PhotoIcon />
                שליחת תמונה
              </div>
              <p className="mt-2 text-sm leading-6 theme-muted">
                אחרי פתיחת וואטסאפ, צרפו תמונה ברורה של הפריט והכתמים. זה עוזר
                לנו לתת הערכה מדויקת יותר, בלי התחייבות.
              </p>
            </div>
          </div>

          <div className="reveal stagger-2 rounded-[1.5rem] border theme-glass p-4 sm:rounded-[2rem] sm:p-6">
            <div className="space-y-4 sm:space-y-5">
              <div>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-[var(--foreground)]">
                    1. סוג ניקוי
                  </h3>
                  <span className="text-xs font-black text-turquoise-dark">
                    חובה
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cleaningTypes.map((type) => (
                    <OptionButton
                      key={type}
                      isActive={cleaningType === type}
                      onClick={() => setCleaningType(type)}
                      ariaLabel={`בחירת ${type}`}
                    >
                      {type}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 text-base font-black text-[var(--foreground)]">
                  2. כמה פריטים
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {itemCounts.map((count) => (
                    <OptionButton
                      key={count}
                      isActive={itemCount === count}
                      onClick={() => setItemCount(count)}
                      ariaLabel={`בחירת ${count}`}
                    >
                      {count}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 text-base font-black text-[var(--foreground)]">
                  3. אזור בארץ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((city) => (
                    <OptionButton
                      key={city}
                      isActive={area === city}
                      onClick={() => setArea(city)}
                      ariaLabel={`בחירת אזור ${city}`}
                    >
                      {city}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.25rem] border theme-card p-3.5 sm:p-4">
                <h3 className="mb-2 text-base font-black text-[var(--foreground)]">
                  4. שליחת תמונה
                </h3>
                <p className="text-sm leading-6 theme-muted">
                  ההודעה מוכנה. פתחו וואטסאפ, שלחו אותה, ואז צרפו תמונה של
                  הפריט.
                </p>
                <a
                  href={getWhatsAppLink(whatsAppMessage)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="פתיחת וואטסאפ עם פרטי הצעת המחיר"
                  className="btn-primary mt-4 inline-flex w-full sm:w-auto"
                >
                  פתחו וואטסאפ ושלחו תמונה
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
