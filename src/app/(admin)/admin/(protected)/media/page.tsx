import { requireCmsAdmin } from "@/cms/authorization";
import { listMedia, listExternalMediaAttempts } from "@/cms/media/repository";
import { Library } from "@/cms/media/Library";
import { UploadForm } from "@/cms/media/UploadForm";
import { mediaByteLimit, mediaUploadEnabled, s3MediaEnvironmentEnabled } from "@/cms/media/environment";
export default async function MediaPage() {
  await requireCmsAdmin();
  const items = await listMedia();
  const attempts = s3MediaEnvironmentEnabled() ? await listExternalMediaAttempts() : [];
  return (
    <section className="grid gap-7">
      <h1 className="text-3xl font-black">ספריית מדיה</h1>
      <p>ניהול תמונות, גרסאות ושימושים בתוכן.</p>
      {mediaUploadEnabled() && <a className="btn-primary justify-self-start" href="#upload-media">העלאת תמונה</a>}
      <Library items={items} />
      {s3MediaEnvironmentEnabled() && <section aria-label="יומן העלאות S3" className="grid gap-3">
        <h2 className="text-xl font-black">יומן העלאות S3</h2>
        <p className="text-sm theme-muted">מצבי העלאה לא ודאיים נשארים לבדיקה ידנית; הם אינם נמחקים אוטומטית.</p>
        {!attempts.length ? <p>אין ניסיונות העלאה.</p> :
          <ul className="grid gap-2">
            {attempts.map(attempt => <li key={attempt.versionId} className="rounded-xl border p-3">
              <span className="font-bold">{attempt.status}</span>
              <span className="mx-2 break-all" dir="ltr">{attempt.versionId}</span>
              <time dateTime={attempt.updatedAt}>{attempt.updatedAt}</time>
              {attempt.lastErrorCode && <span className="mx-2">{attempt.lastErrorCode}</span>}
            </li>)}
          </ul>}
      </section>}
      {mediaUploadEnabled()
        ? <UploadForm maxBytes={mediaByteLimit()} />
        : <p>העלאה והחלפה של תמונות אינן זמינות עד להפעלת גישת המדיה הפרטית.</p>}
    </section>
  );
}
