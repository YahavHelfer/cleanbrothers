import "server-only";
import { managedServiceKeys } from "@/content/service-registry";
import { usesCmsSource } from "@/cms/content/environment";
import { getCmsConfig } from "@/cms/config";
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
  return (
    process.env.CMS_MEDIA_PREVIEW_ENABLED === "1" &&
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/cms-cloud-foundation" &&
    process.env.CMS_SUPABASE_URL === "https://plbwefnwussxlglscfpn.supabase.co" &&
    process.env.CMS_PILOT_CONTENT_SOURCE === "published" &&
    managedServiceKeys.some(usesCmsSource)
  );
}
export function mediaEnabled() {
  return mediaLocalEnabled() || mediaCloudEnabled();
}
export function mediaByteLimit() {
  return mediaCloudEnabled() ? MAX_PREVIEW_IMAGE_BYTES : MAX_IMAGE_BYTES;
}
export function requireMediaEnvironment() {
  if (!mediaEnabled()) throw new Error("CMS media unavailable");
  getCmsConfig();
}
export function requireLocalMediaEnvironment() {
  if (!mediaLocalEnabled()) throw new Error("Local CMS media unavailable");
  getCmsConfig();
}
export function requireCloudMediaEnvironment() {
  if (!mediaCloudEnabled()) throw new Error("Preview CMS media unavailable");
  getCmsConfig();
}
export function mediaUploadOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = mediaCloudEnabled()
    ? [PREVIEW_MEDIA_ORIGIN]
    : mediaLocalEnabled()
      ? ["http://127.0.0.1:56300", "http://127.0.0.1:56301"]
      : [];
  return !!origin && allowed.includes(origin) &&
    request.headers.get("host") === new URL(origin).host;
}
