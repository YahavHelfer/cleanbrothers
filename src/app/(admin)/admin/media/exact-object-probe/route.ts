import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { authenticatedMediaEnvironmentEnabled, mediaUploadOriginAllowed } from "@/cms/media/environment";
import { privateMediaHeaders } from "@/cms/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = "cms-media-production";
const path = "bfda2262-42aa-446d-b148-70c3197e4d67.webp";

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: privateMediaHeaders });
}

function failure(error: unknown) {
  const rawStatus = error && typeof error === "object" && "statusCode" in error ? error.statusCode : null;
  const status = typeof rawStatus === "number" ? rawStatus
    : typeof rawStatus === "string" && /^[45]\d\d$/.test(rawStatus) ? Number(rawStatus) : null;
  const rawCode = error && typeof error === "object" && "code" in error ? error.code : null;
  const code = typeof rawCode === "string" && /^[A-Za-z0-9_]{1,48}$/.test(rawCode) ? rawCode : null;
  return { success: false, status, code,
    category: status === 401 || status === 403 ? "authorization"
      : status === 404 ? "not_found" : "other" };
}

async function adminClient() {
  if (process.env.VERCEL_GIT_COMMIT_REF !== "feature/cms-manual-promotions" ||
      !approvedCmsPreviewIdentity() || !authenticatedMediaEnvironmentEnabled()) return null;
  try {
    await requireCmsAdmin();
    return await createCmsServerClient();
  } catch {
    return null;
  }
}

// Temporary exact-object probe. Never return bytes, credentials, or raw Storage errors.
export async function GET() {
  const client = await adminClient();
  if (!client) return response({ allowed: false }, 404);
  try {
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error || !data) return response({ download: failure(error) });
    return response({ download: { success: true, byteLength: data.size,
      expectedSizeMatches: data.size === 44 } });
  } catch (error) {
    return response({ download: failure(error) });
  }
}

// Only invoked after the temporary SELECT policy has been dropped.
export async function POST(request: Request) {
  if (!mediaUploadOriginAllowed(request)) return response({ allowed: false }, 404);
  const client = await adminClient();
  if (!client) return response({ allowed: false }, 404);
  try {
    const { data, error } = await client.storage.from(bucket).remove([path]);
    if (error) return response({ removal: failure(error) });
    const names = Array.isArray(data) ? data.map(item => item.name) : [];
    return response({ removal: { success: true, returnedCount: names.length,
      exactNameReported: names.includes(path) } });
  } catch (error) {
    return response({ removal: failure(error) });
  }
}
