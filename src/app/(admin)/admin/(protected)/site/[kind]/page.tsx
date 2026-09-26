import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/cms/site/SiteEditor";
import { siteEnvironmentAllowed } from "@/cms/site/environment";
import { siteKinds, type SiteDocumentKind } from "@/cms/site/model";
import { getSiteEditor, getSitePageRoutes } from "@/cms/site/repository";

const labels: Record<SiteDocumentKind,string> = {
  settings: "הגדרות עסק", navigation: "ניווט ראשי", footer: "Footer",
};
export default async function SiteDocumentPage({ params }: { params: Promise<{kind:string}> }) {
  if (!siteEnvironmentAllowed()) notFound();
  const { kind } = await params;
  if (!siteKinds.includes(kind as SiteDocumentKind)) notFound();
  const documentKind=kind as SiteDocumentKind;
  const [{ snapshot,userId },pageRoutes] = await Promise.all([getSiteEditor(documentKind),getSitePageRoutes()]);
  if (!snapshot) return <p>יש לייבא תחילה את ה־baseline המקומי.</p>;
  const lastEditor=snapshot.history[0]?.createdBy;
  return <section className="grid gap-7">
    <Link href="/admin/site" prefetch={false}>חזרה להגדרות האתר</Link>
    <h1 className="text-3xl font-black">{labels[documentKind]}</h1>
    <div className="grid gap-2 rounded-2xl border theme-card p-5" aria-label="מצב פרסום">
      <p>פורסם: גרסה {snapshot.history.find(row=>row.id===snapshot.publishedRevisionId)?.number} · טיוטה: גרסה {snapshot.history.find(row=>row.id===snapshot.draftRevisionId)?.number}</p>
      <p>{snapshot.draftRevisionId===snapshot.publishedRevisionId?"אין שינוי ממתין לפרסום":"יש טיוטה שטרם פורסמה"}</p>
      <p>עריכה אחרונה: {lastEditor===null?"ייבוא baseline":lastEditor===userId?"את/ה":"מנהל/ת נוסף/ת"}</p>
      <p>פרסום אחרון: {snapshot.publishedBy===null?"ייבוא baseline":snapshot.publishedBy===userId?"את/ה":"מנהל/ת נוסף/ת"}</p>
      <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}</time>
    </div>
    <SiteEditor key={snapshot.generation} kind={documentKind} snapshot={snapshot} pageRoutes={pageRoutes} />
  </section>;
}
