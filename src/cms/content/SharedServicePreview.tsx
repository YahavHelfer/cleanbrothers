import type { ServiceLandingConfig } from "@/content/service-landing";
import { ServiceLandingView } from "@/components/ServiceLandingView";
import { PreviewContact } from "./PreviewContact";

// Both the authenticated CMS route and the offline review use this exact view.
// It accepts already-resolved CMS content; it never selects or mutates a source.
export function SharedServicePreview({ config }: { config: ServiceLandingConfig }) {
  return <ServiceLandingView config={config} preview phoneNumber="055-957-7731"
    contact={<PreviewContact serviceName={config.serviceName} />} />;
}
