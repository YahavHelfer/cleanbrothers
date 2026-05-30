import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

const values = [
  {
    title: "אמינות",
    description: "מסבירים מה אפשר לעשות ומה צפוי לפני שמתחילים.",
    icon: "shield" as const,
  },
  {
    title: "שקיפות",
    description: "הצעת מחיר ברורה לפי תמונה, סוג הריפוד והיקף העבודה.",
    icon: "message" as const,
  },
  {
    title: "זמינות",
    description: "שירות מהיר ונוח באזור המרכז, עד בית הלקוח.",
    icon: "calendar" as const,
  },
  {
    title: "עבודה מסודרת",
    description: "ציוד מקצועי, סביבת עבודה נקייה ויחס מכבד לבית.",
    icon: "sparkles" as const,
  },
];

export const metadata = buildMetadata({
  title: "אודות CleanBrothers | ניקוי ספות וריפודים בבית הלקוח",
  description:
    "הכירו את CleanBrothers, עסק צעיר ומקצועי לניקוי ספות, ריפודים, מזרנים, שטיחים וריפודי רכב בבית הלקוח באזור המרכז.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="על CleanBrothers"
        title="עסק צעיר, רציני ומקצועי שמגיע עד אליכם"
        description="CleanBrothers נולדה מתוך רצון לתת שירות ניקוי ריפודים שמרגיש אישי, מדויק ונקי באמת, עם תקשורת ברורה ועבודה מסודרת."
        ctaLabel="דברו איתנו בוואטסאפ"
        ctaHref={getWhatsAppLink(
          "היי, אשמח לשמוע פרטים על שירותי הניקוי של CleanBrothers.",
        )}
      />

      <section className="section-block reveal">
        <div className="section-container grid gap-6 sm:gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-start">
          <article className="card-lift rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/18 text-turquoise-dark sm:mb-6 sm:h-14 sm:w-14">
              <Icon name="team" />
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">
              שירות מקצועי בגובה העיניים
            </h2>
            <div className="mt-4 space-y-4 text-base leading-8 theme-muted sm:mt-6 sm:space-y-5 sm:text-lg sm:leading-9">
              <p>
                אנחנו מתמחים בניקוי ספות, מזרנים, שטיחים, כורסאות, כיסאות
                וריפודי רכב בבית הלקוח. המטרה שלנו היא להפוך את השירות לפשוט:
                שולחים תמונה, מקבלים הצעת מחיר, קובעים מועד ואנחנו מגיעים עם
                כל הציוד הדרוש.
              </p>
              <p>
                כעסק צעיר, חשוב לנו לבנות אמון דרך עבודה מסודרת, תקשורת ברורה
                ותוצאה שנראית לעין. אנחנו מקפידים על חומרים איכותיים, התאמה
                לסוג הריפוד ושמירה על סביבת עבודה נקייה.
              </p>
              <p>
                השירות מתאים למשפחות, דירות שכורות, רכבים, משרדים וכל מי שרוצה
                להחזיר לריפוד מראה נקי, נעים ומטופח בלי להחליף אותו.
              </p>
            </div>
          </article>

          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {values.map((value, index) => (
              <div
                key={value.title}
                className={`card-lift reveal rounded-[1.5rem] border theme-card p-4 hover:border-turquoise/40 sm:rounded-3xl sm:p-5 stagger-${index + 1}`}
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise">
                  <Icon name={value.icon} />
                </span>
                <h3 className="text-xl font-black">{value.title}</h3>
                <p className="mt-2 leading-7 theme-muted">
                  {value.description}
                </p>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
