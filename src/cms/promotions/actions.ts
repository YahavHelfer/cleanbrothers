"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { pageGeneration, pageUuid, PageValidationError } from "@/cms/pages/model";
import { activateCampaign, createCampaign, disableCampaign, readCampaign, saveCampaign } from "./repository";
import { defaultCampaign, isPlacementKey, validateCampaignDraft } from "./model";

export type CampaignActionState = { ok: boolean; message: string };
export async function createCampaignAction(form: FormData) {
  await requireCmsAdmin();
  const requested = form.get("placement");
  const placement = isPlacementKey(requested) ? requested : "home:home";
  const id = await createCampaign(defaultCampaign(placement));
  redirect(`/admin/promotions/${id}`);
}

export async function selectCampaignForPlacementAction(form: FormData) {
  await requireCmsAdmin();
  const id = pageUuid(form.get("id"));
  const placement = form.get("placement");
  if (!isPlacementKey(placement)) throw new PageValidationError("מיקום המבצע אינו תקין.");
  const snapshot = await readCampaign(id);
  if (!snapshot) throw new PageValidationError("המבצע לא נמצא.");
  if (!snapshot.draft.placements.includes(placement)) {
    await saveCampaign(id, snapshot.generation, snapshot.draftRevisionId,
      { ...snapshot.draft, placements: [...snapshot.draft.placements, placement] });
  }
  redirect(`/admin/promotions/${id}`);
}

export async function campaignAction(_previous: CampaignActionState, form: FormData): Promise<CampaignActionState> {
  try {
    await requireCmsAdmin();
    const id = pageUuid(form.get("id"));
    const generation = pageGeneration(form.get("generation"));
    const revision = pageUuid(form.get("revision"));
    const intent = form.get("intent");
    if (intent === "save") {
      const raw = form.get("payload");
      if (typeof raw !== "string" || raw.length > 20_000) throw new PageValidationError();
      await saveCampaign(id, generation, revision, validateCampaignDraft(JSON.parse(raw)));
    } else if (intent === "activate") {
      if (form.get("confirm") !== "yes") throw new PageValidationError("יש לאשר פרסום במפורש.");
      await activateCampaign(id, generation, revision);
    } else if (intent === "disable") {
      if (form.get("confirm") !== "yes") throw new PageValidationError("יש לאשר ביטול במפורש.");
      await disableCampaign(id, generation);
    } else throw new PageValidationError();
    revalidatePath("/admin/promotions");
    revalidatePath(`/admin/promotions/${id}`);
    return { ok: true, message: intent === "save" ? "הטיוטה נשמרה; המבצע הציבורי לא השתנה." :
      intent === "activate" ? "המבצע פורסם והופעל." : "המבצע כובה מיד." };
  } catch (error) {
    return { ok: false, message: error instanceof PageValidationError ? error.message :
      error instanceof SyntaxError ? "תוכן המבצע אינו תקין." :
      error instanceof Error && error.message.length < 120 ? error.message : "הפעולה נכשלה. טענו מחדש ונסו שוב." };
  }
}
