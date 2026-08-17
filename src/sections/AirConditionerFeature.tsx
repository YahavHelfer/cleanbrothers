import Link from "next/link";
import { ServiceImageCarousel } from "@/components/ServiceImageCarousel";
import { services } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

const benefits = [
  "ניקוי אבק ולכלוך",
  "הפחתת ריחות",
  "שירות מקצועי בבית הלקוח",
];

export function AirConditionerFeature() {
  const service = services.find(
    (item) => item.landingPath === "/air-conditioner-cleaning",
  );

  if (!service) return null;

  return (
    <section className="reveal theme-section-soft py-9 sm:py-16 lg:py-18">
      <div className="section-container">
        <div className="overflow-hidden rounded-[1.5rem] border border-turquoise/25 bg-[radial-gradient(circle_at_92%_10%,_rgba(39,211,195,0.13),_transparent_34%)] shadow-lg shadow-turquoise/5 sm:rounded-[2rem]">
          <div className="grid items-stretch lg:grid-cols-[0.92fr_1.08fr]">
            <ServiceImageCarousel
              images={service.images}
              alt="ניקוי מזגנים מקצועי בבית הלקוח"
              fallbackLabel={service.title}
              className="relative aspect-[16/10] w-full lg:aspect-auto lg:min-h-[30rem]"
              imageClassName="object-cover"
              imagePosition={service.imagePosition}
              fallbackClassName="from-cyan-50 via-white to-slate-100 text-navy"
              sizes="(min-width: 1024px) 46vw, 100vw"
            />

            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <p className="text-xs font-black text-turquoise-dark sm:text-sm">
                ניקוי מזגנים מקצועי
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                מזגן נקי. אוויר נעים יותר.
              </h2>
              <p className="mt-3 text-sm leading-6 theme-muted sm:mt-5 sm:text-lg sm:leading-8">
                ניקוי עמוק להסרת אבק, עובש וריחות — בבית או בעסק.
              </p>

              <ul className="mt-5 space-y-3 sm:mt-6">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 text-sm font-bold sm:text-base"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-turquoise/10 text-sm text-turquoise-dark"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:items-center sm:gap-3">
                <a
                  href={getWhatsAppLink(
                    "היי, אשמח לשלוח תמונה של המזגן ולקבל הערכת מחיר לניקוי מזגן.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex min-h-11 px-4 py-2.5 text-sm sm:min-h-12 sm:px-6 sm:text-base"
                >
                  שלחו תמונה של המזגן וקבלו הערכת מחיר
                </a>
                <Link
                  href="/air-conditioner-cleaning"
                  className="btn-secondary inline-flex min-h-11 px-4 py-2.5 text-sm sm:min-h-12 sm:px-6 sm:text-base"
                >
                  לעמוד ניקוי מזגנים
                </Link>
              </div>

              <p className="mt-3 text-xs leading-5 theme-muted">
                השירות כולל ניקוי ואינו תיקון תקלות.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
