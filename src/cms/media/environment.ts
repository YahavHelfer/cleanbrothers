import "server-only";
import { managedServiceKeys } from "@/content/service-registry";
import { usesCmsSource } from "@/cms/content/environment";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction, CMS_PRODUCTION_ORIGIN } from "@/cms/production-environment";
import { MAX_IMAGE_BYTES, MAX_PREVIEW_IMAGE_BYTES } from "./model";

export const PREVIEW_MEDIA_BUCKET = "cms-media-preview";
const PREVIEW_DEPLOYMENT_HOST = /^cleanbrothers-[a-z0-9]{8,20}-yahavs-projects-6b5e850f\.vercel\.app$/;
const PREVIEW_BRANCH_HOST = /^cleanbrothers-git-[a-z0-9-]+-yahavs-projects-6b5e850f\.vercel\.app$/;
function approvedPreviewHost(value: string | undefined, kind: "deployment" | "branch") {
  if (!value) return null;
  return (kind === "deployment" ? PREVIEW_DEPLOYMENT_HOST : PREVIEW_BRANCH_HOST).test(value)
    ? value : null;
}

export function mediaLocalEnabled() {
  return (
    process.env.CMS_MEDIA_LOCAL_ENABLED === "1" &&
    !process.env.VERCEL &&
    !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321"
  );
}
export function mediaCloudEnabled() {
  const preview = (
    process.env.CMS_MEDIA_PREVIEW_ENABLED === "1" &&
    approvedCmsPreviewIdentity() &&
    process.env.CMS_PILOT_CONTENT_SOURCE === "published" &&
    managedServiceKeys.some(usesCmsSource)
  );
  const production = process.env.CMS_MEDIA_PRODUCTION_ENABLED === "1" &&
    configuredCmsProduction();
  return preview || production;
}
// Metadata and code-owned static files need the ordinary CMS identity only.
// Preview keeps its existing rollout gate; Production Admin reads do not
// activate public service content or private Storage.
export function mediaReadEnvironmentEnabled() {
  return mediaLocalEnabled() || mediaCloudEnabled() || configuredCmsProduction();
}
export function requireMediaReadEnvironment() {
  if (!mediaReadEnvironmentEnabled()) throw new Error("CMS media unavailable");
  getCmsConfig();
}
export function trustedMediaEnvironmentEnabled() {
  return mediaLocalEnabled() && !!process.env.CMS_MEDIA_LOCAL_SERVICE_KEY?.trim();
}
// Historical Preview objects may still need the old read-only operator path.
// It is never selected for new hosted uploads or registration.
export function legacyPreviewMediaReadable() {
  return approvedCmsPreviewIdentity() && mediaCloudEnabled() &&
    !!process.env.CMS_MEDIA_SERVER_KEY?.trim();
}
// Hosted Preview and Production use the AAL2 user's JWT and Storage RLS.
export function authenticatedMediaEnvironmentEnabled() {
  return mediaCloudEnabled() &&
    (approvedCmsPreviewIdentity() || configuredCmsProduction());
}
// New hosted writes are deliberately Preview-only until a separate Production
// rollout. Legacy Supabase rows remain readable under their existing policy.
export function s3MediaEnvironmentEnabled() {
  return approvedCmsPreviewIdentity() && mediaCloudEnabled() &&
    process.env.CMS_MEDIA_S3_PREVIEW_ENABLED === "1" &&
    !!process.env.CMS_MEDIA_S3_REGION?.trim() &&
    !!process.env.CMS_MEDIA_S3_BUCKET?.trim() &&
    !!process.env.CMS_MEDIA_S3_ACCESS_KEY_ID?.trim() &&
    !!process.env.CMS_MEDIA_S3_SECRET_ACCESS_KEY?.trim() &&
    !!process.env.CMS_MEDIA_UPLOAD_CAPABILITY?.trim();
}
export function mediaUploadEnabled() {
  // Keep the already reviewed Production upload behavior unchanged; the S3
  // replacement is activated independently on the approved Preview branch.
  return trustedMediaEnvironmentEnabled() || s3MediaEnvironmentEnabled() ||
    configuredCmsProduction() && authenticatedMediaEnvironmentEnabled();
}
export function requireTrustedMediaEnvironment() {
  if (!trustedMediaEnvironmentEnabled() && !legacyPreviewMediaReadable())
    throw new Error("Trusted CMS media unavailable");
  getCmsConfig();
}
export function mediaEnabled() {
  return mediaReadEnvironmentEnabled();
}
export function mediaByteLimit() {
  return mediaCloudEnabled() ? MAX_PREVIEW_IMAGE_BYTES : MAX_IMAGE_BYTES;
}
export function requireMediaEnvironment() {
  requireMediaReadEnvironment();
}
export function requireLocalMediaEnvironment() {
  if (!mediaLocalEnabled()) throw new Error("Local CMS media unavailable");
  getCmsConfig();
}
export function requireCloudMediaEnvironment() {
  if (!mediaCloudEnabled()) throw new Error("Cloud CMS media unavailable");
  if (!trustedMediaEnvironmentEnabled() && !authenticatedMediaEnvironmentEnabled())
    throw new Error("Cloud CMS media unavailable");
}
export function mediaUploadOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = mediaCloudEnabled()
    ? configuredCmsProduction() ? [CMS_PRODUCTION_ORIGIN] : approvedCmsPreviewIdentity()
      ? [approvedPreviewHost(process.env.VERCEL_URL, "deployment"),
          approvedPreviewHost(process.env.VERCEL_BRANCH_URL, "branch")]
        .filter((host): host is string => host !== null).map(host => `https://${host}`)
      : []
    : mediaLocalEnabled()
      ? ["http://127.0.0.1:56300", "http://127.0.0.1:56301"]
      : [];
  return !!origin && allowed.includes(origin) &&
    request.headers.get("host") === new URL(origin).host;
}
