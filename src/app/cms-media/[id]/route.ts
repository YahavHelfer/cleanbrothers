import { managedServiceKeys } from "@/content/service-registry";
import { usesCmsSource } from "@/cms/content/environment";
import { usesCmsPageSource } from "@/cms/pages/environment";
import { newPagePublicAllowed } from "@/cms/pages/new-environment";
import { usesCmsHomeSource } from "@/cms/home/environment";
import { usesScheduledPublicPlacement } from "@/cms/schedules/public-environment";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { mediaReadEnvironmentEnabled } from "@/cms/media/environment";
import { mediaId } from "@/cms/media/model";
import { mediaBytes } from "@/cms/media/repository";
import { privateMediaHeaders } from "@/cms/media/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!mediaReadEnvironmentEnabled()) throw new Error("Not enabled");
    const { url, key } = getCmsConfig();
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    const { data, error } = await client.rpc("cms_read_public_media_version", {
      target_version: mediaId((await params).id),
    });
    const service = Array.isArray(data?.serviceKeys) && data.serviceKeys.some(usesCmsSource);
    const page = Array.isArray(data?.pageKeys) && data.pageKeys.some(usesCmsPageSource);
    const newPage = Array.isArray(data?.pageSlugs) && data.pageSlugs.some(newPagePublicAllowed);
    const home = data?.home === true && usesCmsHomeSource();
    const pinnedPage = Array.isArray(data?.pinnedPageKeys) && data.pinnedPageKeys.some(usesCmsPageSource);
    const pinnedNewPage = Array.isArray(data?.pinnedPageSlugs) && data.pinnedPageSlugs.some(newPagePublicAllowed);
    const pinnedHome = Array.isArray(data?.pinnedPageKeys) && data.pinnedPageKeys.includes("home") && usesCmsHomeSource();
    const scheduled = Array.isArray(data?.scheduledPlacements) && data.scheduledPlacements.some((slot: unknown) => {
      if (typeof slot !== "string") return false;
      if (slot === "global:site") return usesScheduledPublicPlacement("global", "site");
      if (slot === "home:home") return usesScheduledPublicPlacement("home", "home");
      const key = slot.startsWith("service:") ? slot.slice(8) : "";
      return managedServiceKeys.some((approved) => approved === key && usesScheduledPublicPlacement("service", approved));
    });
    const promotion = pinnedPage || pinnedNewPage || pinnedHome || scheduled;
    if (error || !data || !(service || page || newPage || home || promotion)) throw new Error("Not public");
    const file = await mediaBytes(data, "public");
    if (file.staticPath)
      return new Response(null, {status:307,headers:{...privateMediaHeaders,Location:file.staticPath}});
    return new Response(new Uint8Array(file.bytes!), {
      headers: {
        ...privateMediaHeaders,
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="image.webp"',
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: privateMediaHeaders });
  }
}
