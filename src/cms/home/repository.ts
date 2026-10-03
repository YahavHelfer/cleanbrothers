import "server-only";
import { validateImageCollections } from "@/cms/service-images/model";
import type { ServiceImageCollections } from "./service-card-images";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { PageValidationError, pageGeneration, pageUuid } from "@/cms/pages/model";
import { requireHomeEnvironment } from "./environment";
import { addHiddenGoogleReviewsBlock } from "./google-reviews-bootstrap";
import { validateHomeDraft, type HomeDraft } from "./model";

export type HomeRevisionSummary = { id: string; number: number; createdAt: string;
  createdBy: string | null; baseRevisionId: string | null; sourceRevisionId: string | null };
export type HomeSnapshot = { updatedAt: string; generation: number; draftRevisionId: string;
  publishedRevisionId: string; publishedBy: string | null; draft: HomeDraft; serviceImages: ServiceImageCollections; history: HomeRevisionSummary[] };

async function authorizedClient(mediaScopeMutation = false) {
  const admin = await requireCmsAdmin();
  requireHomeEnvironment();
  return { userId: admin.userId, client: await createCmsServerClient(false, mediaScopeMutation) };
}
export async function getHomeEditor(): Promise<{ userId: string; snapshot: HomeSnapshot | null }> {
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_home_editor");
  if (error) throw new Error("CMS homepage read unavailable");
  return { userId, snapshot: data ? { ...data, draft: validateHomeDraft(data.draft), serviceImages: validateImageCollections(data.serviceImages) } : null };
}
export async function getHomeRevision(id: string): Promise<{ id: string; number: number; payload: HomeDraft } | null> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_home_revision", { target_revision: pageUuid(id) });
  if (error) throw new Error("CMS homepage revision unavailable");
  return data ? { id: pageUuid(data.id), number: data.number, payload: validateHomeDraft(data.payload) } : null;
}

export type HomeMutation = { kind: "save"; generation: number; revision: string; payload: HomeDraft; serviceImages?: ServiceImageCollections }
  | { kind: "publish"; generation: number; revision: string }
  | { kind: "restore"; generation: number; revision: string; source: string };
export async function mutateHome(input: HomeMutation): Promise<string> {
  const { client } = await authorizedClient(true);
  const generation = pageGeneration(input.generation), revision = pageUuid(input.revision);
  const { data, error } = input.kind === "publish"
    ? await client.rpc("cms_publish_home_revision", { expected_generation: generation, revision })
    : await client.rpc("cms_save_home_shared_draft", { service_images: input.kind === "save" && input.serviceImages ? validateImageCollections(input.serviceImages) : null, expected_generation: generation, base_revision: revision,
      payload: input.kind === "save" ? validateHomeDraft(input.payload) : null,
      restore_revision: input.kind === "restore" ? pageUuid(input.source) : null });
  if (error?.code === "PT409" || error?.code === "40001")
    throw new PageValidationError("עורך אחר שינה את דף הבית. השינויים שלך נשארו בטופס ולא נשמרו. העתיקו אותם וטענו מחדש לפני ניסיון נוסף.");
  if (error) throw new Error("CMS homepage write unavailable");
  return pageUuid(data);
}

export async function bootstrapHomeGoogleReviews(expectedGeneration: number, expectedRevision: string):
  Promise<{ created: boolean; revision: string }> {
  const generation = pageGeneration(expectedGeneration), revision = pageUuid(expectedRevision);
  const { snapshot } = await getHomeEditor();
  if (!snapshot) throw new PageValidationError("דף הבית עדיין לא יובא ל־CMS.");
  if (snapshot.generation !== generation || snapshot.draftRevisionId !== revision)
    throw new PageValidationError("עורך אחר שינה את דף הבית. טענו מחדש לפני הוספת הביקורות.");
  const payload = addHiddenGoogleReviewsBlock(snapshot.draft);
  if (!payload) return { created: false, revision };
  const saved = await mutateHome({ kind: "save", generation, revision, payload });
  return { created: true, revision: saved };
}
