import { createHash } from "node:crypto";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { authenticatedMediaEnvironmentEnabled } from "@/cms/media/environment";
import { privateMediaHeaders } from "@/cms/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const versionId = "0f1c8e22-9c9b-4e8e-a281-54d38ded5484";
const bucket = "cms-media-production";
const path = `${versionId}.webp`;

function storageStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = "statusCode" in error ? error.statusCode : null;
  return typeof value === "number" && value >= 400 && value <= 599 ? value
    : typeof value === "string" && /^[45]\d\d$/.test(value) ? Number(value) : null;
}

function storageCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = "code" in error ? error.code : null;
  return typeof value === "string" && /^[A-Za-z0-9_]{1,48}$/.test(value) ? value : null;
}

function result(body: object) {
  return Response.json(body, { headers: privateMediaHeaders });
}

export async function GET() {
  if (process.env.VERCEL_GIT_COMMIT_REF !== "feature/cms-manual-promotions" ||
      !approvedCmsPreviewIdentity() || !authenticatedMediaEnvironmentEnabled())
    return new Response(null, { status: 404, headers: privateMediaHeaders });
  try {
    await requireCmsAdmin();
  } catch {
    return new Response(null, { status: 404, headers: privateMediaHeaders });
  }

  const client = await createCmsServerClient();
  const { data: version, error: rowError } = await client.from("media_versions")
    .select("storage_provider,storage_bucket,storage_path,mime_type,byte_size,content_hash")
    .eq("id", versionId).maybeSingle();
  if (rowError || !version || version.storage_provider !== "supabase" ||
      version.storage_bucket !== bucket || version.storage_path !== path ||
      version.mime_type !== "image/webp")
    return result({ adminAuth: "pass", versionRowReadable: false,
      objectDownload: { success: false, category: "not_attempted" },
      registeredSizeMatches: "unresolved", sha256Matches: "unresolved" });

  try {
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error || !data) {
      const status = storageStatus(error);
      return result({ adminAuth: "pass", versionRowReadable: true,
        objectDownload: { success: false, status, code: storageCode(error),
          category: status === 401 || status === 403 ? "authorization"
            : status === 404 ? "not_found" : "other" },
        registeredSizeMatches: "unresolved", sha256Matches: "unresolved" });
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    return result({ adminAuth: "pass", versionRowReadable: true,
      objectDownload: { success: true }, downloadedSize: bytes.length,
      registeredSizeMatches: bytes.length === version.byte_size,
      sha256Matches: createHash("sha256").update(bytes).digest("hex") === version.content_hash });
  } catch (error) {
    return result({ adminAuth: "pass", versionRowReadable: true,
      objectDownload: { success: false, status: storageStatus(error),
        code: storageCode(error), category: "other" },
      registeredSizeMatches: "unresolved", sha256Matches: "unresolved" });
  }
}
