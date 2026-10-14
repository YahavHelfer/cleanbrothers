import { sofaLanding, mattressLanding, carpetLanding, carUpholsteryLanding, armchairChairLanding, delicateUpholsteryLanding } from "@/data/serviceLandingPages";
import { requireSharedServiceKey } from "./service-registry";
import { postRenovationLanding } from "@/data/postRenovationCopy";
import type { ServiceLandingContentSource, ServiceLandingConfig } from "./service-landing";
import type { SharedServiceKey } from "./service-registry";
import { miniCentralAirConditionerLanding } from "@/data/miniCentralAirConditionerCopy";
export const staticServiceConfigs: Record<SharedServiceKey, ServiceLandingConfig> = {
  "sofa-cleaning": sofaLanding, "mattress-cleaning": mattressLanding,
  "carpet-cleaning": carpetLanding, "car-upholstery-cleaning": carUpholsteryLanding,
  "armchair-chair-cleaning": armchairChairLanding, "delicate-upholstery-cleaning": delicateUpholsteryLanding,
  "post-renovation-cleaning": postRenovationLanding,
  "mini-central-air-conditioner-cleaning": miniCentralAirConditionerLanding,
};
export const staticContentSource: ServiceLandingContentSource = {
  getServiceLanding(serviceId) {
    const key = requireSharedServiceKey(serviceId);
    const { serviceName, ...content } = staticServiceConfigs[key];
    return { serviceId: key, displayTitle: serviceName, content };
  },
};
