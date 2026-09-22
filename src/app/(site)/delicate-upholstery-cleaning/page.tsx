import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { getPublicPilot } from "@/cms/content/public-source";
import { toServiceLandingProps } from "@/content/service-landing-adapter";

export async function generateMetadata() {
  const { page } = await getPublicPilot();
  return buildServiceLandingMetadata(toServiceLandingProps(page).config);
}

export default async function DelicateUpholsteryCleaningPage() {
  const page = toServiceLandingProps((await getPublicPilot()).page);
  return <ServiceLandingPage {...page} />;
}
