import Link from "next/link";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";

const deletionSections = [
  {
    title: "מה לכלול בבקשה",
    content:
      "יש לציין שם מלא, מספר טלפון רלוונטי, שם משתמש ב-Instagram אם הבקשה קשורה לפנייה דרך Instagram, ופרטים שיאפשרו לזהות את הפנייה או השיחה הרלוונטית, כגון מועד הפנייה ונושא השיחה.",
  },
  {
    title: "אימות הבקשה",
    content:
      "כדי למנוע מחיקה בעקבות בקשה לא מורשית, CleanBrothers עשויה לבקש אימות סביר של זהות הפונה או של הקשר שלו למידע לפני מחיקתו.",
  },
  {
    title: "מה קורה לאחר הגשת הבקשה",
    content:
      "לאחר האימות, CleanBrothers תבחן את הבקשה ותמחק את המידע האישי הרלוונטי ממערכות שבשליטתה, בכפוף למידע שייתכן שיהיה צורך לשמור לצרכים משפטיים, חשבונאיים, מניעת הונאה, טיפול במחלוקות או חובות לגיטימיות אחרות.",
  },
  {
    title: "מידע שהתקבל דרך Instagram / Meta",
    content:
      "הוראות אלה חלות גם על מידע אישי שהתקבל באמצעות חיבורי ההודעות של CleanBrothers ל-Meta / Instagram. המחיקה מתייחסת למידע שבשליטת CleanBrothers בלבד; אין באפשרותנו למחוק מידע שנשמר באופן עצמאי על ידי Meta בחשבון ה-Instagram שלכם או במערכות Meta.",
  },
];

export const metadata = buildMetadata({
  title: "הוראות למחיקת מידע | CleanBrothers",
  description:
    "הנחיות להגשת בקשה למחיקת מידע אישי שנמסר ל-CleanBrothers דרך האתר, WhatsApp, Instagram וערוצי תקשורת נוספים.",
  path: "/data-deletion",
});

export default function DataDeletionPage() {
  return (
    <section className="section-block theme-section-clean">
      <div className="section-container">
        <article className="mx-auto max-w-4xl rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-10">
          <p className="text-sm font-black text-turquoise-dark">פרטיות ומחיקת מידע</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
            הוראות למחיקת מידע
          </h1>
          <p className="mt-4 text-base leading-8 theme-muted">
            אם פניתם ל-CleanBrothers דרך האתר, WhatsApp, Instagram / Meta,
            טלפון או ערוצי תקשורת אחרים, ניתן לבקש מחיקה של מידע אישי
            שנשמר על ידי CleanBrothers.
          </p>

          <section className="mt-6 rounded-2xl border border-turquoise/20 bg-turquoise/8 p-4">
            <h2 className="text-xl font-black">איך מגישים בקשה</h2>
            <p className="mt-2 text-base leading-8 theme-muted">
              להגשת בקשת מחיקה, שלחו הודעת דוא״ל לכתובת של CleanBrothers
              המופיעה להלן וציינו שמדובר בבקשה למחיקת מידע אישי.
            </p>
            <div className="mt-3 grid gap-2 text-sm font-bold theme-muted">
              <Link
                href={`mailto:${businessConfig.email}`}
                className="break-words hover:text-turquoise-dark"
              >
                <bdi dir="ltr">{businessConfig.email}</bdi>
              </Link>
            </div>
          </section>

          <div className="mt-7 grid gap-4">
            {deletionSections.map((section) => (
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
            למידע נוסף על השימוש במידע אישי, עיינו ב
            <Link href="/privacy-policy" className="underline hover:text-turquoise-dark">
              מדיניות הפרטיות
            </Link>
            .
          </p>
        </article>
      </div>
    </section>
  );
}
