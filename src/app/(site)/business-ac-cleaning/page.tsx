import type { Metadata } from "next";
import { businessConfig } from "@/config/business";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "ניקוי מזגנים לעסקים ומוסדות | CleanBrothers",
  description: "ניקוי מזגנים למשרדים, חנויות, מסעדות ומוסדות באזור המרכז. ניקוי חד-פעמי ותוכניות ניקוי תקופתיות בהתאמה לעסק. בקשו הצעת מחיר.",
  path: "/business-ac-cleaning",
});

const sectors = ["משרדים וחברות", "מסעדות ובתי קפה", "חנויות ורשתות", "מוסדות ומבני ציבור", "חברות ניהול", "קליניקות ומרכזי שירות"];

export default function BusinessAcCleaningPage() {
  const message = "שלום, אשמח להצעת מחיר לניקוי מזגנים לעסק (חד-פעמי או תקופתי).";
  const whatsapp = buildDirectWhatsAppLink(message);
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-20" dir="rtl">
      <section className="rounded-3xl bg-sky-50 px-6 py-12 text-slate-900 md:px-12">
        <p className="mb-4 text-sm font-bold text-sky-800">CleanBrothers לעסקים</p>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">ניקוי מזגנים לעסקים ומוסדות</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8">ניקוי מקצועי למזגנים במשרדים, חנויות, מסעדות ומבנים מסחריים. שירות חד-פעמי או תוכנית ניקוי תקופתית המותאמת לצורכי העסק ולמספר היחידות.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="rounded-xl bg-sky-700 px-6 py-4 font-bold text-white hover:bg-sky-800" href={whatsapp} target="_blank" rel="noopener noreferrer">קבלת הצעת מחיר בוואטסאפ</a>
          <a className="rounded-xl border border-sky-700 px-6 py-4 font-bold text-sky-900" href={`tel:${businessConfig.phoneDisplay}`}>שיחה עם נציג</a>
        </div>
      </section>
      <section className="py-14">
        <h2 className="text-2xl font-bold">למי השירות מתאים?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map(sector => <div key={sector} className="rounded-2xl border border-slate-200 bg-white p-6 font-semibold text-slate-900">{sector}</div>)}
        </div>
      </section>
      <section className="rounded-3xl bg-slate-50 p-8 text-slate-900">
        <h2 className="text-2xl font-bold">ניקוי חד-פעמי או תוכנית תקופתית</h2>
        <p className="mt-4 leading-8">ניתן לתאם ניקוי נקודתי למספר מזגנים או לבקש הצעה לתוכנית ניקוי חוזרת. תדירות השירות והיקפו ייקבעו בהתאם לסוג המערכות, תנאי השימוש, הגישה והצרכים התפעוליים.</p>
        <p className="mt-4 leading-8">מטפלים במזגנים עיליים ובמערכות מיני מרכזיות בהתאם לגישה ולמאפייני המערכת. למערכות מסחריות אחרות נבדוק התאמה לפני התחייבות לביצוע.</p>
      </section>
      <section className="py-14">
        <h2 className="text-2xl font-bold">איך מקבלים הצעת מחיר?</h2>
        <p className="mt-4 max-w-3xl leading-8">שלחו לנו את סוג העסק, היישוב, מספר המזגנים, סוגי המערכות ותמונות אם אפשר. ציינו אם מדובר בניקוי חד-פעמי או בשירות תקופתי, ונחזור עם הצעה בהתאם לפרטי העבודה.</p>
        <a className="mt-6 inline-block rounded-xl bg-sky-700 px-6 py-4 font-bold text-white hover:bg-sky-800" href={whatsapp} target="_blank" rel="noopener noreferrer">שליחת פרטי העסק בוואטסאפ</a>
      </section>
    </div>
  );
}
