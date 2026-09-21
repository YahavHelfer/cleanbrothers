import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { sofaLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(sofaLanding);

export default function SofaCleaningPage() {
  return <ServiceLandingPage config={sofaLanding} />;
}
