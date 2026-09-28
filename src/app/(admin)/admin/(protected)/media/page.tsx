import { requireCmsAdmin } from "@/cms/authorization";
import { listMedia } from "@/cms/media/repository";
import { Library } from "@/cms/media/Library";
import { UploadForm } from "@/cms/media/UploadForm";
import { mediaByteLimit } from "@/cms/media/environment";
export default async function MediaPage() {
  await requireCmsAdmin();
  const items = await listMedia();
  return (
    <section className="grid gap-7">
      <h1 className="text-3xl font-black">ספריית מדיה</h1>
      <p>ניהול תמונות, גרסאות ושימושים בתוכן.</p>
      <Library items={items} />
      <UploadForm maxBytes={mediaByteLimit()} />
    </section>
  );
}
