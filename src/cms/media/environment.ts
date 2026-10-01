import "server-only";
import { managedServiceKeys } from "@/content/service-registry";
import { usesCmsSource } from "@/cms/content/environment";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction, CMS_PRODUCTION_ORIGIN } from "@/cms/production-environment";
import { MAX_IMAGE_BYTES, MAX_PREVIEW_IMAGE_BYTES } from "./model";

export const PREVIEW_MEDIA_BUCKET = "cms-media-preview";
export const PREVIEW_MEDIA_ORIGIN =
  "https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";

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
  return mediaLocalEnabled()
    ? !!process.env.CMS_MEDIA_LOCAL_SERVICE_KEY?.trim()
    : approvedCmsPreviewIdentity() && mediaCloudEnabled() && !!process.env.CMS_MEDIA_SERVER_KEY?.trim();
}
// Production Storage uses the AAL2 user's JWT and RLS, never a privileged key.
export function authenticatedMediaEnvironmentEnabled() {
  return configuredCmsProduction() && mediaCloudEnabled();
}
export function mediaUploadEnabled() {
  return trustedMediaEnvironmentEnabled() || authenticatedMediaEnvironmentEnabled();
}
export function requireTrustedMediaEnvironment() {
  if (!trustedMediaEnvironmentEnabled()) throw new Error("Trusted CMS media unavailable");
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
    ? [configuredCmsProduction() ? CMS_PRODUCTION_ORIGIN : PREVIEW_MEDIA_ORIGIN]
    : mediaLocalEnabled()
      ? ["http://127.0.0.1:56300", "http://127.0.0.1:56301"]
      : [];
  return !!origin && allowed.includes(origin) &&
    request.headers.get("host") === new URL(origin).host;
}
