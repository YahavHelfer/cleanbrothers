import { SectionHeading } from "@/components/SectionHeading";

const testimonials = [
  {
    name: "דניאל",
    city: "פתח תקווה",
    service: "ניקוי ספה",
    snippet: "שלחתי תמונה וקיבלתי מחיר ברור",
    review:
      "שלחתי תמונה בוואטסאפ וקיבלתי מחיר ברור תוך כמה דקות. הגיעו בזמן, עבדו נקי והספה נראית הרבה יותר טוב.",
  },
  {
    name: "שיראל",
    city: "ראש העין",
    service: "ניקוי מזרן",
    snippet: "הגיעו בזמן והסבירו הכל מראש",
    review:
      "שירות נעים ומסודר מהשיחה הראשונה. הסבירו מה אפשר לצפות, הגיעו עם ציוד מקצועי והתוצאה הייתה מצוינת.",
  },
  {
    name: "נועה",
    city: "כפר סבא",
    service: "ניקוי ריפודי רכב",
    snippet: "הרכב הרגיש נקי ורענן",
    review:
      "הרכב הרגיש נקי ורענן אחרי הטיפול. השירות היה מהיר, מקצועי ונוח כי הגיעו עד אליי.",
  },
];

const trustIndicators = ["שירות עד הבית", "מענה מהיר", "חומרים מקצועיים"];

export function Testimonials() {
  return (
    <section className="reveal theme-section-clean relative overflow-hidden py-9 sm:py-16 lg:py-18">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <SectionHeading
          eyebrow="לקוחות אמיתיים"
          title="חוות דעת בגובה העיניים"
          description="פידבק מלקוחות שפנו בוואטסאפ, קיבלו הסבר ברור והזמינו ניקוי בבית הלקוח."
          tone="light"
        />

        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2 sm:mt-6">
          {trustIndicators.map((indicator) => (
            <span
              key={indicator}
              className="rounded-full border border-turquoise/20 bg-turquoise/8 px-3 py-1 text-xs font-black text-turquoise-dark"
            >
              {indicator}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:mt-7 md:grid-cols-3 lg:gap-5">
          {testimonials.map((testimonial, index) => (
            <article
              key={`${testimonial.name}-${testimonial.city}`}
              className={`card-lift reveal relative overflow-hidden rounded-[1.25rem] border theme-card p-4 hover:border-turquoise/40 sm:rounded-[2rem] sm:p-6 stagger-${index + 1}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-3 text-6xl font-black leading-none text-turquoise/10 sm:left-6 sm:top-4 sm:text-7xl"
              >
                ״
              </span>

              <div className="relative mb-3 flex items-start justify-between gap-3 sm:mb-4">
                <div className="min-w-0">
                  <p className="text-lg font-black leading-tight text-[var(--foreground)] sm:text-xl">
                    {testimonial.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold theme-muted">
                    <span>{testimonial.city}</span>
                    <span className="h-1 w-1 rounded-full bg-turquoise/60" />
                    <span>{testimonial.service}</span>
                  </div>
                  <div
                    className="mt-2 flex text-sm leading-none text-turquoise sm:text-base"
                    aria-label="דירוג 5 כוכבים"
                  >
                    <span aria-hidden="true">★★★★★</span>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-turquoise/18 bg-turquoise/8 px-2.5 py-1 text-[0.68rem] font-black text-turquoise-dark sm:px-3 sm:text-xs">
                  לקוח אמיתי
                </span>
              </div>

              <div className="mb-3 inline-flex max-w-full rounded-2xl rounded-tr-sm border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-6 theme-muted">
                {testimonial.snippet}
              </div>

              <blockquote className="relative border-r-2 border-turquoise/35 pr-3 text-sm leading-7 text-[var(--foreground)] sm:pr-4 sm:text-base sm:leading-8">
                {testimonial.review}
              </blockquote>

              <div className="mt-3 flex items-center gap-3 border-t border-[var(--card-border)] pt-3 sm:mt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-turquoise/14 text-base font-black text-turquoise-dark ring-1 ring-turquoise/20 sm:h-10 sm:w-10 sm:text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--foreground)] sm:text-base">
                    {testimonial.name}
                  </p>
                  <p className="text-xs font-bold theme-muted sm:text-sm">
                    לקוח/ה מרוצה
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
