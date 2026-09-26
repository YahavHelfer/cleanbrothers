import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import { PageEditor, RestorePageRevision } from "@/cms/pages/PageEditor";
import { pagesEnvironmentAllowed } from "@/cms/pages/environment";
import { getPageEditor, getPromotionEditor } from "@/cms/pages/repository";
import { newPagesEnvironmentAllowed } from "@/cms/pages/new-environment";
import { getNewPageEditor } from "@/cms/pages/new-repository";
import { NewPageDuplicateForm, NewPageLifecycleForm } from "@/cms/pages/NewPageForms";
import { pageUuid } from "@/cms/pages/model";

export default async function EditPage({ params }: { params: Promise<{ pageId: string }> }) {
  if (!pagesEnvironmentAllowed()) notFound();
  const pageId = (await params).pageId;
  if (pageId !== "about") {
    if (!newPagesEnvironmentAllowed()) notFound();
    try { pageUuid(pageId); } catch { notFound(); }
    const [{ snapshot, userId }, { snapshot: promotion }, mediaChoices] = await Promise.all([
      getNewPageEditor(pageId), getPromotionEditor(), mediaEnabled() ? getMediaChoices() : Promise.resolve([]),
    ]);
    if (!snapshot) notFound();
    return <section className="grid gap-7"><Link href="/admin/pages" prefetch={false}>חזרה לעמודים</Link>
      <h1 className="text-3xl font-black">עריכת עמוד: {snapshot.draft.publicTitle}</h1>
      <p>מצב: {snapshot.lifecycle} · כתובת נוכחית: <bdi>/{snapshot.currentSlug}</bdi> · תבנית: {snapshot.template}</p>
      <p>פורסם: {snapshot.publishedRevisionId ? `גרסה ${snapshot.history.find(row => row.id === snapshot.publishedRevisionId)?.number}` : "טרם פורסם"}
        {' '}· טיוטה: גרסה {snapshot.history.find(row => row.id === snapshot.draftRevisionId)?.number}</p>
      {snapshot.lifecycle !== "archived" && <PageEditor key={snapshot.generation} snapshot={snapshot} pageId={pageId}
        mediaChoices={mediaChoices} promotionRevisions={promotion?.history.map(row => ({ id: row.id, number: row.number })) || []} />}
      <section aria-label="היסטוריית גרסאות" className="grid gap-4"><h2 className="text-2xl font-black">היסטוריית גרסאות</h2>
        {snapshot.history.map(revision => <article key={revision.id} className="rounded-2xl border theme-card p-5">
          <h3>גרסה {revision.number} — {revision.createdBy === userId ? "את/ה" : revision.createdBy ? "מנהל/ת נוסף/ת" : "ייבוא"}</h3>
          <Link href={`/admin/preview/pages/${pageId}?revision=${revision.id}`} prefetch={false}>תצוגה מקדימה מדויקת</Link>
          {snapshot.lifecycle !== "archived" && <RestorePageRevision snapshot={snapshot} source={revision.id} pageId={pageId} />}
        </article>)}
      </section>
      {snapshot.lifecycle !== "archived" && <NewPageDuplicateForm source={pageId} />}
      {snapshot.lifecycle === "published" && <NewPageLifecycleForm snapshot={snapshot} kind="unpublish" label="ביטול פרסום" />}
      {(["draft-only", "unpublished"] as string[]).includes(snapshot.lifecycle) &&
        <NewPageLifecycleForm snapshot={snapshot} kind="archive" label="העברה לארכיון" />}
      {snapshot.lifecycle === "archived" && <NewPageLifecycleForm snapshot={snapshot} kind="restore-archive" label="שחזור מהארכיון" />}
    </section>;
  }
  const [{ snapshot, userId }, { snapshot: promotion }, mediaChoices] = await Promise.all([
    getPageEditor(), getPromotionEditor(), mediaEnabled() ? getMediaChoices() : Promise.resolve([]),
  ]);
  if (!snapshot) return <p>יש לייבא תחילה את עמוד אודות ל־CMS.</p>;
  return <section className="grid gap-7">
    <Link href="/admin/pages" prefetch={false}>חזרה לעמודים</Link>
    <h1 className="text-3xl font-black">עריכת עמוד אודות</h1>
    <div className="rounded-2xl border theme-card p-5" aria-label="מצב פרסום">
      <p>פורסם: גרסה {snapshot.history.find(revision => revision.id === snapshot.publishedRevisionId)?.number} · טיוטה: גרסה {snapshot.history.find(revision => revision.id === snapshot.draftRevisionId)?.number}</p>
      <p>{snapshot.draftRevisionId === snapshot.publishedRevisionId ? "הטיוטה תואמת לגרסה שפורסמה" : "יש שינויים שלא פורסמו"}</p>
      <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
    </div>
    <PageEditor key={snapshot.generation} snapshot={snapshot} mediaChoices={mediaChoices}
      promotionRevisions={promotion?.history.map(revision => ({ id: revision.id, number: revision.number })) || []} />
    <section aria-label="היסטוריית גרסאות" className="grid gap-4"><h2 className="text-2xl font-black">היסטוריית גרסאות</h2>
      <p>שחזור יוצר טיוטה חדשה ואינו משנה גרסאות היסטוריות.</p>
      {snapshot.history.map(revision => <article key={revision.id} data-revision={revision.id} className="grid gap-3 rounded-2xl border theme-card p-5">
        <h3 className="font-black">גרסה {revision.number}</h3>
        <p>{[revision.id === snapshot.publishedRevisionId && "פורסם", revision.id === snapshot.draftRevisionId && "טיוטה"].filter(Boolean).join(" · ") || "גרסה היסטורית"}</p>
        <p>עורך/ת: {revision.createdBy === null ? "ייבוא התוכן הקיים" : revision.createdBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
        <time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time>
        {revision.sourceRevisionId && <p>שוחזר מגרסה {snapshot.history.find(row => row.id === revision.sourceRevisionId)?.number}</p>}
        <Link href={`/admin/preview/pages/about?revision=${revision.id}`} prefetch={false}>תצוגה מקדימה של גרסה {revision.number}</Link>
        <RestorePageRevision snapshot={snapshot} source={revision.id} />
      </article>)}
    </section>
  </section>;
}
