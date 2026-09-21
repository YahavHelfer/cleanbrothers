import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const cmsOrigin = "http://127.0.0.1:56321";
export const appOrigin = "http://127.0.0.1:56300";
const project = "cleanbrothers-cms-local";

export function getLocalStack() {
  const config = readFileSync("supabase/config.toml", "utf8");
  if (!config.includes(`project_id = "${project}"`) || existsSync("supabase/.temp/project-ref")) {
    throw new Error("Tests require the unlinked dedicated local CMS project");
  }
  const status = JSON.parse(execFileSync(resolve("node_modules/.bin/supabase"), ["status", "--output", "json"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1" },
  }));
  if (status.API_URL !== cmsOrigin || !status.PUBLISHABLE_KEY?.startsWith("sb_publishable_")) {
    throw new Error("Unexpected local CMS endpoint or publishable key");
  }
  return { url: cmsOrigin, key: status.PUBLISHABLE_KEY, serviceKey: status.SERVICE_ROLE_KEY };
}

// Test/bootstrap process only. No privileged key is passed to Next.js or a page.
export function localSql(sql) {
  getLocalStack();
  return execFileSync("docker", ["exec", "-i", `supabase_db_${project}`, "psql", "-U", "postgres", "-d", "postgres", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
