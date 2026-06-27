import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { airConditionerLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(airConditionerLanding);

export default function AirConditionerCleaningPage() {
  return <ServiceLandingPage config={airConditionerLanding} />;
}
