import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { getLocalStack, localSql } from "../../../scripts/cms-local.mjs";
import { execFileSync } from "node:child_process";
export function importPilotBaseline() {
  execFileSync(process.execPath, ["scripts/cms-import-pilot.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
  return localSql("select id from content_revisions where revision_number=1");
}

export const stack = getLocalStack();
const privileged = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `Local-Cms!${randomUUID()}`;
export type Actor = { id: string; email: string };
export const actors: Actor[] = [];
export function resetContent() {
  localSql("truncate public.content_publication_events, public.content_publication_state, public.content_revisions, public.content_documents");
  return importPilotBaseline();
}
export async function createActor(member: boolean) {
  const email = `cms-content-${randomUUID()}@example.invalid`;
  const { data, error } = await privileged.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error("Local content actor creation failed");
  const actor = { id: data.user.id, email }; actors.push(actor);
  if (member) localSql(`insert into public.cms_admin_members(user_id,is_active) values('${actor.id}',true)`);
  return actor;
}
export async function cleanupActors() {
  resetContent(); // Audit FKs intentionally prevent silently deleting real history.
  for (const actor of actors.splice(0)) {
    const { error } = await privileged.auth.admin.deleteUser(actor.id);
    if (error) throw new Error("Local content actor cleanup failed");
  }
  usedCounters.clear();
  if (localSql("select (select count(*) from auth.users)+(select count(*) from cms_admin_members)+(select count(*) from auth.mfa_factors)") !== "0") throw new Error("Local fixture cleanup incomplete");
}
export async function session(actor: Actor, context?: BrowserContext, aal2 = true) {
  const jar = new Map<string,string>();
  const client = createServerClient(stack.url, stack.key, {
    cookieOptions: { name: "cb-cms-auth", path: "/admin", httpOnly: true, sameSite: "lax", secure: false },
    cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})),
      setAll: (updates) => { for (const {name,value} of updates) jar.set(name,value); } },
  });
  const signedIn = await client.auth.signInWithPassword({ email: actor.email, password });
  if (signedIn.error) throw new Error("Local content login failed");
  if (aal2) {
    const factor = await client.auth.mfa.enroll({ factorType: "totp" });
    if (factor.error || !factor.data) throw new Error("Local content factor failed");
    const result = await client.auth.mfa.challengeAndVerify({factorId: factor.data.id, code: await totp(factor.data.totp.secret)});
    if (result.error) throw new Error("Local content MFA failed");
  }
  if (context) await context.addCookies([...jar].map(([name,value]) => ({name,value,domain:"127.0.0.1",path:"/admin",httpOnly:true,sameSite:"Lax" as const})));
  return client;
}
export function state() {
  return JSON.parse(localSql("select row_to_json(s) from public.content_publication_state s")) as {generation:number;draft_revision_id:string;published_revision_id:string};
}
export function payload(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid local fixture revision");
  return JSON.parse(localSql(`select public.cms_revision_payload(r) from public.content_revisions r where id='${id}'`));
}

// RFC 6238 TOTP generation exists only in the isolated test runner. No fixtures,
// codes, token hashes, cookies or enrollment secrets are written to disk/logs.
const usedCounters = new Map<string, number>();
export async function totp(secret: string) {
  let counter = Math.floor(Date.now() / 30_000);
  if (usedCounters.get(secret) === counter) {
    await new Promise((resolve) => setTimeout(resolve, 30_000 - Date.now() % 30_000 + 200));
    counter = Math.floor(Date.now() / 30_000);
  }
  usedCounters.set(secret, counter);
  const bits = [...secret.replace(/=+$/, "").toUpperCase()].map((char) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const message = Buffer.alloc(8); message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
