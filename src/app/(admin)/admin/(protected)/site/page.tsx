import Link from "next/link";
import { notFound } from "next/navigation";
import { siteEnvironmentAllowed } from "@/cms/site/environment";
import { getSiteEditor } from "@/cms/site/repository";
import { siteKinds, type SiteDocumentKind } from "@/cms/site/model";

const labels: Record<SiteDocumentKind,string> = {
  settings: "הגדרות עסק", navigation: "ניווט ראשי", footer: "Footer",
};
export default async function SitePage() {
  if (!siteEnvironmentAllowed()) notFound();
  const documents = await Promise.all(siteKinds.map(async kind => ({ kind, ...(await getSiteEditor(kind)) })));
  return <section className="grid gap-6"><h1 className="text-3xl font-black">הגדרות האתר</h1>
    <p>ניהול טיוטות, גרסאות ופרסום של פרטי העסק, הניווט וה־Footer.</p>
    {documents.map(({kind,snapshot})=><article key={kind} className="grid gap-3 rounded-2xl border theme-card p-5">
      <h2 className="text-xl font-black">{labels[kind]}</h2>
      {!snapshot ? <p>ממתין לייבוא ה־baseline המקומי.</p> : <>
        <p>מפורסם: גרסה {snapshot.history.find(row=>row.id===snapshot.publishedRevisionId)?.number} · טיוטה: גרסה {snapshot.history.find(row=>row.id===snapshot.draftRevisionId)?.number}</p>
        <p>{snapshot.draftRevisionId===snapshot.publishedRevisionId?"אין שינוי ממתין לפרסום":"יש טיוטה שטרם פורסמה"}</p>
        <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}</time></p>
        <Link href={`/admin/site/${kind}`} prefetch={false} className="btn-primary justify-self-start">עריכה וניהול</Link>
      </>}
    </article>)}
  </section>;
}
