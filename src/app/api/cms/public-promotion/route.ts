import { readPublicCampaign } from "@/cms/promotions/repository";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path || url.searchParams.size !== 1) return Response.json(null, { status: 400, headers });
  return Response.json(await readPublicCampaign(path), { headers });
}
