"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_IMAGE_BYTES, type MediaAsset } from "./model";

export function UploadForm({ asset }: { asset?: MediaAsset }) {
  const [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function choose(f?: File) {
    setMessage("");
    if (!f) return;
    if (
      f.size > MAX_IMAGE_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(f.type)
    ) {
      setMessage("בחרו JPEG, PNG או WebP בגודל עד 8 MiB.");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
  return (
    <form
      aria-label={asset ? "החלפת תמונה" : "העלאת תמונה"}
      className="grid gap-4 rounded-2xl border theme-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) {
          setMessage("יש לבחור תמונה.");
          return;
        }
        const form = new FormData(e.currentTarget);
        form.set("file", file);
        setPending(true);
        setMessage("");
        try {
          const response = await fetch("/admin/media/upload", {
            method: "POST",
            body: form,
          });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.message || "ההעלאה לא הושלמה.");
            return;
          }
          router.push(`/admin/media/${result.id}`);
          router.refresh();
          setFile(null);
          setPreview(null);
        } catch {
          setMessage(
            "החיבור הופסק. בדקו בספרייה אם ההעלאה הושלמה לפני ניסיון נוסף.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="text-xl font-black">
        {asset ? "החלפה בגרסה חדשה" : "העלאת תמונה חדשה"}
      </h2>
      <p className="text-sm theme-muted">
        JPEG, PNG או WebP בלבד · עד 8 MiB · עד 6,000 פיקסלים לצלע ו־16 מיליון
        פיקסלים. תמונות מונפשות אינן נתמכות.
      </p>
      {asset && (
        <>
          <input type="hidden" name="asset" value={asset.id} />
          <input type="hidden" name="generation" value={asset.generation} />
          <p>
            ההחלפה תוסיף גרסה חדשה לספרייה. תמונות שכבר נבחרו בתוכן יישארו ללא
            שינוי.
          </p>
        </>
      )}
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        <div
          className="min-w-0 rounded-xl border-2 border-dashed p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!pending) choose(e.dataTransfer.files[0]);
          }}
        >
          <label className="grid gap-2 font-bold">
            בחירת תמונה
            <input
              className="min-w-0 w-full max-w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
          <p className="mt-3 text-sm">אפשר גם לגרור תמונה לכאן.</p>
          {file && (
            <p className="mt-2 break-all" dir="auto">
              {file.name}
            </p>
          )}
        </div>
        {preview && (
          <Image
            src={preview}
            alt="תצוגת התמונה שנבחרה לפני העלאה"
            width={320}
            height={240}
            unoptimized
            className="max-h-48 w-full object-contain"
          />
        )}
        <label className="grid gap-2">
          תיאור חלופי
          <input
            className="field"
            name="altText"
            maxLength={300}
            required
            defaultValue={asset?.alt_text}
          />
        </label>
        <label className="grid gap-2">
          כיתוב אופציונלי
          <textarea
            className="field"
            name="caption"
            maxLength={1000}
            defaultValue={asset?.caption}
          />
        </label>
        <label className="grid gap-2">
          סיווג
          <input
            className="field"
            name="folder"
            maxLength={80}
            defaultValue={asset?.folder}
          />
        </label>
        <button className="btn-primary justify-self-start" disabled={!file}>
          {pending
            ? "מעבד ושומר תמונה…"
            : asset
              ? "שמירת גרסה חדשה"
              : "העלאה לספרייה"}
        </button>
      </fieldset>
      {pending && <p role="status">התמונה בבדיקה ובעיבוד…</p>}
      {message && (
        <p role="alert" className="rounded border p-3">
          {message}
        </p>
      )}
    </form>
  );
}
