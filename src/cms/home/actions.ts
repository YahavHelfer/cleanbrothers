"use server";

import { revalidatePath } from "next/cache";
import { managedServiceKeys, serviceRegistry } from "@/content/service-registry";
import { validateImageCollections } from "@/cms/service-images/model";
import { requireCmsAdmin } from "@/cms/authorization";
import { PageValidationError, pageGeneration, pageUuid } from "@/cms/pages/model";
import { bootstrapHomeGoogleReviews, mutateHome } from "./repository";

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
      const images = form.get("serviceImages");
      result = await mutateHome({ kind: "save", generation, revision, payload: payload as never,
        ...(typeof images === "string" ? { serviceImages: validateImageCollections(JSON.parse(images)) } : {}) });
    } else if (intent === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new PageValidationError("יש לאשר במפורש את פרסום הגרסה השמורה.");
      result = await mutateHome({ kind: "publish", generation, revision });
    } else if (intent === "restore") {
      result = await mutateHome({ kind: "restore", generation, revision, source: pageUuid(form.get("source")) });
    } else throw new PageValidationError();
    revalidatePath("/admin/pages");
    revalidatePath("/admin/pages/home");
    revalidatePath("/");
    revalidatePath("/services");
    for (const key of managedServiceKeys) revalidatePath(serviceRegistry[key].path);
    return { ok: true, revision: result, message: intent === "publish" ?
      "גרסת דף הבית פורסמה בסביבת התוכן המאושרת." : "טיוטת דף הבית נשמרה. הפרסום לא השתנה." };
  } catch (error) {
    return { ok: false, message: error instanceof PageValidationError ? error.message :
      "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את דף הבית." };
  }
}

export async function bootstrapGoogleReviewsAction(_previous: HomeActionState, form: FormData): Promise<HomeActionState> {
  try {
    await requireCmsAdmin();
    const generation = pageGeneration(form.get("generation"));
    const revision = pageUuid(form.get("revision"));
    const result = await bootstrapHomeGoogleReviews(generation, revision);
    if (result.created) {
      revalidatePath("/admin/pages/home");
      revalidatePath("/admin/preview/pages/home");
    }
    return { ok: true, revision: result.revision, message: result.created ?
      "בלוק הביקורות נוסף כטיוטה מוסתרת. דף הבית הציבורי לא השתנה." :
      "בלוק הביקורות כבר קיים בטיוטה. לא נוצרה גרסה נוספת." };
  } catch (error) {
    return { ok: false, message: error instanceof PageValidationError ? error.message :
      "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את דף הבית." };
  }
}
