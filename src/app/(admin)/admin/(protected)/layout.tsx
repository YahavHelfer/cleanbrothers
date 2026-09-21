import { requireCmsAdminPage } from "@/cms/dashboard";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireCmsAdminPage();
  return children;
}
