import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaEnabled } from "@/cms/media/environment";
import { getMediaChoices } from "@/cms/media/repository";
import { PromotionEditor } from "@/cms/pages/PageEditor";
import { pagesLocalOnly } from "@/cms/pages/environment";
import { getPromotionEditor } from "@/cms/pages/repository";

export default async function PromotionPage({ params }: { params: Promise<{ pageId: string }> }) {
  if (!pagesLocalOnly() || (await params).pageId !== "about") notFound();
  const [{ snapshot }, mediaChoices] = await Promise.all([getPromotionEditor(), mediaEnabled() ? getMediaChoices() : Promise.resolve([])]);
  if (!snapshot) return <p>יש לייבא תחילה את מבצע הפיילוט לסביבת ה־CMS המקומית.</p>;
  return <section className="grid gap-6"><Link href="/admin/pages/about" prefetch={false}>חזרה לעמוד</Link>
    <h1 className="text-3xl font-black">מבצע הפיילוט</h1>
    <p>מסמך המבצע נפרד מן העמוד. בלוק המבצע מצביע לגרסה בלתי־משתנה, ולכן עריכת מבצע חדש אינה משנה עמוד היסטורי.</p>
    <p>סטטוס: {snapshot.status === "active" ? "פעיל" : "בארכיון"} · גרסה מפורסמת: {snapshot.history.find(row => row.id === snapshot.publishedRevisionId)?.number}</p>
    <PromotionEditor key={snapshot.generation} snapshot={snapshot} mediaChoices={mediaChoices} />
    <section className="grid gap-3"><h2 className="text-xl font-black">גרסאות מבצע</h2>
      {snapshot.history.map(row => <p key={row.id}>גרסה {row.number} · {row.id === snapshot.publishedRevisionId ? "פורסמה" : "היסטורית / טיוטה"}</p>)}
    </section>
  </section>;
}
