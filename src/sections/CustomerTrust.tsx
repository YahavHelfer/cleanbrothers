const trustStats = [
  {
    title: "שירות עד הבית",
    description: "מגיעים לבית, לרכב או לעסק עם כל הציוד הדרוש.",
  },
  {
    title: "מענה מהיר",
    description: "אפשר לשלוח תמונה בוואטסאפ ולקבל הערכה ראשונית.",
  },
  {
    title: "חומרים מקצועיים",
    description: "מתאימים את שיטת העבודה לסוג הריפוד והמצב שלו.",
  },
];

const returnReasons = [
  "מסבירים מראש מה אפשר לצפות מהניקוי",
  "נותנים הצעת מחיר ברורה לפי תמונה ומצב הפריט",
  "עובדים נקי ומסודר בבית הלקוח",
  "שומרים על יחס אישי גם בעבודות קטנות",
];

export function CustomerTrust() {
  return (
    <section className="reveal theme-section-clean py-8 sm:py-16 lg:py-18">
      <div className="section-container">
        <div className="grid gap-5 sm:gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-turquoise/25 bg-turquoise/10 px-4 py-2 text-sm font-black text-turquoise-dark">
              זמינים בוואטסאפ
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-[var(--foreground)] sm:mt-4 sm:text-4xl">
              למה לקוחות חוזרים אלינו?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 theme-muted sm:hidden">
              תהליך קצר וברור: שולחים תמונה, מקבלים הערכה וקובעים זמן.
            </p>
            <p className="mt-3 hidden max-w-2xl text-base leading-7 theme-muted sm:mt-4 sm:block sm:text-lg sm:leading-8">
              כי מעבר לניקוי עצמו, חשוב לנו שהתהליך יהיה ברור, נעים ומקצועי:
              שולחים תמונה, מקבלים הערכה, קובעים זמן ואנחנו מגיעים מוכנים.
            </p>

            <div className="mt-5 grid gap-2.5 sm:mt-7 sm:gap-3">
              {returnReasons.map((reason, index) => (
                <div
                  key={reason}
                  className={`card-lift reveal flex items-center gap-2.5 rounded-[1.15rem] border theme-card px-3 py-2.5 sm:rounded-[1.5rem] sm:px-4 sm:py-3 stagger-${index + 1}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-turquoise/14 text-sm font-black text-turquoise-dark">
                    ✓
                  </span>
                  <span className="font-bold text-[var(--foreground)]">
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {trustStats.map((stat, index) => (
              <article
                key={stat.title}
                className={`card-lift reveal rounded-[1.25rem] border theme-card p-3.5 text-center sm:rounded-[2rem] sm:p-5 stagger-${index + 1}`}
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-turquoise shadow-[0_0_18px_rgba(39,211,195,0.42)]" />
                <h3 className="text-xl font-black text-[var(--foreground)]">
                  {stat.title}
                </h3>
                <p className="mt-2 text-sm leading-6 theme-muted sm:mt-3 sm:leading-7">
                  {stat.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
