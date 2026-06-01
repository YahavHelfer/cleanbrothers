import { BeforeAfterCard } from "@/components/BeforeAfterCard";
import { SectionHeading } from "@/components/SectionHeading";
import { galleryItems } from "@/data/site";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function BeforeAfter() {
  const homepageGalleryItems = galleryItems.slice(0, 2);

  return (
    <section
      id="before-after"
      className="reveal theme-section-strong py-8 sm:py-20 lg:py-24"
    >
      <div className="section-container">
        <div className="rounded-[1.5rem] border theme-inverse-card p-3.5 transition duration-300 hover:border-turquoise/30 sm:rounded-[2rem] sm:p-8">
          <SectionHeading
            eyebrow="לפני ואחרי"
            title="תוצאות אמיתיות, בלי פילטרים מיותרים"
            mobileDescription="תוצאות לדוגמה לפני ואחרי ניקוי."
            description="דוגמאות מניקוי ספה, מזרן, שטיח וריפודי רכב. התמונות עוזרות להבין את מצב הריפוד ולקבל הצעת מחיר מדויקת יותר."
          />

          <div className="mt-5 grid gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-2">
            {homepageGalleryItems.map((item, index) => (
              <BeforeAfterCard
                key={item.title}
                className={`reveal stagger-${(index % 4) + 1}`}
                title={item.title}
                description={item.description}
                beforeImage={item.beforeImage}
                afterImage={item.afterImage}
                beforeAlt={item.beforeAlt}
                afterAlt={item.afterAlt}
              />
            ))}
          </div>

          <div className="mt-5 text-center sm:mt-10">
            <a
              href={getWhatsAppLink(
                "היי, ראיתי את התמונות לפני ואחרי ואשמח לשלוח תמונה לקבלת הערכת מחיר.",
              )}
              aria-label="שליחת תמונה בוואטסאפ לקבלת מחיר"
              className="btn-primary inline-flex min-h-10 px-4 py-2 text-xs sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
            >
              רוצים לבדוק לפי תמונה? שלחו בוואטסאפ
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
