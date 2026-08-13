import Link from "next/link";
import { ServiceImageCarousel } from "@/components/ServiceImageCarousel";
import { services } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

const benefits = [
  "ניקוי אבק ולכלוך שהצטברו",
  "טיפול בפילטרים ובחלקים הנגישים לניקוי",
  "הפחתת ריחות לא נעימים",
  "ניקוי מקצועי בבית הלקוח",
];

const signals = [
  "ריח לא נעים",
  "אבק מהפתח",
  "מזגן שלא נוקה זמן רב",
  "לפני תחילת הקיץ",
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
                ניקוי מזגנים לקיץ
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                מזגן נקי. אוויר נעים יותר.
              </h2>
              <p className="mt-3 text-sm leading-6 theme-muted sm:mt-5 sm:text-lg sm:leading-8">
                ניקוי מזגן מקצועי מסייע להסיר אבק, לכלוך וריחות לא נעימים
                שהצטברו ביחידה הפנימית ובפילטרים. אנחנו מגיעים עד הבית עם ציוד
                מקצועי ומבצעים ניקוי מסודר באזור המרכז.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-2 rounded-2xl border border-turquoise/15 bg-turquoise/[0.06] px-3 py-2.5 text-sm font-bold"
                  >
                    <span className="mt-0.5 text-turquoise-dark" aria-hidden="true">
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
                {signals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border theme-card px-2.5 py-1 text-[0.7rem] font-black theme-muted sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    {signal}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
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
                השירות הוא ניקוי מקצועי ואינו תיקון טכני. אם נשארת תקלה לאחר
                הניקוי, ייתכן שיידרש טכנאי מזגנים מוסמך.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
