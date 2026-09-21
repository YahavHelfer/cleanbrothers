import "server-only";
import { redirect } from "next/navigation";
import { CmsAccessError, requireCmsAdmin } from "./authorization";

export async function requireCmsAdminPage() {
  try {
    return await requireCmsAdmin();
  } catch (error) {
    const reason = error instanceof CmsAccessError ? error.reason : "unavailable";
    redirect(reason === "anonymous" ? "/admin/login" : `/admin/login?error=${reason}`);
  }
}

export async function getCmsDashboard() {
  // The page's data boundary authorizes independently of Proxy and layout.
  const admin = await requireCmsAdminPage();
  return { admin };
}
