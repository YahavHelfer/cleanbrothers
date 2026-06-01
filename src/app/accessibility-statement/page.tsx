import Link from "next/link";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";

const actions = [
  "שימוש במבנה כותרות ברור ככל האפשר.",
  "הוספת טקסט חלופי לתמונות מרכזיות.",
  "שיפור ניגודיות צבעים וקריאות טקסט.",
  "תמיכה בסיסית בניווט מקלדת ובמצבי פוקוס.",
  "התאמה למובייל ולמסכים בגדלים שונים.",
  "הוספת כלי נגישות בסיסיים לשינוי גודל טקסט, ניגודיות והדגשת קישורים.",
];

export const metadata = buildMetadata({
  title: "הצהרת נגישות | CleanBrothers",
  description:
    "הצהרת נגישות של אתר CleanBrothers, פעולות שבוצעו ודרכי פנייה בנושא נגישות.",
  path: "/accessibility-statement",
});

export default function AccessibilityStatementPage() {
  const emailHref = `mailto:${businessConfig.email}`;
  const phoneHref = `tel:${businessConfig.phoneDisplay}`;

  return (
    <section className="section-block theme-section-clean">
      <div className="section-container">
        <article className="mx-auto max-w-4xl rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-10">
          <p className="text-sm font-black text-turquoise-dark">נגישות</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
            הצהרת נגישות
          </h1>
          <p className="mt-4 text-base leading-8 theme-muted">
            אתר CleanBrothers נמצא בתהליך הנגשה ושיפור מתמיד. אנחנו עושים מאמץ
            לאפשר חוויית שימוש נוחה וברורה ככל האפשר לכלל המשתמשים.
          </p>

          <section className="mt-7 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
            <h2 className="text-xl font-black">פעולות שבוצעו באתר</h2>
            <ul className="mt-3 grid gap-2 text-base leading-7 theme-muted">
              {actions.map((action) => (
                <li key={action} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-turquoise" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 rounded-2xl border border-turquoise/20 bg-turquoise/8 p-4">
            <h2 className="text-xl font-black">פניות בנושא נגישות</h2>
            <p className="mt-2 text-base leading-8 theme-muted">
              אם מצאתם בעיית נגישות באתר, נשמח שתיצרו קשר וננסה לטפל בנושא
              בהקדם האפשרי.
            </p>
            <div className="mt-3 grid gap-2 text-sm font-bold theme-muted">
              <span>CleanBrothers</span>
              <Link href={phoneHref} className="hover:text-turquoise-dark">
                {businessConfig.phoneDisplay}
              </Link>
              <Link href={emailHref} className="hover:text-turquoise-dark">
                {businessConfig.email}
              </Link>
            </div>
          </section>

          <p className="mt-7 text-sm font-bold theme-muted">
            תאריך עדכון אחרון: 1 ביוני 2026
          </p>
        </article>
      </div>
    </section>
  );
}
