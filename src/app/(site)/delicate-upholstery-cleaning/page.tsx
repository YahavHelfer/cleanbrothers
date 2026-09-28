import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { getPublicPilot } from "@/cms/content/public-source";
import { toServiceLandingProps } from "@/content/service-landing-adapter";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";

export async function generateMetadata() {
  const { page } = await getPublicPilot();
  return buildServiceLandingMetadata(toServiceLandingProps(page).config);
}

export default async function DelicateUpholsteryCleaningPage() {
  const page = toServiceLandingProps((await getPublicPilot()).page);
  const active = await getPublicActivePromotion("service", "delicate-upholstery-cleaning");
  const landing = <ServiceLandingPage {...page} />;
  return active ? <><PublicScheduledPromotion active={active} />{landing}</> : landing;
}
