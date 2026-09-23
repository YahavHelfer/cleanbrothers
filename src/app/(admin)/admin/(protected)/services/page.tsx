import Link from "next/link";
import { getServiceEditor } from "@/cms/content/repository";
import { managedServiceKeys, serviceRegistry } from "@/content/service-registry";

export default async function ServicesPage() {
  const services = await Promise.all(managedServiceKeys.map(async key => ({ key, ...await getServiceEditor(key) })));
  return <section className="grid gap-6">
    <h1 className="text-3xl font-black">ניהול שירותים</h1>
    {services.map(({ key, snapshot, userId }) => <article key={key} className="grid gap-4 rounded-3xl border theme-card p-6">
      <h2 className="text-xl font-black">{snapshot?.draft.publicTitle || serviceRegistry[key].crmName}</h2>
      {snapshot ? <>
        <p>פורסם: גרסה {snapshot.history.find(r => r.id === snapshot.publishedRevisionId)?.number}</p>
        <p>טיוטה: גרסה {snapshot.history.find(r => r.id === snapshot.draftRevisionId)?.number}</p>
        <p>{snapshot.draftRevisionId === snapshot.publishedRevisionId ? "הטיוטה תואמת לגרסה שפורסמה" : "יש שינויים שלא פורסמו"}</p>
        <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
        <p>עורך/ת אחרון/ה: {snapshot.history[0]?.createdBy === null ? "ייבוא התוכן הקיים" : snapshot.history[0]?.createdBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
        <p>מפרסם/ת אחרון/ה: {snapshot.publishedBy == null ? "ייבוא התוכן הקיים" : snapshot.publishedBy === userId ? "את/ה" : "מנהל/ת נוסף/ת"}</p>
        <Link href={`/admin/services/${key}`} prefetch={false} className="btn-primary justify-self-start">עריכת השירות</Link>
      </> : <p>השירות עדיין לא יובא לסביבת התוכן.</p>}
    </article>)}
    <p>ניקוי מזגנים וניקוי חלונות — עדיין לא מנוהל במערכת</p>
  </section>;
}
