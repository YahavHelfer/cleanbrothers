import Link from "next/link";
import { createCampaignAction, selectCampaignForPlacementAction } from "./actions";
import { manualCampaignAdminAllowed } from "./environment";
import { isPlacementKey } from "./model";
import { listCampaigns } from "./repository";

export async function CampaignPlacementSection({ placement }: { placement: string }) {
  if (!manualCampaignAdminAllowed() || !isPlacementKey(placement)) return null;
  const campaigns = await listCampaigns();
  const active = campaigns.find(row => row.activePlacements.includes(placement));
  return <section className="grid gap-3 rounded-2xl border theme-card p-5" aria-label="מבצע בעמוד" dir="rtl">
    <h2 className="text-xl font-black">מבצע בעמוד</h2>
    <p>{active ? `פעיל: ${active.name}` : "אין מבצע פעיל בעמוד הזה."}</p>
    {active && <Link href={`/admin/preview/promotions/${active.documentId}?revision=${active.publishedRevisionId}`} prefetch={false}>תצוגה מקדימה של הגרסה הפעילה</Link>}
    <form action={createCampaignAction}><input type="hidden" name="placement" value={placement} />
      <button className="btn-primary">יצירת מבצע חדש לעמוד</button></form>
    {campaigns.length > 0 && <div className="grid gap-2"><p className="font-bold">בחירת מבצע קיים כטיוטה</p>
      {campaigns.map(row => <form key={row.documentId} action={selectCampaignForPlacementAction}>
        <input type="hidden" name="placement" value={placement} /><input type="hidden" name="id" value={row.documentId} />
        <button className="underline" type="submit">{row.name}</button>
      </form>)}
      <p className="text-sm">הבחירה יוצרת גרסה חדשה המפנה למיקום הזה; היא אינה מפרסמת עד אישור מפורש.</p></div>}
    <Link href="/admin/promotions" prefetch={false}>כל המבצעים</Link>
  </section>;
}
