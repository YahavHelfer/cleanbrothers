"use server";

import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { PageValidationError, pageGeneration, pageUuid, type PageDraft } from "./model";
import { createNewPage, duplicateNewPage, mutateNewPage, type NewPageTemplate } from "./new-repository";
import { PageSlugError, validateNewPageSlug } from "./routes";

export type NewPageActionState = { ok: boolean; message: string; pageId?: string; revision?: string };
const failed = (error: unknown): NewPageActionState => ({ ok: false, message:
  error instanceof PageValidationError || error instanceof PageSlugError ? error.message :
    "הפעולה לא הושלמה. בדקו את ההרשאה וטענו מחדש את העמוד." });
function titleOf(form: FormData): string {
  const title = form.get("title");
  if (typeof title !== "string" || !title.trim() || title.length > 120 || /[<>\u0000-\u001f]/u.test(title))
    throw new PageValidationError("שם העמוד אינו תקין.");
  return title;
}
export async function createNewPageAction(_previous: NewPageActionState, form: FormData): Promise<NewPageActionState> {
  try {
    await requireCmsAdmin();
    const template = form.get("template");
    if (!["blank", "standard", "promotion"].includes(String(template))) throw new PageValidationError();
    const pageId = await createNewPage(titleOf(form),validateNewPageSlug(form.get("slug")),template as NewPageTemplate);
    revalidatePath("/admin/pages");
    return { ok: true, pageId, message: "העמוד נוצר כטיוטה בלבד." };
  } catch (error) { return failed(error); }
}
export async function duplicateNewPageAction(source: string, _previous: NewPageActionState,
  form: FormData): Promise<NewPageActionState> {
  try {
    await requireCmsAdmin();
    const pageId = await duplicateNewPage(pageUuid(source),titleOf(form),validateNewPageSlug(form.get("slug")));
    revalidatePath("/admin/pages");
    return { ok: true, pageId, message: "העותק נוצר כטיוטה נפרדת, ללא פרסום או הפניות." };
  } catch (error) { return failed(error); }
}
export async function newPageAction(pageId: string, _previous: NewPageActionState,
  form: FormData): Promise<NewPageActionState> {
  try {
    await requireCmsAdmin();
    const generation = pageGeneration(form.get("generation"));
    const intent = form.get("intent");
    let result: string | null;
    if (intent === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 150_000) throw new PageValidationError();
      let payload: PageDraft;
      try { payload = JSON.parse(raw) as PageDraft; } catch { throw new PageValidationError(); }
      result = await mutateNewPage(pageId,{ kind: "save", generation,
        revision: pageUuid(form.get("revision")), payload });
    } else if (intent === "publish") {
      if (form.get("confirmPublish") !== "yes") throw new PageValidationError("יש לאשר במפורש את הפרסום.");
      result = await mutateNewPage(pageId,{ kind: "publish", generation,
        revision: pageUuid(form.get("revision")) });
    } else if (intent === "restore-revision") {
      result = await mutateNewPage(pageId,{ kind: "restore-revision", generation,
        revision: pageUuid(form.get("revision")), source: pageUuid(form.get("source")) });
    } else if (intent === "unpublish" || intent === "archive" || intent === "restore-archive") {
      if (form.get("confirmLifecycle") !== "yes") throw new PageValidationError("יש לאשר במפורש את הפעולה.");
      result = await mutateNewPage(pageId,{ kind: intent, generation });
    } else throw new PageValidationError();
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}`);
    revalidatePath("/sitemap.xml");
    return { ok: true, revision: result || undefined, message: intent === "publish" ? "העמוד פורסם." :
      intent === "save" || intent === "restore-revision" ? "הטיוטה נשמרה; הפרסום לא השתנה." : "מצב העמוד עודכן." };
  } catch (error) { return failed(error); }
}
