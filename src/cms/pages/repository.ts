import "server-only";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { requirePagesEnvironment } from "./environment";
import { PageValidationError, pageGeneration, pageUuid, validatePageDraft,
  validatePromotionDraft, type PageDraft, type PromotionDraft } from "./model";

export type TypedRevisionSummary = { id: string; number: number; createdAt: string; createdBy: string | null;
  baseRevisionId: string | null; sourceRevisionId: string | null };
export type PageSnapshot = { updatedAt: string; generation: number; draftRevisionId: string;
  publishedRevisionId: string; publishedBy: string | null; draft: PageDraft; history: TypedRevisionSummary[] };
export type PromotionSnapshot = { updatedAt: string; generation: number; draftRevisionId: string;
  publishedRevisionId: string; status: "active" | "archived"; analyticsIdentity: "about-intro";
  draft: PromotionDraft; history: TypedRevisionSummary[] };

async function authorizedClient() {
  const admin = await requireCmsAdmin();
  requirePagesEnvironment();
  return { userId: admin.userId, client: await createCmsServerClient() };
}
export async function getPageEditor(): Promise<{ userId: string; snapshot: PageSnapshot | null }> {
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_page_editor");
  if (error) throw new Error("CMS page read unavailable");
  return { userId, snapshot: data ? { ...data, draft: validatePageDraft(data.draft) } : null };
}
export async function getPageRevision(id: string): Promise<{ id: string; number: number; payload: PageDraft } | null> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_page_revision", { target_revision: pageUuid(id) });
  if (error) throw new Error("CMS page revision unavailable");
  return data ? { id: pageUuid(data.id), number: data.number, payload: validatePageDraft(data.payload) } : null;
}
export async function getPublishedPageForLocalTest(): Promise<{ id: string; number: number; payload: PageDraft } | null> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_published_page");
  if (error) throw new Error("CMS published page unavailable");
  return data ? { id: pageUuid(data.id), number: data.number, payload: validatePageDraft(data.payload) } : null;
}
export async function getPromotionEditor(): Promise<{ userId: string; snapshot: PromotionSnapshot | null }> {
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_promotion_editor");
  if (error) throw new Error("CMS promotion read unavailable");
  return { userId, snapshot: data ? { ...data, draft: validatePromotionDraft(data.draft) } : null };
}
export async function getPromotionRevision(id: string): Promise<{ id: string; number: number; payload: PromotionDraft } | null> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_promotion_revision", { target_revision: pageUuid(id) });
  if (error) throw new Error("CMS promotion revision unavailable");
  return data ? { id: pageUuid(data.id), number: data.number, payload: validatePromotionDraft(data.payload) } : null;
}

type Mutation<T> = { kind: "save"; generation: number; revision: string; payload: T }
  | { kind: "publish"; generation: number; revision: string }
  | { kind: "restore"; generation: number; revision: string; source: string };
async function mutation(kind: "page" | "promotion", input: Mutation<unknown>): Promise<string> {
  const { client } = await authorizedClient();
  const generation = pageGeneration(input.generation);
  const revision = pageUuid(input.revision);
  const payload = input.kind === "save" ?
    (kind === "page" ? validatePageDraft(input.payload) : validatePromotionDraft(input.payload)) : null;
  const name = kind === "page" ? "page" : "promotion";
  const { data, error } = input.kind === "publish"
    ? await client.rpc(`cms_publish_${name}_revision`, { expected_generation: generation, revision })
    : await client.rpc(`cms_save_${name}_draft`, { expected_generation: generation, base_revision: revision,
      payload, restore_revision: input.kind === "restore" ? pageUuid(input.source) : null });
  if (error?.code === "PT409" || error?.code === "40001")
    throw new PageValidationError("עורך אחר שינה את התוכן. השינויים שלך נשארו בטופס ולא נשמרו. העתיקו אותם וטענו מחדש לפני ניסיון נוסף.");
  if (error) throw new Error("CMS page write unavailable");
  return pageUuid(data);
}
export const mutatePage = (input: Mutation<PageDraft>) => mutation("page", input);
export const mutatePromotion = (input: Mutation<PromotionDraft>) => mutation("promotion", input);
