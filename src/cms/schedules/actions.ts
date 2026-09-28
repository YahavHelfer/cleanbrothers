"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { createSchedule, editSchedule, transitionSchedule } from "./repository";
import type { Placement } from "./model";
import { scheduleUuid } from "./model";

export type ScheduleActionState = { ok: boolean; message: string };
function required(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string" || value.length > 500) throw new Error("פרטי התזמון אינם תקינים.");
  return value;
}
function placements(form: FormData): Placement[] {
  return form.getAll("placement").map(value => {
    if (typeof value !== "string" || value.length > 100) throw new Error("מיקום המבצע אינו תקין.");
    const split = value.indexOf(":");
    if (split < 1) throw new Error("מיקום המבצע אינו תקין.");
    return { kind: value.slice(0, split), target: value.slice(split + 1) } as Placement;
  });
}
function promotionSelection(form: FormData): { documentId: string; revisionId: string } {
  const value = required(form, "promotionSelection");
  const parts = value.split(":");
  if (parts.length !== 2) throw new Error("יש לבחור גרסת מבצע תקינה.");
  return { documentId: scheduleUuid(parts[0]), revisionId: scheduleUuid(parts[1]) };
}
export async function scheduleAction(_previous: ScheduleActionState, form: FormData): Promise<ScheduleActionState> {
  try {
    await requireCmsAdmin();
    const intent = required(form, "intent");
    if (intent === "create" || intent === "edit") {
      const input = { ...promotionSelection(form),
        label: required(form, "label"), startLocal: required(form, "startLocal"),
        endLocal: required(form, "endLocal"), placements: placements(form) };
      if (intent === "create") await createSchedule(input);
      else await editSchedule(required(form, "id"), Number(required(form, "version")), input);
    } else if (intent === "schedule" || intent === "cancel" || intent === "retry") {
      if (required(form, "confirm") !== "yes") throw new Error("נדרש אישור מפורש לפעולה.");
      await transitionSchedule(required(form, "id"), Number(required(form, "version")), intent);
    } else throw new Error("פעולה לא מאושרת.");
    revalidatePath("/admin/promotions/schedules");
    return { ok: true, message: "הפעולה הושלמה בסביבת ה־CMS המקומית." };
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.message.length < 160 ? error.message
      : "הפעולה נכשלה. בדקו הרשאות וטענו מחדש." };
  }
}
