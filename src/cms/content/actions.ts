"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { mutatePilot } from "./repository";
import { ContentValidationError, parseGeneration, parseRevisionId, PILOT_KEY } from "./pilot-model";

export type ContentActionState = { message: string; ok: boolean; revision?: string };
export async function contentAction(_previous: ContentActionState, form: FormData): Promise<ContentActionState> {
  try {
    // Each exported Server Action is an independent authorization boundary.
    await requireCmsAdmin();
    const generation = parseGeneration(form.get("generation"));
    const revision = parseRevisionId(form.get("revision"));
    const kind = form.get("intent");
    let result: string;
    if (kind === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 100_000) throw new ContentValidationError();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { throw new ContentValidationError(); }
      result = await mutatePilot({ kind, generation, revision, payload });
    } else if (kind === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new ContentValidationError("יש לאשר במפורש פרסום של הגרסה השמורה.");
      result = await mutatePilot({ kind, generation, revision });
    } else if (kind === "restore") {
      result = await mutatePilot({ kind, generation, revision, source: parseRevisionId(form.get("source")) });
    } else throw new ContentValidationError();
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${PILOT_KEY}`);
    return { ok: true, revision: result, message: kind === "publish" ? "הגרסה פורסמה בסביבה המקומית." : "הטיוטה נשמרה. הפרסום לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof ContentValidationError ? error.message : "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את העמוד." };
  }
}
