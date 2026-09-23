import { isManagedServiceKey } from "@/content/service-registry";
import { toServiceLanding } from "@/cms/content/service-model";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { getServiceRevision } from "@/cms/content/repository";
import { parseRevisionId } from "@/cms/content/pilot-model";
import { toServiceLandingProps } from "@/content/service-landing-adapter";
import { ServiceLandingView } from "@/components/ServiceLandingView";
import { PreviewContact } from "@/cms/content/PreviewContact";

export const metadata: Metadata = { title: "תצוגה מקדימה פרטית | CleanBrothers", robots: { index: false, follow: false } };
export default async function ServicePreview({ params: routeParams, searchParams }: { params: Promise<{ serviceKey: string }>; searchParams: Promise<{ revision?: string | string[] }> }) {
  await requireCmsAdmin();
  const { serviceKey } = await routeParams;
  if (!isManagedServiceKey(serviceKey)) notFound();
  const params = await searchParams;
  let id: string;
  try { id = parseRevisionId(params.revision); } catch { notFound(); }
  const revision = await getServiceRevision(serviceKey, id);
  if (!revision) notFound();
  const { config } = toServiceLandingProps(toServiceLanding(serviceKey, revision.payload, revision.media));
  return <>
    <aside className="mb-6 rounded-2xl border theme-card p-5" aria-label="מצב תצוגה מקדימה">
      <p className="font-black">תצוגה מקדימה — גרסה {revision.number}</p>
      <p>הגרסה השמורה הזו בלבד. פעולות יצירת קשר מושבתות.</p>
    </aside>
    <ServiceLandingView config={config} preview phoneNumber="055-957-7731" contact={<PreviewContact serviceName={config.serviceName} />} />
  </>;
}
