import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { armchairChairLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(armchairChairLanding);

export default function ArmchairChairCleaningPage() {
  return <ServiceLandingPage config={armchairChairLanding} />;
}
