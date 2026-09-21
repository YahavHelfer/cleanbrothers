import type { ServiceLandingContentSource } from "./service-landing";
import { staticContentSource } from "./static-source";

// Static is the only implementation. No environment switch or CMS client exists.
export const contentSource: ServiceLandingContentSource = staticContentSource;
