import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { mediaEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import { PageBlocksView, type BlockMedia, type BlockPromotions } from "@/cms/pages/PageBlocksView";
import { pagesEnvironmentAllowed } from "@/cms/pages/environment";
import { pageUuid } from "@/cms/pages/model";
import { getPageRevision, getPromotionRevision } from "@/cms/pages/repository";
import { newPagesEnvironmentAllowed } from "@/cms/pages/new-environment";
import { getNewPageRevision } from "@/cms/pages/new-repository";

export const metadata: Metadata = { title: "תצוגה מקדימה פרטית | CleanBrothers", robots: { index: false, follow: false } };
export default async function PagePreview({ params: routeParams, searchParams }: {
  params: Promise<{ pageId: string }>; searchParams: Promise<{ revision?: string | string[] }>;
}) {
  await requireCmsAdmin();
  if (!pagesEnvironmentAllowed()) notFound();
  const pageId = (await routeParams).pageId;
  if (pageId !== "about" && !newPagesEnvironmentAllowed()) notFound();
  let id: string;
  try {
    id = pageUuid((await searchParams).revision);
    if (pageId !== "about") pageUuid(pageId);
  } catch { notFound(); }
  const revision = pageId === "about" ? await getPageRevision(id) : await getNewPageRevision(pageId,id);
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
