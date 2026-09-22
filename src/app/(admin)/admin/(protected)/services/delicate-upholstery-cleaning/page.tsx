import { mediaLocalEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import Link from "next/link";
import { getPilotEditor } from "@/cms/content/repository";
import { PILOT_KEY } from "@/cms/content/pilot-model";
import { ServiceEditor, RestoreRevision } from "@/cms/content/ServiceEditor";

export default async function ServiceEditorPage() {
  const { snapshot, userId } = await getPilotEditor();
  if (!snapshot) return <p>יש לייבא תחילה את תוכן השירות לסביבת התוכן.</p>;
  const mediaChoices = mediaLocalEnabled() ? await getMediaChoices() : undefined;
  return <section className="grid gap-7">
    <Link href="/admin/services" prefetch={false}>חזרה לשירותים</Link>
    <h1 className="text-3xl font-black">עריכת ריפודים עדינים</h1>
    <div className="rounded-2xl border theme-card p-5" aria-label="מצב פרסום">
      <p>פורסם: גרסה {snapshot.history.find((r) => r.id === snapshot.publishedRevisionId)?.number} · טיוטה: גרסה {snapshot.history.find((r) => r.id === snapshot.draftRevisionId)?.number}</p>
      <p>{snapshot.draftRevisionId === snapshot.publishedRevisionId ? "הטיוטה תואמת לגרסה שפורסמה" : "יש שינויים שלא פורסמו"}</p>
      <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
    </div>
    <ServiceEditor key={snapshot.generation} snapshot={snapshot} mediaChoices={mediaChoices} />
    <section aria-label="היסטוריית גרסאות" className="grid gap-4">
      <h2 className="text-2xl font-black">היסטוריית גרסאות</h2>
      <p>שחזור יוצר טיוטה חדשה ואינו משנה את הפרסום. הגרסאות הקודמות נשמרות.</p>
      {snapshot.history.map((revision) => <article key={revision.id} data-revision={revision.id} className="grid gap-3 rounded-2xl border theme-card p-5">
        <h3 className="font-black">גרסה {revision.number}</h3>
        <p>{[revision.id === snapshot.publishedRevisionId && "פורסם", revision.id === snapshot.draftRevisionId && "טיוטה"].filter(Boolean).join(" · ") || "גרסה היסטורית"}</p>
        <p>עורך/ת: {revision.createdBy === null ? "ייבוא התוכן הקיים" : revision.createdBy === userId ? "את/ה" : `מנהל/ת ${revision.createdBy.slice(0, 8)}`}</p>
        <time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time>
        {revision.sourceRevisionId && <p>שוחזר מגרסה {snapshot.history.find((r) => r.id === revision.sourceRevisionId)?.number}</p>}
        <Link href={`/admin/preview/services/${PILOT_KEY}?revision=${revision.id}`} prefetch={false}>תצוגה מקדימה של גרסה {revision.number}</Link>
        <RestoreRevision key={`${revision.id}-${snapshot.generation}`} generation={snapshot.generation} revision={snapshot.draftRevisionId} source={revision.id} />
      </article>)}
    </section>
  </section>;
}
