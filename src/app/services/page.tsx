import { Icon } from "@/components/Icon";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { PageHero } from "@/components/PageHero";
import { services } from "@/data/site";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

export const metadata = buildMetadata({
  title: "שירותי ניקוי ספות, ריפודים ומזגנים | CleanBrothers",
  description:
    "שירותי ניקוי ספות, ריפודים, מזרנים, שטיחים, ריפודי רכב וניקוי מזגנים בבית הלקוח באזור המרכז, כולל ראש העין, פתח תקווה, כפר סבא, רמת גן ותל אביב.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="השירותים שלנו"
        title="ניקוי מקצועי לבית, לעסק ולרכב"
        description="כל שירות מותאם לסוג הפריט, מצב הכתמים ורמת הלכלוך. אנחנו מגיעים עד אליכם עם ציוד מקצועי, חומרים איכותיים והצעת מחיר ברורה לפני שמתחילים."
        ctaLabel="שלחו תמונה לקבלת מחיר"
        ctaHref={getWhatsAppLink(
          "היי, אשמח לקבל הצעת מחיר לניקוי ריפודים.",
        )}
      />

      <section className="section-block reveal">
        <div className="section-container">
          <div className="mb-7 grid gap-3 rounded-[1.5rem] border theme-card p-4 sm:mb-10 sm:grid-cols-3 sm:gap-4 sm:rounded-[2rem] sm:p-6">
            {["אבחון לפי תמונה", "מחיר ברור מראש", "שירות עד הבית"].map(
              (item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise">
                    <Icon
                      name={index === 1 ? "message" : "sparkles"}
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="font-black">{item}</span>
                </div>
              ),
            )}
          </div>

          <div className="grid gap-5 sm:gap-7">
            {services.map((service, index) => (
              <article
                key={service.title}
                className={`card-lift reveal grid overflow-hidden rounded-[1.5rem] border theme-card sm:rounded-[2rem] lg:grid-cols-[0.42fr_1fr] stagger-${(index % 6) + 1}`}
              >
                <ImageWithFallback
                  src={service.image}
                  alt={service.title}
                  fallbackLabel={service.title}
                  className="relative aspect-[16/10] w-full lg:h-full lg:min-h-72"
                  imageClassName={`object-cover ${service.imagePosition} transition duration-500 group-hover:scale-[1.025]`}
                  fallbackClassName="from-slate-100 via-white to-cyan-100 text-navy"
                  sizes="(min-width: 1024px) 38vw, 100vw"
                />

                <div className="p-5 sm:p-8">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-turquoise/18 text-turquoise-dark sm:h-14 sm:w-14">
                      <Icon name="sparkles" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-turquoise-dark">
                        שירות #{index + 1}
                      </p>
                      <h2 className="mt-1 text-2xl font-black leading-tight sm:mt-2 sm:text-3xl">
                        {service.title}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-base leading-7 theme-muted sm:mt-5 sm:text-lg sm:leading-8">
                    {service.details}
                  </p>

                  <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                    {["בדיקה לפני ניקוי", "חומרים מותאמים", "עבודה מסודרת"].map(
                      (note) => (
                        <div
                          key={note}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-navy shadow-sm sm:p-4"
                        >
                          {note}
                        </div>
                      ),
                    )}
                  </div>

                  <a
                    href={getWhatsAppLink(
                      `היי, אשמח לקבל הצעת מחיר עבור ${service.title}.`,
                    )}
                    aria-label={`פתיחת וואטסאפ לקבלת מחיר עבור ${service.title}`}
                    className="btn-primary mt-5 inline-flex sm:mt-7"
                  >
                    לקבלת מחיר בוואטסאפ
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
