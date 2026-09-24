import { staticMediaPath } from "@/cms/media/static-inventory";
import type { ResolvedMedia } from "@/cms/media/model";
import type { SpecialContent, SpecialMediaInput } from "./special-model";
export function specialMedia(content: SpecialContent, role: keyof SpecialContent["media"] | "gallery" | "seo", refs?: ResolvedMedia[]) {
    const items = (content.media as Record<string, SpecialMediaInput[]>)[role] || [];
    return items.map((item, position) => {
        if (!refs)
            return { src: staticMediaPath(item.versionId), alt: item.alt };
        const ref = refs.find(r => r.usage_role === role && r.position === position && r.media_version_id === item.versionId);
        if (!ref || ref.alt_text !== item.alt)
            throw new Error("Special media projection unavailable");
        return { src: ref.src, alt: ref.alt_text };
    });
}
