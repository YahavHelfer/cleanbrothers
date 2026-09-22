"use client";
import { useActionState, useState } from "react";
import { mediaAction } from "./actions";
import type { MediaAsset } from "./model";
export function MetadataEditor({ asset }: { asset: MediaAsset }) {
  // Keep the editor's base generation and input across an RSC refresh after a conflict.
  const [generation, setGeneration] = useState(asset.generation);
  const [state, action, pending] = useActionState(
    async (previous: { ok: boolean; message: string }, form: FormData) => {
      const result = await mediaAction(previous, form);
      if (result.ok) setGeneration(Number(form.get("generation")) + 1);
      return result;
    },
    { ok: false, message: "" },
  );
  const [metadata, setMetadata] = useState({
    altText: asset.alt_text,
    caption: asset.caption,
    folder: asset.folder,
  });
  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border theme-card p-5"
      aria-label="פרטי מדיה"
    >
      <input type="hidden" name="id" value={asset.id} />
      <input type="hidden" name="generation" value={generation} />
      <h2 className="text-xl font-black">פרטי התמונה בספרייה</h2>
      <p>
        אלו ערכי ברירת מחדל לבחירה חדשה. התיאור השמור בגרסאות תוכן קודמות אינו
        משתנה.
      </p>
      <fieldset disabled={pending} className="grid gap-4">
        <label className="grid gap-2">
          תיאור חלופי בספרייה
          <input
            className="field"
            name="altText"
            value={metadata.altText}
            onChange={(e) =>
              setMetadata((current) => ({
                ...current,
                altText: e.target.value,
              }))
            }
            maxLength={300}
            required
          />
        </label>
        <label className="grid gap-2">
          כיתוב בספרייה
          <textarea
            className="field"
            name="caption"
            value={metadata.caption}
            onChange={(e) =>
              setMetadata((current) => ({
                ...current,
                caption: e.target.value,
              }))
            }
            maxLength={1000}
          />
        </label>
        <label className="grid gap-2">
          סיווג בספרייה
          <input
            className="field"
            name="folder"
            value={metadata.folder}
            onChange={(e) =>
              setMetadata((current) => ({ ...current, folder: e.target.value }))
            }
            maxLength={80}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" name="operation" value="metadata">
            שמירת פרטים
          </button>
          <button
            className="btn-secondary"
            name="operation"
            value={asset.status === "archived" ? "restore" : "archive"}
          >
            {asset.status === "archived" ? "החזרה לבחירה" : "העברה לארכיון"}
          </button>
        </div>
      </fieldset>
      <p>
        ארכוב מסתיר את הנכס מבחירה חדשה. כל הגרסאות והשימושים נשמרים; אין מחיקה
        לצמיתות.
      </p>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className="rounded border p-3">
          {state.message}
        </p>
      )}
    </form>
  );
}
