import Link from "next/link";
import { notFound } from "next/navigation";
import { createCampaignAction } from "@/cms/promotions/actions";
import { manualCampaignAdminAllowed } from "@/cms/promotions/environment";
import { listCampaigns } from "@/cms/promotions/repository";

export default async function PromotionsPage() {
  if (!manualCampaignAdminAllowed()) notFound();
  const campaigns = await listCampaigns();
  return <section className="grid gap-6" dir="rtl"><div><h1 className="text-3xl font-black">מבצעים</h1>
    <p>מבצע רגיל פועל מרגע הפרסום עד הכיבוי. תזמון מתקדם מפעיל ומסיים מבצע אוטומטית.</p></div>
    <form action={createCampaignAction}><button className="btn-primary">מבצע חדש</button></form>
    <Link href="/admin/promotions/schedules" prefetch={false}>תזמון מתקדם (אופציונלי)</Link>
    <div className="grid gap-3">{campaigns.length === 0 && <p>עדיין אין מבצעים ידניים.</p>}
      {campaigns.map(row => <article key={row.documentId} className="grid gap-3 rounded-2xl border theme-card p-5">
        <h2 className="text-xl font-bold">{row.name}</h2><p>{row.active ? "פעיל" : "לא פעיל"}</p>
        <div className="flex gap-4"><Link href={`/admin/promotions/${row.documentId}`} prefetch={false}>עריכה</Link>
          <Link href={`/admin/preview/promotions/${row.documentId}?revision=${row.draftRevisionId}`} prefetch={false}>תצוגה מקדימה</Link></div>
      </article>)}</div>
  </section>;
}
