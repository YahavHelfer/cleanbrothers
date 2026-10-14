import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { getPublicService } from "@/cms/content/public-source";
import { toServiceLandingProps } from "@/content/service-landing-adapter";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";

export async function generateMetadata() {
  const { page } = await getPublicService("mini-central-air-conditioner-cleaning");
  return buildServiceLandingMetadata(toServiceLandingProps(page).config);
}
export default async function ServicePage() {
  const [source, active] = await Promise.all([getPublicService("mini-central-air-conditioner-cleaning"), getPublicActivePromotion("service", "mini-central-air-conditioner-cleaning")]);
  const page = <ServiceLandingPage {...toServiceLandingProps(source.page)} />;
  return active ? <><PublicScheduledPromotion active={active} />{page}</> : page;
}
