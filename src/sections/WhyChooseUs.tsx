const trustItems = [
  "ציוד מקצועי",
  "שירות עד הבית",
  "חומרי ניקוי איכותיים",
  "יחס אישי",
  "זמינות מהירה",
  "תוצאות שנראות לעין",
];

export function WhyChooseUs() {
  return (
    <section
      id="why-us"
      className="reveal theme-section-soft relative overflow-hidden py-11 sm:py-20 lg:py-22"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />
      <div className="section-container grid gap-7 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-black text-turquoise">למה לבחור בנו?</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)] sm:mt-3 sm:text-5xl lg:text-6xl">
            שירות מדויק, נקי ומקצועי מהרגע הראשון
          </h2>
          <p className="mt-3 text-base leading-7 theme-muted sm:mt-5 sm:text-lg sm:leading-8">
            אנחנו הופכים את תהליך הניקוי לפשוט וברור: שולחים תמונה, מקבלים
            הערכת מחיר, קובעים מועד ואנחנו מגיעים עד אליכם עם כל מה שצריך.
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {trustItems.map((item, index) => (
            <div
              key={item}
              className={`card-lift reveal group flex min-h-16 items-center gap-3 rounded-[1.5rem] border theme-card p-3.5 hover:border-turquoise/40 hover:shadow-turquoise/10 sm:min-h-20 sm:gap-4 sm:rounded-[2rem] sm:p-5 stagger-${(index % 6) + 1}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-turquoise/14 font-black text-turquoise-dark shadow-[0_12px_28px_rgba(39,211,195,0.12)] ring-1 ring-turquoise/20 transition duration-300 group-hover:scale-105 sm:shadow-[0_16px_38px_rgba(39,211,195,0.14)]">
                ✓
              </span>
              <span className="text-lg font-black leading-tight text-[var(--foreground)]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
