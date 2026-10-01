import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireCmsAdmin } from "@/cms/authorization";
import { getCmsConfig } from "@/cms/config";
import { pageUuid } from "@/cms/pages/model";
import { createCmsServerClient } from "@/cms/server";
import { manualCampaignAdminAllowed, manualCampaignPublicAllowed } from "./environment";
import { validateCampaignDraft, validateCampaignSnapshot, validatePublicCampaign,
  type CampaignDraft, type CampaignSnapshot, type PublicCampaign } from "./model";

async function adminClient() {
  await requireCmsAdmin();
  if (!manualCampaignAdminAllowed()) throw new Error("Manual campaigns unavailable");
  return createCmsServerClient();
}

export type CampaignListRow = { documentId: string; key: string; name: string; generation: number;
  draftRevisionId: string; publishedRevisionId: string; active: boolean; activePlacements: string[] };
export async function listCampaigns(): Promise<CampaignListRow[]> {
  const client = await adminClient();
  const { data, error } = await client.rpc("cms_read_manual_campaigns");
  if (error || !Array.isArray(data)) throw new Error("Campaign list unavailable");
  return data.map((row: CampaignListRow) => ({ ...row, documentId: pageUuid(row.documentId) }));
}
export async function readCampaign(id: string): Promise<CampaignSnapshot | null> {
  const client = await adminClient();
  const { data, error } = await client.rpc("cms_read_manual_campaign_editor", { doc_id: pageUuid(id) });
  if (error) throw new Error("Campaign unavailable");
  return data === null ? null : validateCampaignSnapshot(data);
}
export async function readCampaignRevision(id: string): Promise<{ id: string; number: number; payload: CampaignDraft } | null> {
  const client = await adminClient();
  const { data, error } = await client.rpc("cms_read_manual_campaign_revision", { target_revision: pageUuid(id) });
  if (error) throw new Error("Campaign revision unavailable");
  return data === null ? null : { id: pageUuid(data.id), number: data.number, payload: validateCampaignDraft(data.payload) };
}
export async function createCampaign(payload: CampaignDraft): Promise<string> {
  const client = await adminClient();
  const { data, error } = await client.rpc("cms_create_manual_campaign", { payload: validateCampaignDraft(payload) });
  if (error) throw new Error("יצירת המבצע נכשלה.");
  return pageUuid(data);
}
export async function saveCampaign(id: string, generation: number, revision: string, payload: CampaignDraft): Promise<string> {
  const client = await adminClient();
  const { data, error } = await client.rpc("cms_save_manual_campaign_draft", {
    doc_id: pageUuid(id), expected_generation: generation, base_revision: pageUuid(revision),
    payload: validateCampaignDraft(payload),
  });
  if (error) throw new Error(error.code === "PT409" ? "עורך אחר שינה את המבצע. טענו מחדש." : "שמירת המבצע נכשלה.");
  return pageUuid(data);
}
export async function activateCampaign(id: string, generation: number, revision: string): Promise<void> {
  const client = await adminClient();
  const { error } = await client.rpc("cms_activate_manual_campaign", {
    doc_id: pageUuid(id), expected_generation: generation, revision: pageUuid(revision),
  });
  if (error) throw new Error(error.code === "23505" ? "מיקום זה כבר מציג מבצע פעיל. בטלו אותו תחילה." :
    error.code === "PT409" ? "עורך אחר שינה את המבצע. טענו מחדש." : "פרסום המבצע נכשל.");
}
export async function disableCampaign(id: string, generation: number): Promise<void> {
  const client = await adminClient();
  const { error } = await client.rpc("cms_disable_manual_campaign", {
    doc_id: pageUuid(id), expected_generation: generation,
  });
  if (error) throw new Error(error.code === "PT409" ? "עורך אחר שינה את המבצע. טענו מחדש." : "ביטול המבצע נכשל.");
}

const paths = new Set(["/", "/about", "/services", "/contact", "/gallery", "/privacy-policy",
  "/accessibility-statement", "/data-deletion", "/delicate-upholstery-cleaning", "/sofa-cleaning",
  "/mattress-cleaning", "/carpet-cleaning", "/car-upholstery-cleaning", "/armchair-chair-cleaning",
  "/air-conditioner-cleaning", "/window-cleaning", "/post-renovation-cleaning"]);
export async function readPublicCampaign(path: string): Promise<{ revisionId: string; campaign: PublicCampaign } | null> {
  if (!paths.has(path) || !manualCampaignPublicAllowed()) return null;
  let stage: "config" | "rpc" | "projection" = "config";
  try {
    const { url, key } = getCmsConfig();
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
    });
    stage = "rpc";
    const { data, error } = await client.rpc("cms_read_public_manual_campaign", { public_path: path });
    if (error) throw error;
    if (!data) return null;
    stage = "projection";
    const revisionId = pageUuid(data.revisionId);
    const campaign = validatePublicCampaign(data.campaign);
    return campaign.enabled ? { revisionId, campaign } : null;
  } catch {
    console.error(`Public manual campaign unavailable at ${stage}`);
    return null;
  }
}
