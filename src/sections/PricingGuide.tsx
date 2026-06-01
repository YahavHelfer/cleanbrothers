import { getWhatsAppLink } from "@/lib/whatsapp";

type PricingIcon = "single" | "multi" | "car" | "air";

const priceFactors = [
  "סוג הריפוד",
  "גודל הפריט",
  "מצב הלכלוך והכתמים",
  "כמות הפריטים",
  "מיקום השירות",
];

const pricingCards: {
  title: string;
  description: string;
  icon: PricingIcon;
}[] = [
  {
    title: "ניקוי פריט בודד",
    description: "מתאים לספה קטנה, מזרן או כורסה אחת.",
    icon: "single",
  },
  {
    title: "ניקוי כמה פריטים",
    description: "מתאים לבית עם כמה ספות, מזרנים או שטיחים.",
    icon: "multi",
  },
  {
    title: "ניקוי רכב",
    description: "מתאים לריפודי רכב, מושבים ושטיחוני פנים.",
    icon: "car",
  },
  {
    title: "ניקוי מזגן",
    description: "מתאים למזגן עילי עם אבק, ריחות או לכלוך שהצטבר.",
    icon: "air",
  },
];

function PricingCardIcon({ icon }: { icon: PricingIcon }) {
  const props = {
    className: "h-6 w-6",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (icon === "multi") {
    return (
      <svg {...props}>
        <path
          d="M6.5 9.5h7A2.5 2.5 0 0 1 16 12v5.5H4V12a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 9.5V7.8A2.8 2.8 0 0 1 11.8 5h3.7A2.5 2.5 0 0 1 18 7.5V17.5M6.2 17.5V19M14 17.5V19M18 17.5V19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "car") {
    return (
      <svg {...props}>
        <path
          d="M6.5 15.8h11A2.5 2.5 0 0 0 20 13.3v-1.1a2.5 2.5 0 0 0-1.7-2.4l-1.1-.4-1.5-3.1A2.2 2.2 0 0 0 13.7 5H10a2.2 2.2 0 0 0-2 1.3L6.5 9.4l-.9.3A2.5 2.5 0 0 0 4 12v1.3a2.5 2.5 0 0 0 2.5 2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 15.8V18M16.5 15.8V18M8 9.4h8M8 12.6h.01M16 12.6h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "air") {
    return (
      <svg {...props}>
        <path
          d="M5.5 6.5h13A2.5 2.5 0 0 1 21 9v3.2a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 12.2V9a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 10.2h11M7.5 17c1.2.9 2.4.9 3.6 0M12.2 18.7c1.2.9 2.4.9 3.6 0M16 17c.9.7 1.8.8 2.7.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path
        d="M6.2 13.4v-2.2A3.2 3.2 0 0 1 9.4 8h5.2a3.2 3.2 0 0 1 3.2 3.2v2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.8 13h10.4a2.3 2.3 0 0 1 2.3 2.3V18H4.5v-2.7A2.3 2.3 0 0 1 6.8 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 18v1.5M17 18v1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PricingGuide() {
  return (
    <section className="reveal theme-section-soft relative overflow-hidden py-8 sm:py-16 lg:py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black text-turquoise sm:text-sm">
            שקיפות במחיר
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)] sm:mt-3 sm:text-5xl">
            איך נקבע המחיר?
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-7 theme-muted sm:hidden">
            המחיר נקבע לפי הפריט, המצב והכמות.
          </p>
          <p className="mx-auto mt-3 hidden max-w-3xl text-base leading-7 theme-muted sm:mt-5 sm:block sm:text-lg sm:leading-8">
            אין מחיר קבוע לכל עבודה - המחיר נקבע לפי סוג הפריט, מצב הריפוד
            וכמות הפריטים, כדי לתת לכם הצעה הוגנת וברורה.
          </p>
        </div>

        <div className="mx-auto mt-5 max-w-6xl rounded-[1.25rem] border theme-card p-3.5 sm:mt-8 sm:rounded-[2rem] sm:p-5">
          <div className="mb-3 flex items-center justify-center gap-2 text-center sm:mb-4">
            <span className="h-px w-10 bg-turquoise/45" />
            <h3 className="text-sm font-black text-[var(--foreground)]">
              מה משפיע על ההצעה?
            </h3>
            <span className="h-px w-10 bg-turquoise/45" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {priceFactors.map((factor, index) => (
              <span
                key={factor}
                className={`reveal inline-flex items-center gap-2 rounded-full border border-turquoise/20 bg-turquoise/8 px-3 py-1.5 text-xs font-black text-[var(--foreground)] transition duration-300 hover:border-turquoise/40 hover:bg-turquoise/14 hover:text-turquoise-dark sm:px-4 sm:py-2 sm:text-sm stagger-${(index % 5) + 1}`}
              >
                <span className="h-2 w-2 rounded-full bg-turquoise shadow-[0_0_18px_rgba(39,211,195,0.7)]" />
                {factor}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {pricingCards.map((card, index) => (
            <article
              key={card.title}
              className={`card-lift reveal rounded-[1.25rem] border theme-card p-3.5 hover:border-turquoise/40 hover:shadow-turquoise/10 sm:rounded-[2rem] sm:p-7 stagger-${index + 1}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-turquoise/14 text-turquoise-dark shadow-[0_12px_28px_rgba(39,211,195,0.14)] ring-1 ring-turquoise/25 sm:h-14 sm:w-14 sm:shadow-[0_18px_45px_rgba(39,211,195,0.18)]">
                  <PricingCardIcon icon={card.icon} />
                </span>
                <div className="min-w-0">
                  <p className="mb-2 inline-flex rounded-full bg-turquoise/12 px-3 py-1 text-xs font-black text-turquoise-dark sm:mb-3">
                    הערכה לפי תמונה
                  </p>
                  <h3 className="text-xl font-black leading-tight sm:text-2xl">
                    {card.title}
                  </h3>
                </div>
              </div>

              <p className="mt-2 text-sm leading-6 theme-muted sm:mt-5 sm:text-base sm:leading-8">
                {card.description}
              </p>
              <div className="mt-4 h-1 w-14 rounded-full bg-turquoise sm:mt-6 sm:w-16" />
            </article>
          ))}
        </div>

        <div className="mx-auto mt-5 hidden max-w-2xl text-center sm:mt-8 sm:block">
          <a
            href={getWhatsAppLink(
              "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודים.",
            )}
            aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר"
            className="btn-primary inline-flex"
          >
            שלחו תמונה וקבלו מחיר
          </a>
          <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-7 theme-muted">
            בלי התחייבות - בדיקה מהירה לפי תמונה והערכה ברורה לפי מצב הריפוד.
          </p>
        </div>
      </div>
    </section>
  );
}
