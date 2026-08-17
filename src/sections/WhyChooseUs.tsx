const trustItems = [
  "הצעת מחיר מראש",
  "שירות עד הבית",
  "ציוד וחומרים מקצועיים",
  "עבודה נקייה ומסודרת",
];

export function WhyChooseUs() {
  return (
    <section
      id="why-us"
      className="reveal theme-section-soft py-10 sm:py-12 lg:py-14"
    >
      <div className="section-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-turquoise">למה לבחור בנו?</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)] sm:text-4xl">
            שירות מקצועי, פשוט וברור
          </h2>
          <p className="mt-3 text-base leading-7 theme-muted sm:text-lg">
            שולחים תמונה, מקבלים הערכת מחיר ומתאמים ניקוי עד הבית.
          </p>
        </div>

        <ul className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex min-h-20 items-center gap-2.5 rounded-[1.25rem] border theme-card px-3 py-3 sm:min-h-24 sm:gap-3 sm:px-4"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-turquoise/14 text-sm font-black text-turquoise-dark ring-1 ring-turquoise/20"
              >
                ✓
              </span>
              <span className="text-sm font-black leading-6 text-[var(--foreground)] sm:text-base">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
