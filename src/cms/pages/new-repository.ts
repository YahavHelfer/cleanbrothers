import "server-only";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { PageValidationError, pageGeneration, pageUuid, validatePageDraft, type PageDraft } from "./model";
import { requireNewPagesEnvironment } from "./new-environment";
import { validateNewPageSlug } from "./routes";
import type { TypedRevisionSummary } from "./repository";

export type NewPageTemplate = "blank" | "standard" | "promotion";
export type NewPageLifecycle = "draft-only" | "published" | "unpublished" | "archived";
export type NewPageSummary = { id: string; title: string; slug: string; template: NewPageTemplate;
  lifecycle: NewPageLifecycle; draftRevisionId: string; publishedRevisionId: string | null;
  updatedAt: string; publishedBy: string | null };
export type NewPageSnapshot = { documentId: string; currentSlug: string; template: NewPageTemplate;
  lifecycle: NewPageLifecycle; createdAt: string; createdBy: string; updatedAt: string;
  generation: number; draftRevisionId: string; publishedRevisionId: string | null;
  publishedBy: string | null; draft: PageDraft; history: TypedRevisionSummary[] };

async function authorizedClient() {
  const admin = await requireCmsAdmin();
  requireNewPagesEnvironment();
  return { userId: admin.userId, client: await createCmsServerClient() };
}
function checkedSnapshot(data: unknown): NewPageSnapshot | null {
  if (!data) return null;
  const row = data as NewPageSnapshot;
  return { ...row, documentId: pageUuid(row.documentId), currentSlug: validateNewPageSlug(row.currentSlug),
    draftRevisionId: pageUuid(row.draftRevisionId),
    publishedRevisionId: row.publishedRevisionId ? pageUuid(row.publishedRevisionId) : null,
    draft: validatePageDraft(row.draft) };
}
function writeError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (["PT409", "40001", "23505"].includes(error.code || ""))
    throw new PageValidationError("עורך אחר שינה את העמוד או שהכתובת כבר תפוסה. השינויים שלך נשארו בטופס; טענו מחדש לפני ניסיון נוסף.");
  if (error.code === "22023") throw new PageValidationError();
  throw new Error("פעולת CMS לא הושלמה");
}
export async function listNewPages(includeArchived = false) {
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_list_new_pages", { include_archived: includeArchived });
  if (error || !Array.isArray(data)) throw new Error("CMS page list unavailable");
  return { userId, pages: data as NewPageSummary[] };
}
export async function getNewPageEditor(id: string) {
  const { userId, client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_new_page_editor", { target_page: pageUuid(id) });
  if (error) throw new Error("CMS page read unavailable");
  return { userId, snapshot: checkedSnapshot(data) };
}
export async function getNewPageRevision(pageId: string, revisionId: string) {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_read_new_page_revision", {
    target_page: pageUuid(pageId), target_revision: pageUuid(revisionId),
  });
  if (error) throw new Error("CMS page revision unavailable");
  return data ? { id: pageUuid(data.id), number: data.number as number,
    payload: validatePageDraft(data.payload) } : null;
}
export async function createNewPage(title: string, slug: string, template: NewPageTemplate): Promise<string> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_create_new_page", {
    title, slug: validateNewPageSlug(slug), template,
  });
  writeError(error);
  return pageUuid(data);
}
export async function duplicateNewPage(source: string, title: string, slug: string): Promise<string> {
  const { client } = await authorizedClient();
  const { data, error } = await client.rpc("cms_duplicate_new_page", {
    source_page: pageUuid(source), title, slug: validateNewPageSlug(slug),
  });
  writeError(error);
  return pageUuid(data);
}
export type NewPageMutation = { kind: "save"; generation: number; revision: string; payload: PageDraft }
  | { kind: "publish"; generation: number; revision: string }
  | { kind: "restore-revision"; generation: number; revision: string; source: string }
  | { kind: "unpublish" | "archive" | "restore-archive"; generation: number };
export async function mutateNewPage(pageId: string, input: NewPageMutation): Promise<string | null> {
  const { client } = await authorizedClient();
  const target_page = pageUuid(pageId);
  const expected_generation = pageGeneration(input.generation);
  let result: { data: unknown; error: { code?: string; message?: string } | null };
  if (input.kind === "save" || input.kind === "restore-revision") result = await client.rpc("cms_save_new_page_draft", {
    target_page, expected_generation, base_revision: pageUuid(input.revision),
    payload: input.kind === "save" ? validatePageDraft(input.payload) : null,
    restore_revision: input.kind === "restore-revision" ? pageUuid(input.source) : null,
  });
  else if (input.kind === "publish") result = await client.rpc("cms_publish_new_page", {
    target_page, expected_generation, revision: pageUuid(input.revision),
  });
  else result = await client.rpc(input.kind === "unpublish" ? "cms_unpublish_new_page" :
    input.kind === "archive" ? "cms_archive_new_page" : "cms_restore_new_page", {
    target_page, expected_generation,
  });
  writeError(result.error);
  return result.data ? pageUuid(result.data) : null;
}
