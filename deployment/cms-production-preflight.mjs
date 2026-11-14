import { pathToFileURL } from "node:url";

export async function verifyCmsProduction(env, fetchImpl = fetch) {
  if (env.VERCEL_ENV !== "production") return { skipped: true, reason: "non_production" };
  const expected = {
    VERCEL: "1",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "main",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
    CMS_HOME_SOURCE: "published",
    CMS_HOME_ALLOWLIST: "home",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (env[key] !== value) throw new Error(`CMS production preflight: invalid ${key}`);
  }
  const key = env.CMS_SUPABASE_PUBLISHABLE_KEY;
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? "")) {
    throw new Error("CMS production preflight: missing publishable key");
  }
  const response = await fetchImpl(new URL("/rest/v1/rpc/cms_read_public_home", expected.CMS_SUPABASE_URL), {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}", cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("CMS production preflight: published home request failed");
  const data = await response.json();
  if (!data?.revisionId || !data.payload || !Array.isArray(data.media) ||
      !data.serviceImages || typeof data.serviceImages !== "object") {
    throw new Error("CMS production preflight: invalid published home response");
  }
  const remoteMedia = data.media.filter(row => ["s3", "supabase", "local"].includes(row.provider));
  if (!remoteMedia.length) throw new Error("CMS production preflight: published CMS images missing");
  return { productionIdentity: "verified", publishedHome: "verified", cmsMediaCount: remoteMedia.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await verifyCmsProduction(process.env)));
  } catch (error) {
    // Never print fetch responses, headers or environment values.
    console.error(error instanceof Error && error.message.startsWith("CMS production preflight:")
      ? error.message : "CMS production preflight: request failed");
    process.exitCode = 1;
  }
}
