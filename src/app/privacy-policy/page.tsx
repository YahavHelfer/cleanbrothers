import Link from "next/link";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";

const policySections = [
  {
    title: "מי אנחנו",
    content:
      "CleanBrothers מספקים שירותי ניקוי ספות, מזרנים, שטיחים, ריפודים, רכבים ומזגנים בבית הלקוח.",
  },
  {
    title: "איזה מידע נאסף",
    content:
      "בעת פנייה דרך האתר, וואטסאפ או טלפון עשוי להיאסף מידע כגון שם, טלפון, עיר, סוג השירות, הודעה ותמונות שהלקוח שולח מרצונו לצורך קבלת הערכת מחיר.",
  },
  {
    title: "למה המידע משמש",
    content:
      "המידע משמש ליצירת קשר, מתן הצעת מחיר, תיאום שירות, טיפול בפנייה ושיפור השירות וחוויית המשתמש.",
  },
  {
    title: "קוקיז וכלי מדידה",
    content:
      "האתר עשוי להשתמש בקוקיז בסיסיים ובכלי מדידה לצורך שיפור חוויית המשתמש, הבנת שימוש באתר ופנייה נוחה בוואטסאפ.",
  },
  {
    title: "שמירת מידע",
    content:
      "מידע נשמר לפרק זמן סביר הדרוש לטיפול בפנייה, תיאום שירות, תיעוד פנימי ושיפור השירות.",
  },
  {
    title: "העברת מידע לצד שלישי",
    content:
      "מידע לא יועבר לצד שלישי אלא אם הדבר נדרש לצורך תפעול השירות, שמירה על זכויות, עמידה בדרישות חוק או שימוש בכלים טכנולוגיים בסיסיים להפעלת האתר.",
  },
  {
    title: "זכויות המשתמש",
    content:
      "ניתן לפנות אלינו כדי לבקש עיון, תיקון או מחיקה של מידע אישי שנמסר לנו, בכפוף להוראות הדין ולצרכי תפעול סבירים.",
  },
];

export const metadata = buildMetadata({
  title: "מדיניות פרטיות וקוקיז | CleanBrothers",
  description:
    "מדיניות פרטיות וקוקיז בסיסית של CleanBrothers: איזה מידע נאסף, למה הוא משמש ואיך ניתן ליצור קשר.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const emailHref = `mailto:${businessConfig.email}`;
  const phoneHref = `tel:${businessConfig.phoneDisplay}`;

  return (
    <section className="section-block theme-section-clean">
      <div className="section-container">
        <article className="mx-auto max-w-4xl rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-10">
          <p className="text-sm font-black text-turquoise-dark">
            פרטיות וקוקיז
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
            מדיניות פרטיות ושימוש בקוקיז
          </h1>
          <p className="mt-4 text-base leading-8 theme-muted">
            מסמך זה נועד לספק מידע כללי ושקוף על אופן השימוש במידע באתר
            CleanBrothers. הוא אינו מהווה ייעוץ משפטי ואינו מצהיר על עמידה מלאה
            בכל דרישה רגולטורית.
          </p>

          <div className="mt-6 rounded-2xl border border-turquoise/20 bg-turquoise/8 p-4">
            <h2 className="text-xl font-black">פרטי קשר</h2>
            <div className="mt-3 grid gap-2 text-sm font-bold theme-muted">
              <Link href={phoneHref} className="hover:text-turquoise-dark">
                {businessConfig.phoneDisplay}
              </Link>
              <Link href={emailHref} className="hover:text-turquoise-dark">
                {businessConfig.email}
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4">
            {policySections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-4"
              >
                <h2 className="text-xl font-black text-[var(--foreground)]">
                  {section.title}
                </h2>
                <p className="mt-2 text-base leading-8 theme-muted">
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-7 text-sm font-bold theme-muted">
            תאריך עדכון אחרון: 1 ביוני 2026
          </p>
        </article>
      </div>
    </section>
  );
}
