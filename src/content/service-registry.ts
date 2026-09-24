// Code-owned integration identity, never accepted from editor payloads.
export const serviceRegistry = {
  "sofa-cleaning": {
    "crmName": "ניקוי ספות",
    "documentId": "9aef51c5-1851-4c76-8816-2242abd80a3f",
    "path": "/sofa-cleaning"
  },
  "mattress-cleaning": {
    "crmName": "ניקוי מזרנים",
    "documentId": "78ae8483-c8d3-4b25-8e62-e15cb3aba3a4",
    "path": "/mattress-cleaning"
  },
  "carpet-cleaning": {
    "crmName": "ניקוי שטיחים",
    "documentId": "7c563896-cf12-4aa7-82a2-1a17bd40cf04",
    "path": "/carpet-cleaning"
  },
  "car-upholstery-cleaning": {
    "crmName": "ניקוי ריפודי רכב",
    "documentId": "e28e9966-82c8-45ce-8d85-266ef6c6643c",
    "path": "/car-upholstery-cleaning"
  },
  "armchair-chair-cleaning": {
    "crmName": "ניקוי כורסאות וכיסאות",
    "documentId": "8896b193-728e-4284-8196-198a95081d7c",
    "path": "/armchair-chair-cleaning"
  },
  "delicate-upholstery-cleaning": {
    "crmName": "ניקוי ריפודים עדינים",
    "documentId": "c0000000-0000-4000-8000-000000000001",
    "path": "/delicate-upholstery-cleaning"
  },
  "air-conditioner-cleaning": { crmName: "ניקוי מזגנים", documentId: "2185a776-4440-4728-af2c-909d17994241", path: "/air-conditioner-cleaning" },
  "window-cleaning": { crmName: "ניקוי חלונות", documentId: "f05f10a0-b576-4625-8eb2-8abc5a0a1ae6", path: "/window-cleaning" }
} as const;
export type ManagedServiceKey = keyof typeof serviceRegistry;
export const managedServiceKeys = Object.keys(serviceRegistry) as ManagedServiceKey[];
export function isManagedServiceKey(value: unknown): value is ManagedServiceKey {
 return typeof value === "string" && Object.hasOwn(serviceRegistry, value);
}
export function requireServiceKey(value: unknown): ManagedServiceKey {
 if (!isManagedServiceKey(value)) throw new Error("Unsupported managed service");
 return value;
}

export const specialServiceKeys = ["air-conditioner-cleaning", "window-cleaning"] as const;
export type SpecialServiceKey = typeof specialServiceKeys[number];
export type SharedServiceKey = Exclude<ManagedServiceKey, SpecialServiceKey>;
export function isSpecialServiceKey(key: unknown): key is SpecialServiceKey { return key === "air-conditioner-cleaning" || key === "window-cleaning"; }
export const sharedServiceKeys = managedServiceKeys.filter((key): key is SharedServiceKey => !isSpecialServiceKey(key));
export function requireSharedServiceKey(key: unknown): SharedServiceKey { if (!isManagedServiceKey(key) || isSpecialServiceKey(key)) throw new Error("Unsupported managed service"); return key; }
