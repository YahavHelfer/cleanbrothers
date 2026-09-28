import "server-only";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { pageGeneration, pageUuid } from "@/cms/pages/model";
import { requireSiteEnvironment } from "./environment";
import { siteKinds, SiteValidationError, validateSitePayload, type SiteDocumentKind,
  type SitePayload } from "./model";

export type SiteRevisionSummary = { id: string; number: number; createdAt: string; createdBy: string | null;
  baseRevisionId: string | null; sourceRevisionId: string | null };
export type SiteEditorSnapshot = { updatedAt: string; generation: number; draftRevisionId: string;
  publishedRevisionId: string; publishedBy: string | null; draft: SitePayload; history: SiteRevisionSummary[] };

function checkedKind(value: unknown): SiteDocumentKind {
  if (!siteKinds.includes(value as SiteDocumentKind)) throw new SiteValidationError();
  return value as SiteDocumentKind;
}
async function authorizedClient() {
  const admin = await requireCmsAdmin();
  requireSiteEnvironment();
  return { userId: admin.userId, client: await createCmsServerClient() };
}
export async function getSiteEditor(input: unknown) {
  const kind = checkedKind(input);
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_site_editor", { kind });
  if (error) throw new Error("CMS site read unavailable");
  const snapshot = data ? { ...data, draft: validateSitePayload(kind,data.draft) } as SiteEditorSnapshot : null;
  return { userId, snapshot };
}
export async function getSiteRevision(input: unknown, id: unknown) {
  const kind = checkedKind(input);
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_site_revision", { kind, target_revision: pageUuid(id) });
  if (error) throw new Error("CMS site revision unavailable");
  return data ? { id: pageUuid(data.id), number: data.number as number,
    payload: validateSitePayload(kind,data.payload) } : null;
}
export async function getSitePageRoutes() {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_site_page_routes");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("CMS site routes unavailable");
  return data as Record<string,string>;
}
export type SiteMutation = { intent: "save"; generation: number; revision: string; payload: SitePayload }
  | { intent: "publish"; generation: number; revision: string }
  | { intent: "restore"; generation: number; revision: string; source: string };
export async function mutateSite(inputKind: unknown, input: SiteMutation) {
  const kind = checkedKind(inputKind);
  const { client } = await authorizedClient();
  const expected_generation = pageGeneration(input.generation);
  const revision = pageUuid(input.revision);
  const result = input.intent === "publish"
    ? await client.rpc("cms_publish_site_revision", { kind, expected_generation, revision })
    : await client.rpc("cms_save_site_draft", { kind, expected_generation, base_revision: revision,
      payload: input.intent === "save" ? validateSitePayload(kind,input.payload) : null,
      restore_revision: input.intent === "restore" ? pageUuid(input.source) : null });
  if (result.error?.code === "PT409" || result.error?.code === "40001")
    throw new SiteValidationError("עורך אחר שינה את המסמך. השינויים שלך נשארו בטופס ולא נשמרו. טענו מחדש לפני ניסיון נוסף.");
  if (result.error?.code === "22023" || result.error?.code === "55000")
    throw new SiteValidationError("לא ניתן לפרסם קישור לעמוד שאינו מפורסם, או שהמסמך אינו תקין.");
  if (result.error) throw new Error("CMS site write unavailable");
  return pageUuid(result.data);
}
