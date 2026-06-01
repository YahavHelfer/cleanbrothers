import { ContactForm } from "@/components/ContactForm";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

const quickServices = [
  {
    label: "ניקוי ספה",
    message:
      "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ספה.",
  },
  {
    label: "ניקוי מזרן",
    message:
      "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי מזרן.",
  },
  {
    label: "ניקוי שטיח",
    message:
      "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי שטיח.",
  },
  {
    label: "ניקוי רכב",
    message:
      "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודי רכב.",
  },
  {
    label: "ניקוי מזגן",
    message:
      "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי מזגן.",
  },
];

export const metadata = buildMetadata({
  title: "צור קשר | CleanBrothers ניקוי ספות וריפודים במרכז",
  description:
    "צרו קשר עם CleanBrothers לקבלת הצעת מחיר לניקוי ספות, ריפודים, מזרנים, שטיחים וריפודי רכב בבית הלקוח באזור המרכז.",
  path: "/contact",
});

export default function ContactPage() {
  const phoneDigits = businessConfig.phoneDisplay.replace(/\D/g, "");
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : "/contact";
  const emailHref = `mailto:${businessConfig.email}`;

  return (
    <>
      <PageHero
        eyebrow="צור קשר"
        title="שלחו תמונה וקבלו מחיר ברור יותר"
        description="בדיקה מהירה לפי תמונה עוזרת לנו להבין את סוג הריפוד, מצב הכתמים והיקף העבודה לפני ההגעה."
        ctaLabel="שלחו תמונה בוואטסאפ"
        ctaHref={getWhatsAppLink(
          "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודים.",
        )}
      />

      <section className="section-block reveal">
        <div className="section-container grid gap-6 sm:gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="card-lift order-1 rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8 lg:order-none">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise sm:mb-5 sm:h-14 sm:w-14">
              <Icon name="whatsapp" />
            </span>
            <p className="text-sm font-black text-turquoise">
              בדיקה מהירה לפי תמונה
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight sm:mt-3 sm:text-3xl">
              שלחו תמונה בוואטסאפ ונחזור עם הערכת מחיר.
            </h2>
            <p className="mt-3 text-sm leading-7 theme-muted sm:mt-4 sm:text-base sm:leading-8">
              תמונה אחת של הספה, המזרן, השטיח או הרכב עוזרת לנו להבין את מצב
              הריפוד ולתת הערכת מחיר ברורה יותר.
            </p>

            <div className="mt-5 grid gap-3 sm:mt-7">
              <a
                href={getWhatsAppLink(
                  "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודים.",
                )}
                aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר"
                className="btn-primary inline-flex"
              >
                <Icon name="whatsapp" className="ml-2 h-5 w-5" />
                שלחו תמונה וקבלו מחיר
              </a>
              <a
                href={phoneHref}
                aria-label="חיוג ל-CleanBrothers"
                className="btn-secondary inline-flex"
              >
                <Icon name="phone" className="ml-2 h-5 w-5" />
                {businessConfig.phoneDisplay}
              </a>
              <a
                href={emailHref}
                aria-label="שליחת אימייל ל-CleanBrothers"
                className="btn-secondary inline-flex"
              >
                {businessConfig.email}
              </a>
            </div>

            <div className="mt-6 border-t border-[var(--card-border)] pt-5 sm:mt-8 sm:pt-6">
              <p className="mb-4 font-black">בחירה מהירה</p>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {quickServices.map((service) => (
                  <a
                    key={service.label}
                    href={getWhatsAppLink(service.message)}
                    aria-label={`פתיחת וואטסאפ עבור ${service.label}`}
                    className="card-lift rounded-2xl border theme-glass px-4 py-3 text-center text-sm font-black hover:border-turquoise/40 hover:text-turquoise-dark focus:outline-none focus:ring-2 focus:ring-turquoise"
                  >
                    {service.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="order-2 lg:order-none">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
