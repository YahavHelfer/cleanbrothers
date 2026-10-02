import { requireCmsAdmin } from "@/cms/authorization";
import { listMedia } from "@/cms/media/repository";
import { Library } from "@/cms/media/Library";
import { UploadForm } from "@/cms/media/UploadForm";
import { mediaByteLimit, mediaUploadEnabled } from "@/cms/media/environment";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { createCmsServerClient } from "@/cms/server";

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

async function logCanaryProbe() {
  const client = await createCmsServerClient();
  let downloadSuccess = false;
  let storageStatus: number | null = null;
  let storageCode: string | null = null;
  let storageCategory: "ok" | "not_found" | "authorization" | "other" = "other";
  let byteLength: number | null = null;
  let expectedSizeMatch: boolean | null = null;
  try {
    const { data, error } = await client.storage.from("cms-media-production").download(canaryPath);
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
  console.info(JSON.stringify({ category: "cms_media_probe_a", adminAuth: true,
    downloadSuccess, storageStatus, storageCode, storageCategory, byteLength, expectedSizeMatch }));
}

export default async function MediaPage({ searchParams }: {
  searchParams: Promise<{ storageProbe?: string | string[] }>;
}) {
  await requireCmsAdmin();
  const { storageProbe } = await searchParams;
  if (storageProbe === "canary-a" && process.env.VERCEL_GIT_COMMIT_REF === "feature/cms-manual-promotions" &&
      approvedCmsPreviewIdentity()) await logCanaryProbe();
  const items = await listMedia();
  return (
    <section className="grid gap-7">
      <h1 className="text-3xl font-black">ספריית מדיה</h1>
      <p>ניהול תמונות, גרסאות ושימושים בתוכן.</p>
      {mediaUploadEnabled() && <a className="btn-primary justify-self-start" href="#upload-media">העלאת תמונה</a>}
      <Library items={items} />
      {mediaUploadEnabled()
        ? <UploadForm maxBytes={mediaByteLimit()} />
        : <p>העלאה והחלפה של תמונות אינן זמינות עד להפעלת גישת המדיה הפרטית.</p>}
    </section>
  );
}
