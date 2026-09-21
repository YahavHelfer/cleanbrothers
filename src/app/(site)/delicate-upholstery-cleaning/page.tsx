import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { contentSource } from "@/content/source";
import { toServiceLandingProps } from "@/content/service-landing-adapter";

const page = toServiceLandingProps(
  contentSource.getServiceLanding("delicate-upholstery-cleaning"),
);

export const metadata = buildServiceLandingMetadata(page.config);

export default function DelicateUpholsteryCleaningPage() {
  return <ServiceLandingPage {...page} />;
}
