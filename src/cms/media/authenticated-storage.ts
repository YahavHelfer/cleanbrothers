import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { createCmsServerClient } from "@/cms/server";
import { authenticatedMediaEnvironmentEnabled } from "./environment";
import { MAX_PREVIEW_IMAGE_BYTES, mediaId, MediaError } from "./model";

// One private bucket for authenticated uploads from approved Preview and Production.
export const AUTHENTICATED_MEDIA_BUCKET = "cms-media-production";
const pathFor = (id: string) => `${mediaId(id)}.webp`;

function requireAuthenticatedMedia() {
  if (!authenticatedMediaEnvironmentEnabled()) throw new MediaError("העלאת מדיה אינה זמינה.", 503);
}

export async function writeAuthenticatedImage(id: string, bytes: Uint8Array) {
  requireAuthenticatedMedia();
  if (!bytes.length || bytes.length > MAX_PREVIEW_IMAGE_BYTES) throw new MediaError();
  const client = await createCmsServerClient();
  const { error } = await client.storage.from(AUTHENTICATED_MEDIA_BUCKET).upload(pathFor(id), bytes, {
    contentType: "image/webp", upsert: false, cacheControl: "0",
  });
  if (error) throw new MediaError();
}

async function checkedDownload(id: string, hash: string, admin: boolean) {
  requireAuthenticatedMedia();
  const client = admin ? await createCmsServerClient() : (() => {
    const { url, key } = getCmsConfig();
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", redirect: "error" }) },
    });
  })();
  const { data, error } = await client.storage.from(AUTHENTICATED_MEDIA_BUCKET).download(pathFor(id));
  if (error || !data || !data.size || data.size > MAX_PREVIEW_IMAGE_BYTES) throw new MediaError();
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new MediaError();
  return bytes;
}

export const readAuthenticatedImage = (id: string, hash: string) => checkedDownload(id, hash, true);
export const readPublishedImage = (id: string, hash: string) => checkedDownload(id, hash, false);

// Only definite registration failures may reach this compensation path.
export async function discardUnregisteredAuthenticatedImage(id: string) {
  requireAuthenticatedMedia();
  const client = await createCmsServerClient();
  const { error } = await client.storage.from(AUTHENTICATED_MEDIA_BUCKET).remove([pathFor(id)]);
  if (error) throw new MediaError();
}
