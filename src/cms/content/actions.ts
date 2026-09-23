"use server";

import { requireServiceKey } from "@/content/service-registry";
import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { mutateService } from "./repository";
import { ContentValidationError, parseGeneration, parseRevisionId } from "./pilot-model";

export type ContentActionState = { message: string; ok: boolean; revision?: string };
export async function contentAction(_previous: ContentActionState, form: FormData): Promise<ContentActionState> {
  try {
    // Each exported Server Action is an independent authorization boundary.
    await requireCmsAdmin();
    const key = requireServiceKey(form.get("serviceKey"));
    const generation = parseGeneration(form.get("generation"));
    const revision = parseRevisionId(form.get("revision"));
    const kind = form.get("intent");
    let result: string;
    if (kind === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 100_000) throw new ContentValidationError();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { throw new ContentValidationError(); }
      result = await mutateService(key, { kind, generation, revision, payload });
    } else if (kind === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new ContentValidationError("יש לאשר במפורש פרסום של הגרסה השמורה.");
      result = await mutateService(key, { kind, generation, revision });
    } else if (kind === "restore") {
      result = await mutateService(key, { kind, generation, revision, source: parseRevisionId(form.get("source")) });
    } else throw new ContentValidationError();
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${key}`);
    return { ok: true, revision: result, message: kind === "publish" ? "הגרסה פורסמה בסביבת התוכן הנוכחית." : "הטיוטה נשמרה. הפרסום לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof ContentValidationError ? error.message : "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את העמוד." };
  }
}
