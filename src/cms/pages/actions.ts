"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { PageValidationError, pageGeneration, pageUuid } from "./model";
import { mutatePage, mutatePromotion } from "./repository";

export type PageActionState = { ok: boolean; message: string; revision?: string };
async function act(kind: "page" | "promotion", form: FormData): Promise<PageActionState> {
  try {
    await requireCmsAdmin();
    const generation = pageGeneration(form.get("generation"));
    const revision = pageUuid(form.get("revision"));
    const intent = form.get("intent");
    let result: string;
    if (intent === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 150_000) throw new PageValidationError();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { throw new PageValidationError(); }
      result = kind === "page" ? await mutatePage({ kind: "save", generation, revision, payload: payload as never })
        : await mutatePromotion({ kind: "save", generation, revision, payload: payload as never });
    } else if (intent === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new PageValidationError("יש לאשר במפורש פרסום של הגרסה השמורה.");
      result = kind === "page" ? await mutatePage({ kind: "publish", generation, revision })
        : await mutatePromotion({ kind: "publish", generation, revision });
    } else if (intent === "restore") {
      const source = pageUuid(form.get("source"));
      result = kind === "page" ? await mutatePage({ kind: "restore", generation, revision, source })
        : await mutatePromotion({ kind: "restore", generation, revision, source });
    } else throw new PageValidationError();
    revalidatePath("/admin/pages");
    revalidatePath(kind === "page" ? "/admin/pages/about" : "/admin/pages/about/promotion");
    return { ok: true, revision: result, message: intent === "publish" ? "הגרסה פורסמה בסביבת התוכן המאושרת." : "הטיוטה נשמרה. הפרסום לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof PageValidationError ? error.message : "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את העמוד." };
  }
}
export async function pageAction(_previous: PageActionState, form: FormData): Promise<PageActionState> {
  return act("page", form);
}
export async function promotionAction(_previous: PageActionState, form: FormData): Promise<PageActionState> {
  return act("promotion", form);
}
