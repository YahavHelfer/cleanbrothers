import type { ServiceLandingContentSource } from "./service-landing";
import { staticContentSource } from "./static-source";

// Shared public content remains static. Only the pilot route has a separate
// server-only, explicitly local published-content selector.
export const contentSource: ServiceLandingContentSource = staticContentSource;
