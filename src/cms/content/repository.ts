import "server-only";
import { requireMediaEnvironment } from "@/cms/media/environment";
import { resolveMediaProjection } from "@/cms/media/resolve";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { requireContentEnvironment } from "./environment";
import { ContentValidationError, parseRevisionId, PILOT_KEY } from "./pilot-model";

import { requireServiceKey, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { validateServiceDraft, type ServiceDraft } from "./service-model";

export type RevisionSummary = { id: string; number: number; createdAt: string; createdBy: string | null;
  baseRevisionId: string | null; sourceRevisionId: string | null };
export type ServiceEditorSnapshot = { generation: number; updatedAt: string; draftRevisionId: string;
  publishedRevisionId: string; publishedBy?: string | null; draft: ServiceDraft; history: RevisionSummary[] };

export async function getServiceEditor(key: ManagedServiceKey): Promise<{ snapshot: ServiceEditorSnapshot | null; userId: string }> {
  const admin = await requireCmsAdmin();
  requireContentEnvironment();
  requireServiceKey(key);
  const client = await createCmsServerClient();
  // A single SQL snapshot pairs the form payload, generation, pointers and history.
  const { data, error } = await client.rpc("cms_read_service_editor", { target_key: key });
  if (error) throw new Error("CMS content read unavailable");
  return { userId: admin.userId, snapshot: data ? { ...data, draft: validateServiceDraft(key, data.draft) } : null };
}

export async function getServiceRevision(key: ManagedServiceKey, id: string) {
  await requireCmsAdmin();
  requireContentEnvironment();
  requireServiceKey(key);
  const revisionId = parseRevisionId(id);
  const client = await createCmsServerClient();
  const { data, error } = await client.from("content_revisions")
    .select("id, revision_number, schema_version, public_title, h1, seo_title, seo_description, body")
    .eq("document_id", serviceRegistry[key].documentId).eq("id", revisionId).maybeSingle();
  if (error) throw new Error("CMS revision read unavailable");
  if (!data) return null;
  let media;
  if (data.schema_version >= 2) {
    requireMediaEnvironment();
    const refs = await client.rpc("cms_read_revision_media", { target_revision: revisionId });
    if (refs.error) throw new Error("CMS media unavailable");
    media = resolveMediaProjection(refs.data, "admin");
  }
  return { id: data.id as string, number: data.revision_number as number, media,
    payload: validateServiceDraft(key, { ...data.body, schemaVersion: data.schema_version,
      publicTitle: data.public_title, h1: data.h1, seoTitle: data.seo_title, seoDescription: data.seo_description }) };
}

export type ContentMutation = { kind: "save"; generation: number; revision: string; payload: unknown }
  | { kind: "publish"; generation: number; revision: string }
  | { kind: "restore"; generation: number; revision: string; source: string };

export async function mutateService(key: ManagedServiceKey, input: ContentMutation): Promise<string> {
  // Deliberately authorize independently on every write, including direct calls.
  await requireCmsAdmin();
  requireContentEnvironment();
  requireServiceKey(key);
  if (!Number.isSafeInteger(input.generation) || input.generation < 1) throw new ContentValidationError();
  const revision = parseRevisionId(input.revision);
  if (input.kind === "save" && validateServiceDraft(key, input.payload).schemaVersion >= 2) requireMediaEnvironment();
  const client = await createCmsServerClient();
  const result = input.kind === "publish"
    ? await client.rpc("cms_publish_managed_revision", { target_key: key, expected_generation: input.generation, revision })
    : await client.rpc("cms_save_managed_draft", { target_key: key, expected_generation: input.generation, base_revision: revision,
      payload: input.kind === "save" ? validateServiceDraft(key, input.payload) : null,
      restore_revision: input.kind === "restore" ? parseRevisionId(input.source) : null });
  if (result.error?.code === "PT409" || result.error?.code === "40001") throw new ContentValidationError("עורך אחר שינה את השירות. השינויים שלך נשארו בטופס ולא נשמרו. העתיקו אותם וטענו מחדש לפני ניסיון נוסף.");
  if (result.error) throw new Error("CMS content write unavailable");
  return parseRevisionId(result.data);
}

// Compatibility entry points preserve existing callers while sharing one implementation.
export const getPilotEditor = () => getServiceEditor(PILOT_KEY);
export const getPilotRevision = (id: string) => getServiceRevision(PILOT_KEY, id);
export const mutatePilot = (input: ContentMutation) => mutateService(PILOT_KEY, input);
