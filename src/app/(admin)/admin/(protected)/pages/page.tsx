import Link from "next/link";
import { notFound } from "next/navigation";
import { pagesEnvironmentAllowed } from "@/cms/pages/environment";
import { getPageEditor } from "@/cms/pages/repository";

export default async function PagesPage() {
  if (!pagesEnvironmentAllowed()) notFound();
  const { snapshot, userId } = await getPageEditor();
  return <section className="grid gap-6" aria-labelledby="pages-title">
    <h1 id="pages-title" className="text-3xl font-black">ניהול עמודים</h1>
    <p>ניהול עמודי תוכן בתבניות מאושרות. יצירת עמודים וכתובות חדשות אינה זמינה בשלב זה.</p>
    <article className="grid gap-4 rounded-3xl border theme-card p-6">
      <h2 className="text-xl font-black">{snapshot?.draft.publicTitle || "אודות CleanBrothers"}</h2>
      <p>כתובת ציבורית: <bdi>/about</bdi></p>
        <p>סטטוס CMS: {snapshot ? "פיילוט עמוד אודות" : "ממתין לייבוא עמוד אודות"}</p>
      {snapshot ? <>
        <p>פורסם: גרסה {snapshot.history.find(revision => revision.id === snapshot.publishedRevisionId)?.number}</p>
        <p>טיוטה: גרסה {snapshot.history.find(revision => revision.id === snapshot.draftRevisionId)?.number}</p>
        <p>{snapshot.draftRevisionId === snapshot.publishedRevisionId ? "אין שינויים ממתינים לפרסום" : "יש טיוטה שלא פורסמה"}</p>
        <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
        <p>עורך/ת אחרון/ה: {snapshot.history[0]?.createdBy === null ? "ייבוא התוכן הקיים" : snapshot.history[0]?.createdBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
        <p>מפרסם/ת אחרון/ה: {snapshot.publishedBy === null ? "ייבוא התוכן הקיים" : snapshot.publishedBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
        <Link href="/admin/pages/about" prefetch={false} className="btn-primary justify-self-start">עריכת העמוד</Link>
      </> : <p>העמוד עדיין לא יובא ל־CMS.</p>}
    </article>
    <Link href="/admin/pages/about/promotion" prefetch={false} className="underline">מבצע הפיילוט</Link>
  </section>;
}
