import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { mattressLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(mattressLanding);

export default function MattressCleaningPage() {
  return <ServiceLandingPage config={mattressLanding} />;
}
