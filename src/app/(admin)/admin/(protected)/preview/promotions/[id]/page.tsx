import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { resolveSafeTarget } from "@/cms/pages/model";
import { manualCampaignAdminAllowed } from "@/cms/promotions/environment";
import { readCampaign, readCampaignRevision } from "@/cms/promotions/repository";
import { PromotionPopupView } from "@/cms/promotions/PromotionPopupView";

export const metadata: Metadata = { title: "תצוגה מקדימה של מבצע | CleanBrothers", robots: { index: false, follow: false } };
export default async function CampaignPreview({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ revision?: string }>;
}) {
  await requireCmsAdmin();
  if (!manualCampaignAdminAllowed()) notFound();
  const snapshot = await readCampaign((await params).id);
  const revision = await readCampaignRevision((await searchParams).revision ?? "");
  if (!snapshot || !revision || !snapshot.history.some(row => row.id === revision.id)) notFound();
  const p = revision.payload;
  return <section className="grid gap-5" dir="rtl"><h1 className="text-3xl font-black">תצוגה מקדימה של פופאפ</h1>
    <p>גרסה {revision.number}. תצוגה פרטית, ללא אנליטיקה או פעולת קשר חיצונית.</p>
    {p.displayMode === "popup" ? <PromotionPopupView campaign={p} revisionId={revision.id} preview /> :
      <aside className="rounded-2xl border theme-card p-6"><span>{p.badgeText}</span><h2>{p.h1}</h2>
        <p>{p.description}</p><span aria-disabled="true">{p.cta.label}</span><small>{p.terms}</small>
        <span hidden>{resolveSafeTarget(p.cta.target, true)}</span></aside>}
  </section>;
}
