import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { carUpholsteryLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(carUpholsteryLanding);

export default function CarUpholsteryCleaningPage() {
  return <ServiceLandingPage config={carUpholsteryLanding} />;
}
