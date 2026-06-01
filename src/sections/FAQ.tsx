import { SectionHeading } from "@/components/SectionHeading";
import { faqs } from "@/data/site";

export function FAQ() {
  return (
    <section
      id="faq"
      className="reveal theme-section-soft relative overflow-hidden py-8 sm:py-20 lg:py-22"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <SectionHeading
          eyebrow="שאלות נפוצות"
          title="כל מה שכדאי לדעת לפני שמזמינים ניקוי"
          mobileDescription="תשובות קצרות לפני שמזמינים."
          description="תשובות קצרות וברורות על ייבוש, ריחות, כתמים, בעלי חיים, מחיר ושירות עד הבית."
          tone="light"
        />

        <div className="mx-auto mt-4 max-w-4xl space-y-1.5 sm:mt-10 sm:space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className={`card-lift reveal group rounded-[1.05rem] border theme-card p-3 hover:border-turquoise/35 sm:rounded-[1.75rem] sm:p-5 stagger-${(index % 6) + 1}`}
            >
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2.5 text-sm font-black leading-5 sm:min-h-0 sm:gap-4 sm:text-lg sm:leading-normal">
                <span>{faq.question}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-turquoise/14 text-lg leading-none text-turquoise transition duration-300 group-open:rotate-45 sm:h-9 sm:w-9 sm:text-2xl">
                  +
                </span>
              </summary>
              <p className="mt-2 border-t border-[var(--card-border)] pt-2 text-sm leading-6 theme-muted sm:mt-4 sm:pt-4 sm:text-base sm:leading-8">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
