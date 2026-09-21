import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { carpetLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(carpetLanding);

export default function CarpetCleaningPage() {
  return <ServiceLandingPage config={carpetLanding} />;
}
