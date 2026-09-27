import "server-only";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { requireSchedulesEnvironment } from "./environment";
import { scheduleLabel, scheduleUuid, scheduleVersion, validatePlacements,
  validateScheduleTimes, type Placement, type PromotionSchedule } from "./model";

async function client() {
  await requireCmsAdmin();
  requireSchedulesEnvironment();
  return createCmsServerClient();
}

export type PromotionChoice = { documentId: string; documentKey: string; revisionId: string; number: number; title: string };
export async function listSchedules(): Promise<{ schedules: PromotionSchedule[]; choices: PromotionChoice[] }> {
  const db = await client();
  const [rows, revisions] = await Promise.all([
    db.rpc("cms_read_promotion_schedules"), db.rpc("cms_read_promotion_schedule_choices"),
  ]);
  if (rows.error || revisions.error || !Array.isArray(rows.data) || !Array.isArray(revisions.data))
    throw new Error("Scheduled Promotions read unavailable");
  return { schedules: rows.data as PromotionSchedule[], choices: revisions.data as PromotionChoice[] };
}

type ScheduleInput = { revisionId: string; documentId: string; label: string;
  startLocal: string; endLocal: string; placements: Placement[] };
function validated(input: ScheduleInput) {
  return { revisionId: scheduleUuid(input.revisionId), documentId: scheduleUuid(input.documentId),
    label: scheduleLabel(input.label), ...validateScheduleTimes(input.startLocal, input.endLocal),
    placements: validatePlacements(input.placements) };
}
export async function createSchedule(input: ScheduleInput): Promise<string> {
  const db = await client();
  const v = validated(input);
  const { data, error } = await db.rpc("cms_create_promotion_schedule", {
    doc_id: v.documentId, revision_id: v.revisionId, name: v.label,
    start_time: v.startsAt, end_time: v.endsAt, placements: v.placements,
  });
  if (error) throw new Error(error.code === "23503" ? "יש לבחור גרסת מבצע שפורסמה בעבר." : "יצירת התזמון נכשלה.");
  return scheduleUuid(data);
}
export async function editSchedule(id: string, version: number, input: ScheduleInput): Promise<void> {
  const db = await client();
  const v = validated(input);
  const { error } = await db.rpc("cms_edit_promotion_schedule", { sid: scheduleUuid(id),
    expected_version: scheduleVersion(version), revision_id: v.revisionId, name: v.label,
    start_time: v.startsAt, end_time: v.endsAt, placements: v.placements });
  if (error) throw new Error(error.code === "PT409" ? "עורך אחר שינה את התזמון. טענו מחדש." : "עריכת הטיוטה נכשלה.");
}
export async function transitionSchedule(id: string, version: number, action: "schedule" | "cancel" | "retry") {
  const db = await client();
  const names = { schedule: "cms_schedule_promotion", cancel: "cms_cancel_promotion_schedule",
    retry: "cms_retry_promotion_schedule" } as const;
  const { error } = await db.rpc(names[action], { sid: scheduleUuid(id), expected_version: scheduleVersion(version) });
  if (error) throw new Error(error.code === "23505" ? "קיים תזמון חופף לאותו מיקום וזמן."
    : error.code === "PT409" ? "עורך אחר שינה את התזמון. טענו מחדש." : "שינוי מצב התזמון נכשל.");
}

/** Trusted scheduler adapter only. Never invoked by an Admin page, browser or public request. */
export async function processDuePromotionSchedules(now: Date, run: (iso: string) => Promise<number>): Promise<number> {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Trusted UTC clock required");
  requireSchedulesEnvironment();
  return run(now.toISOString());
}
