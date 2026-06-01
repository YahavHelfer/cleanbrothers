import { ImageWithFallback } from "@/components/ImageWithFallback";
import { SectionHeading } from "@/components/SectionHeading";
import { services } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

const primaryServiceTitles = new Set([
  "ניקוי ספות",
  "ניקוי מזרנים",
  "ניקוי ריפודי רכב",
  "ניקוי מזגנים",
]);

function ServiceAccentIcon({ title }: { title: string }) {
  const isAirConditioner = title === "ניקוי מזגנים";

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-turquoise/14 text-turquoise-dark ring-1 ring-turquoise/20 sm:h-12 sm:w-12">
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {isAirConditioner ? (
          <>
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
          </>
        ) : (
          <>
            <path
              d="M12 4.5l1.35 3.85L17.2 9.7l-3.85 1.35L12 14.9l-1.35-3.85L6.8 9.7l3.85-1.35L12 4.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M6 16.5h.01M9 19h.01M15.5 18.5h.01M18.5 15.5h.01"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </span>
  );
}

export function Services() {
  const primaryServices = services.filter((service) =>
    primaryServiceTitles.has(service.title),
  );

  return (
    <section
      id="services"
      className="reveal theme-section-clean py-9 sm:py-18 lg:py-20"
    >
      <div className="section-container">
        <SectionHeading
          eyebrow="השירותים המרכזיים"
          title="השירותים המרכזיים שמחזירים לבית תחושה נקייה"
          mobileDescription="ספות, מזרנים, רכבים ומזגנים. שולחים תמונה ומקבלים הערכה."
          description="מתמקדים במה שהלקוחות מבקשים הכי הרבה: ספות, מזרנים, ריפודי רכב ומזגנים. שולחים תמונה בוואטסאפ ומקבלים הערכת מחיר ברורה."
          tone="light"
        />

        <div className="mt-5 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {primaryServices.map((service, index) => (
            <article
              key={service.title}
              className={`card-lift reveal group overflow-hidden rounded-[2rem] border theme-card hover:border-turquoise/35 hover:shadow-turquoise/10 stagger-${index + 1}`}
            >
              <div className="relative">
                <ImageWithFallback
                  src={service.image}
                  alt={service.title}
                  fallbackLabel={service.title}
                  className="image-reveal relative aspect-[16/10] w-full sm:aspect-[4/3]"
                  imageClassName="object-cover transition duration-500 group-hover:scale-105"
                  fallbackClassName="from-surface-soft via-white to-cyan-100 text-navy"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/24 via-transparent to-turquoise/8" />
              </div>

              <div className="p-3.5 sm:p-7">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <ServiceAccentIcon title={service.title} />
                  <div>
                    <p className="text-xs font-black leading-5 text-turquoise-dark sm:text-sm sm:leading-normal">
                      {service.benefit}
                    </p>
                    <h3 className="mt-1.5 text-xl font-black leading-tight sm:mt-3 sm:text-3xl">
                      {service.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 theme-muted sm:mt-3 sm:text-base sm:leading-8">
                  {service.description}
                </p>

                <a
                  href={getWhatsAppLink(
                    `היי, אשמח לקבל הצעת מחיר עבור ${service.title}.`,
                  )}
                  aria-label={`פתיחת וואטסאפ לקבלת מחיר עבור ${service.title}`}
                  className="btn-primary mt-3 inline-flex min-h-10 px-4 py-2 text-xs sm:mt-6 sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
                >
                  לקבלת מחיר
                </a>
                <p className="mt-2 hidden text-xs font-bold theme-muted sm:mt-3 sm:block">
                  אפשר לשלוח תמונה ולקבל הערכת מחיר ללא התחייבות.
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="theme-glass mx-auto mt-5 max-w-3xl rounded-2xl border px-4 py-3 text-center text-sm font-bold theme-muted sm:mt-7 sm:rounded-full sm:px-5">
          וגם ניקוי שטיחים, כורסאות, כיסאות וריפודים עדינים.
        </p>
      </div>
    </section>
  );
}
