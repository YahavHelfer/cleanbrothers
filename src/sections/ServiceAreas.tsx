import { serviceAreas } from "@/data/site";
import { SectionHeading } from "@/components/SectionHeading";

export function ServiceAreas() {
  return (
    <section className="reveal theme-section-clean py-8 sm:py-16 lg:py-18">
      <div className="section-container">
        <div className="grid gap-4 rounded-[1.5rem] border theme-card p-4 sm:gap-6 sm:rounded-[2rem] sm:p-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <SectionHeading
            align="start"
            eyebrow="אזורי שירות"
            title="ניקוי ריפודים עד בית הלקוח באזור המרכז"
            mobileDescription="מגיעים לערי המרכז. שולחים תמונה ומקבלים הערכה."
            description="CleanBrothers מגיעים עם ציוד מקצועי עד הבית בפתח תקווה, ראש העין, רמת גן, גבעת שמואל, תל אביב וערים נוספות במרכז. אפשר לשלוח תמונה בוואטסאפ ולקבל הערכת מחיר לפי מצב הריפוד."
            tone="light"
          />

          <div className="flex flex-wrap gap-1.5 sm:gap-3" aria-label="ערי שירות">
            {serviceAreas.map((area, index) => (
              <span
                key={area}
                className={`reveal inline-flex items-center gap-1.5 rounded-full border border-turquoise/20 bg-turquoise/8 px-3 py-1.5 text-xs font-black text-[var(--foreground)] transition duration-300 hover:border-turquoise/45 hover:bg-turquoise/12 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm stagger-${(index % 6) + 1}`}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-turquoise/16 text-[0.7rem] text-turquoise-dark"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
