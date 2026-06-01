import { SectionHeading } from "@/components/SectionHeading";

const testimonials = [
  {
    name: "דניאל",
    city: "פתח תקווה",
    service: "ניקוי ספה",
    snippet: "שלחתי תמונה וקיבלתי מחיר ברור",
    mobileReview:
      "שלחתי תמונה, קיבלתי מחיר ברור והספה נראית הרבה יותר טוב.",
    review:
      "שלחתי תמונה בוואטסאפ וקיבלתי מחיר ברור תוך כמה דקות. הגיעו בזמן, עבדו נקי והספה נראית הרבה יותר טוב.",
  },
  {
    name: "שיראל",
    city: "ראש העין",
    service: "ניקוי מזרן",
    snippet: "הגיעו בזמן והסבירו הכל מראש",
    mobileReview:
      "שירות מסודר ונעים. הגיעו בזמן והתוצאה הייתה מצוינת.",
    review:
      "שירות נעים ומסודר מהשיחה הראשונה. הסבירו מה אפשר לצפות, הגיעו עם ציוד מקצועי והתוצאה הייתה מצוינת.",
  },
  {
    name: "נועה",
    city: "כפר סבא",
    service: "ניקוי ריפודי רכב",
    snippet: "הרכב הרגיש נקי ורענן",
    mobileReview:
      "הרכב הרגיש נקי ורענן, והשירות היה מהיר ונוח.",
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
          mobileDescription="פידבק קצר מלקוחות שהזמינו ניקוי עד הבית."
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
              className={`card-lift reveal relative overflow-hidden rounded-[1.25rem] border theme-card p-3.5 hover:border-turquoise/40 sm:rounded-[2rem] sm:p-6 stagger-${index + 1}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-2 text-5xl font-black leading-none text-turquoise/10 sm:left-6 sm:top-4 sm:text-7xl"
              >
                ״
              </span>

              <div className="relative mb-2.5 flex items-start justify-between gap-2.5 sm:mb-4 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-base font-black leading-tight text-[var(--foreground)] sm:text-xl">
                    {testimonial.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.72rem] font-bold theme-muted sm:mt-1.5 sm:text-xs">
                    <span>{testimonial.city}</span>
                    <span className="h-1 w-1 rounded-full bg-turquoise/60" />
                    <span>{testimonial.service}</span>
                  </div>
                  <div
                    className="mt-1.5 flex text-xs leading-none text-turquoise sm:mt-2 sm:text-base"
                    aria-label="דירוג 5 כוכבים"
                  >
                    <span aria-hidden="true">★★★★★</span>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-turquoise/18 bg-turquoise/8 px-2 py-0.5 text-[0.64rem] font-black text-turquoise-dark sm:px-3 sm:py-1 sm:text-xs">
                  לקוח אמיתי
                </span>
              </div>

              <div className="mb-2 inline-flex max-w-full rounded-2xl rounded-tr-sm border border-[var(--card-border)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-[0.72rem] font-bold leading-5 theme-muted sm:mb-3 sm:px-3 sm:py-2 sm:text-xs sm:leading-6">
                {testimonial.snippet}
              </div>

              <blockquote className="relative border-r-2 border-turquoise/35 pr-3 text-sm leading-6 text-[var(--foreground)] sm:pr-4 sm:text-base sm:leading-8">
                <span className="sm:hidden">{testimonial.mobileReview}</span>
                <span className="hidden sm:inline">{testimonial.review}</span>
              </blockquote>

              <div className="mt-2.5 flex items-center gap-2.5 border-t border-[var(--card-border)] pt-2.5 sm:mt-4 sm:gap-3 sm:pt-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-turquoise/14 text-sm font-black text-turquoise-dark ring-1 ring-turquoise/20 sm:h-10 sm:w-10 sm:text-lg">
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
