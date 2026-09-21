import { delicateUpholsteryLanding } from "@/data/serviceLandingPages";
import type { ServiceLandingContentSource } from "./service-landing";

export const staticContentSource: ServiceLandingContentSource = {
  getServiceLanding(serviceId) {
    if (serviceId !== "delicate-upholstery-cleaning") {
      throw new Error("Unsupported static service");
    }
    const { serviceName, ...content } = delicateUpholsteryLanding;
    return { serviceId, displayTitle: serviceName, content };
  },
};
