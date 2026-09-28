import { serviceRegistry, requireServiceKey, type ManagedServiceKey } from "./service-registry";
// Kept as a type alias for existing consumers; integration identity is code-owned.
export type PilotServiceId = ManagedServiceKey;
export function getCrmServiceName(serviceId: ManagedServiceKey): string {
  return serviceRegistry[requireServiceKey(serviceId)].crmName;
}
