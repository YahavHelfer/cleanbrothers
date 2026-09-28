import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { mediaCloudEnabled, requireMediaEnvironment } from "./environment";

// Server attestation of decoded bytes and private Storage access. Never exported
// through an action, client component, browser credential or signed URL.
export function createTrustedMediaClient() {
  requireMediaEnvironment();
  const { url } = getCmsConfig();
  const key = mediaCloudEnabled()
    ? process.env.CMS_MEDIA_SERVER_KEY
    : process.env.CMS_MEDIA_LOCAL_SERVICE_KEY;
  if (!key) throw new Error("Media registration unavailable");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      }),
    },
  });
}
