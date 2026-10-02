import { createHash } from "node:crypto";
import sharp from "sharp";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { authenticatedMediaEnvironmentEnabled, mediaUploadOriginAllowed } from "@/cms/media/environment";
import { privateMediaHeaders } from "@/cms/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const versionId = "bfda2262-42aa-446d-b148-70c3197e4d67";
const bucket = "cms-media-production";
const path = `${versionId}.webp`;

function status(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = "statusCode" in error ? error.statusCode : null;
  return typeof value === "number" && value >= 400 && value <= 599 ? value
    : typeof value === "string" && /^[45]\d\d$/.test(value) ? Number(value) : null;
}

function code(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = "code" in error ? error.code : null;
  return typeof value === "string" && /^[A-Za-z0-9_]{1,48}$/.test(value) ? value : null;
}

function failure(error: unknown) {
  const httpStatus = status(error);
  return { success: false, status: httpStatus, code: code(error),
    category: httpStatus === 401 || httpStatus === 403 ? "authorization"
      : httpStatus === 404 ? "not_found" : "other" };
}

function respond(body: object, httpStatus = 200) {
  return Response.json(body, { status: httpStatus, headers: privateMediaHeaders });
}

async function canaryBytes() {
  return sharp({ create: { width: 2, height: 2, channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 } } }).webp().toBuffer();
}

export async function POST(request: Request) {
  if (process.env.VERCEL_GIT_COMMIT_REF !== "feature/cms-manual-promotions" ||
      !approvedCmsPreviewIdentity() || !authenticatedMediaEnvironmentEnabled() ||
      !mediaUploadOriginAllowed(request))
    return respond({ allowed: false }, 404);
  try {
    await requireCmsAdmin();
  } catch {
    return respond({ allowed: false }, 404);
  }

  let phase: unknown;
  try {
    phase = (await request.json()).phase;
  } catch {
    return respond({ allowed: false }, 400);
  }
  if (phase !== "upload" && phase !== "read-and-delete" && phase !== "delete")
    return respond({ allowed: false }, 400);

  const client = await createCmsServerClient();
  const storage = client.storage.from(bucket);
  if (phase === "upload") {
    const bytes = await canaryBytes();
    try {
      const { data, error } = await storage.upload(path, bytes, {
        contentType: "image/webp", upsert: false, cacheControl: "0",
      });
      if (error || !data) return respond({ adminAuth: "pass", upload: failure(error) });
      return respond({ adminAuth: "pass", upload: { success: true,
        pathMatches: data.path === path, fullPathShapeMatches: data.fullPath === `${bucket}/${path}` },
        generatedByteLength: bytes.length });
    } catch (error) {
      return respond({ adminAuth: "pass", upload: failure(error) });
    }
  }

  let download: object = { success: false, category: "not_attempted" };
  if (phase === "read-and-delete") {
    try {
      const { data, error } = await storage.download(path);
      if (error || !data) download = failure(error);
      else {
        const bytes = new Uint8Array(await data.arrayBuffer());
        const expected = await canaryBytes();
        download = { success: true, byteLength: bytes.length,
          sizeMatches: bytes.length === expected.length,
          sha256Matches: createHash("sha256").update(bytes).digest("hex") ===
            createHash("sha256").update(expected).digest("hex") };
      }
    } catch (error) {
      download = failure(error);
    }
  }

  try {
    const { error } = await storage.remove([path]);
    return respond({ adminAuth: "pass", download,
      deletion: error ? failure(error) : { success: true } });
  } catch (error) {
    return respond({ adminAuth: "pass", download, deletion: failure(error) });
  }
}
