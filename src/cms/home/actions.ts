"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { PageValidationError, pageGeneration, pageUuid } from "@/cms/pages/model";
import { mutateHome } from "./repository";

export type HomeActionState = { ok: boolean; message: string; revision?: string };
export async function homeAction(_previous: HomeActionState, form: FormData): Promise<HomeActionState> {
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
      result = await mutateHome({ kind: "save", generation, revision, payload: payload as never });
    } else if (intent === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new PageValidationError("יש לאשר במפורש את פרסום הגרסה השמורה.");
      result = await mutateHome({ kind: "publish", generation, revision });
    } else if (intent === "restore") {
      result = await mutateHome({ kind: "restore", generation, revision, source: pageUuid(form.get("source")) });
    } else throw new PageValidationError();
    revalidatePath("/admin/pages");
    revalidatePath("/admin/pages/home");
    revalidatePath("/");
    return { ok: true, revision: result, message: intent === "publish" ?
      "גרסת דף הבית פורסמה בסביבת התוכן המאושרת." : "טיוטת דף הבית נשמרה. הפרסום לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof PageValidationError ? error.message :
      "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את דף הבית." };
  }
}
