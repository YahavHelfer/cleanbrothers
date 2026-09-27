import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { staticHomeMedia } from "@/cms/home/HomeBlocksView";
import { mediaEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import { BlockView, type BlockMedia } from "@/cms/pages/PageBlocksView";
import { getPromotionRevision } from "@/cms/pages/repository";
import type { PageBlock } from "@/cms/pages/model";
import { scheduleUuid } from "@/cms/schedules/model";
import { schedulesLocalEnabled } from "@/cms/schedules/environment";
import { listSchedules } from "@/cms/schedules/repository";

export const metadata: Metadata = { title: "תצוגת מבצע מתוזמן פרטית | CleanBrothers",
  robots: { index: false, follow: false } };

export default async function SchedulePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireCmsAdmin();
  if (!schedulesLocalEnabled()) notFound();
  let id: string;
  try { id = scheduleUuid((await params).id); } catch { notFound(); }
  const { schedules } = await listSchedules();
  const schedule = schedules.find(item => item.id === id);
  if (!schedule) notFound();
  const [revision, choices] = await Promise.all([getPromotionRevision(schedule.promotionRevisionId),
    mediaEnabled() ? getMediaChoices() : Promise.resolve([])]);
  if (!revision) notFound();
  const media: BlockMedia = { ...staticHomeMedia,
    ...Object.fromEntries(choices.map(choice => [choice.versionId, { src: choice.src, altText: choice.altText }])) };
  const block: PageBlock = { id: schedule.id, position: 0, type: "promotionBanner", schemaVersion: 1,
    hidden: false, payload: { template: revision.payload.template }, mediaVersionId: null,
    promotionRevisionId: revision.id };
  return <section className="grid gap-6"><div className="rounded-2xl border theme-card p-5">
    <h1 className="text-2xl font-black">תצוגה מקדימה פרטית — {schedule.label}</h1>
    <p>מבצע גרסה {revision.number}, מיקום: {schedule.placements.map(item => `${item.kind}:${item.target}`).join(", ")}.</p>
    <p>זו הדמיה בלבד: אינה מפעילה תזמון, מעקב, שיחת טלפון או שליחת ליד.</p>
  </div><BlockView block={block} media={media} promotions={{ [revision.id]: revision.payload }}
    preview revisionId={revision.id} /></section>;
}
