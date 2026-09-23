import { sofaLanding, mattressLanding, carpetLanding, carUpholsteryLanding, armchairChairLanding, delicateUpholsteryLanding } from "@/data/serviceLandingPages";
import { requireServiceKey } from "./service-registry";
import type { ServiceLandingContentSource, ServiceLandingConfig } from "./service-landing";
import type { ManagedServiceKey } from "./service-registry";
export const staticServiceConfigs: Record<ManagedServiceKey, ServiceLandingConfig> = {
  "sofa-cleaning": sofaLanding, "mattress-cleaning": mattressLanding,
  "carpet-cleaning": carpetLanding, "car-upholstery-cleaning": carUpholsteryLanding,
  "armchair-chair-cleaning": armchairChairLanding, "delicate-upholstery-cleaning": delicateUpholsteryLanding,
};
export const staticContentSource: ServiceLandingContentSource = {
  getServiceLanding(serviceId) {
    const key = requireServiceKey(serviceId);
    const { serviceName, ...content } = staticServiceConfigs[key];
    return { serviceId: key, displayTitle: serviceName, content };
  },
};
