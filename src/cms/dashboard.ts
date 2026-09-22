import "server-only";
import { redirect } from "next/navigation";
import { requireCmsAdmin } from "./authorization";
import { cmsAccessDestination } from "./onboarding";

export async function requireCmsAdminPage() {
  try {
    return await requireCmsAdmin();
  } catch (error) {
    redirect(cmsAccessDestination(error));
  }
}

export async function getCmsDashboard() {
  // The page's data boundary authorizes independently of Proxy and layout.
  const admin = await requireCmsAdminPage();
  return { admin };
}
