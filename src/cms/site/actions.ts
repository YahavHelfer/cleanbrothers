"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { pageGeneration, pageUuid } from "@/cms/pages/model";
import { mutateSite } from "./repository";
import { siteKinds, SiteValidationError, type SiteDocumentKind } from "./model";

export type SiteActionState = { ok: boolean; message: string; revision?: string };
export async function siteAction(_previous: SiteActionState, form: FormData): Promise<SiteActionState> {
  try {
    await requireCmsAdmin();
    const kind = form.get("kind");
    if (!siteKinds.includes(kind as SiteDocumentKind)) throw new SiteValidationError();
    const generation = pageGeneration(form.get("generation"));
    const revision = pageUuid(form.get("revision"));
    const intent = form.get("intent");
    let result: string;
    if (intent === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 50_000) throw new SiteValidationError();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { throw new SiteValidationError(); }
      result = await mutateSite(kind, { intent, generation, revision, payload: payload as never });
    } else if (intent === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new SiteValidationError("יש לאשר במפורש את הפרסום.");
      result = await mutateSite(kind, { intent, generation, revision });
    } else if (intent === "restore") {
      result = await mutateSite(kind, { intent, generation, revision, source: pageUuid(form.get("source")) });
    } else throw new SiteValidationError();
    revalidatePath("/admin/site");
    revalidatePath(`/admin/site/${kind}`);
    return { ok: true, revision: result, message: intent === "publish" ? "הגרסה פורסמה בסביבה המקומית." : "הטיוטה נשמרה; התוכן הציבורי לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof SiteValidationError ? error.message : "הפעולה לא הושלמה. בדקו הרשאות וטענו מחדש." };
  }
}
