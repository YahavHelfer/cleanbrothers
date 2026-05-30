import { GalleryGrid } from "@/components/GalleryGrid";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

export const metadata = buildMetadata({
  title: "גלריית לפני ואחרי | CleanBrothers ניקוי ריפודים",
  description:
    "גלריית לפני ואחרי לניקוי ספות, ריפודים, שטיחים וריפודי רכב. CleanBrothers מספקים שירות ניקוי מקצועי בבית הלקוח במרכז.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="גלריית עבודות"
        title="לפני ואחרי - תוצאות שמדברות ברור"
        description="דוגמאות מניקוי ספה, מזרן, שטיח וריפודי רכב. אפשר לשלוח תמונה דומה בוואטסאפ ולקבל הערכת מחיר לפי מצב הריפוד."
        ctaLabel="שלחו תמונה וקבלו מחיר"
        ctaHref={getWhatsAppLink(
          "היי, ראיתי את הגלריה ואשמח לשלוח תמונה לקבלת הערכת מחיר.",
        )}
      />

      <section className="section-block reveal">
        <div className="section-container">
          <div className="mb-7 rounded-[1.5rem] border theme-card p-5 sm:mb-10 sm:rounded-[2rem] sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise sm:h-14 sm:w-14">
                <Icon name="gallery" />
              </span>
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  תמונות לדוגמה מתוצאות ניקוי
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 theme-muted sm:mt-3 sm:text-base sm:leading-8">
                  הגלריה מציגה דוגמאות לפני ואחרי כדי להמחיש את סוגי התוצאות
                  האפשריות. בהמשך ניתן להחליף או להוסיף תמונות אמיתיות נוספות
                  מעבודות חדשות של CleanBrothers.
                </p>
              </div>
            </div>
          </div>

          <GalleryGrid />
        </div>
      </section>
    </>
  );
}
