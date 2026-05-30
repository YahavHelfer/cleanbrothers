"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { getWhatsAppLink } from "@/lib/whatsapp";

type DirtLevel = "קל" | "בינוני" | "קשה";
type ServiceKey = "sofa" | "mattress" | "carpet" | "car" | "ac";

type PriceOption = {
  label: string;
  ranges: Record<DirtLevel, string>;
};

type ServiceConfig = {
  label: string;
  icon: "sofa" | "mattress" | "carpet" | "car" | "ac";
  options: PriceOption[];
};

const dirtLevels: DirtLevel[] = ["קל", "בינוני", "קשה"];

const pricingConfig: Record<ServiceKey, ServiceConfig> = {
  sofa: {
    label: "ספה",
    icon: "sofa",
    options: [
      {
        label: "2 מושבים",
        ranges: { קל: "₪250-₪350", בינוני: "₪320-₪450", קשה: "₪420-₪580" },
      },
      {
        label: "3 מושבים",
        ranges: { קל: "₪320-₪450", בינוני: "₪400-₪550", קשה: "₪520-₪700" },
      },
      {
        label: "ספה פינתית",
        ranges: { קל: "₪450-₪600", בינוני: "₪550-₪750", קשה: "₪700-₪950" },
      },
      {
        label: "פינתית גדולה",
        ranges: { קל: "₪600-₪800", בינוני: "₪750-₪1,000", קשה: "₪950-₪1,250" },
      },
    ],
  },
  mattress: {
    label: "מזרון",
    icon: "mattress",
    options: [
      {
        label: "יחיד",
        ranges: { קל: "₪200-₪280", בינוני: "₪260-₪360", קשה: "₪340-₪480" },
      },
      {
        label: "זוגי",
        ranges: { קל: "₪280-₪380", בינוני: "₪350-₪500", קשה: "₪450-₪650" },
      },
      {
        label: "Queen",
        ranges: { קל: "₪330-₪450", בינוני: "₪420-₪580", קשה: "₪550-₪750" },
      },
      {
        label: "King",
        ranges: { קל: "₪380-₪520", בינוני: "₪480-₪680", קשה: "₪620-₪850" },
      },
    ],
  },
  carpet: {
    label: "שטיח",
    icon: "carpet",
    options: [
      {
        label: "קטן",
        ranges: { קל: "₪180-₪260", בינוני: "₪240-₪340", קשה: "₪320-₪460" },
      },
      {
        label: "בינוני",
        ranges: { קל: "₪260-₪380", בינוני: "₪340-₪500", קשה: "₪460-₪650" },
      },
      {
        label: "גדול",
        ranges: { קל: "₪380-₪550", בינוני: "₪500-₪720", קשה: "₪650-₪900" },
      },
    ],
  },
  car: {
    label: "רכב",
    icon: "car",
    options: [
      {
        label: "מושבים קדמיים",
        ranges: { קל: "₪220-₪320", בינוני: "₪300-₪430", קשה: "₪400-₪580" },
      },
      {
        label: "רכב פרטי",
        ranges: { קל: "₪400-₪550", בינוני: "₪520-₪720", קשה: "₪680-₪950" },
      },
      {
        label: "רכב משפחתי",
        ranges: { קל: "₪520-₪700", בינוני: "₪650-₪900", קשה: "₪850-₪1,150" },
      },
    ],
  },
  ac: {
    label: "מזגן",
    icon: "ac",
    options: [
      {
        label: "מזגן עילי",
        ranges: { קל: "₪250-₪350", בינוני: "₪320-₪450", קשה: "₪420-₪600" },
      },
      {
        label: "מיני מרכזי",
        ranges: { קל: "₪450-₪650", בינוני: "₪600-₪850", קשה: "₪800-₪1,150" },
      },
      {
        label: "מזגן מרכזי",
        ranges: { קל: "₪650-₪900", בינוני: "₪850-₪1,200", קשה: "₪1,100-₪1,500" },
      },
    ],
  },
};

