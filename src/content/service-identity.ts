// Integration values are code-owned, never derived from editable display text.
// Only the structural pilot is mapped in Phase 1A; other services remain unchanged.
const crmServiceNames = {
  "delicate-upholstery-cleaning": "ניקוי ריפודים עדינים",
} as const;

export type PilotServiceId = keyof typeof crmServiceNames;

export function getCrmServiceName(serviceId: PilotServiceId): string {
  if (!Object.hasOwn(crmServiceNames, serviceId)) {
    throw new Error("Unsupported service identity");
  }
  return crmServiceNames[serviceId];
}
