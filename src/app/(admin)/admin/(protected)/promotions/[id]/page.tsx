import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignEditor } from "@/cms/promotions/CampaignEditor";
import { manualCampaignAdminAllowed } from "@/cms/promotions/environment";
import { readCampaign } from "@/cms/promotions/repository";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  if (!manualCampaignAdminAllowed()) notFound();
  let snapshot;
  try { snapshot = await readCampaign((await params).id); } catch { notFound(); }
  if (!snapshot) notFound();
  return <section className="grid gap-6" dir="rtl"><Link href="/admin/promotions" prefetch={false}>חזרה למבצעים</Link>
    <h1 className="text-3xl font-black">עריכת מבצע — {snapshot.draft.publicTitle}</h1>
    <p>מצב: {snapshot.active ? "פעיל" : "לא פעיל"}. שמירת טיוטה אינה משנה את התוכן הציבורי.</p>
    <CampaignEditor key={snapshot.generation} snapshot={snapshot} />
    <section><h2 className="text-xl font-black">גרסאות בלתי־משתנות</h2>
      {snapshot.history.map(row => <p key={row.id}>גרסה {row.number} · {row.id === snapshot.publishedRevisionId && snapshot.active ? "פעילה" : "היסטורית / טיוטה"} · <Link
        href={`/admin/preview/promotions/${snapshot.documentId}?revision=${row.id}`} prefetch={false}>תצוגה מקדימה</Link></p>)}
    </section>
  </section>;
}
