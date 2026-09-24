import "server-only";
import { requireMediaEnvironment } from "@/cms/media/environment";
import { resolveMediaProjection } from "@/cms/media/resolve";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { staticContentSource } from "@/content/static-source";
import { requireContentEnvironment, usesCmsSource } from "./environment";
import { parseRevisionId, PILOT_KEY } from "./pilot-model";

import { requireServiceKey, type SharedServiceKey } from "@/content/service-registry";
import { toServiceLanding } from "./service-model";

export { usesCmsSource } from "./environment";

// React request memoization shares exactly one immutable published snapshot
// between generateMetadata and page rendering. No session or privileged key.
export const getPublicService = cache(async (key: SharedServiceKey) => {
  requireServiceKey(key);
  if (!usesCmsSource(key)) return { revisionId: null, page: staticContentSource.getServiceLanding(key) };
  requireContentEnvironment();
  await connection();
  const { url, key: publishableKey } = getCmsConfig();
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await (key === PILOT_KEY ? client.rpc("cms_read_published_pilot") : client.rpc("cms_read_published_service", { target_key: key }));
  if (error || !data) throw new Error("Published CMS service unavailable");
  const media = data.payload.schemaVersion >= 2 ? (() => {
    requireMediaEnvironment();
    return resolveMediaProjection(data.media, "public");
  })() : undefined;
  return { revisionId: parseRevisionId(data.revisionId), page: toServiceLanding(key, data.payload, media) };
});

export const getPublicPilot = () => getPublicService(PILOT_KEY);

import { isSpecialServiceKey, type SpecialServiceKey } from "@/content/service-registry";
import { acBaseline, windowBaseline } from "./special-baseline";
import { validateSpecialContent } from "./special-model";
export const getPublicSpecialService = cache(async (key: SpecialServiceKey) => {
  if (!isSpecialServiceKey(key)) throw new Error("Unsupported special service");
  // AC can be enabled later on the stable Preview alias. Keep its approved
  // Preview route request-rendered even before allowlisting, so a static
  // baseline response cannot outlive the deployment that produced it.
  const acPreview = key === "air-conditioner-cleaning" &&
    process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_PROJECT_ID === "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/cms-cloud-foundation" &&
    process.env.CMS_SUPABASE_URL === "https://plbwefnwussxlglscfpn.supabase.co";
  if (acPreview) await connection();
  if (!usesCmsSource(key)) return { revisionId: null, content: key === "air-conditioner-cleaning" ? acBaseline : windowBaseline, media: undefined };
  requireContentEnvironment();
  requireMediaEnvironment();
  if (!acPreview) await connection();
  const { url, key: publishableKey } = getCmsConfig();
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) } });
  const { data, error } = await client.rpc("cms_read_published_service", { target_key: key });
  if (error || !data) throw new Error("Published CMS service unavailable");
  return { revisionId: parseRevisionId(data.revisionId), content: validateSpecialContent(key, data.payload), media: resolveMediaProjection(data.media, "public") };
});
