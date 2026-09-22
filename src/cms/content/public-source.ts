import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { staticContentSource } from "@/content/static-source";
import { requireContentEnvironment } from "./environment";
import { parseRevisionId, PILOT_KEY, toPilotLanding } from "./pilot-model";

// React request memoization shares exactly one immutable published snapshot
// between generateMetadata and page rendering. No session or privileged key.
export const getPublicPilot = cache(async () => {
  // Independent opt-ins: published mode alone must never switch the public site.
  // This phase accepts exactly one service; wildcards/extra routes fail closed.
  if (process.env.CMS_PILOT_CONTENT_SOURCE !== "published" ||
      process.env.CMS_CONTENT_SERVICE_ALLOWLIST !== PILOT_KEY) {
    return { revisionId: null, page: staticContentSource.getServiceLanding(PILOT_KEY) };
  }
  requireContentEnvironment();
  await connection();
  const { url, key } = getCmsConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await client.rpc("cms_read_published_pilot");
  if (error || !data) throw new Error("Published CMS pilot unavailable");
  return { revisionId: parseRevisionId(data.revisionId), page: toPilotLanding(data.payload) };
});
