"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { LibraryItem } from "./repository";
import { privateMediaUrl, STATIC_MEDIA_PATH } from "./model";
export function Library({ items }: { items: LibraryItem[] }) {
  const [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false);
  const filtered = items.filter(
    (a) =>
      (archived || a.status === "available") &&
      [a.alt_text, a.folder, a.version.original_filename]
        .join(" ")
        .toLocaleLowerCase("he")
        .includes(query.toLocaleLowerCase("he")),
  );
  return (
    <section className="grid gap-5" aria-label="נכסי המדיה">
      <div className="flex flex-wrap items-center gap-4">
        <label className="grid gap-2">
          חיפוש בספרייה
          <input
            className="field"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          הצגת נכסים בארכיון
        </label>
      </div>
      {!filtered.length && <p>לא נמצאו תמונות מתאימות.</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <article
            key={a.id}
            className="grid gap-3 rounded-2xl border theme-card p-4"
          >
            <Image
              src={
                a.version.storage_provider === "static"
                  ? STATIC_MEDIA_PATH
                  : privateMediaUrl(a.version.id)
              }
              alt={a.alt_text}
              width={320}
              height={240}
              unoptimized
              className="h-48 w-full rounded-xl object-contain"
            />
            <h2 className="break-all font-bold" dir="auto">
              {a.version.original_filename}
            </h2>
            <p>{a.alt_text}</p>
            <p>
              {a.version.width} × {a.version.height} · {a.version.mime_type} ·
              גרסה {a.version.version_number}
            </p>
            <p>
              {a.usageCount} הפניות שמורות · {a.publishedUsageCount} בתוכן
              מפורסם
            </p>
            <p>{a.status === "archived" ? "בארכיון" : "זמין לבחירה"}</p>
            <Link
              className="font-bold underline"
              prefetch={false}
              href={`/admin/media/${a.id}`}
            >
              פרטי התמונה
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
