import { ServiceLandingPage, buildServiceLandingMetadata } from "@/components/ServiceLandingPage";
import { delicateUpholsteryLanding } from "@/data/serviceLandingPages";

export const metadata = buildServiceLandingMetadata(delicateUpholsteryLanding);

export default function DelicateUpholsteryCleaningPage() {
  return <ServiceLandingPage config={delicateUpholsteryLanding} />;
}
