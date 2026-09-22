import { delicateUpholsteryLanding as pilot } from "@/data/serviceLandingPages";
import { validatePilotDraft } from "./pilot-model";

// Used only by the explicitly local import and equivalence tests. No copy edits.
export function pilotBaseline() {
  const { serviceName, metaTitle, metaDescription, path, ...body } = pilot;
  if (path !== "/delicate-upholstery-cleaning") throw new Error("Unexpected pilot baseline");
  return validatePilotDraft({ schemaVersion: 1, publicTitle: serviceName,
    seoTitle: metaTitle, seoDescription: metaDescription, ...body });
}
