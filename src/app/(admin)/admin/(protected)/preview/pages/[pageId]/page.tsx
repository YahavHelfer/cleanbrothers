import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { mediaEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import { PageBlocksView, type BlockMedia, type BlockPromotions } from "@/cms/pages/PageBlocksView";
import { pagesEnvironmentAllowed } from "@/cms/pages/environment";
import { pageUuid } from "@/cms/pages/model";
import { getPageRevision, getPromotionRevision } from "@/cms/pages/repository";

export const metadata: Metadata = { title: "תצוגה מקדימה פרטית | CleanBrothers", robots: { index: false, follow: false } };
export default async function PagePreview({ params: routeParams, searchParams }: {
  params: Promise<{ pageId: string }>; searchParams: Promise<{ revision?: string | string[] }>;
}) {
  await requireCmsAdmin();
  if (!pagesEnvironmentAllowed() || (await routeParams).pageId !== "about") notFound();
  let id: string;
  try { id = pageUuid((await searchParams).revision); } catch { notFound(); }
  const revision = await getPageRevision(id);
  if (!revision) notFound();
  const promotionIds = [...new Set(revision.payload.blocks.flatMap(block => block.promotionRevisionId ? [block.promotionRevisionId] : []))];
  const [promotionRows, choices] = await Promise.all([
    Promise.all(promotionIds.map(promotionId => getPromotionRevision(promotionId))),
    mediaEnabled() ? getMediaChoices() : Promise.resolve([]),
  ]);
  if (promotionRows.some(row => !row)) notFound();
  const promotions: BlockPromotions = Object.fromEntries(promotionRows.map(row => [row!.id, row!.payload]));
  const media: BlockMedia = Object.fromEntries(choices.map(choice => [choice.versionId, { src: choice.src, altText: choice.altText }]));
  return <><aside className="mb-6 rounded-2xl border theme-card p-5" aria-label="מצב תצוגה מקדימה">
      <p className="font-black">תצוגה מקדימה — גרסה {revision.number}</p>
      <p>הגרסה השמורה הזו בלבד. פעולות יצירת קשר מושבתות; פרסום ציבורי הוא פעולה נפרדת.</p>
    </aside><PageBlocksView page={revision.payload} revisionId={revision.id} media={media} promotions={promotions} preview /></>;
}
