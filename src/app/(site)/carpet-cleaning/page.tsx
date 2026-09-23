import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { getPublicService } from "@/cms/content/public-source";
import { toServiceLandingProps } from "@/content/service-landing-adapter";

export async function generateMetadata() {
  const { page } = await getPublicService("carpet-cleaning");
  return buildServiceLandingMetadata(toServiceLandingProps(page).config);
}
export default async function ServicePage() {
  return <ServiceLandingPage {...toServiceLandingProps((await getPublicService("carpet-cleaning")).page)} />;
}
