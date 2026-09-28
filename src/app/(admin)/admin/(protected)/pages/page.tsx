import Link from "next/link";
import { notFound } from "next/navigation";
import { pagesEnvironmentAllowed } from "@/cms/pages/environment";
import { getPageEditor } from "@/cms/pages/repository";
import { newPagesEnvironmentAllowed } from "@/cms/pages/new-environment";
import { listNewPages } from "@/cms/pages/new-repository";
import { homeEnvironmentAllowed } from "@/cms/home/environment";
import { getHomeEditor } from "@/cms/home/repository";

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ archive?: string }> }) {
  if (!pagesEnvironmentAllowed()) notFound();
  const { snapshot, userId } = await getPageEditor();
  const home = homeEnvironmentAllowed() ? await getHomeEditor() : null;
  const newPages = newPagesEnvironmentAllowed() ? await listNewPages((await searchParams).archive === "1") : null;
  return <section className="grid gap-6" aria-labelledby="pages-title">
    <h1 id="pages-title" className="text-3xl font-black">ניהול עמודים</h1>
    <p>ניהול עמודי תוכן בתבניות מאושרות. פרסום עמוד חדש אינו מוסיף אותו אוטומטית לניווט האתר.</p>
    {home && <article className="grid gap-3 rounded-3xl border theme-card p-6">
      <h2 className="text-xl font-black">דף הבית</h2>
      <p>כתובת ציבורית קבועה: <bdi>/</bdi></p>
      <p>סטטוס CMS: {home.snapshot ? "גרסת בסיס מיובאת" : "ממתין לייבוא דף הבית"}</p>
      {home.snapshot && <><p>פורסם: גרסה {home.snapshot.history.find(row=>row.id===home.snapshot!.publishedRevisionId)?.number}
        {' '}· טיוטה: גרסה {home.snapshot.history.find(row=>row.id===home.snapshot!.draftRevisionId)?.number}</p>
        <Link href="/admin/pages/home" prefetch={false} className="btn-primary justify-self-start">עריכת דף הבית</Link></>}
    </article>}
    {newPages && <div className="flex gap-4"><Link href="/admin/pages/new" prefetch={false} className="btn-primary">עמוד חדש</Link>
      <Link href="/admin/pages?archive=1" prefetch={false} className="btn-secondary">הצג ארכיון</Link></div>}
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
    {newPages?.pages.map(page => <article key={page.id} className="grid gap-3 rounded-3xl border theme-card p-6">
      <h2 className="text-xl font-black">{page.title}</h2>
      <p>כתובת: <bdi>/{page.slug}</bdi> · תבנית: {page.template}</p>
      <p>מצב: {{ "draft-only": "טיוטה בלבד", published: "מפורסם", unpublished: "לא מפורסם", archived: "בארכיון" }[page.lifecycle]}</p>
      <p>גרסה מפורסמת: {page.publishedRevisionId ? "קיימת" : "אין"} · טיוטה: קיימת</p>
      <p>עודכן: <time dateTime={page.updatedAt}>{new Date(page.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
      <p>מפרסם/ת אחרון/ה: {page.publishedBy === null ? "טרם פורסם" : page.publishedBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
      <Link href={`/admin/pages/${page.id}`} prefetch={false} className="btn-secondary justify-self-start">עריכה וניהול</Link>
    </article>)}
    <Link href="/admin/pages/about/promotion" prefetch={false} className="underline">מבצע הפיילוט</Link>
  </section>;
}
