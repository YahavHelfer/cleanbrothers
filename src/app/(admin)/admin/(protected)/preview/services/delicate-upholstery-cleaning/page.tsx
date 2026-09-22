import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { getPilotRevision } from "@/cms/content/repository";
import { parseRevisionId, toPilotLanding } from "@/cms/content/pilot-model";
import { toServiceLandingProps } from "@/content/service-landing-adapter";
import { ServiceLandingView } from "@/components/ServiceLandingView";
import { PreviewContact } from "@/cms/content/PreviewContact";

export const metadata: Metadata = { title: "תצוגה מקדימה פרטית | CleanBrothers", robots: { index: false, follow: false } };
export default async function PilotPreview({ searchParams }: { searchParams: Promise<{ revision?: string | string[] }> }) {
  await requireCmsAdmin();
  const params = await searchParams;
  let id: string;
  try { id = parseRevisionId(params.revision); } catch { notFound(); }
  const revision = await getPilotRevision(id);
  if (!revision) notFound();
  const { config } = toServiceLandingProps(toPilotLanding(revision.payload));
  return <>
    <aside className="mb-6 rounded-2xl border theme-card p-5" aria-label="מצב תצוגה מקדימה">
      <p className="font-black">תצוגה מקדימה — גרסה {revision.number}</p>
      <p>הגרסה השמורה הזו בלבד. פעולות יצירת קשר מושבתות.</p>
    </aside>
    <ServiceLandingView config={config} preview phoneNumber="055-957-7731" contact={<PreviewContact serviceName={config.serviceName} />} />
  </>;
}
