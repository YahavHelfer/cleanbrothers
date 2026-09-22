import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { requireMediaEnvironment } from "@/cms/media/environment";
import { mediaId } from "@/cms/media/model";
import { mediaBytes } from "@/cms/media/repository";
import { privateMediaHeaders } from "@/cms/media/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireMediaEnvironment();
    if (
      process.env.CMS_PILOT_CONTENT_SOURCE !== "published" ||
      process.env.CMS_CONTENT_SERVICE_ALLOWLIST !==
        "delicate-upholstery-cleaning"
    )
      throw new Error("Not enabled");
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
    if (error || !data) throw new Error("Not public");
    const file = await mediaBytes(data);
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
