import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PageBlocksView, pageRevisionMetadata } from "@/cms/pages/PageBlocksView";
import { getPublicNewPage } from "@/cms/pages/new-public-source";

type Props = { params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string,string | string[] | undefined>> };
function queryString(input: Record<string,string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(input)) {
    if (Array.isArray(value)) for (const item of value) params.append(key,item);
    else if (typeof value === "string") params.append(key,value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const snapshot = await getPublicNewPage((await params).slug);
  if (!snapshot || snapshot.kind === "redirect") return { robots: { index: false, follow: false } };
  return pageRevisionMetadata(snapshot.page);
}
export default async function NewCmsPage({ params, searchParams }: Props) {
  const snapshot = await getPublicNewPage((await params).slug);
  if (!snapshot) notFound();
  if (snapshot.kind === "redirect")
    permanentRedirect(`/${snapshot.destination}${queryString(await searchParams)}`);
  return <PageBlocksView page={snapshot.page} revisionId={snapshot.revisionId}
    media={snapshot.media} promotions={snapshot.promotions} preview={false} />;
}
