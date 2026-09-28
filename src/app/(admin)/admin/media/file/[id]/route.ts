import { readPrivateMedia } from "@/cms/media/repository";
import { privateMediaHeaders } from "@/cms/media/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const file = await readPrivateMedia((await params).id);
    if (!file)
      return new Response(null, { status: 404, headers: privateMediaHeaders });
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
