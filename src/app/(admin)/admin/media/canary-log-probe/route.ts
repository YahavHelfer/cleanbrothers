import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { authenticatedMediaEnvironmentEnabled } from "@/cms/media/environment";
import { privateMediaHeaders } from "@/cms/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = "cms-media-production";
const canaryPath = "bfda2262-42aa-446d-b148-70c3197e4d67.webp";

function storageFailure(error: unknown) {
  const rawStatus = error && typeof error === "object" && "statusCode" in error ? error.statusCode : null;
  const storageStatus = typeof rawStatus === "number" && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus : typeof rawStatus === "string" && /^[45]\d\d$/.test(rawStatus)
      ? Number(rawStatus) : null;
  const rawCode = error && typeof error === "object" && "code" in error ? error.code : null;
  const storageCode = typeof rawCode === "string" && /^[A-Za-z0-9_]{1,48}$/.test(rawCode)
    ? rawCode : null;
  return { storageStatus, storageCode,
    storageCategory: storageStatus === 401 || storageStatus === 403 ? "authorization"
      : storageStatus === 404 ? "not_found" : "other" } as const;
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
  let downloadSuccess = false;
  let storageStatus: number | null = null;
  let storageCode: string | null = null;
  let storageCategory: "ok" | "not_found" | "authorization" | "other" = "other";
  let byteLength: number | null = null;
  let expectedSizeMatch: boolean | null = null;

  try {
    const { data, error } = await client.storage.from(bucket).download(canaryPath);
    if (error || !data) {
      ({ storageStatus, storageCode, storageCategory } = storageFailure(error));
    } else {
      downloadSuccess = true;
      storageCategory = "ok";
      byteLength = data.size;
      expectedSizeMatch = data.size === 44;
    }
  } catch (error) {
    ({ storageStatus, storageCode, storageCategory } = storageFailure(error));
  }

  // Metadata existence and non-registration were verified immediately before
  // the one-shot request with a read-only query against the exact CMS project.
  console.info(JSON.stringify({ category: "cms_media_canary_download", adminAuth: true,
    versionRegistered: false, metadataRowExists: true, downloadSuccess,
    storageStatus, storageCode, storageCategory, byteLength, expectedSizeMatch }));
  return new Response(null, { status: 204, headers: privateMediaHeaders });
}
