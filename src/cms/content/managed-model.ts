import { isSpecialServiceKey, type ManagedServiceKey } from "@/content/service-registry";
import { validateServiceDraft, type ServiceDraft } from "./service-model";
import { validateSpecialContent, type SpecialContent } from "./special-model";
export type ManagedDraft = ServiceDraft | SpecialContent;
export function validateManagedDraft(key: ManagedServiceKey, value: unknown): ManagedDraft {
    return isSpecialServiceKey(key) ? validateSpecialContent(key, value) : validateServiceDraft(key, value);
}