function ServiceIcon({ icon }: { icon: ServiceConfig["icon"] }) {
  const props = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (icon === "mattress") {
    return (
      <svg {...props}>
        <path d="M4 10.5h16v6H4z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 10.5V8.8A2.3 2.3 0 0 1 8.8 6.5h6.4a2.3 2.3 0 0 1 2.3 2.3v1.7M6 16.5V19M18 16.5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "carpet") {
    return (
      <svg {...props}>
        <path d="M6 5.5h12A2.5 2.5 0 0 1 20.5 8v8A2.5 2.5 0 0 1 18 18.5H6A2.5 2.5 0 0 1 3.5 16V8A2.5 2.5 0 0 1 6 5.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 9h9M7.5 12h9M7.5 15h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "car") {
    return (
      <svg {...props}>
        <path d="M6.5 15.8h11A2.5 2.5 0 0 0 20 13.3v-1.1a2.5 2.5 0 0 0-1.7-2.4l-1.1-.4-1.5-3.1A2.2 2.2 0 0 0 13.7 5H10a2.2 2.2 0 0 0-2 1.3L6.5 9.4l-.9.3A2.5 2.5 0 0 0 4 12v1.3a2.5 2.5 0 0 0 2.5 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 15.8V18M16.5 15.8V18M8 9.4h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "ac") {
    return (
      <svg {...props}>
        <path d="M5.5 6.5h13A2.5 2.5 0 0 1 21 9v3.2a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 12.2V9a2.5 2.5 0 0 1 2.5-2.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 10.2h11M7.5 17c1.2.9 2.4.9 3.6 0M12.2 18.7c1.2.9 2.4.9 3.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M6.2 13.4v-2.2A3.2 3.2 0 0 1 9.4 8h5.2a3.2 3.2 0 0 1 3.2 3.2v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.8 13h10.4a2.3 2.3 0 0 1 2.3 2.3V18H4.5v-2.7A2.3 2.3 0 0 1 6.8 13Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Chip({
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
          ? "border-turquoise bg-turquoise text-navy shadow-[0_0_0_4px_rgba(39,211,195,0.12),0_14px_30px_rgba(39,211,195,0.2)]"
          : "border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:border-turquoise/45 hover:bg-turquoise/10 hover:text-turquoise-dark"
      }`}
    >
      {children}
    </button>
  );
}

export function QuickPriceEstimate() {
  const [serviceKey, setServiceKey] = useState<ServiceKey>("sofa");
  const [optionIndex, setOptionIndex] = useState(0);
  const [dirtLevel, setDirtLevel] = useState<DirtLevel>("בינוני");

  const currentService = pricingConfig[serviceKey];
  const currentOption =
    currentService.options[Math.min(optionIndex, currentService.options.length - 1)];
  const priceRange = currentOption.ranges[dirtLevel];

  const whatsAppMessage = useMemo(
    () =>
      [
        "היי CleanBrothers, אשמח לקבל מחיר מדויק לפי תמונה.",
        `שירות: ${currentService.label}`,
        `סוג פריט: ${currentOption.label}`,
        `רמת לכלוך: ${dirtLevel}`,
        `הערכת מחיר באתר: ${priceRange}`,
        "אני מצרף/ת תמונה בהודעה הבאה.",
      ].join("\n"),
    [currentOption.label, currentService.label, dirtLevel, priceRange],
  );

  function handleServiceChange(nextService: ServiceKey) {
    setServiceKey(nextService);
    setOptionIndex(0);
  }

  return (
    <section className="reveal theme-section-clean relative overflow-hidden py-9 sm:py-16 lg:py-18">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black text-turquoise-dark sm:text-sm">
            הערכת מחיר מהירה
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
            בדקו טווח מחיר לפני ששולחים תמונה
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 theme-muted sm:mt-5 sm:text-lg sm:leading-8">
            בחרו שירות, סוג פריט ורמת לכלוך. לאחר מכן שלחו תמונה בוואטסאפ כדי
            לקבל מחיר מדויק יותר.
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-4 lg:mt-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:gap-6">
          <div className="reveal stagger-1 rounded-[1.5rem] border theme-glass p-4 sm:rounded-[2rem] sm:p-6">
            <div className="space-y-5">
              <div>
                <h3 className="mb-3 text-base font-black text-[var(--foreground)]">
                  1. בחרו שירות
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(Object.keys(pricingConfig) as ServiceKey[]).map((key) => {
                    const service = pricingConfig[key];

                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={`בחירת שירות ${service.label}`}
                        aria-pressed={serviceKey === key}
                        onClick={() => handleServiceChange(key)}
                        className={`card-lift flex min-h-24 flex-col items-center justify-center gap-2 rounded-[1.15rem] border px-3 py-3 text-sm font-black transition duration-300 focus:outline-none focus:ring-2 focus:ring-turquoise sm:min-h-28 sm:rounded-[1.5rem] ${
                          serviceKey === key
                            ? "border-turquoise bg-turquoise/14 text-turquoise-dark shadow-[0_0_0_4px_rgba(39,211,195,0.1),0_18px_38px_rgba(39,211,195,0.16)]"
                            : "border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:border-turquoise/40 hover:bg-turquoise/8"
                        }`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-turquoise/12 text-turquoise-dark ring-1 ring-turquoise/22">
                          <ServiceIcon icon={service.icon} />
                        </span>
                        {service.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-black text-[var(--foreground)]">
                  2. בחרו סוג פריט
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentService.options.map((option, index) => (
                    <Chip
                      key={option.label}
                      isActive={optionIndex === index}
                      onClick={() => setOptionIndex(index)}
                      ariaLabel={`בחירת ${option.label}`}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-black text-[var(--foreground)]">
                  3. רמת לכלוך
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {dirtLevels.map((level) => (
                    <Chip
                      key={level}
                      isActive={dirtLevel === level}
                      onClick={() => setDirtLevel(level)}
                      ariaLabel={`בחירת רמת לכלוך ${level}`}
                    >
                      {level}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="card-lift reveal stagger-2 flex flex-col justify-between rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8">
            <div>
              <p className="text-sm font-black text-turquoise-dark">
                טווח מחיר משוער
              </p>
              <div
                key={`${serviceKey}-${optionIndex}-${dirtLevel}`}
                className="reveal mt-3 rounded-[1.35rem] border border-turquoise/22 bg-turquoise/10 p-5 text-center sm:p-6"
                aria-live="polite"
              >
                <p className="text-sm font-black theme-muted">
                  {currentService.label} · {currentOption.label} · {dirtLevel}
                </p>
                <p className="mt-2 text-4xl font-black leading-none text-[var(--foreground)] sm:text-5xl">
                  {priceRange}
                </p>
              </div>

              <p className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold leading-6 theme-muted">
                מחיר סופי ייקבע לפי מצב הפריט בפועל.
              </p>
            </div>

            <div className="mt-5">
              <a
                href={getWhatsAppLink(whatsAppMessage)}
                target="_blank"
                rel="noreferrer"
                aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר מדויק"
                className="btn-primary inline-flex w-full"
              >
                שלחו תמונה לקבלת מחיר מדויק
              </a>
              <p className="mt-3 text-center text-xs font-bold theme-muted">
                ללא התחייבות - הערכה מהירה לפי תמונה.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
