const trustItems = [
  "זמינות מהירה",
  "שירות עד הבית",
  "ציוד מקצועי",
  "הצעת מחיר בוואטסאפ",
];

export function TrustStrip() {
  return (
    <section className="reveal theme-section-soft relative py-6 sm:py-10 lg:py-12">
      <div className="section-container">
        <div className="mb-3 text-center sm:mb-4">
          <span className="inline-flex rounded-full border border-turquoise/25 bg-turquoise/10 px-3.5 py-1.5 text-xs font-black text-turquoise-dark sm:px-4 sm:py-2">
            זמינים בוואטסאפ
          </span>
        </div>
        <div className="theme-glass mx-auto max-w-5xl rounded-[1.5rem] border p-2.5 sm:rounded-[2rem] sm:p-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {trustItems.map((item, index) => (
              <div
                key={item}
                className={`card-lift reveal rounded-[1.15rem] border border-[var(--glass-border)] bg-[var(--glass)] px-2.5 py-2.5 text-center text-xs font-black text-[var(--foreground)] hover:border-turquoise/35 hover:bg-turquoise/10 hover:text-turquoise sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-sm stagger-${index + 1}`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
