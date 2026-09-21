import { getCrmServiceName } from "./service-identity";
import type { ServiceLandingConfig, ServiceLandingContent } from "./service-landing";

export function toServiceLandingProps(page: ServiceLandingContent): {
  config: ServiceLandingConfig;
  crmServiceName: string;
} {
  return {
    config: { ...page.content, serviceName: page.displayTitle },
    crmServiceName: getCrmServiceName(page.serviceId),
  };
}
