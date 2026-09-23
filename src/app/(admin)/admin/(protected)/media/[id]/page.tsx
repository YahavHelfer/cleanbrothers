import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCmsAdmin } from "@/cms/authorization";
import { getMediaDetail } from "@/cms/media/repository";
import { privateMediaUrl, STATIC_MEDIA_PATH, mediaId } from "@/cms/media/model";
import { MetadataEditor } from "@/cms/media/MetadataEditor";
import { UploadForm } from "@/cms/media/UploadForm";
import { mediaByteLimit } from "@/cms/media/environment";
export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireCmsAdmin();
  const { id } = await params;
  try {
    mediaId(id);
  } catch {
    notFound();
  }
  const detail = await getMediaDetail(id);
  if (!detail) notFound();
  const { asset, versions, usages, audit } = detail;
  const actor = (id: string | null) =>
    id === null
      ? "ייבוא מערכת"
      : id === admin.userId
        ? "את/ה"
        : `מנהל/ת ${id.slice(0, 8)}`;
  const names: Record<string, string> = {
    bootstrap: "ייבוא",
    upload: "העלאה",
    replace: "החלפה",
    metadata: "עריכת פרטים",
    archive: "ארכוב",
    restore: "החזרה לבחירה",
  };
  return (
    <section className="grid gap-7">
      <Link href="/admin/media" prefetch={false}>
        חזרה לספריית המדיה
      </Link>
      <h1 className="text-3xl font-black">פרטי תמונה</h1>
      <p>
        {asset.status === "archived" ? "בארכיון" : "זמין לבחירה"} · מצב עריכה{" "}
        {asset.generation}
      </p>
      <MetadataEditor key={asset.id} asset={asset} />
      {asset.status === "available" && (
        <UploadForm key={`upload-${asset.generation}`} asset={asset} maxBytes={mediaByteLimit()} />
      )}
      <section aria-label="גרסאות תמונה" className="grid gap-4">
        <h2 className="text-2xl font-black">גרסאות תמונה</h2>
        {versions.map((v) => (
          <article
            key={v.id}
            className="grid gap-3 rounded-2xl border theme-card p-4"
          >
            <h3 className="font-bold">
              גרסת תמונה {v.version_number}
              {v.id === asset.current_version_id ? " · נוכחית" : ""}
            </h3>
            <Image
              src={
                v.storage_provider === "static"
                  ? STATIC_MEDIA_PATH
                  : privateMediaUrl(v.id)
              }
              width={320}
              height={240}
              alt={asset.alt_text}
              unoptimized
              className="max-h-60 w-full object-contain"
            />
            <p className="break-all" dir="auto">
              {v.original_filename}
            </p>
            <p>
              {v.width} × {v.height} · {v.mime_type} · {v.byte_size} bytes
            </p>
            <p>נוצרה על ידי {actor(v.created_by)}</p>
            <time dateTime={v.created_at}>
              {new Date(v.created_at).toLocaleString("he-IL", {
                timeZone: "Asia/Jerusalem",
              })}
            </time>
          </article>
        ))}
      </section>
      <section aria-label="שימושים בתוכן" className="grid gap-3">
        <h2 className="text-2xl font-black">שימושים בתוכן</h2>
        {!usages.length && (
          <p>עדיין אין הפניות מתוכן. גרסאות התמונה נשמרות גם ללא הפניה.</p>
        )}
        {usages.map((u) => (
          <p key={`${u.revision_id}-${u.usage_role}-${u.position}`}>
            <Link
              prefetch={false}
              className="underline"
              href={`/admin/preview/services/delicate-upholstery-cleaning?revision=${u.revision_id}`}
            >
              גרסת תוכן {u.revisionNumber}
            </Link>{" "}
            ·{" "}
            {u.usage_role === "hero"
              ? "פתיחה"
              : u.usage_role === "benefits"
                ? "יתרונות"
                : "תוצאות"}{" "}
            · {u.published ? "מפורסמת" : "גרסה שמורה"} · {u.alt_text}
          </p>
        ))}
      </section>
      <section aria-label="יומן מדיה" className="grid gap-3">
        <h2 className="text-2xl font-black">יומן פעולות</h2>
        {audit.map((e) => (
          <p key={e.id}>
            {names[e.kind]} · {actor(e.actor_id)} ·{" "}
            <time dateTime={e.occurred_at}>
              {new Date(e.occurred_at).toLocaleString("he-IL", {
                timeZone: "Asia/Jerusalem",
              })}
            </time>
          </p>
        ))}
      </section>
    </section>
  );
}
