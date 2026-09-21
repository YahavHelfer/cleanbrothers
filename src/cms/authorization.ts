import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCmsServerClient } from "./server";

export class CmsAccessError extends Error {
  constructor(public readonly reason: "anonymous" | "forbidden" | "unavailable") {
    super("CMS access denied");
  }
}

export type CmsAdmin = Readonly<{ userId: string; email: string; role: "admin" }>;

export async function verifyCmsAdmin(client: SupabaseClient): Promise<CmsAdmin> {
  try {
    // A fresh Auth-server lookup: never trust the user object in stored cookies.
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new CmsAccessError("anonymous");
    const membership = await client.from("cms_admin_members")
      .select("user_id, role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership.error) throw new CmsAccessError("unavailable");
    if (!membership.data || membership.data.user_id !== user.id ||
        membership.data.role !== "admin" || membership.data.is_active !== true) {
      throw new CmsAccessError("forbidden");
    }
    return { userId: user.id, email: user.email ?? "", role: "admin" };
  } catch (error) {
    if (error instanceof CmsAccessError) throw error;
    throw new CmsAccessError("unavailable");
  }
}

// Call this in every future CMS read/mutation. No identity arguments, shared
// client, persistent cache, service key, or caller-supplied authorization result.
export async function requireCmsAdmin(): Promise<CmsAdmin> {
  try {
    return await verifyCmsAdmin(await createCmsServerClient());
  } catch (error) {
    if (error instanceof CmsAccessError) throw error;
    throw new CmsAccessError("unavailable");
  }
}
